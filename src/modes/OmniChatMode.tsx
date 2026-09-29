import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAiInstance, transcribeAudio } from '../services/gemini';
import { useSettings } from '../contexts/SettingsContext';
import {
  Send, Mic, Square, Loader2, Bot, User, Trash2, RotateCcw,
  Copy, Check, Sparkles, Plus, History, X, MessageSquare,
  Clock, ChevronRight, Search, BookOpen, Brain, UserCircle, ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RetrievedSource, MemoryItem, PersonaConfig } from '../types';
import { PersonaModal } from '../components/PersonaModal';
import { KnowledgeBaseModal } from '../components/KnowledgeBaseModal';
import { MemoryPanel } from '../components/MemoryPanel';
import { buildSystemInstructionForPersona } from '../data/personas';
import { KnowledgeBaseService } from '../services/knowledgeBaseService';
import { extractLocalMemories, extractMemoriesWithGemini, recallRelevantMemories } from '../services/memoryService';
import { showToast } from '../utils/toast';

/* ─── Types ─────────────────────────────────────────── */
interface Msg {
  id: string;
  role: 'user' | 'model';
  text: string;
  streaming?: boolean;
  recalledMemories?: string[];
  retrievedSources?: RetrievedSource[];
}

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
  memories?: MemoryItem[];
}

const STORAGE_KEY = 'omnichat_conversations_v2';

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: any) => ({
      ...c,
      memories: Array.isArray(c.memories) ? c.memories.map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      })) : []
    }));
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch (err) {
    console.error('Failed to save conversations:', err);
  }
}

