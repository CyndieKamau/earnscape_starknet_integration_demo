// import { PrivyClient } from '@privy-io/server-auth';

// let privyClient: PrivyClient | null = null;

// export function getPrivyClient(): PrivyClient {
//   if (!privyClient) {
//     const appId = process.env.PRIVY_APP_ID;
//     const appSecret = process.env.PRIVY_APP_SECRET;
//     const walletAuthKey = process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY;

//     if (!appId || !appSecret) {
//       throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be set');
//     }

//     // ✅ Initialize with wallet authorization key
//     privyClient = new PrivyClient(appId, appSecret, {
//       walletApi: {
//         authorizationPrivateKey: walletAuthKey, // ✅ This is crucial!
//       },
//     });
//   }

//   return privyClient;
// }

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
    console.log('PRIVY_WALLET_AUTH_PRIVATE_KEY preview:', walletAuthKey?.substring(0, 15) + '...');

    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be set');
    }

    // ✅ Only add walletApi config if the key exists
    if (!walletAuthKey) {
      console.warn('⚠️  PRIVY_WALLET_AUTH_PRIVATE_KEY not set - wallet operations will fail');
      privyClient = new PrivyClient(appId, appSecret);
    } else {
      privyClient = new PrivyClient(appId, appSecret, {
        walletApi: {
          authorizationPrivateKey: walletAuthKey,
        },
      });
      console.log('✅ Privy Client initialized with wallet API support');
    }
  }

  return privyClient;
}