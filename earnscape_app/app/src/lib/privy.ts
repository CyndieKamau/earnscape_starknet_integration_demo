import { PrivyClient } from '@privy-io/server-auth';

let privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    const walletAuthKey = process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY;

    console.log('🔧 Initializing Privy Client');
    console.log('PRIVY_APP_ID:', appId);
    console.log('PRIVY_APP_SECRET exists:', !!appSecret);
    console.log('PRIVY_WALLET_AUTH_PRIVATE_KEY exists:', !!walletAuthKey);

    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be set');
    }

    // Initialize client 
    privyClient = new PrivyClient(appId, appSecret);

    //Update authorization key after initialization 
    if (walletAuthKey) {
      try {
        privyClient.walletApi.updateAuthorizationKey(walletAuthKey);
        console.log('✅ Privy wallet authorization key configured');
      } catch (e: any) {
        console.warn('⚠️ Failed to set Privy wallet authorization key:', e?.message);
      }
    } else {
      console.warn('⚠️ PRIVY_WALLET_AUTH_PRIVATE_KEY not set - wallet operations will fail');
    }
  }

  return privyClient;
}
