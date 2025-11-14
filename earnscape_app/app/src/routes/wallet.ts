// src/routes/wallet.ts

import { Router, Request, Response } from 'express';
import { requirePrivyAuth } from '../middleware/auth';
import { getPrivyClient } from '../lib/privy';
import { 
  computeReadyAddress, 
  deployReadyAccountWithPaymaster, 
  executeReadyTransactionWithPaymaster 
} from '../lib/ready';
import { 
  getAccountInfo,
  getEarnBalance,
  getEarnBalanceFormatted
} from '../lib/starknet';
import { sendEarnsToUserFormatted } from '../lib/paymaster';
import { CallData } from 'starknet';
import { ENV } from '../config/env';

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Starknet wallet from Privy
 */
async function getStarknetWallet(walletId: string) {
  if (!walletId) throw new Error('walletId is required');
  
  const privy = getPrivyClient();
  const wallet: any = await privy.walletApi.getWallet({ id: walletId });
  
  const chainType = wallet?.chainType || wallet?.chain_type;
  if (!wallet || !chainType || chainType !== 'starknet') {
    throw new Error('Provided wallet is not a Starknet wallet');
  }
  
  const publicKey: string | undefined = wallet.public_key || wallet.publicKey;
  if (!publicKey) throw new Error('Wallet missing Starknet public key');
  
  const address: string | undefined = wallet.address;
   if (!address) throw new Error('Wallet missing address');
  
  return { publicKey, address, chainType, wallet };
}


/**
 * Get user's Starknet wallets from Privy
 */
async function getUserStarknetWallets(userId: string) {
  const privy = getPrivyClient();
  
  console.log('🔍 Fetching user from Privy...');
  const user: any = await privy.getUserById(userId);
  
  const accounts = user?.linkedAccounts || user?.linked_accounts || [];
  console.log('🔍 Total accounts found:', accounts.length);
  
  const walletAccounts = accounts.filter((acc: any) => acc?.type === 'wallet');
  console.log('🔍 Total wallet accounts:', walletAccounts.length);
  
  const wallets = await Promise.all(
    walletAccounts.map(async (acc: any) => {
      try {
        console.log(`🔍 Fetching wallet details for: ${acc.id}`);
        const wallet: any = await privy.walletApi.getWallet({ id: acc.id });
        
        //Checking  chain type here
        const chainType = wallet.chain_type || wallet.chainType;
        console.log(`🔍 Wallet ${acc.id}: chainType=${chainType}`);
        
        // Skip non-Starknet wallets
        if (chainType !== 'starknet') {
          console.log(`⏭️  Skipping non-Starknet wallet: ${acc.id}`);
          return null;
        }
        
        const publicKey: string | undefined = wallet.public_key || wallet.publicKey;
        const address = wallet.address;
        if (!address) {
        console.warn(`Wallet ${acc.id} missing address, skipping`);
        return null;
        }
        
        console.log(`✅ Starknet wallet ${acc.id}: address=${address}`);
        
        return {
          id: wallet.id,
          address,
          chainType: chainType,
          publicKey,
          createdAt: wallet.created_at || wallet.createdAt,
        };
      } catch (error: any) {
        console.error(`❌ Failed to fetch wallet ${acc.id}:`, error.message);
        return null;
      }
    })
  );
  
  return wallets.filter((w) => w !== null);
}

// ============================================
// WALLET MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/wallet/create
 * Create a new Privy-managed Starknet wallet
 */
router.post('/create', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    console.log('🔧 Creating Privy Starknet wallet...');
    console.log('  User ID:', userId);

    const privy = getPrivyClient();
    
    // Create Privy wallet
    const wallet = await privy.walletApi.createWallet({
      chainType: 'starknet',
      owner: { userId }
    });

    const publicKey = (wallet as any).publicKey || (wallet as any).public_key;
    const address = wallet.address;
    if (!address) throw new Error('Wallet missing address');

    console.log('✅ Privy wallet created!');
    console.log('  Wallet ID:', wallet.id);
    console.log('  Address:', address);
    console.log('  Public Key:', publicKey);

    return res.json({
      success: true,
      data: {
        walletId: wallet.id,
        address,
        publicKey,
        chainType: 'starknet',
        message: 'Starknet wallet created successfully'
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to create Privy wallet:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create Privy wallet',
      details: error.message
    });
  }
});

/**
 * GET /api/wallet/list
 * Get all user's Starknet wallets
 */
router.get('/list', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    console.log('📋 Listing Starknet wallets for user:', userId);

    const wallets = await getUserStarknetWallets(userId);

    console.log(`✅ Found ${wallets.length} wallet(s)`);

    return res.json({
      success: true,
      data: {
        wallets,
        count: wallets.length
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to list wallets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list wallets',
      details: error.message
    });
  }
});

/**
 * GET /api/wallet/:walletId
 * Get specific wallet details
 */
