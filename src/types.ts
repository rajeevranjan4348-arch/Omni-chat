export type AppMode = 
  | 'gpt-astra'
  | 'chat-pro'
  | 'chat-fast'
  | 'voice-live'
  | 'search-maps'
  | 'transcription'
  | 'tts'
  | 'jarvis'
  | 'coder'
  | 'settings'
  | 'logs';

export type MemoryCategory = 'preference' | 'topic' | 'fact' | 'goal';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  timestamp: Date;
  source?: 'user' | 'assistant' | 'auto';
}

export interface ExampleInteraction {
  id: string;
  title: string;
  scenario: string;
  userPrompt: string;
  assistantResponse: string;
  traitsDemonstrated: string[];
}

export interface PersonaConfig {
  id: string;
  name: string;
  title: string;
  avatar: string;
  category: 'friendly-casual' | 'formal-informative' | 'witty-sarcastic' | 'mentor' | 'custom';
  backstory: string;
  toneOfVoice: string;
  styleGuidelines: string[];
  characteristics: string[];
  sampleGreeting?: string;
  exampleInteractions: ExampleInteraction[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: 'documentation' | 'faq' | 'guide' | 'policy' | 'custom';
  tags: string[];
  updatedAt: Date;
  isActive: boolean;
  charCount: number;
}

export interface KnowledgeUrl {
  id: string;
  url: string;
  title: string;
  summary?: string;
  content?: string;
  isActive: boolean;
  addedAt: Date;
}

export interface RetrievedSource {
  title: string;
  source: string;
  snippet?: string;
  type: 'doc' | 'url';
  score?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  groundingChunks?: any[];
  timestamp?: Date;
  status?: 'sent' | 'delivered' | 'read';
  recalledMemories?: string[];
  retrievedSources?: RetrievedSource[];
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Message[];
  memories?: MemoryItem[];
}

