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
 * /api/chat/session:
 *   post:
 *     summary: Create a new AI Assistant chat session
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 */
router.post('/session', catchAsync(createSession));

/**
 * @openapi
 * /api/chat/history/{sessionId}:
 *   get:
 *     summary: Get chat message history for a session
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 */
router.get('/history/:sessionId', catchAsync(getHistory));

/**
 * @openapi
 * /api/chat/message:
 *   post:
 *     summary: Send message to AI Assistant and receive structured response blocks
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 */
router.post('/message', catchAsync(sendMessage));

export default router;
