import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth, isFirebaseInitialized } from '../config/firebase.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

const JWT_SECRET = process.env.JWT_SECRET || 'myguard-super-secret-jwt-key-2026';

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // [NOTE]: Real mühitdə (Production) bu blok kommentdə qalmalıdır!
    // Əgər lokal test üçün token tələbini müvəqqəti söndürmək istəyirsinizsə, aşağıdakı bloku aça bilərsiniz.
    /*
    if (env.NODE_ENV === 'development' || !isFirebaseInitialized) {
      req.user = {
        uid: 'usr-admin-001',
        email: 'e.mammadov@soc.gov.az',
        role: 'admin',
      };
      return next();
    }
    */

    return next(new AppError('Avtorizasiya tələb olunur (Missing Bearer Token)', 401));
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // 1. Try verifying JWT Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.uid) {
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role || 'user',
      };
      return next();
    }
  } catch (jwtErr) {
    // Continue to Firebase verification
  }

  // 2. Try verifying Firebase ID Token
  try {
    if (isFirebaseInitialized && auth) {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: (decodedToken.role as string) || 'user',
      };
      return next();
    }
  } catch (firebaseErr) {
    console.error('[Auth Middleware] Token verification failed:', firebaseErr);
  }

  // [NOTE]: Real mühitdə (Production) bu blok kommentdə qalmalıdır!
  // Əgər tokenin səhv olmasına baxmayaraq test məqsədilə bypass etmək istəyirsinizsə, aça bilərsiniz.
  /*
  if (env.NODE_ENV === 'development' || !isFirebaseInitialized) {
    req.user = {
      uid: 'usr-admin-001',
      email: 'e.mammadov@soc.gov.az',
      role: 'admin',
    };
    return next();
  }
  */

  // 3. Əgər token tapılmazsa və ya keçərsizdirsə, xəta qaytar.
  next(new AppError('Etibarsız və ya vaxtı bitmiş token', 401));
}
