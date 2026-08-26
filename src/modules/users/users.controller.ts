import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { getUserProfile } from '../auth/auth.service.js';

/**
 * Get current authenticated user details (Me)
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
  const uid = req.user?.uid || 'usr-admin-001';
  const user = await getUserProfile(uid);
  res.json({ success: true, user });
}
