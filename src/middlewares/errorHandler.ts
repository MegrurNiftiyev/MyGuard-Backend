import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Error Handler]:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      isOperational: err.isOperational,
    });
  }

  res.status(500).json({
    error: 'Daxili server xətası (Internal Server Error)',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
