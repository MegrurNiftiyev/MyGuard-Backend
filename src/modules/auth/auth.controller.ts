import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  loginWithOAuth,
} from './auth.service.js';
import { AppError } from '../../errors/AppError.js';

/**
 * Register user
 */
export async function register(req: Request, res: Response) {
  const { fullName, finCode, email, phone, password, department } = req.body;

  if (!fullName || !finCode || !email || !phone || !password) {
    throw new AppError('Bütün sahələri doldurun: Ad Soyad, FİN Kod, E-poçt, Telefon, Şifrə.', 400);
  }

  const result = await registerUser({
    fullName,
    finCode,
    email,
    phone,
    password,
    department,
  });

  res.status(201).json(result);
}

/**
 * Login user via FİN code (or email) and password
 */
export async function login(req: Request, res: Response) {
  const { finCode, email, password, rememberMe } = req.body;

  if ((!finCode && !email) || !password) {
    throw new AppError('FİN kod (və ya e-poçt) və şifrə daxil edilməlidir.', 400);
  }

  const result = await loginUser({
    finCode,
    email,
    password,
    rememberMe,
  });

  res.json(result);
}

/**
 * Refresh access token
 */
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const result = await refreshAccessToken(refreshToken);
  res.json({ success: true, ...result });
}

/**
 * myGov QR / SSO login
 */
export async function loginMyGov(req: Request, res: Response) {
  const { finCode, qrSessionId, fullName, email, phone } = req.body;
  const result = await loginWithOAuth({
    provider: 'mygov',
    finCode: finCode || '7MYG001',
    qrSessionId,
    fullName: fullName || 'myGov Doğrulanmış İstifadəçi',
    email,
    phone,
  });
  res.json(result);
}

/**
 * SİMA QR / SSO login
 */
export async function loginSima(req: Request, res: Response) {
  const { finCode, qrSessionId, fullName, email, phone } = req.body;
  const result = await loginWithOAuth({
    provider: 'sima',
    finCode: finCode || '7SIM001',
    qrSessionId,
    fullName: fullName || 'SİMA Doğrulanmış İstifadəçi',
    email,
    phone,
  });
  res.json(result);
}



/**
 * Logout
 */
export async function logout(req: AuthenticatedRequest, res: Response) {
  res.json({ success: true, message: 'Uğurla çıxış edildi.' });
}
