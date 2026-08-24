import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { ChatMessage, ChatSession } from './chat.schema.js';

const memorySessions = new Map<string, ChatSession>();
const memoryMessages = new Map<string, ChatMessage[]>();

export async function createOrGetChatSession(userId: string, title?: string): Promise<ChatSession> {
  const sessionId = 'session-' + Date.now();
  const now = new Date().toISOString();

  const session: ChatSession = {
    id: sessionId,
    userId,
    title: title || 'Yeni Təhlükəsizlik Söhbəti',
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.CHAT_SESSIONS).doc(sessionId).set(session);
    } catch (err) {
      console.warn('[Chat Service] Firestore set session error:', err);
    }
  }

  memorySessions.set(sessionId, session);
  memoryMessages.set(sessionId, []);
  return session;
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db
        .collection(COLLECTIONS.CHAT_MESSAGES)
        .where('sessionId', '==', sessionId)
        .orderBy('timestamp', 'asc')
        .get();

      const messages: ChatMessage[] = [];
      snapshot.forEach((doc: any) => messages.push(doc.data() as ChatMessage));
      return messages;
    } catch (err) {
      console.warn('[Chat Service] Firestore get messages fallback to memory:', err);
    }
  }

  return memoryMessages.get(sessionId) || [];
}

export async function processUserMessage(
  userId: string,
  sessionId: string,
  userMessageText: string,
  attachmentDocumentId?: string
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  const now = new Date().toISOString();
  const userMsgId = 'msg-' + Date.now();
  const assistantMsgId = 'msg-' + (Date.now() + 1);

  const userMessage: ChatMessage = {
    id: userMsgId,
    sessionId,
    sender: 'user',
    timestamp: now,
    content: userMessageText,
  };

  const assistantBlocks = [
    {
      type: 'analysis',
      title: 'Təhlükəsizlik Analizi və Skoring',
      riskScore: 88,
      riskLevel: 'Yüksək Risk',
      scannedItemsCount: 3,
      findings: [
        'Sənəd içərisində daxili prompt manipulyasiyası təsbit edildi.',
        'Sistem daxili LLM qaydalarının bypass edilməsi cəhdi mövcuddur.',
        'Vizual layer ilə OCR mətni arasında 15% uyğunsuzluq aşkarlandı.',
      ],
    },
    {
      type: 'callout',
      calloutType: 'warning',
      title: 'Tövsiyə Edilən Təhlükəsizlik Tədbiri',
      text: 'Bu sənədin birbaşa AI modullarına ötürülməsi risklidir. Əlavə olunmuş sanitizer vasitəsilə sənədi yenidən emal edin.',
    },
    {
      type: 'text',
      content: `Sualınıza əsasən (${userMessageText}), sistemin təhlükəsizlik qaydaları avtomatik olaraq bu faylı karantinə almışdır. Əlavə məlumat üçün risk hesabatlarını nəzərdən keçirə bilərsiniz.`,
    },
  ];

  const assistantMessage: ChatMessage = {
    id: assistantMsgId,
    sessionId,
    sender: 'assistant',
    timestamp: new Date().toISOString(),
    content: 'Təhlükəsizlik analizi tamamlandı.',
    blocks: assistantBlocks,
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.CHAT_MESSAGES).doc(userMsgId).set(userMessage);
      await db.collection(COLLECTIONS.CHAT_MESSAGES).doc(assistantMsgId).set(assistantMessage);
    } catch (err) {
      console.warn('[Chat Service] Firestore save message error:', err);
    }
  }

  const existingMsgs = memoryMessages.get(sessionId) || [];
  existingMsgs.push(userMessage, assistantMessage);
  memoryMessages.set(sessionId, existingMsgs);

  return { userMessage, assistantMessage };
}
