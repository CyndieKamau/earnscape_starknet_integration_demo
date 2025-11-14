// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { verifyPrivyAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', verifyPrivyAuth, async (req: Request, res: Response) => {
  try {
    if (req.auth?.userId) {
      return res.json({
        success: true,
        userId: req.auth.userId,
        authenticated: true,
        message: 'User authenticated successfully',
      });
    }

    return res.json({
      success: false,
      authenticated: false,
      message: 'No valid auth token provided',
    });

  } catch (error: any) {
    console.error('❌ /auth/me error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      details: error.message
    });
  }
});

export default router;