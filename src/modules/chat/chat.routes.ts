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
 *     responses:
 *       200:
 *         description: Array of historical chat messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   example: "session-1724500000"
 *                 title:
 *                   type: string
 *                   example: "Yeni Təhlükəsizlik Sessiyası"
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
 *             $ref: '#/components/schemas/SendChatMessageRequest'
 *     responses:
 *       200:
 *         description: AI response returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatMessage'
 */
router.post('/message', catchAsync(sendMessage));

export default router;


