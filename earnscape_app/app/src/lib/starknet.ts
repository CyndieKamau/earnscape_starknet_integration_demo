// src/lib/starknet.ts
import { 
  Account, 
  RpcProvider, 
  Contract, 
  num, 
  uint256, 
  type Uint256, 
  Call,
  CallData,
  hash,
} from "starknet";
import { keccak_256 } from '@noble/hashes/sha3';
import path from "node:path";
import fs from "node:fs";
import { ENV } from "../config/env";

// ---- Validate required ENV vars ----
if (!ENV.EARNS_TOKEN_OWNER || !ENV.EARNS_TOKEN_OWNER_PRIVATE_KEY) {
  throw new Error('EARNS_TOKEN_OWNER and EARNS_TOKEN_OWNER_PRIVATE_KEY must be set');
}

// ---- Provider & hello-account (manager owner) ----
export const provider = new RpcProvider({ nodeUrl: ENV.RPC_URL });

// âœ… CORRECT SYNTAX for v8.5.3: Account expects options object
export const helloAccount = new Account({
  provider: provider,  // Can also pass provider directly
  address: ENV.EARNS_TOKEN_OWNER,
  signer: ENV.EARNS_TOKEN_OWNER_PRIVATE_KEY,
  cairoVersion: "1",
});

console.log('âœ… hello-account initialized:', helloAccount.address);

// ---- Load ABIs with error handling ----
function loadABI(filename: string): any {
  try {
    const abiPath = path.join(process.cwd(), "contracts", "abis",filename);
    if (!fs.existsSync(abiPath)) {
      throw new Error(`ABI file not found: ${abiPath}`);
    }
    return JSON.parse(fs.readFileSync(abiPath, "utf8"));
  } catch (error) {
    console.error(`Failed to load ABI: ${filename}`, error);
    throw error;
  }
}

const EarnTokenABI = loadABI("EarnTokenABI.json");
const EarnSTARKManagerABI = loadABI("EarnStarkManagerABI.json");

// ---- Contracts ----
// âœ… CORRECT SYNTAX for v8.5.3: Contract expects options object
export const earnToken = new Contract({
  abi: EarnTokenABI,
  address: ENV.EARNS_TOKEN_ADDRESS,
  providerOrAccount: helloAccount,  // Or pass helloAccount for write operations
});

export const earnManager = new Contract({
  abi: EarnSTARKManagerABI,
  address: ENV.EARNSTARK_MANAGER_ADDRESS,
  providerOrAccount: helloAccount,
});



console.log('âœ… Contracts initialized');
console.log('  - EarnToken:', ENV.EARNS_TOKEN_ADDRESS);
console.log('  - EarnManager:', ENV.EARNSTARK_MANAGER_ADDRESS);

// ---- User Starknet Address Calculation ----

/**
 * Calculate a deterministic Starknet address for a Privy user
 * This address doesn't need to be deployed - tokens can be sent to it
 * User can deploy later if they want to withdraw to another address
 * 
 * @param privyUserId - The Privy user ID (e.g., "did:privy:...")
 * @returns The calculated Starknet address
 */
