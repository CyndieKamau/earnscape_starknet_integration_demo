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
  console.log('🔑 Getting authorization key...');
  console.log('  User JWT length:', userJwt.length);
  console.log('  User ID:', userId);
  
  const authKey = process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY;
  
  if (!authKey) {
    throw new Error('PRIVY_WALLET_AUTH_PRIVATE_KEY not configured in .env');
  }

  console.log('✅ Using configured authorization key');
  return authKey;
}

export function buildAuthorizationSignature({
  input,
  authorizationKey,
}: {
  input: WalletApiRequestSignatureInput;
  authorizationKey: string;
}): string {
  console.log('🔐 Building authorization signature...');
  console.log('  Input:', JSON.stringify(input, null, 2));
  console.log('  Auth key length:', authorizationKey.length);
  
  try {
    const signature = generateAuthorizationSignature({
      input,
      authorizationPrivateKey: authorizationKey,
    });

    console.log('✅ Signature generated:', signature.substring(0, 50) + '...');
    return signature;
  } catch (error: any) {
    console.error('❌ Failed to generate signature:', error);
    throw error;
  }
}

