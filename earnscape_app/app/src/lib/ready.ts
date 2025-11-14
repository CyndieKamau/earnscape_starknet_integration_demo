// src/lib/ready.ts - Ready v0.5.0 Account Deployment & Management
import { CairoCustomEnum, CairoOption, CairoOptionVariant, Account, CallData, hash, num } from "starknet";
import { RawSigner } from "./rawSigner";
import { provider } from "./starknet";
import { ENV } from "../config/env";
import { setupPaymaster, getPaymasterRpc } from "./paymaster";

/**
 * Build Ready v0.5.0 constructor calldata
 */
function buildReadyConstructor(publicKey: string): string[] {
  const signerEnum = new CairoCustomEnum({ Starknet: { pubkey: publicKey } });
  const guardian = new CairoOption(CairoOptionVariant.None);
  return CallData.compile({ owner: signerEnum, guardian });
}

/**
 * Compute the Ready account address for a given public key
 */
export function computeReadyAddress(publicKey: string): string {
  const calldata = buildReadyConstructor(publicKey);
  
  return hash.calculateContractAddressFromHash(
    publicKey, // salt
    ENV.READY_CLASSHASH,
    calldata,
    0 // deployer address
  );
}

/**
 * Sign a message hash using Privy's direct API
 * This uses the /raw_sign endpoint without SDK wrapper
 */