export function calculateUserStarknetAddress(privyUserId: string): string {
  try {
    console.log('ðŸ”¢ Calculating Starknet address for Privy user...');
    console.log('  Privy User ID:', privyUserId);

    // Hash the Privy user ID to get a deterministic value
    const encoder = new TextEncoder();
    const bytes = encoder.encode(privyUserId);
    const hashBytes = keccak_256(bytes);
    
    // Convert hash to BigInt
    const hashHex = '0x' + Array.from(hashBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const hashBigInt = BigInt(hashHex);
    
    // Ensure it's a valid Starknet felt (< 2^251)
    // Using a 251-bit mask to be conservative
    const MASK_251_BITS = (BigInt(1) << BigInt(251)) - BigInt(1);
    const publicKey = hashBigInt & MASK_251_BITS;
    const publicKeyHex = '0x' + publicKey.toString(16).padStart(64, '0');

    console.log('  Derived Public Key:', publicKeyHex);
    console.log('  Class Hash:', ENV.READY_CLASSHASH);

    // Calculate constructor calldata for Ready v0.5.0
    const constructorCalldata = CallData.compile({
      public_key: publicKeyHex,
    });

    // Calculate the contract address (this is just for verification purposes to confirm Privy's address matches what we calculate.)
    const address = hash.calculateContractAddressFromHash(
      publicKeyHex, // salt
      ENV.READY_CLASSHASH,
      constructorCalldata,
      0 // deployer address (0 for counterfactual)
    );

    console.log('âœ… Address calculated:', address);
    return address;

  } catch (error: any) {
    console.error('âŒ Failed to calculate Starknet address:', error);
    throw new Error(`Address calculation failed: ${error.message}`);
  }
}
/**
 * Verify if a Starknet address is deployed on-chain
 * Uses multiple checks to avoid false negatives from RPC caching
 * 
 * @param address - The Starknet address to check
 * @returns true if deployed, false if not
 */
export async function isAddressDeployed(address: string): Promise<boolean> {
  try {
    // Ensure address has proper padding (0x + 64 hex chars)
    const paddedAddress = address.startsWith('0x') 
      ? '0x' + address.slice(2).padStart(64, '0')
      : '0x' + address.padStart(64, '0');
    
    console.log('🔍 Checking deployment for:', paddedAddress);
    if (address !== paddedAddress) {
      console.log('  📝 Padded from:', address);
    }
    
    // Method 1: Check class hash
    const classHash = await provider.getClassHashAt(paddedAddress);
    const hasClassHash = classHash !== '0x0' && classHash !== '0x00';
    
    console.log('  📊 Class Hash Response:', classHash);
    console.log('  ✓ Has Class Hash:', hasClassHash);
    
    // Method 2: Try to get nonce (only works if deployed)
    let hasNonce = false;
    let nonceValue = null;
    try {
      const nonce = await provider.getNonceForAddress(paddedAddress);
      nonceValue = nonce;
      hasNonce = nonce !== undefined && nonce !== null;
      console.log('  📊 Nonce Response:', nonce);
      console.log('  ✓ Has Nonce:', hasNonce);
    } catch (e: any) {
      // Nonce fetch fails for undeployed accounts
      console.log('  ❌ Nonce Error:', e.message);
      hasNonce = false;
    }
    
    const isDeployed = hasClassHash || hasNonce;
    
    console.log('  🎯 FINAL RESULT:', {
      address: paddedAddress.slice(0, 10) + '...',
      classHash: classHash.slice(0, 20) + '...',
      hasClassHash,
      nonceValue,
      hasNonce,
      isDeployed
    });
    
    return isDeployed;
  } catch (error: any) {
    console.log('⚠️ Deployment check error:', error.message);
    console.log('   Stack:', error.stack);
    // If error, address is not deployed
    return false;
  }
}

/**
 * Get account info (deployment status, nonce)
 * 
 * @param address - The Starknet address to check
 * @param retry - If true, wait briefly and retry to get fresh data
 * @returns Deployment info
 */
export async function getAccountInfo(
  address: string, 
  retry: boolean = false
): Promise<{
  isDeployed: boolean;
  nonce?: string;
  classHash?: string;
}> {
  try {
    // If retry requested, wait a moment for RPC to sync
    if (retry) {
      console.log('⏳ Waiting for RPC to sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const isDeployed = await isAddressDeployed(address);
    
    if (!isDeployed) {
      return { isDeployed: false };
    }

    const [nonce, classHash] = await Promise.all([
      provider.getNonceForAddress(address),
      provider.getClassHashAt(address)
    ]);

    return {
      isDeployed: true,
      nonce,
      classHash
    };
  } catch (error: any) {
    console.error('Failed to get account info:', error);
    throw error;
  }
}

/**
 * Get constructor calldata for Ready v0.5.0 account
 * Used by mobile app for deployment
 * 
 * @param publicKey - Starknet public key
 * @returns Constructor calldata array
 */
export function getReadyConstructorCalldata(publicKey: string): string[] {
  const pubKey = publicKey.startsWith('0x') ? publicKey : `0x${publicKey}`;
  return CallData.compile({
    public_key: pubKey,
  });
}

// ---- Helper: Convert to u256 ----
function toUint256(amount: string | bigint): Uint256 {
  return uint256.bnToUint256(BigInt(amount));
}

// ---- Get EARN balance ----
/**
 * Get EARN token balance for any address (deployed or not)
 * 
 * @param address - The Starknet address to check
 * @returns Balance as string (in wei)
 */
export async function getEarnBalance(address: string): Promise<string> {
  try {
    const balance = await earnToken.balanceOf(address);
    const balanceBN = uint256.uint256ToBN(balance);
    return balanceBN.toString();
  } catch (error) {
    console.error('Failed to get EARN balance:', error);
    // Return 0 if address not deployed or other error
    return "0";
  }
}

/**
 * Get EARN balance in human-readable format (with decimals)
 * Assumes 18 decimals (standard for ERC20)
 * 
 * @param address - The Starknet address
 * @returns Balance as string with decimals (e.g., "10.5")
 */
export async function getEarnBalanceFormatted(address: string): Promise<string> {
  try {
    const balanceWei = await getEarnBalance(address);
    const decimals = 18; // Standard ERC20 decimals
    
    // Convert wei to human-readable
    const balance = Number(balanceWei) / Math.pow(10, decimals);
    return balance.toFixed(2);
  } catch (error) {
    console.error('Failed to get formatted balance:', error);
    return "0.00";
  }
}

// ---- Get manager contract balance ----
export async function getManagerBalance(): Promise<string> {
  try {
    const balance = await earnManager.get_earns_balance();
    const balanceBN = uint256.uint256ToBN(balance);
    return balanceBN.toString();
  } catch (error) {
    console.error('Failed to get manager balance:', error);
    throw error;
  }
}

export default {
  provider,
  helloAccount,
  earnToken,
  earnManager,
  calculateUserStarknetAddress,
  isAddressDeployed,
  getAccountInfo,
  getReadyConstructorCalldata,
  getEarnBalance,
  getEarnBalanceFormatted,
  getManagerBalance,
};