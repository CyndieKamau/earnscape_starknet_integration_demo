import type { Request, Response, NextFunction } from 'express';
import { getPrivyClient } from '../lib/privy';
// import { getUserAuthorizationKey } from '../lib/privyAuth';

// 1. Extract Bearer token helper
function getBearerToken(req: Request): string | undefined {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token.trim();
}

// 2. Middleware to verify Privy token + fetch user signer key
export async function requirePrivyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing Authorization: Bearer <token>' });
    }

    const privy = getPrivyClient();
    let claims;
    try {
      claims = await privy.verifyAuthToken(token);
    } catch (e: any) {
      console.error('Privy verify failed:', e?.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: invalid or expired Privy token', 
        details: e?.message 
      });
    }

    // Extract user ID (Privy returns it as userId or sub)
    const userId = (claims as any).userId || (claims as any).sub;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid Privy token: no userId/sub in claims' 
      });
    }

    console.log('✅ User authenticated:', userId);

    // ✅ SIMPLIFIED - No authorization key needed for your demo
    req.auth = {
      userId: String(userId),
      userJwt: token,
      // ❌ REMOVED: authorizationKey
    };

    return next();
  } catch (err: any) {
    console.error('Auth middleware error:', err?.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      details: err?.message,
    });
  }
}