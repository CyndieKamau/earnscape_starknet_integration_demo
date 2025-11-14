// src/lib/paymaster.ts - Gasless transactions via AVNU Paymaster
import axios from "axios";
import { 
  Call, 
  CallData, 
  num, 
  uint256, 
  type Uint256, 
  Account,
  RpcProvider,
  PaymasterRpc
} from "starknet";
import { ENV } from "../config/env";
import { provider, helloAccount, earnManager } from "./starknet";

// ============================================
// PROVIDER & PAYMASTER SETUP
// ============================================

const providerCache = new Map<string, RpcProvider>();
let cachedPaymaster: PaymasterRpc | null = null;

/**
 * Get RPC provider (with optional caching)
 */
export function getRpcProvider(opts?: { 
  blockIdentifier?: 'pre_confirmed' | 'latest' | 'pending' 
}): RpcProvider {
  const rpcUrl = ENV.RPC_URL;
  if (!rpcUrl) throw new Error('Missing RPC_URL');
  
  const key = `${rpcUrl}|${opts?.blockIdentifier || ''}`;
  const existing = providerCache.get(key);
  if (existing) return existing;
  
  const newProvider = new RpcProvider({ 
    nodeUrl: rpcUrl, 
    ...(opts?.blockIdentifier ? { blockIdentifier: opts.blockIdentifier } : {}) 
  });
  
  providerCache.set(key, newProvider);
  return newProvider;
}

/**
 * Get PaymasterRpc instance (cached)
 */
export function getPaymasterRpc(): PaymasterRpc {
  if (cachedPaymaster) return cachedPaymaster;
  
  const url = ENV.PAYMASTER_URL || 'https://sepolia.paymaster.avnu.fi';
  const headers: Record<string, string> | undefined = ENV.PAYMASTER_API_KEY
    ? { 'x-paymaster-api-key': ENV.PAYMASTER_API_KEY }
    : undefined;
  
  cachedPaymaster = new PaymasterRpc(
    headers ? { nodeUrl: url, headers } : { nodeUrl: url }
  );
  
  return cachedPaymaster;
}

/**
 * Setup paymaster with mode detection (sponsored vs default)
 */
export async function setupPaymaster(): Promise<{ 
  paymasterRpc: PaymasterRpc; 
  isSponsored: boolean; 
  gasToken?: string;
}> {
  const isSponsored = (ENV.PAYMASTER_MODE || 'sponsored').toLowerCase() === 'sponsored';
  
  if (isSponsored && !ENV.PAYMASTER_API_KEY) {
    throw new Error("PAYMASTER_API_KEY is required when PAYMASTER_MODE is 'sponsored'");
  }
  
  const paymasterRpc = getPaymasterRpc();
  
  try {
    const available = await paymasterRpc.isAvailable();
    
    if (!available) {
      throw new Error('Paymaster service is not available');
    }
  } catch (error: any) {
    console.warn('⚠️ Paymaster availability check failed:', error.message);
    // Continue anyway - some paymasters don't support isAvailable()
  }
  
  let gasToken: string | undefined;
  
  if (!isSponsored) {
    try {
      const supported = await paymasterRpc.getSupportedTokens();
      gasToken = ENV.EARNS_TOKEN_ADDRESS || supported[0]?.token_address;
      
      if (!gasToken) {
        throw new Error('No supported gas tokens available (and GAS_TOKEN_ADDRESS not set)');
      }
    } catch (error: any) {
      console.warn('⚠️ Could not get supported tokens:', error.message);
      gasToken = ENV.EARNS_TOKEN_ADDRESS;
    }
  }
  
  console.log('✅ Paymaster configured');
  console.log('  Mode:', isSponsored ? 'sponsored (gasless)' : 'default (user pays)');
  if (gasToken) console.log('  Gas token:', gasToken);
  
  return { paymasterRpc, isSponsored, gasToken };
}

// ============================================
// PAYMASTER TRANSACTION EXECUTION
// ============================================

/**
 * Deploy account with paymaster (using native Starknet.js support)
 * This is the method the demo uses - it's gasless!
 * 
 * @param account - Ready account to deploy (with Privy signer and paymaster)
 * @param deployPayload - Deployment details
 * @returns Transaction result with hash
 */
