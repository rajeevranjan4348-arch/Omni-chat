export type AppMode = 
  | 'chat-pro'
  | 'chat-fast'
  | 'voice-live'
  | 'search-maps'
  | 'transcription'
  | 'tts'
  | 'jarvis'
  | 'coder'
  | 'document-chat'
  | 'settings'
  | 'logs';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  groundingChunks?: any[];
  timestamp?: Date;
  status?: 'sent' | 'delivered' | 'read';
}
