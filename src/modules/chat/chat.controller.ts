import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  createOrGetChatSession,
  getChatHistory,
  logSmallChatMessage,
  callLlmSmall,
  callLlmLarge,
  appendToHistory,
} from './chat.service.js';
import { getSystemPromptFor } from './prompts.js';
import { SendChatMessageRequest, ChatMode, SmallChatMessage, LargeChatMessage } from '../../types/index.js';
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
  const { chatMode, screenDestination, message, sessionId } = req.body as SendChatMessageRequest;

  if (!message) {
    throw new AppError('message parametri məcburidir', 400);
  }

  const mode = chatMode || 'LARGE_CHAT';
  const dest = screenDestination || 'AI_SCREEN';

  const systemPrompt = getSystemPromptFor(screenDestination);

  if (chatMode === ChatMode.SMALL_CHAT) {
    const reply = await callLlmSmall(systemPrompt, message);
    await logSmallChatMessage({ screenDestination, message, reply }); // fire-and-forget
    const response: SmallChatMessage = { chatMode, text: reply };
    return res.json(response);
  }

  // LARGE_CHAT
  if (!sessionId) {
    throw new AppError('LARGE_CHAT üçün sessionId məcburidir', 400);
  }

  const history = await getChatHistory(sessionId, 10);
  const blocks = await callLlmLarge(systemPrompt, history, message);
  const reply: LargeChatMessage = await appendToHistory(sessionId, message, blocks);
  
  return res.json(reply);
}