export async function paymasterDeployAccount(
  account: Account,
  deployPayload: {
    classHash: string;
    contractAddress: string;
    constructorCalldata: string[];
    addressSalt: string;
  }
): Promise<{ transaction_hash: string }> {
  console.log('🚀 Deploying account with paymaster (native method)...');
  console.log('  Address:', deployPayload.contractAddress);
  console.log('  Class Hash:', deployPayload.classHash);

  try {
    const { isSponsored, gasToken } = await setupPaymaster();

    // Convert calldata to hex for paymaster
    const constructorHex = deployPayload.constructorCalldata.map((v: any) => 
      typeof v === 'string' && v.startsWith('0x') ? v : num.toHex(v)
    );

    const deploymentData = {
      class_hash: deployPayload.classHash,
      salt: deployPayload.addressSalt,
      calldata: constructorHex,
      address: deployPayload.contractAddress,
      version: 1,
    } as const;

    // Prepare paymaster fee details
    const paymasterDetails = {
      feeMode: isSponsored
        ? { mode: 'sponsored' as const }
        : { mode: 'default' as const, gasToken: gasToken! },
      deploymentData,
    };

    console.log(`Processing with paymaster in ${isSponsored ? 'sponsored' : 'default'} mode...`);

    let maxFee: bigint | undefined = undefined;

    // Estimate fees if not sponsored
    if (!isSponsored) {
      console.log('Estimating fees...');
      const feeEstimation = await account.estimatePaymasterTransactionFee(
        [], // No initial calls for pure deployment
        paymasterDetails
      );
      
      const suggested = feeEstimation.suggested_max_fee_in_gas_token;
      console.log('Estimated fee:', suggested.toString());
      
      // Apply 1.5x safety margin
      maxFee = (BigInt(suggested.toString()) * 3n + 1n) / 2n;
    }

    // ✅ Execute deployment with paymaster
    console.log('Executing paymaster deployment...');
    const result = await account.executePaymasterTransaction(
      [], // No initial calls
      paymasterDetails,
      maxFee
    );

    console.log('✅ Account deployment submitted:', result.transaction_hash);
    console.log('💰 Deployment gas paid by paymaster');

    return result;

  } catch (error: any) {
    console.error('❌ Paymaster deployment failed:', error);
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

/**
 * Execute transaction with paymaster 
 * 
 * @param calls - Single call or array of calls
 * @param account - Account with paymaster configured
 * @returns Transaction result with hash
 */
export async function paymasterExecute(
  calls: Call | Call[],
  account: Account
): Promise<{ transaction_hash: string }> {
  console.log('📝 Executing transaction with paymaster...');
  console.log('  From:', account.address);

  try {
    const { isSponsored, gasToken } = await setupPaymaster();
    const callsArray = Array.isArray(calls) ? calls : [calls];

    const paymasterDetails = {
      feeMode: isSponsored
        ? { mode: 'sponsored' as const }
        : { mode: 'default' as const, gasToken: gasToken! },
    };

    console.log(`Processing with paymaster in ${isSponsored ? 'sponsored' : 'default'} mode...`);

    let maxFee: bigint | undefined = undefined;

    if (!isSponsored) {
      console.log('Estimating fees...');
      const feeEstimation = await account.estimatePaymasterTransactionFee(
        callsArray,
        paymasterDetails
      );
      const suggested = feeEstimation.suggested_max_fee_in_gas_token;
      maxFee = (BigInt(suggested.toString()) * 3n + 1n) / 2n;
    }

    const result = await account.executePaymasterTransaction(
      callsArray,
      paymasterDetails,
      maxFee
    );

    console.log('✅ Transaction executed (paymaster):', result.transaction_hash);
    console.log('💰 Gas paid by paymaster');

    return result;

  } catch (error: any) {
    console.error('❌ Paymaster execution failed:', error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

// ============================================
// LEGACY API-BASED METHODS (Fallback)
// ============================================

/**
 * Request paymaster sponsorship from AVNU and execute transaction
 * This is the old API-based method - use paymasterExecute() instead
 * 
 * @deprecated Use paymasterExecute() instead
 */
export async function sponsoredExecute(
  calls: Call | Call[],
  account: Account = helloAccount
): Promise<{ transaction_hash: string }> {
  if (!ENV.PAYMASTER_URL || !ENV.PAYMASTER_API_KEY) {
    throw new Error('Paymaster not configured. Set PAYMASTER_URL and PAYMASTER_API_KEY');
  }

  const callsArray = Array.isArray(calls) ? calls : [calls];

  console.log('📄 Requesting paymaster sponsorship (API method)...');
  console.log('  From:', account.address);
  console.log('  Calls:', callsArray.length);
  
  try {
    const { data } = await axios.post(
      `${ENV.PAYMASTER_URL}/sponsor`,
      {
        chain_id: "SN_SEPOLIA",
        sender: account.address,
        calls: callsArray.map((c: Call) => {
          let calldataArray: string[];
          
          if (Array.isArray(c.calldata)) {
            calldataArray = c.calldata.map((val: any) => {
              if (typeof val === 'string' && val.startsWith('0x')) {
                return val;
              }
              return num.toHex(val);
            });
          } else if (c.calldata) {
            const compiled = CallData.compile(c.calldata);
            calldataArray = compiled.map((val: any) => num.toHex(val));
          } else {
            calldataArray = [];
          }

          return {
            contract_address: c.contractAddress,
            entrypoint: c.entrypoint,
            calldata: calldataArray,
          };
        }),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ENV.PAYMASTER_API_KEY,
        },
        timeout: 20_000,
      }
    );

    console.log('✅ Paymaster approved sponsorship');

    const result = await account.execute(callsArray, {
      ...data,
    });

    console.log('✅ Transaction submitted (paymaster):', result.transaction_hash);
    
    return result;

  } catch (error: any) {
    console.error('❌ Paymaster sponsorship failed:', error?.response?.data || error.message);
    throw new Error(`Paymaster failed: ${error?.response?.data?.message || error.message}`);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function toUint256(amount: string | bigint): Uint256 {
  return uint256.bnToUint256(BigInt(amount));
}

// ============================================
// TOKEN TRANSFER FUNCTIONS
// ============================================

/**
 * Send EARN tokens to a user address using the manager contract
 * Uses legacy API method with hello-account
 * 
 * @param toAddress - Recipient Starknet address
 * @param amount - Amount to send in wei
 * @returns Transaction hash
 */
export async function sendEarnsToUser(
  toAddress: string,
  amount: string | bigint
): Promise<{ txHash: string }> {
  try {
    console.log(`🚀 Sending EARN tokens to user`);
    console.log(`  To: ${toAddress}`);
    console.log(`  Amount (wei): ${amount}`);
    console.log(`  Signed by: hello-account (${helloAccount.address})`);

    const call = earnManager.populate("transfer_earns", {
      recipient: toAddress,
      amount: toUint256(amount),
    });

    const { transaction_hash } = await sponsoredExecute(call, helloAccount);

    console.log(`✅ EARN transfer successful: ${transaction_hash}`);
    
    return { txHash: transaction_hash };
  } catch (error: any) {
    console.error('❌ Failed to send EARN:', error);
    throw error;
  }
}

/**
 * Send EARN tokens with human-readable amount
 */
export async function sendEarnsToUserFormatted(
  toAddress: string,
  amountEarn: string
): Promise<{ txHash: string }> {
  try {
    const decimals = 18;
    const amountWei = BigInt(Math.floor(Number(amountEarn) * Math.pow(10, decimals)));
    console.log(`📊 Converting ${amountEarn} EARN to ${amountWei} wei`);
    return await sendEarnsToUser(toAddress, amountWei);
  } catch (error: any) {
    console.error('❌ Failed to send formatted EARN:', error);
    throw error;
  }
}

/**
 * Batch send EARN tokens to multiple users
 */
export async function batchSendEarns(
  transfers: Array<{ address: string; amount: string | bigint }>
): Promise<{ txHash: string }> {
  try {
    console.log(`🚀 Batch sending EARN to ${transfers.length} users`);

    const calls = transfers.map(({ address, amount }) => 
      earnManager.populate("transfer_earns", {
        recipient: address,
        amount: toUint256(amount),
      })
    );

    const { transaction_hash } = await sponsoredExecute(calls, helloAccount);
    console.log(`✅ Batch EARN transfer successful: ${transaction_hash}`);
    
    return { txHash: transaction_hash };
  } catch (error: any) {
    console.error('❌ Failed to batch send EARN:', error);
    throw error;
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  txHash: string,
  timeoutMs: number = 300_000
): Promise<boolean> {
  try {
    console.log(`⏳ Waiting for transaction: ${txHash}`);
    
    await provider.waitForTransaction(txHash, {
      retryInterval: 5000,
    });

    console.log(`✅ Transaction confirmed: ${txHash}`);
    return true;
  } catch (error: any) {
    console.error('❌ Transaction wait failed:', error);
    return false;
  }
}

export default {
  // Provider functions
  getRpcProvider,
  getPaymasterRpc,
  setupPaymaster,
  
  // Native paymaster methods (recommended)
  paymasterDeployAccount,
  paymasterExecute,
  
  // Legacy API methods
  sponsoredExecute,
  
  // Token transfers
  sendEarnsToUser,
  sendEarnsToUserFormatted,
  batchSendEarns,
  
  // Utilities
  waitForTransaction,
};
