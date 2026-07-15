export type AppMode = 
  | 'dashboard'
  | 'chat-pro'
  | 'chat-fast'
  | 'voice-live'
  | 'search-maps'
  | 'transcription'
  | 'tts'
  | 'jarvis'
  | 'coder'
  | 'omni-chat'
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
