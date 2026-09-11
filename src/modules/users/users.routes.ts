import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { getMe } from './users.controller.js';

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', requireAuth, catchAsync(getMe));

export default router;

