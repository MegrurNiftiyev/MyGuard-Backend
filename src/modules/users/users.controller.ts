import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { getUserProfile } from '../auth/auth.service.js';
import { AppError } from '../../errors/AppError.js';

/**
 * Get current authenticated user details (Me)
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !req.user.uid) {
    throw new AppError('Avtorizasiya olunmayıb', 401);
  }
  const uid = req.user.uid;
  const user = await getUserProfile(uid);
  res.json({ success: true, user });
}
