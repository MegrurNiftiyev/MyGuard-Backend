import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import {
  register,
  login,
  refresh,
  loginMyGov,
  loginSima,
  logout,
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
 *             type: object
 *             required: [fullName, finCode, email, phone, password]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Samir Əliyev"
 *               finCode:
 *                 type: string
 *                 example: "7AB1234"
 *               email:
 *                 type: string
 *                 example: "e.mammadov@soc.gov.az"
 *               phone:
 *                 type: string
 *                 example: "+994 50 123 45 67"
 *               password:
 *                 type: string
 *                 example: "Secret123!"
 *               department:
 *                 type: string
 *                 example: "Təhlükəsizlik və İnformasiya İdarəsi"
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
 *             type: object
 *             required: [password]
 *             properties:
 *               finCode:
 *                 type: string
 *                 example: "7AB1234"
 *               email:
 *                 type: string
 *                 example: "e.mammadov@soc.gov.az"
 *               password:
 *                 type: string
 *                 example: "Admin123!"
 *               rememberMe:
 *                 type: boolean
 *                 example: true
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
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 */
router.post('/refresh', catchAsync(refresh));

/**
 * @openapi
 * /api/auth/mygov:
 *   post:
 *     summary: myGov QR / SSO Login
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               finCode:
 *                 type: string
 *                 example: "7MYG001"
 *               qrSessionId:
 *                 type: string
 *                 example: "mygov-qr-session-987"
 *               fullName:
 *                 type: string
 *                 example: "myGov Doğrulanmış İstifadəçi"
 *               email:
 *                 type: string
 *                 example: "user@mygov.az"
 *               phone:
 *                 type: string
 *                 example: "+994 50 111 22 33"
 */
router.post('/mygov', catchAsync(loginMyGov));

/**
 * @openapi
 * /api/auth/sima:
 *   post:
 *     summary: SİMA QR / SSO Login
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               finCode:
 *                 type: string
 *                 example: "7SIM001"
 *               qrSessionId:
 *                 type: string
 *                 example: "sima-qr-session-456"
 *               fullName:
 *                 type: string
 *                 example: "SİMA Doğrulanmış İstifadəçi"
 *               email:
 *                 type: string
 *                 example: "user@sima.az"
 *               phone:
 *                 type: string
 *                 example: "+994 55 222 33 44"
 */
router.post('/sima', catchAsync(loginSima));



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

export default router;
