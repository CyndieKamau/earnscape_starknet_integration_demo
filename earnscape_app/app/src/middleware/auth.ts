// src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { getPrivyClient } from '../lib/privy';

// ---- Extend Express Request type ----
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        userJwt: string;
        [key: string]: any; // Allow additional auth properties
      };
    }
  }
}

// ---- Extract Bearer token helper ----
function getBearerToken(req: Request): string | undefined {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token.trim();
}

/**
 * NON-FATAL auth verification
 * Use for /auth/me and other endpoints that should work without auth
 * Continues even if token is invalid
 */
export async function verifyPrivyAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      // No token - continue without auth
      return next();
    }

    const privy = getPrivyClient();
    
    try {
      const claims = await privy.verifyAuthToken(token);
      const userId = (claims as any).userId || (claims as any).sub;
      
      if (userId) {
        console.log('✅ User authenticated:', userId);
        req.auth = {
          userId: String(userId),
          userJwt: token,
          ...claims, // Include all claims
        };
      }
    } catch (e: any) {
      console.warn('⚠️ Token verification failed (non-fatal):', e?.message);
    }

    return next();
    
  } catch (err: any) {
    console.warn('⚠️ Auth middleware error (non-fatal):', err?.message);
    return next();
  }
}

/**
 * FATAL auth verification
 * Use for protected endpoints that REQUIRE authentication
 * Returns 401 if token is missing or invalid
 */
export async function requirePrivyAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Missing Authorization: Bearer <token>' 
      });
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

    const userId = (claims as any).userId || (claims as any).sub;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid Privy token: no userId/sub in claims' 
      });
    }

    console.log('✅ User authenticated:', userId);
    req.auth = {
      userId: String(userId),
      userJwt: token,
      ...claims, // Include all claims
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

// ---- Optional: Middleware to attach Starknet address ----
export async function attachStarknetAddress(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { calculateUserStarknetAddress } = await import('../lib/starknet');
    const address = calculateUserStarknetAddress(req.auth.userId);
    
    // Attach to request
    (req.auth as any).starknetAddress = address;

    return next();
    
  } catch (err: any) {
    console.error('Starknet address calculation error:', err?.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate Starknet address',
      details: err?.message,
    });
  }
}

export default {
  verifyPrivyAuth,      // Non-fatal - for optional auth
  requirePrivyAuth,     // Fatal - for protected routes
  attachStarknetAddress,
};