router.get('/:walletId', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const userId = req.auth!.userId;

    console.log('📍 Getting wallet details...');
    console.log('  Wallet ID:', walletId);
    console.log('  User ID:', userId);

    // Get wallet from Privy
    const { publicKey, address } = await getStarknetWallet(walletId);

    // Check if deployed on-chain
    const accountInfo = await getAccountInfo(address);

    // Get balance
    const balanceWei = await getEarnBalance(address);
    const balanceFormatted = await getEarnBalanceFormatted(address);

    console.log('✅ Wallet details retrieved');
    console.log('  Address:', address);
    console.log('  Deployed:', accountInfo.isDeployed);
    console.log('  Balance:', balanceFormatted, 'EARN');

    return res.json({
      success: true,
      data: {
        walletId,
        address,
        publicKey,
        isDeployed: accountInfo.isDeployed,
        nonce: accountInfo.nonce,
        classHash: accountInfo.classHash,
        balance: {
          wei: balanceWei,
          formatted: balanceFormatted,
          symbol: 'EARN',
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get wallet:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get wallet details',
      details: error.message
    });
  }
});

/**
 * GET /api/wallet/:walletId/balance
 * Get wallet balance
 */
router.get('/:walletId/balance', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

    console.log('💰 Getting balance for wallet:', walletId);

    const { publicKey, address } = await getStarknetWallet(walletId);

    // Get balance
    const balanceWei = await getEarnBalance(address);
    const balanceFormatted = await getEarnBalanceFormatted(address);

    console.log('✅ Balance:', balanceFormatted, 'EARN');

    return res.json({
      success: true,
      data: {
        walletId,
        address,
        balanceWei,
        balance: balanceFormatted,
        symbol: 'EARN',
      }
    });

  } catch (error: any) {
    console.error('❌ Get balance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get balance',
      details: error.message
    });
  }
});

// ============================================
// DEPLOYMENT ENDPOINT
// ============================================

/**
 * POST /api/wallet/:walletId/deploy
 * Deploy the user's Starknet account (gasless via paymaster)
 */
router.post('/:walletId/deploy', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const userId = req.auth!.userId;
    const userJwt = req.auth!.userJwt;

    console.log('🚀 Deploying Starknet account...');
    console.log('  Wallet ID:', walletId);
    console.log('  User ID:', userId);

    const classHash = ENV.READY_CLASSHASH;
    if (!classHash) {
      return res.status(500).json({
        success: false,
        error: 'READY_CLASSHASH not configured'
      });
    }

    // Get wallet details from Privy
    const { publicKey, address } = await getStarknetWallet(walletId);

    // Check if already deployed
    const accountInfo = await getAccountInfo(address);
    if (accountInfo.isDeployed) {
      return res.status(400).json({
        success: false,
        error: 'Account already deployed',
        address
      });
    }

    // Deploy with paymaster
    const origin = (req.headers?.origin as string) || ENV.CLIENT_URL;
    
    const deployResult = await deployReadyAccountWithPaymaster({
      walletId,
      publicKey,
      classHash,
      userJwt,
      privyAddress: address,
    });

    console.log('✅ Account deployed successfully!');
    console.log('  Tx Hash:', deployResult.transaction_hash);

    return res.json({
      success: true,
      data: {
        walletId,
        address,
        publicKey,
        transactionHash: deployResult.transaction_hash,
        message: 'Account deployed successfully! (Gas paid by paymaster)'
      }
    });

  } catch (error: any) {
    console.error('❌ Deploy error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deploy account',
      details: error.message
    });
  }
});

// ============================================
// CLAIM ENDPOINT (Custodial - hello-account signs)
// ============================================

/**
 * POST /api/wallet/:walletId/claim
 * Claim EARN tokens (hello-account sends tokens)
 */
router.post('/:walletId/claim', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const userId = req.auth!.userId;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be greater than 0'
      });
    }

    console.log('🎁 Processing claim...');
    console.log('  Wallet ID:', walletId);
    console.log('  User ID:', userId);
    console.log('  Amount:', amount, 'EARN');

    // Get wallet address
    const { publicKey, address } = await getStarknetWallet(walletId);

    // TODO: Add your business logic here
    // - Verify user has enough points
    // - Deduct from available balance
    // - Record in database

    // Send EARN tokens (hello-account signs, paymaster pays gas)
    const result = await sendEarnsToUserFormatted(address, amount);

    console.log('✅ Claim successful');
    console.log('  Tx Hash:', result.txHash);

    return res.json({
      success: true,
      data: {
        txHash: result.txHash,
        walletId,
        address,
        amount,
        message: 'Rewards claimed! EARN tokens sent to your wallet.'
      }
    });

  } catch (error: any) {
    console.error('❌ Claim error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to claim rewards',
      details: error.message
    });
  }
});

// ============================================
// WITHDRAW ENDPOINT (User signs via Privy)
// ============================================

/**
 * POST /api/wallet/:walletId/withdraw
 * Withdraw tokens to external address (USER signs the transaction)
 */
