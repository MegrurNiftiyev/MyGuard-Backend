import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  forgotPassword,
  resendOtp,
  checkOtp,
  changePassword,
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
 * Logout
 */
export async function logout(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !req.user.uid) {
    throw new AppError('Avtorizasiya olunmayıb', 401);
  }
  res.json({ success: true, message: 'Uğurla çıxış edildi.' });
}

/**
 * POST /api/auth/forgot-password -> sends 6-digit OTP
 */
export async function forgotPasswordController(req: Request, res: Response) {
  const result = await forgotPassword(req.body);
  res.json(result);
}

/**
 * POST /api/auth/resend-otp -> invalidates old OTP, sends fresh OTP
 */
export async function resendOtpController(req: Request, res: Response) {
  const result = await resendOtp(req.body);
  res.json(result);
}

/**
 * POST /api/auth/check-otp -> verifies OTP, returns resetToken (NOT a login session)
 */
export async function checkOtpController(req: Request, res: Response) {
  const result = await checkOtp(req.body);
  res.json(result);
}

/**
 * POST /api/auth/change-password -> sets new password using resetToken (NOT a login session)
 */
export async function changePasswordController(req: Request, res: Response) {
  const result = await changePassword(req.body);
  res.json(result);
}