function makeTitle(messages: Msg[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  return first.text.slice(0, 50) + (first.text.length > 50 ? '…' : '');
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

/* ─── Keyframe animations ─────────────────────────────── */
const STYLES = `
  @keyframes omni-float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-22px) scale(1.04); }
  }
  @keyframes omni-float2 {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(18px) scale(0.96); }
  }
  @keyframes omni-float3 {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    33%       { transform: translateY(-14px) translateX(10px); }
    66%       { transform: translateY(10px) translateX(-8px); }
  }
  @keyframes omni-pulse-ring {
    0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
    70%  { transform: scale(1);    box-shadow: 0 0 0 14px rgba(139,92,246,0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139,92,246,0); }
  }
  @keyframes omni-spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes omni-msg-in {
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes omni-fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes omni-glow {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }
  @keyframes omni-typing-dot {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40%           { transform: scale(1);   opacity: 1; }
  }
  @keyframes omni-border-glow {
    0%, 100% { border-color: rgba(139,92,246,0.25); box-shadow: 0 0 0 0 rgba(139,92,246,0); }
    50%       { border-color: rgba(139,92,246,0.6);  box-shadow: 0 0 18px rgba(139,92,246,0.15); }
  }
  @keyframes omni-card-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes omni-panel-in {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .omni-msg-in    { animation: omni-msg-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
  .omni-fade-up   { animation: omni-fade-up 0.5s ease both; }
  .omni-card-0    { animation: omni-card-in 0.4s 0.1s ease both; }
  .omni-card-1    { animation: omni-card-in 0.4s 0.2s ease both; }
  .omni-card-2    { animation: omni-card-in 0.4s 0.3s ease both; }
  .omni-card-3    { animation: omni-card-in 0.4s 0.4s ease both; }
  .omni-panel-in  { animation: omni-panel-in 0.25s ease both; }

  .history-item { transition: background 0.15s ease, border-color 0.15s ease; }
  .history-item:hover { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.25); }
  .history-item.active { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.4); }

  .omni-scrollbar::-webkit-scrollbar { width: 4px; }
  .omni-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .omni-scrollbar::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }
`;

/* ─── Animated background orbs ──────────────────────── */
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div style={{ position:'absolute',top:'-10%',left:'-5%',width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',animation:'omni-float 9s ease-in-out infinite',filter:'blur(40px)' }} />
      <div style={{ position:'absolute',bottom:'5%',right:'-8%',width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)',animation:'omni-float2 11s ease-in-out infinite',filter:'blur(50px)' }} />
      <div style={{ position:'absolute',top:'40%',right:'20%',width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',animation:'omni-float3 13s ease-in-out infinite',filter:'blur(35px)' }} />
    </div>
  );
}

/* ─── Omni avatar ────────────────────────────────────── */
function OmniAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 72 : size === 'sm' ? 28 : 36;
  const iconSize = size === 'lg' ? 32 : size === 'sm' ? 13 : 16;
  return (
    <div style={{ width:dim,height:dim,borderRadius:'50%',position:'relative',flexShrink:0,animation: size==='lg'?'omni-pulse-ring 2.5s ease-out infinite':undefined }}>
      {size==='lg' && (
        <div style={{ position:'absolute',inset:-4,borderRadius:'50%',background:'conic-gradient(from 0deg, rgba(139,92,246,0.8), rgba(99,102,241,0.4), rgba(168,85,247,0.8), rgba(139,92,246,0.8))',animation:'omni-spin-slow 4s linear infinite',padding:2 }}>
          <div style={{ width:'100%',height:'100%',borderRadius:'50%',background:'#0e1117' }} />
        </div>
      )}
      <div style={{ position:'absolute',inset:0,borderRadius:'50%',background:'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #a855f7 100%)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow: size==='lg'?'0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)':'0 0 10px rgba(139,92,246,0.4)' }}>
        <Bot size={iconSize} color="white" />
      </div>
    </div>
  );
}

/* ─── Copy button ────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
      className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded text-white/25 hover:text-white/60" title="Copy">
      {copied ? <Check size={13}/> : <Copy size={13}/>}
    </button>
  );
}

/* ─── History Panel ──────────────────────────────────── */
function HistoryPanel({
  conversations, currentId, onSelect, onDelete, onClose, searchQuery, onSearch
}: {
  conversations: Conversation[];
  currentId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}) {
  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const grouped: { label: string; items: Conversation[] }[] = [];
  const now = Date.now();
  const today: Conversation[] = [];
  const week: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of filtered) {
    const age = now - c.updatedAt;
    if (age < 86400000) today.push(c);
    else if (age < 7 * 86400000) week.push(c);
    else older.push(c);
  }

  if (today.length) grouped.push({ label: 'Today', items: today });
  if (week.length)  grouped.push({ label: 'Previous 7 Days', items: week });
  if (older.length) grouped.push({ label: 'Older', items: older });

  return (
    <div className="omni-panel-in absolute top-0 left-0 bottom-0 w-80 z-30 flex flex-col"
      style={{ background:'rgba(14,17,28,0.96)',borderRight:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(24px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <History size={16} className="text-violet-400"/>
          <span className="text-sm font-semibold tracking-wide">Conversations</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
          <X size={15}/>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.06)' }}>
          <Search size={13} className="text-white/30 shrink-0"/>
          <input
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search chats…"
            className="bg-transparent outline-none w-full text-white/80 placeholder:text-white/25"
          />
          {searchQuery && (
            <button onClick={() => onSearch('')} className="text-white/30 hover:text-white/60">
              <X size={12}/>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 omni-scrollbar space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageSquare size={24} className="text-white/15 mx-auto mb-2"/>
            <p className="text-xs text-white/30">{searchQuery ? 'No chats matched your search' : 'No saved conversations yet'}</p>
          </div>
        ) : (
          grouped.map(grp => (
            <div key={grp.label}>
              <p className="text-[10px] font-semibold tracking-wider uppercase px-2 mb-1 text-white/25">
                {grp.label}
              </p>
              {grp.items.map(c => (
                <div
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`history-item group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer mb-0.5 border ${
                    c.id === currentId
                      ? 'active text-violet-300'
                      : 'border-transparent text-white/65 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare size={13} className="shrink-0 opacity-50"/>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate font-medium leading-tight">{c.title}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{timeAgo(c.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(c.id); }}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 size={11}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[10px] text-white/20 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} saved locally
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */
const SUGGESTIONS = [
  { emoji: '✨', text: 'What can you help me with?' },
  { emoji: '🌊', text: 'Write a short poem about the ocean.' },
  { emoji: '⚛️', text: 'Explain quantum computing simply.' },
  { emoji: '🚀', text: 'Give me a productivity tip.' },
];

export const OmniChatMode: React.FC = () => {
  const { userProfile, memory, activePersona, setActivePersona } = useSettings();

  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [currentId, setCurrentId] = useState<string>(() => {
    const convs = loadConversations();
    if (convs.length > 0) return convs[0].id;
    return `conv-${Date.now()}`;
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Modals for Persona, Knowledge Base, and Memory
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isKnowledgeBaseModalOpen, setIsKnowledgeBaseModalOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentConv = conversations.find(c => c.id === currentId);
  const messages = currentConv?.messages ?? [];
  const currentMemories = currentConv?.memories ?? [];

  /* ── Persist conversations ───────────────────────── */
  const upsertConversation = useCallback((id: string, msgs: Msg[], mems?: MemoryItem[]) => {
    const cleanMsgs = msgs.filter(m => !m.streaming);
    setConversations(prev => {
      const exists = prev.find(c => c.id === id);
      let updated: Conversation[];
      if (exists) {
        updated = prev.map(c => c.id === id
          ? {
              ...c,
              messages: cleanMsgs,
              title: makeTitle(cleanMsgs) || c.title,
              updatedAt: Date.now(),
              memories: mems !== undefined ? mems : c.memories
            }
          : c);
      } else {
        const newConv: Conversation = {
          id,
          title: makeTitle(cleanMsgs) || 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: cleanMsgs,
          memories: mems || []
        };
        updated = [newConv, ...prev];
      }
      saveConversations(updated);
      return updated;
    });
  }, []);

  /* ── Scroll to bottom on new messages ───────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── New chat ────────────────────────────────────── */
  const startNewChat = useCallback(() => {
    const id = `conv-${Date.now()}`;
    setCurrentId(id);
    setShowHistory(false);
    setInput('');
  }, []);

  /* ── Load existing conversation ──────────────────── */
  const loadConversation = useCallback((id: string) => {
    setCurrentId(id);
    setShowHistory(false);
  }, []);

  /* ── Delete conversation ─────────────────────────── */
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveConversations(updated);
      return updated;
    });
    if (id === currentId) startNewChat();
  }, [currentId, startNewChat]);

  /* ── Auto-resize textarea ─────────────────────────── */
  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  /* ── Send message ─────────────────────────────────── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 1. Knowledge Base Retrieval
    const kbResults = KnowledgeBaseService.search(text, 4);
    const kbGroundingContext = kbResults.length > 0 
      ? KnowledgeBaseService.buildGroundingContext(text, kbResults) 
      : '';

    // 2. Memory Extraction & Recall
    const localNewMemories = extractLocalMemories(text);
    const updatedMemoriesList = [...currentMemories];
    if (localNewMemories.length > 0) {
      localNewMemories.forEach(nm => {
        if (!updatedMemoriesList.some(em => em.content.toLowerCase() === nm.content.toLowerCase())) {
          updatedMemoriesList.push(nm);
        }
      });
    }

    const recalledFacts = recallRelevantMemories(text, updatedMemoriesList);

    // 3. User Message & Model Streaming Placeholder
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    const modelId = `m-${Date.now() + 1}`;
    const streamMsg: Msg = {
      id: modelId,
      role: 'model',
      text: '',
      streaming: true,
      recalledMemories: recalledFacts.length > 0 ? recalledFacts : (updatedMemoriesList.length > 0 ? updatedMemoriesList.slice(0, 3).map(m => m.content) : undefined),
      retrievedSources: kbResults.length > 0 ? kbResults : undefined
    };
    const updatedMsgs = [...messages, userMsg, streamMsg];

    setConversations(prev => {
      const exists = prev.find(c => c.id === currentId);
      let updated: Conversation[];
      if (exists) {
        updated = prev.map(c => c.id === currentId
          ? {
              ...c,
              messages: updatedMsgs,
              title: makeTitle(updatedMsgs) || c.title,
              updatedAt: Date.now(),
              memories: updatedMemoriesList
            }
          : c);
      } else {
        updated = [{
          id: currentId,
          title: makeTitle([userMsg]),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: updatedMsgs,
          memories: updatedMemoriesList
        }, ...prev];
      }
      saveConversations(updated);
      return updated;
    });

    setIsLoading(true);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Parallel deep extraction
    extractMemoriesWithGemini(text, updatedMemoriesList).then(extracted => {
      if (extracted && extracted.length > 0) {
        setConversations(prev => prev.map(c => {
          if (c.id === currentId) {
            const existing = c.memories || [];
            const toAdd = extracted.filter(nm => !existing.some(em => em.content.toLowerCase() === nm.content.toLowerCase()));
            if (toAdd.length > 0) {
              const updated = [...existing, ...toAdd];
              saveConversations(prev.map(item => item.id === currentId ? { ...item, memories: updated } : item));
              return { ...c, memories: updated };
            }
          }
          return c;
        }));
      }
    }).catch(err => console.warn('Memory extraction error:', err));

    try {
      const ai = getAiInstance();
      const sysInstruction = buildSystemInstructionForPersona(activePersona, {
        userName: userProfile.name,
        userPreferences: userProfile.preferences,
        conversationMemories: updatedMemoriesList,
        longTermMemories: memory,
        knowledgeBaseContext: kbGroundingContext
      });

      const history = messages.filter(m => !m.streaming && m.text).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3.8-flash',
        config: { systemInstruction: { parts: [{ text: sysInstruction }] } },
        history: history.length ? history : undefined,
      });

      let promptToSend = text;
      if (kbGroundingContext) {
        promptToSend = `${kbGroundingContext}\n\nUser Question:\n${text}`;
      }

      const stream = await chat.sendMessageStream({ message: promptToSend });
      let full = '';
      for await (const chunk of stream) {
        if (chunk.text) full += chunk.text;
        setConversations(prev => {
          const updated = prev.map(c => c.id === currentId
            ? { ...c, messages: c.messages.map(m => m.id === modelId ? { ...m, text: full } : m) }
            : c);
          return updated;
        });
      }

      setConversations(prev => {
        const updated = prev.map(c => c.id === currentId
          ? {
              ...c,
              messages: c.messages.map(m => m.id === modelId ? { ...m, streaming: false, text: full || 'I am here and ready to help!' } : m),
              updatedAt: Date.now()
            }
          : c);
        saveConversations(updated);
        return updated;
      });
    } catch (err: any) {
      console.error('OmniChat error:', err);
      const errorMsg = err?.message || 'Failed to generate response.';
      setConversations(prev => {
        const updated = prev.map(c => c.id === currentId
          ? {
              ...c,
              messages: c.messages.map(m => m.id === modelId ? {
                ...m,
                text: `**Notice:** ${errorMsg}\n\nIf your API key is missing or invalid, check your environment settings.`,
                streaming: false
              } : m)
            }
          : c);
        saveConversations(updated);
        return updated;
      });
      showToast('Error connecting to Gemini. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Clear current chat ──────────────────────────── */
  const clearChat = () => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === currentId ? { ...c, messages: [], updatedAt: Date.now() } : c);
      saveConversations(updated);
      return updated;
    });
    showToast('Conversation cleared', 'info');
  };

  /* ── Retry last message ───────────────────────────── */
  const retryLast = () => {
    const userMsgs = messages.filter(m => m.role === 'user');
    const last = userMsgs[userMsgs.length - 1];
    if (!last) return;
    const lastUserIdx = messages.lastIndexOf(last);
    const trimmed = messages.slice(0, lastUserIdx);
    setConversations(prev => {
      const updated = prev.map(c => c.id === currentId ? { ...c, messages: trimmed } : c);
      saveConversations(updated);
      return updated;
    });
    setTimeout(() => sendMessage(last.text), 50);
  };

  /* ── Voice recording ─────────────────────────────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setIsTranscribing(true);
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(',')[1];
          try {
            const res = await transcribeAudio(b64, blob.type || 'audio/webm');
            if (res.text) setInput(p => p + (p ? ' ' : '') + res.text);
          } catch {
            showToast('Voice transcription failed. Please try again.', 'error');
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch {
      showToast('Could not access microphone. Please check browser permissions.', 'warning');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="flex flex-col h-full text-white relative overflow-hidden"
        style={{ background:'linear-gradient(160deg, #0b0d14 0%, #0e1020 50%, #0d0b14 100%)' }}>
        <BackgroundOrbs />

        {/* ── History panel ────────────────────────── */}
        {showHistory && (
          <>
            <div className="absolute inset-0 z-20" onClick={() => setShowHistory(false)} />
            <HistoryPanel
              conversations={conversations}
              currentId={currentId}
              onSelect={loadConversation}
              onDelete={deleteConversation}
              onClose={() => setShowHistory(false)}
              searchQuery={historySearch}
              onSearch={setHistorySearch}
            />
          </>
        )}

        {/* ── Top bar ──────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(11,13,20,0.7)',backdropFilter:'blur(20px)' }}>

          <div className="flex items-center gap-2">
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(v => !v)}
              title="Chat history"
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${showHistory ? 'bg-violet-500/20 text-violet-300' : 'hover:bg-white/5 text-white/40 hover:text-white/70'}`}
            >
              <History size={16}/>
              {conversations.length > 0 && (
                <span className="text-[10px] bg-violet-500/30 text-violet-300 rounded-full px-1.5 py-0.5 leading-none hidden sm:inline">
                  {conversations.length}
                </span>
              )}
            </button>

            {/* New chat */}
            <button
              onClick={startNewChat}
              title="New chat"
              className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
            >
              <Plus size={16}/>
            </button>

            {/* Persona Switcher Button */}
            <button
              onClick={() => setIsPersonaModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-300 text-xs transition-colors"
              title="Change AI Persona & Tone"
            >
              <span>{activePersona.avatar}</span>
              <span className="font-medium hidden sm:inline">{activePersona.name}</span>
            </button>

            {/* Knowledge Base Button */}
            <button
              onClick={() => setIsKnowledgeBaseModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300 text-xs transition-colors"
              title="Manage Knowledge Base Documents & URLs"
            >
              <BookOpen size={13} />
              <span className="hidden sm:inline">Knowledge</span>
            </button>

            {/* Memory Button */}
            <button
              onClick={() => setIsMemoryPanelOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-300 text-xs transition-colors"
              title="View Stored Memories"
            >
              <Brain size={13} />
              <span className="hidden sm:inline">Memories</span>
              {currentMemories.length > 0 && (
                <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full">
                  {currentMemories.length}
                </span>
              )}
            </button>
          </div>

          {/* Center: avatar + name */}
          <div className="hidden lg:flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
            <OmniAvatar size="sm" />
            <div>
              <p className="text-sm font-semibold leading-none tracking-wide">{activePersona.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation:'omni-glow 2s ease-in-out infinite' }} />
                <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.35)' }}>{activePersona.title}</p>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button onClick={retryLast} title="Retry last"
                className="p-2 rounded-xl transition-all hover:bg-white/5"
                style={{ color:'rgba(255,255,255,0.3)' }}>
                <RotateCcw size={15}/>
              </button>
            )}
            <button onClick={clearChat} title="Clear chat"
              className="p-2 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-400"
              style={{ color:'rgba(255,255,255,0.3)' }}>
              <Trash2 size={15}/>
            </button>
          </div>
        </div>

        {/* ── Conversation title bar (when active) ─── */}
        {messages.length > 0 && currentConv && (
          <div className="relative z-10 flex items-center justify-center gap-2 py-1.5 px-4 shrink-0"
            style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background:'rgba(11,13,20,0.4)' }}>
            <MessageSquare size={11} className="text-violet-400/60"/>
            <span className="text-[11px] text-white/30 truncate max-w-xs">{currentConv.title}</span>
          </div>
        )}

        {/* ── Chat body ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10 omni-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 omni-fade-up max-w-lg mx-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl mb-1">{activePersona.avatar}</div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-1.5"
                    style={{ background:'linear-gradient(135deg,#c4b5fd,#818cf8,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>
                    Hey, I'm {activePersona.name}
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.38)',fontSize:14 }}>
                    {activePersona.toneOfVoice}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {SUGGESTIONS.map((s, i) => (
                  <button key={s.text} onClick={() => sendMessage(s.text)}
                    className={`omni-card-${i} text-left px-4 py-3 rounded-2xl flex flex-col gap-1.5 transition-all`}
                    style={{ background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.18)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(139,92,246,0.12)'; el.style.borderColor='rgba(139,92,246,0.4)'; el.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(139,92,246,0.06)'; el.style.borderColor='rgba(139,92,246,0.18)'; el.style.transform='translateY(0)'; }}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span className="text-xs leading-relaxed" style={{ color:'rgba(255,255,255,0.55)' }}>{s.text}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2" style={{ color:'rgba(255,255,255,0.2)',fontSize:11 }}>
                <Sparkles size={12}/>
                <span>Equipped with Memory System & Knowledge Base</span>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full space-y-5">
              {messages.map(msg => (
                <div key={msg.id} className={`omni-msg-in flex gap-3 group ${msg.role==='user'?'flex-row-reverse':'flex-row'}`}>
                  {msg.role==='model' ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-violet-600/30 border border-violet-500/30 text-sm shadow-md">
                      {activePersona.avatar}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)' }}>
                      <User size={13} style={{ color:'rgba(255,255,255,0.6)' }}/>
                    </div>
                  )}
                  <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role==='user'?'rounded-tr-sm':'rounded-tl-sm'}`}
                    style={msg.role==='user' ? {
                      background:'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(99,102,241,0.85) 100%)',
                      boxShadow:'0 4px 20px rgba(139,92,246,0.25)',
                    } : {
                      background:'rgba(255,255,255,0.05)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      boxShadow:'0 2px 12px rgba(0,0,0,0.2)',
                    }}>
                    {msg.role==='model' ? (
                      <>
                        {/* Recalled Memories Indicator */}
                        {msg.recalledMemories && msg.recalledMemories.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mb-2 pb-2 border-b border-white/10 text-[11px] text-purple-300">
                            <Brain size={12} className="text-purple-400 shrink-0" />
                            <span className="font-semibold text-purple-200">Recalled:</span>
                            {msg.recalledMemories.map((fact, idx) => (
                              <span key={idx} className="bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full text-[10px]">
                                {fact}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Retrieved Sources Indicator */}
                        {msg.retrievedSources && msg.retrievedSources.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mb-2 pb-2 border-b border-white/10 text-[11px] text-emerald-300">
                            <BookOpen size={12} className="text-emerald-400 shrink-0" />
                            <span className="font-semibold text-emerald-200">Knowledge:</span>
                            {msg.retrievedSources.map((source, idx) => (
                              <span key={idx} className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px]" title={source.snippet}>
                                {source.title}
                              </span>
                            ))}
                          </div>
                        )}

                        {msg.streaming && !msg.text ? (
                          <span className="inline-flex gap-1.5 items-center py-1">
                            {[0,1,2].map(i => (
                              <span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'rgba(139,92,246,0.7)',display:'inline-block',animation:`omni-typing-dot 1.2s ${i*0.2}s ease-in-out infinite` }}/>
                            ))}
                          </span>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-code:text-violet-300 prose-code:bg-violet-950/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-headings:text-white prose-headings:font-semibold">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          </div>
                        )}
                        <div className="absolute -bottom-5 left-2"><CopyButton text={msg.text}/></div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>

        {/* ── Input bar ────────────────────────────── */}
        <div className="shrink-0 px-4 pb-5 pt-2 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2.5 transition-all"
              style={{
                background:'rgba(255,255,255,0.05)',
                border:`1px solid ${inputFocused?'rgba(139,92,246,0.5)':'rgba(255,255,255,0.08)'}`,
                boxShadow: inputFocused?'0 0 0 3px rgba(139,92,246,0.08), 0 8px 32px rgba(0,0,0,0.3)':'0 4px 20px rgba(0,0,0,0.25)',
                backdropFilter:'blur(20px)',
                animation: isLoading?'omni-border-glow 1.8s ease-in-out infinite':undefined,
              }}>
              <button type="button" onClick={isRecording?stopRecording:startRecording}
                disabled={isLoading||isTranscribing}
                className={`p-2 rounded-xl transition-all shrink-0 mb-0.5 ${isRecording?'bg-red-500/20 text-red-400 animate-pulse':'hover:bg-white/5 text-white/40 hover:text-white/70'}`}
                title={isRecording?'Stop recording':'Voice message'}>
                {isTranscribing?<Loader2 size={16} className="animate-spin text-violet-400"/>:isRecording?<Square size={16}/>:<Mic size={16}/>}
              </button>

              <textarea ref={textareaRef} rows={1} value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                onFocus={()=>setInputFocused(true)} onBlur={()=>setInputFocused(false)}
                disabled={isLoading||isTranscribing||isRecording}
                placeholder={isTranscribing?'Transcribing…':isRecording?'Listening…':'Message Omni…'}
                className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed disabled:opacity-50 py-0.5"
                style={{ color:'rgba(255,255,255,0.9)',caretColor:'#8b5cf6',maxHeight:160 }}
              />

              <button onClick={() => sendMessage(input)}
                disabled={!input.trim()||isLoading||isTranscribing}
                className="p-2 rounded-xl transition-all shrink-0 mb-0.5 disabled:opacity-30"
                style={{ background:input.trim()&&!isLoading?'linear-gradient(135deg,#8b5cf6,#6366f1)':'rgba(255,255,255,0.06)',color:'white',boxShadow:input.trim()&&!isLoading?'0 4px 15px rgba(139,92,246,0.4)':'none' }}>
                {isLoading?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}
              </button>
            </div>
            <p className="text-center text-[10px] mt-2" style={{ color:'rgba(255,255,255,0.15)' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────── */}
      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        activePersona={activePersona}
        onSavePersona={(persona) => {
          setActivePersona(persona);
          showToast(`Persona switched to ${persona.name}`, 'success');
        }}
        onSelectExamplePrompt={(prompt) => {
          setIsPersonaModalOpen(false);
          setInput(prompt);
          setTimeout(() => sendMessage(prompt), 100);
        }}
      />

      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseModalOpen}
        onClose={() => setIsKnowledgeBaseModalOpen(false)}
        onSelectSampleQuery={(query) => {
          setIsKnowledgeBaseModalOpen(false);
          setInput(query);
          setTimeout(() => sendMessage(query), 100);
        }}
      />

      <MemoryPanel
        isOpen={isMemoryPanelOpen}
        onClose={() => setIsMemoryPanelOpen(false)}
        memories={currentMemories}
        onAddMemory={(mem) => {
          const newItem: MemoryItem = {
            id: Date.now().toString(),
            category: mem.category,
            content: mem.content,
            timestamp: new Date(),
            source: 'user'
          };
          const updated = [...currentMemories, newItem];
          upsertConversation(currentId, messages, updated);
        }}
        onRemoveMemory={(memId) => {
          const updated = currentMemories.filter(m => m.id !== memId);
          upsertConversation(currentId, messages, updated);
        }}
        onClearMemories={() => {
          upsertConversation(currentId, messages, []);
        }}
      />
    </>
  );
};
