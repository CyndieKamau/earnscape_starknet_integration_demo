import { getPrivyClient } from "./privy";
import type { PrivyClient,WalletApiRequestSignatureInput } from "@privy-io/server-auth";
import { generateAuthorizationSignature } from "@privy-io/server-auth/wallet-api";

// In-memory cache of user authorization keys to avoid regenerating per request.
// Keyed by userId; values include key and expiry.
const userSignerCache = new Map<
  string,
  { authorizationKey: string; expiresAt: number }
>();

export async function getUserAuthorizationKey({
  userJwt,
  userId,
}: {
  userJwt: string;
  userId?: string;
}): Promise<string> {
  const cacheKey = userId || "unknown";
  const cached = userSignerCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 5_000) {
    return cached.authorizationKey;
  }

  // Make sure PRIVY_WALLET_AUTH_PRIVATE_KEY is set
  if (!process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY) {
    throw new Error('PRIVY_WALLET_AUTH_PRIVATE_KEY not configured in .env');
  }

  const privy = getPrivyClient();
  
  // This is the correct way according to Privy's SDK
  const res = await privy.walletApi.generateUserSigner({
    userJwt: userJwt, // ✅ This is correct for your SDK version
  });

  const authKey = res.authorizationKey;
  const expiresAt = new Date(res.expiresAt as unknown as string).getTime();
  userSignerCache.set(cacheKey, { authorizationKey: authKey, expiresAt });
  
  return authKey;
}

export function buildAuthorizationSignature({
  input,
  authorizationKey,
}: {
  input: WalletApiRequestSignatureInput;
  authorizationKey: string;
}): string {
  const signature = generateAuthorizationSignature({
    input,
    authorizationPrivateKey: authorizationKey,
  });

  return signature;
}

// src/lib/privyAuth.ts

// import { getPrivyClient } from './privy';

// /**
//  * Generate an authorization key for a user to sign transactions
//  * 
//  * @param userJwt - The user's Privy JWT token
//  * @param userId - Optional user ID for caching (not used by Privy API)
//  * @returns Authorization key string
//  */
// export async function getUserAuthorizationKey({
//   userJwt,
//   userId,
// }: {
//   userJwt: string;
//   userId?: string;
// }): Promise<string> {
//   if (!userJwt) {
//     throw new Error('userJwt is required');
//   }

//   console.log('🔑 Generating authorization key...');
//   if (userId) {
//     console.log('  User ID:', userId);
//   }

//   const privy = getPrivyClient();
  
//   try {
//     // ✅ CRITICAL FIX: Pass JWT string directly, not as object
//     const response = await privy.walletApi.generateUserSigner(userJwt);
    
//     console.log('✅ Authorization key generated');
//     console.log('  Key length:', response.authorizationKey.length);
//     console.log('  Expires at:', response.expiresAt);
    
//     return response.authorizationKey;
    
//   } catch (error: any) {
//     console.error('❌ Failed to generate authorization key:', error);
//     console.error('  Error type:', error.error_type);
//     console.error('  Error message:', error.message);
    
//     // Add helpful error context
//     if (error.error_type === 'invalid_data') {
//       throw new Error(
//         'Invalid JWT token. Make sure:\n' +
//         '1. User has created a Privy wallet\n' +
//         '2. JWT token is valid and not expired\n' +
//         '3. User has at least one embedded wallet'
//       );
//     }
    
//     throw error;
//   }
// }

// /**
//  * Generate authorization key with caching (optional enhancement)
//  * You can use this later if you want to cache keys
//  */
// export async function getUserAuthorizationKeyWithCache({
//   userJwt,
//   userId,
// }: {
//   userJwt: string;
//   userId: string;
// }): Promise<string> {
//   // For now, just call the main function
//   // You can add caching logic here later
//   return getUserAuthorizationKey({ userJwt, userId });
// }
