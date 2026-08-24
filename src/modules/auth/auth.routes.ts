import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { catchAsync } from '../../utils/catchAsync.js';

const router = Router();

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/profile',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      uid: req.user?.uid || 'dev-user-123',
      email: req.user?.email || 'developer@myguard.internal',
      role: req.user?.role || 'admin',
      displayName: 'Məğrur Niftiyev',
      department: 'Security Analytics',
    });
  })
);

export default router;
