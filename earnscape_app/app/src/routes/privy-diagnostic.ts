// src/routes/debug-privy.ts
// Complete diagnostic suite for Privy authorization key issues

import { Router, Request, Response } from 'express';
import { requirePrivyAuth } from '../middleware/auth';
import { getPrivyClient } from '../lib/privy';

const router = Router();

/**
 * MAIN DIAGNOSTIC: Comprehensive check of Privy authorization
 */
router.get('/privy-full-diagnostic', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const userJwt = req.auth!.userJwt;
    const privy = getPrivyClient();

    console.log('\n🔍 PRIVY AUTHORIZATION DIAGNOSTIC');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const results: any = {
      userId,
      timestamp: new Date().toISOString(),
      tests: [],
    };

    // ====== TEST 1: Check Privy Client Configuration ======
    console.log('\n📋 TEST 1: Privy Client Configuration');
    try {
      const config = {
        hasWalletApi: !!privy.walletApi,
        walletApiMethods: privy.walletApi ? Object.keys(privy.walletApi) : [],
        hasGenerateUserSigner: !!privy.walletApi?.generateUserSigner,
        envVars: {
          PRIVY_APP_ID: process.env.PRIVY_APP_ID,
          PRIVY_APP_SECRET_exists: !!process.env.PRIVY_APP_SECRET,
          PRIVY_WALLET_AUTH_PRIVATE_KEY_exists: !!process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY,
          PRIVY_WALLET_AUTH_PRIVATE_KEY_length: process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY?.length || 0,
          PRIVY_WALLET_AUTH_PRIVATE_KEY_preview: process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY?.substring(0, 20) + '...',
        },
      };
      
      results.tests.push({
        test: 'Privy client configuration',
        success: true,
        config,
      });
      
      console.log('  ✅ Configuration OK');
      console.log('  Has walletApi:', config.hasWalletApi);
      console.log('  Has generateUserSigner:', config.hasGenerateUserSigner);
      console.log('  Auth key exists:', config.envVars.PRIVY_WALLET_AUTH_PRIVATE_KEY_exists);
      console.log('  Auth key length:', config.envVars.PRIVY_WALLET_AUTH_PRIVATE_KEY_length);
      
    } catch (error: any) {
      results.tests.push({
        test: 'Privy client configuration',
        success: false,
        error: error.message,
      });
      console.log('  ❌ Configuration check failed:', error.message);
    }

    // ====== TEST 2: Decode and Verify JWT Structure ======
    console.log('\n🎫 TEST 2: JWT Token Analysis');
    try {
      const parts = userJwt.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT structure - expected 3 parts');
      }
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      const tokenInfo = {
        header,
        payload: {
          sub: payload.sub,
          userId: payload.userId,
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          expDate: new Date(payload.exp * 1000).toISOString(),
          iat: payload.iat,
          iatDate: new Date(payload.iat * 1000).toISOString(),
          hasEmail: !!payload.email,
          email: payload.email,
          hasLinkedAccounts: !!payload.linked_accounts,
          linkedAccountsCount: payload.linked_accounts?.length || 0,
          scope: payload.scope,
        },
        validation: {
          isExpired: payload.exp < Date.now() / 1000,
          minutesUntilExpiry: ((payload.exp * 1000) - Date.now()) / (1000 * 60),
          hasRequiredFields: !!(payload.sub || payload.userId) && !!payload.iss && !!payload.aud,
        },
      };
      
      results.tests.push({
        test: 'JWT structure analysis',
        success: true,
        tokenInfo,
      });
      
      console.log('  ✅ JWT valid');
      console.log('  Issuer:', tokenInfo.payload.iss);
      console.log('  Subject:', tokenInfo.payload.sub);
      console.log('  Expires:', tokenInfo.payload.expDate);
      console.log('  Is expired:', tokenInfo.validation.isExpired);
      console.log('  Minutes until expiry:', tokenInfo.validation.minutesUntilExpiry.toFixed(1));
      console.log('  Has required fields:', tokenInfo.validation.hasRequiredFields);
      
    } catch (error: any) {
      results.tests.push({
        test: 'JWT structure analysis',
        success: false,
        error: error.message,
      });
      console.log('  ❌ JWT analysis failed:', error.message);
    }

    // ====== TEST 3: Fetch User Data ======
    console.log('\n👤 TEST 3: Fetch User Data');
    let user: any = null;
    try {
      user = await privy.getUserFromIdToken(userJwt);
      
      const userData = {
        id: user.id,
        createdAt: user.created_at,
        linkedAccountsCount: user.linked_accounts?.length || 0,
        linkedAccounts: user.linked_accounts?.map((acc: any) => ({
          type: acc.type,
          address: acc.address,
          chainType: acc.chain_type,
          walletId: acc.wallet_id,
        })),
        hasStarknetWallet: user.linked_accounts?.some(
          (acc: any) => acc.type === 'wallet' && acc.chain_type === 'starknet'
        ),
      };
      
      results.tests.push({
        test: 'Fetch user data',
        success: true,
        userData,
      });
      
      console.log('  ✅ User fetched');
      console.log('  User ID:', userData.id);
      console.log('  Linked accounts:', userData.linkedAccountsCount);
      console.log('  Has Starknet wallet:', userData.hasStarknetWallet);
      
    } catch (error: any) {
      results.tests.push({
        test: 'Fetch user data',
        success: false,
        error: error.message,
      });
      console.log('  ❌ Failed to fetch user:', error.message);
    }

    // ====== TEST 4: Try generateUserSigner with userJwt ======
    console.log('\n🔑 TEST 4: Generate User Signer (PRIMARY TEST)');
    try {
      console.log('  Calling privy.walletApi.generateUserSigner({ userJwt })...');
      
      const result = await privy.walletApi.generateUserSigner({
        userJwt: userJwt,
      });
      
      results.tests.push({
        test: 'generateUserSigner with userJwt',
        success: true,
        authorizationKey: result.authorizationKey.substring(0, 30) + '...',
        expiresAt: result.expiresAt,
      });
      
      console.log('  ✅✅✅ SUCCESS! Authorization key generated!');
      console.log('  Key preview:', result.authorizationKey.substring(0, 30) + '...');
      console.log('  Expires at:', result.expiresAt);
      
    } catch (error: any) {
      results.tests.push({
        test: 'generateUserSigner with userJwt',
        success: false,
        error: error.message,
        errorType: error.type,
        errorStatus: error.status,
      });
      
      console.log('  ❌ FAILED');
      console.log('  Error:', error.message);
      console.log('  Type:', error.type);
      console.log('  Status:', error.status);
    }

    // ====== TEST 5: Check if Starknet Wallet Exists ======
    if (user) {
      console.log('\n💼 TEST 5: Starknet Wallet Check');
      try {
        const starknetWallet = user.linked_accounts?.find(
          (acc: any) => acc.type === 'wallet' && acc.chain_type === 'starknet'
        );
        
        if (starknetWallet) {
          results.tests.push({
            test: 'Starknet wallet exists',
            success: true,
            wallet: {
              id: starknetWallet.wallet_id,
              address: starknetWallet.address,
              chainType: starknetWallet.chain_type,
              walletClient: starknetWallet.wallet_client,
            },
          });
          
          console.log('  ✅ Starknet wallet found');
          console.log('  Wallet ID:', starknetWallet.wallet_id);
          console.log('  Address:', starknetWallet.address);
        } else {
          results.tests.push({
            test: 'Starknet wallet exists',
            success: false,
            error: 'No Starknet wallet found',
          });
          
          console.log('  ❌ No Starknet wallet found');
          console.log('  User needs to create a wallet first');
        }
        
      } catch (error: any) {
        results.tests.push({
          test: 'Starknet wallet exists',
          success: false,
          error: error.message,
        });
        console.log('  ❌ Wallet check failed:', error.message);
      }
    }

    // ====== SUMMARY ======
    const summary = {
      totalTests: results.tests.length,
      passed: results.tests.filter((t: any) => t.success).length,
      failed: results.tests.filter((t: any) => !t.success).length,
      criticalTest: results.tests.find((t: any) => t.test === 'generateUserSigner with userJwt'),
    };
    
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Total tests:', summary.totalTests);
    console.log('Passed:', summary.passed);
    console.log('Failed:', summary.failed);
    console.log('Critical test (generateUserSigner):', summary.criticalTest?.success ? '✅ PASSED' : '❌ FAILED');
    
    if (!summary.criticalTest?.success) {
      console.log('\n❌ DIAGNOSIS:');
      console.log('The generateUserSigner() call is failing.');
      console.log('\nMOST LIKELY CAUSES:');
      console.log('1. PRIVY_WALLET_AUTH_PRIVATE_KEY is incorrect or from wrong source');
      console.log('2. The authorization key was not generated in Privy Dashboard');
      console.log('3. The authorization key needs to be refreshed');
      console.log('\nSOLUTION:');
      console.log('1. Go to Privy Dashboard → Settings → Embedded Wallets');
      console.log('2. Find "Server-side authorization" or "Wallet API"');
      console.log('3. Generate a NEW authorization key');
      console.log('4. Copy the FULL key to PRIVY_WALLET_AUTH_PRIVATE_KEY in .env');
      console.log('5. Restart your server');
    }

    return res.json({
      success: summary.criticalTest?.success || false,
      summary,
      results,
    });

  } catch (error: any) {
    console.error('💥 DIAGNOSTIC FAILED:', error);
    return res.status(500).json({
      success: false,
      error: 'Diagnostic test failed',
      details: error.message,
    });
  }
});

/**
 * Simple endpoint to check Privy client initialization
 */
router.get('/privy-config', async (req: Request, res: Response) => {
  try {
    const privy = getPrivyClient();
    
    const config = {
      hasWalletApi: !!privy.walletApi,
      walletApiMethods: privy.walletApi ? Object.keys(privy.walletApi).slice(0, 10) : [],
      hasGenerateUserSigner: !!privy.walletApi?.generateUserSigner,
      envVars: {
        PRIVY_APP_ID: process.env.PRIVY_APP_ID,
        PRIVY_APP_SECRET_exists: !!process.env.PRIVY_APP_SECRET,
        PRIVY_WALLET_AUTH_PRIVATE_KEY_exists: !!process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY,
        PRIVY_WALLET_AUTH_PRIVATE_KEY_length: process.env.PRIVY_WALLET_AUTH_PRIVATE_KEY?.length || 0,
      },
    };
    
    return res.json({
      success: true,
      config,
    });
    
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;