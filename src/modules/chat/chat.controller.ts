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
    userMessage,
    sessionId,
    documentId,
    contextDocumentId,
    attachedDocument,
    files
  } = req.body as SendChatMessageRequest;

  const actualMessage = message || userMessage || '';

  const fileList: typeof attachedDocument[] = [];
  if (Array.isArray(files) && files.length > 0) {
    fileList.push(...files);
  } else if (attachedDocument) {
    fileList.push(attachedDocument);
  }

  if (!actualMessage && fileList.length === 0) {
    throw new AppError('message (və ya userMessage) və ya files məcburidir', 400);
  }

  const mode = chatMode || 'LARGE_CHAT';
  const dest = screenDestination || 'AI_SCREEN';

  const systemPrompt = getSystemPromptFor(dest, mode);

  if (mode === ChatMode.SMALL_CHAT) {
    const reply = await callLlmSmall(systemPrompt, actualMessage);
    await logSmallChatMessage({ screenDestination: dest, message: actualMessage, reply }); // fire-and-forget
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
  const blocks = await callLlmLarge(systemPrompt, history, actualMessage, dest, userId, docId, attachedDocument, fileList);
  
  let historyMessageText = actualMessage;
  if (fileList.length > 0) {
    const fileNames = fileList.map(f => f.name || f.fileName || 'Fayl').join(', ');
    historyMessageText = actualMessage ? `[Fayl(lar): ${fileNames}] ${actualMessage}` : `[Fayl(lar) əlavə edildi: ${fileNames}]`;
  }

  const reply: LargeChatMessage = await appendToHistory(sessionId, historyMessageText, blocks);
  
  return res.json(reply);
}
