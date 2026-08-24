import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../errors/AppError.js';

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Forbidden: Access denied', 403));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Forbidden: Requires one of [${allowedRoles.join(', ')}] roles`, 403));
    }

    next();
  };
}
