import { Response, NextFunction } from 'express';
import { auth, isFirebaseInitialized } from '../config/firebase.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (env.NODE_ENV === 'development' || !isFirebaseInitialized) {
      req.user = {
        uid: 'dev-user-123',
        email: 'developer@myguard.internal',
        role: 'admin',
      };
      return next();
    }

    return next(new AppError('Unauthorized: Missing or invalid Authorization Bearer header', 401));
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    if (isFirebaseInitialized && auth) {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: (decodedToken.role as string) || 'user',
      };
    } else {
      req.user = {
        uid: 'dev-user-123',
        email: 'developer@myguard.internal',
        role: 'admin',
      };
    }
    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error);
    next(new AppError('Unauthorized: Invalid Firebase ID token', 401));
  }
}
