export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  blocks?: any[];
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
