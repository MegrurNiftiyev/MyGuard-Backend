import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  createOrGetChatSession,
  getChatHistory,
  processUserMessage,
} from './chat.service.js';
import { AppError } from '../../errors/AppError.js';

export async function createSession(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.uid || 'dev-user-123';
  const { title } = req.body;
  const session = await createOrGetChatSession(userId, title);
  res.json({ success: true, session });
}

export async function getHistory(req: AuthenticatedRequest, res: Response) {
  const sessionId = String(req.params.sessionId);
  const messages = await getChatHistory(sessionId);
  res.json({ sessionId, messages });
}

export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.uid || 'dev-user-123';
  const { sessionId, message, attachmentDocumentId } = req.body;

  if (!sessionId || !message) {
    throw new AppError('sessionId və message məcburidir', 400);
  }

  const result = await processUserMessage(
    userId,
    sessionId,
    message,
    attachmentDocumentId
  );

  res.json({
    success: true,
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
  });
}