async function rawSign(
  walletId: string,
  messageHash: string,
  userJwt: string
): Promise<string> {
  console.log('🔏 Signing with Privy API...');
  console.log('  Wallet ID:', walletId);
  console.log('  Message hash:', messageHash.substring(0, 20) + '...');

  const appId = ENV.PRIVY_APP_ID;
  const appSecret = ENV.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be set');
  }

  // Privy's wallet API endpoint for raw signing
  const url = `https://api.privy.io/v1/wallets/${walletId}/rpc`;
  
  const body = {
    method: 'starknet_signMessage',
    params: {
      message: messageHash,
    },
  };

  // Create headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'privy-app-id': appId,
    'Authorization': `Bearer ${userJwt}`,
    // Basic auth for app credentials
    'privy-app-secret': appSecret,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response from Privy: ${text}`);
    }

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || `HTTP ${response.status}: ${text}`
      );
    }

    // Extract signature from response
    const sig =
      data?.signature ||
      data?.result?.signature ||
      data?.result ||
      data?.data?.signature;

    if (!sig || typeof sig !== 'string') {
      console.error('Unexpected response structure:', data);
      throw new Error('No signature returned from Privy');
    }

    console.log('✅ Signature received from Privy');

    // Ensure it has 0x prefix
    return sig.startsWith('0x') ? sig : `0x${sig}`;

  } catch (error: any) {
    console.error('❌ Privy signature failed:', error);
    throw new Error(`Failed to sign with Privy: ${error.message}`);
  }
}

/**
 * Build a Ready account with Privy-backed signer
 */
export async function buildReadyAccount({
  walletId,
  publicKey,
  classHash,
  userJwt,
   usePaymaster = false,
   privyAddress,
}: {
  walletId: string;
  publicKey: string;
  classHash: string;
  userJwt: string;
  usePaymaster?: boolean;
  privyAddress?: string;
}): Promise<{ account: Account; address: string }> {
  const constructorCalldata = buildReadyConstructor(publicKey);
  const address = privyAddress || hash.calculateContractAddressFromHash(
    publicKey,
    classHash,
    buildReadyConstructor(publicKey),
    0
  );

  console.log('🏗️ Building Ready account...');
  console.log('  Address:', address);
  console.log('  Public Key:', publicKey);

  if (privyAddress) {
    console.log('  ✅ Using Privy address (not calculated)');
  } else {
    console.log('  ⚠️  Calculated address (fallback - should not happen!)');
  }

  const accountOptions: any = {
    provider: provider,
    address: address,
    signer: new (class extends RawSigner {
      async signRaw(messageHash: string): Promise<[string, string]> {
        const sig = await rawSign(walletId, messageHash, userJwt);
        
        // Split signature into r and s
        const body = sig.slice(2); // Remove 0x
        const r = `0x${body.slice(0, 64)}`;
        const s = `0x${body.slice(64, 128)}`;
        
        return [r, s];
      }
    })(),
    cairoVersion: '1',
  };

  //Add a paymaster if requested
  if (usePaymaster) {
    const paymasterRpc = getPaymasterRpc();
    accountOptions.paymaster = paymasterRpc;
    console.log('✅ Account configured with paymaster');
  }

  //Create account with options
  const account = new Account(accountOptions);

  return { account, address };

}

/**
 * Deploy a Ready account
 * NOTE::: This is for internal testing!!!
 */
export async function deployReadyAccount({
  walletId,
  publicKey,
  classHash,
  userJwt,
  usePaymaster = false,
  privyAddress,

}: {
  walletId: string;
  publicKey: string;
  classHash: string;
  userJwt: string;
  usePaymaster?: boolean;
  privyAddress?: string;
}): Promise<{ transaction_hash: string; address: string }> {
  console.log('🚀 Deploying Ready account...');
  console.log('  Wallet ID:', walletId);
  console.log('  Public Key:', publicKey);
  console.log('  Class Hash:', classHash);

  const constructorCalldata = buildReadyConstructor(publicKey);
  const contractAddress = privyAddress || hash.calculateContractAddressFromHash(
    publicKey,
    classHash,
    buildReadyConstructor(publicKey),
    0
  );

  console.log('  Calculated Address:', contractAddress);

  // Build account with Privy signer
  const { account } = await buildReadyAccount({
    walletId,
    publicKey,
    classHash,
    userJwt,
    usePaymaster: false,
  });

  // Deploy payload
  const deployPayload = {
    classHash,
    contractAddress,
    constructorCalldata,
    addressSalt: publicKey,
  };

  console.log('📄 Deploying account...');

  try {
    // Deploy account - the account.deployAccount method handles signing
    const result = await account.deployAccount(deployPayload);

    console.log('✅ Deployment transaction submitted:', result.transaction_hash);

    return {
      transaction_hash: result.transaction_hash,
      address: contractAddress,
    };

  } catch (error: any) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

/**
 * Deploy a Ready account with paymaster sponsorship
 */
export async function deployReadyAccountWithPaymaster({
  walletId,
  publicKey,
  classHash,
  userJwt,
   privyAddress,
}: {
  walletId: string;
  publicKey: string;
  classHash: string;
  userJwt: string;
  privyAddress: string;
}): Promise<{ transaction_hash: string; address: string }> {
  console.log('🚀 Deploying Ready account with paymaster...');

  const constructorCalldata = buildReadyConstructor(publicKey);
  const contractAddress = privyAddress;
  console.log('  Using Privy Address:', contractAddress);


  // Build account with the paymaster flag
  const { account } = await buildReadyAccount({
    walletId,
    publicKey,
    classHash,
    userJwt,
    usePaymaster: true, 
    privyAddress: contractAddress,
  });

  //Prepare deployment data for paymaster
  const constructorHex = constructorCalldata.map((v: any) => num.toHex(v));
  
  const deploymentData = {
    class_hash: classHash,
    salt: publicKey,
    calldata: constructorHex,
    address: contractAddress,
    version: 1,
  } as const;

  const paymasterDetails = {
    feeMode: { mode: 'sponsored' as const },
    deploymentData,
  };

  console.log('📄 Executing paymaster deployment...');

  try {
    const result = await account.executePaymasterTransaction(
      [], 
      paymasterDetails
    );

    console.log('✅ Deployment submitted (gasless):', result.transaction_hash);

    return {
      transaction_hash: result.transaction_hash,
      address: contractAddress,
    };

  } catch (error: any) {
    console.error('❌ Paymaster deployment failed:', error.message);
    console.error('Full error:', error);
    
    throw new Error(`Paymaster deployment failed: ${error.message}`);
  }
}
/**
 * Get a Ready account (already deployed)
 */
export async function getReadyAccount({
  walletId,
  publicKey,
  classHash,
  userJwt,
}: {
  walletId: string;
  publicKey: string;
  classHash: string;
  userJwt: string;
}): Promise<{ account: Account; address: string }> {
  return buildReadyAccount({
    walletId,
    publicKey,
    classHash,
    userJwt,
  });
}

/**
 * Execute a transaction with a Ready account
 * INTERNAL!!!!
 */
export async function executeReadyTransaction({
  walletId,
  publicKey,
  classHash,
  userJwt,
  calls,
}: {
  walletId: string;
  publicKey: string;
  classHash: string;
  userJwt: string;
  calls: any | any[];
}): Promise<{ transaction_hash: string; address: string }> {
  console.log('📝 Executing Ready account transaction...');

  // Get account with Privy signer
  const { account, address } = await getReadyAccount({
    walletId,
    publicKey,
    classHash,
    userJwt,
  });

  console.log('  From address:', address);

  // Convert single call to array
  const callsArray = Array.isArray(calls) ? calls : [calls];

  try {
    const result = await account.execute(callsArray);

    console.log('✅ Transaction executed:', result.transaction_hash);

    return {
      transaction_hash: result.transaction_hash,
      address,
    };

  } catch (error: any) {
    console.error('❌ Transaction execution failed:', error);
    throw error;
  }
}

/**
 * Execute a transaction with paymaster sponsorship
 */
export async function executeReadyTransactionWithPaymaster({
  walletId,
  publicKey,
  classHash,
  userJwt,
  calls,
  privyAddress,
}: {
  walletId: string;
  publicKey: string;
  classHash: string;
  userJwt: string;
  calls: any | any[];
  privyAddress: string;
}): Promise<{ transaction_hash: string; address: string }> {
  console.log('📝 Executing Ready transaction with paymaster...');

  const { account, address } = await buildReadyAccount({
    walletId,
    publicKey,
    classHash,
    userJwt,
    usePaymaster: true, 
    privyAddress,
  });

  // Normalize calls to array
  const callsArray = Array.isArray(calls) ? calls : [calls];

  console.log('  From address:', address);
  console.log('  Calls:', callsArray.length);

  const paymasterDetails = {
    feeMode: { mode: 'sponsored' as const },
  };

  try {
    const result = await account.executePaymasterTransaction(
      callsArray,
      paymasterDetails
    );

    console.log('✅ Transaction executed (gasless):', result.transaction_hash);

    return {
      transaction_hash: result.transaction_hash,
      address,
    };

  } catch (error: any) {
    console.error('❌ Paymaster transaction failed:', error.message);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

export default {
  computeReadyAddress,
  buildReadyAccount,
  deployReadyAccount,
  deployReadyAccountWithPaymaster,
  getReadyAccount,
  executeReadyTransaction,
  executeReadyTransactionWithPaymaster,
};