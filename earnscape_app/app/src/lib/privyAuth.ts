import { getPrivyClient } from "./privy";
import type { WalletApiRequestSignatureInput } from "@privy-io/server-auth";
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