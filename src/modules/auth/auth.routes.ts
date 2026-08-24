import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import {
  register,
  login,
  refresh,
  loginMyGov,
  loginSima,
  getProfile,
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
 * /api/auth/oauth/mygov:
 *   post:
 *     summary: myGov QR / SSO Login
 *     tags: [Authentication]
 */
router.post('/oauth/mygov', catchAsync(loginMyGov));

/**
 * @openapi
 * /api/auth/oauth/sima:
 *   post:
 *     summary: SİMA QR / SSO Login
 *     tags: [Authentication]
 */
router.post('/oauth/sima', catchAsync(loginSima));

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.get('/profile', requireAuth, catchAsync(getProfile));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile (alias)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.get('/me', requireAuth, catchAsync(getProfile));

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.post('/logout', requireAuth, catchAsync(logout));

export default router;
