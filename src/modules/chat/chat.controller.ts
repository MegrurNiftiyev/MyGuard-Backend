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
  const { 
    chatMode, 
    screenDestination, 
    message, 
    sessionId,
    documentId,
    contextDocumentId,
    attachedDocument
  } = req.body as SendChatMessageRequest;

  if (!message && !attachedDocument?.text) {
    throw new AppError('message və ya attachedDocument məcburidir', 400);
  }

  const mode = chatMode || 'LARGE_CHAT';
  const dest = screenDestination || 'AI_SCREEN';

  const systemPrompt = getSystemPromptFor(dest, mode);

  if (mode === ChatMode.SMALL_CHAT) {
    const reply = await callLlmSmall(systemPrompt, message || '');
    await logSmallChatMessage({ screenDestination: dest, message: message || '', reply }); // fire-and-forget
    const response: SmallChatMessage = { chatMode: mode, text: reply };
    return res.json(response);
  }

  // LARGE_CHAT
  if (!sessionId) {
    throw new AppError('LARGE_CHAT üçün sessionId məcburidir', 400);
  }

  const docId = documentId || contextDocumentId;
  const history = await getChatHistory(sessionId, 10);
  const userId = req.user?.uid || 'dev-user-123';
  const blocks = await callLlmLarge(systemPrompt, history, message || '', dest, userId, docId, attachedDocument);
  const reply: LargeChatMessage = await appendToHistory(sessionId, message || (attachedDocument?.fileName ? `[Fayl əlavə edildi: ${attachedDocument.fileName}]` : ''), blocks);
  
  return res.json(reply);
}