router.post('/:walletId/withdraw', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const userId = req.auth!.userId;
    const userJwt = req.auth!.userJwt;
    const { toAddress, amount } = req.body;

    if (!toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'toAddress and amount are required'
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    console.log('💸 Processing withdrawal (user signs)...');
    console.log('  Wallet ID:', walletId);
    console.log('  To:', toAddress);
    console.log('  Amount:', amount, 'EARN');

    const classHash = ENV.READY_CLASSHASH;
    if (!classHash) {
      return res.status(500).json({
        success: false,
        error: 'READY_CLASSHASH not configured'
      });
    }

    // Get wallet details
    const { publicKey, address } = await getStarknetWallet(walletId);

    // Check if deployed
    const accountInfo = await getAccountInfo(address);
    if (!accountInfo.isDeployed) {
      return res.status(400).json({
        success: false,
        error: 'Account not deployed. Deploy your account first.',
        hint: 'Call POST /api/wallet/:walletId/deploy'
      });
    }

    // Check balance
    const balanceWei = await getEarnBalance(address);
    const balanceFormatted = await getEarnBalanceFormatted(address);
    const amountWei = BigInt(Math.floor(Number(amount) * 1e18));
    
    if (BigInt(balanceWei) < amountWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        available: balanceFormatted
      });
    }

    // Build transfer call
    const { earnToken } = await import('../lib/starknet');
    const transferCall = {
      contractAddress: earnToken.address,
      entrypoint: 'transfer',
      calldata: CallData.compile({
        recipient: toAddress,
        amount: {
          low: amountWei,
          high: 0n
        }
      })
    };

    // Execute with paymaster (user signs)
    const origin = (req.headers?.origin as string) || ENV.CLIENT_URL;
    
    const result = await executeReadyTransactionWithPaymaster({
      walletId,
      publicKey,
      classHash,
      userJwt,
      calls: [transferCall],
      privyAddress: address, 
    });

    console.log('✅ Withdrawal successful (gasless)');
    console.log('  Tx Hash:', result.transaction_hash);

    return res.json({
      success: true,
      data: {
        txHash: result.transaction_hash,
        from: address,
        to: toAddress,
        amount,
        gasless: true,
        message: 'Withdrawal successful! (User signed, gas paid by paymaster)'
      }
    });

  } catch (error: any) {
    console.error('❌ Withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal',
      details: error.message
    });
  }
});

/**
 * POST /api/wallet/:walletId/execute
 * Execute arbitrary transaction (like demo's /execute endpoint)
 */
router.post('/:walletId/execute', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const userId = req.auth!.userId;
    const userJwt = req.auth!.userJwt;
    const { call, calls, wait } = req.body;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'walletId is required'
      });
    }

    const classHash = ENV.READY_CLASSHASH;
    if (!classHash) {
      return res.status(500).json({
        success: false,
        error: 'READY_CLASSHASH not configured'
      });
    }

    console.log('📝 Executing transaction...');
    console.log('  Wallet ID:', walletId);
    console.log('  User ID:', userId);

    const { publicKey, address } = await getStarknetWallet(walletId);

    // Check if deployed
    const accountInfo = await getAccountInfo(address);
    if (!accountInfo.isDeployed) {
      return res.status(400).json({
        success: false,
        error: 'Account not deployed'
      });
    }

    // Normalize call(s)
    const normalizeOne = (c: any) => {
      if (!c || !c.contractAddress || !c.entrypoint) {
        throw new Error('call must include contractAddress and entrypoint');
      }
      let calldata: any = c.calldata ?? [];
      if (calldata && !Array.isArray(calldata) && typeof calldata === 'object') {
        calldata = CallData.compile(calldata);
      }
      return {
        contractAddress: c.contractAddress,
        entrypoint: c.entrypoint,
        calldata: calldata || [],
      };
    };

    const execCalls = calls
      ? (calls as any[]).map(normalizeOne)
      : call
      ? [normalizeOne(call)]
      : null;

    if (!execCalls) {
      return res.status(400).json({
        success: false,
        error: 'call or calls is required'
      });
    }

    // Execute with paymaster
    const origin = (req.headers?.origin as string) || ENV.CLIENT_URL;
    
    const result = await executeReadyTransactionWithPaymaster({
      walletId,
      publicKey,
      classHash,
      userJwt,
      calls: execCalls,
      privyAddress: address, 
    });

    console.log('✅ Transaction executed:', result.transaction_hash);

    // Wait for confirmation if requested
    if (wait) {
      try {
        const { waitForTransaction } = await import('../lib/paymaster');
        await waitForTransaction(result.transaction_hash);
      } catch (error) {
        console.warn('Failed to wait for transaction:', error);
      }
    }

    return res.json({
      success: true,
      data: {
        walletId,
        address,
        transactionHash: result.transaction_hash,
        message: 'Transaction executed successfully'
      }
    });

  } catch (error: any) {
    console.error('❌ Execute error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute transaction',
      details: error.message
    });
  }
});

export default router;