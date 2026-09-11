import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import {
  register,
  login,
  refresh,
  logout,
  forgotPasswordController,
  resendOtpController,
  checkOtpController,
  changePasswordController,
} from './auth.controller.js';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user with FİN Code, email, phone, and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/register', catchAsync(register));

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user using FİN Code (primary) or Email and Password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/login', catchAsync(login));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh expired access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 */
router.post('/refresh', catchAsync(refresh));

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', requireAuth, catchAsync(logout));

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send 6-digit OTP code to user's email via FİN code or email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: OTP code sent generic response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Əgər bu hesab mövcuddursa, OTP kodu göndərildi.
 */
router.post('/forgot-password', catchAsync(forgotPasswordController));

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Invalidate prior OTP and resend a fresh 6-digit OTP code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOtpRequest'
 *     responses:
 *       200:
 *         description: Fresh OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Yeni OTP kodu göndərildi.
 */
router.post('/resend-otp', catchAsync(resendOtpController));

/**
 * @openapi
 * /api/auth/check-otp:
 *   post:
 *     summary: Verify 6-digit OTP code and return 10-minute reset token (NOT a login session)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckOtpRequest'
 *     responses:
 *       200:
 *         description: OTP verified, single-use reset token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 resetToken:
 *                   type: string
 *                   example: 9f8e7d6c5b4a...
 */
router.post('/check-otp', catchAsync(checkOtpController));

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Set new password using resetToken (NOT a login session)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Şifrə uğurla yeniləndi. Zəhmət olmasa yenidən daxil olun.
 */
router.post('/change-password', catchAsync(changePasswordController));

export default router;



