import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import {
  createSession,
  getHistory,
  sendMessage,
} from './chat.controller.js';

const router = Router();

/**
 * @openapi
 * /api/chat/history/{sessionId}:
 *   get:
 *     summary: Get chat message history for a session
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat Session ID
 */
router.get('/history/:sessionId', catchAsync(getHistory));

/**
 * @openapi
 * /api/chat/session:
 *   post:
 *     summary: Create a new AI Assistant chat session
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Yeni Təhlükəsizlik Sessiyası"
 *     responses:
 *       200:
 *         description: Chat session created successfully
 */
router.post('/session', catchAsync(createSession));

/**
 * @openapi
 * /api/chat/message:
 *   post:
 *     summary: Send message to AI Assistant and receive structured response blocks
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               chatMode:
 *                 type: string
 *                 enum: [SMALL_CHAT, LARGE_CHAT]
 *                 example: "LARGE_CHAT"
 *               screenDestination:
 *                 type: string
 *                 enum: [HOME_SCREEN, DOCUMENTS_SCREEN, SCAN_SCREEN, SETTINGS_SCREEN, AI_SCREEN]
 *                 example: "DOCUMENTS_SCREEN"
 *               message:
 *                 type: string
 *                 example: "Salam, sənədlərdə olan prompt injection təhdidləri haqqında məlumat ver."
 *               sessionId:
 *                 type: string
 *                 example: "session-1724500000"
 *     responses:
 *       200:
 *         description: AI response returned successfully
 */
router.post('/message', catchAsync(sendMessage));

export default router;
