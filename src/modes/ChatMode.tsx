import React, { useState, useRef, useEffect } from 'react';
import { Message, Conversation, MemoryItem, MemoryCategory, RetrievedSource, PersonaConfig } from '../types';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { SystemStatus } from '../components/SystemStatus';
import { getAiInstance } from '../services/gemini';
import { ThinkingLevel, Type } from '@google/genai';
import { 
  Settings2, Globe, UserCircle, Link as LinkIcon, Trash2, Plus, 
  MessageSquare, Brain, Sparkles, Edit3, BookOpen, Database, Play 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { PersonaModal } from '../components/PersonaModal';
import { MemoryPanel } from '../components/MemoryPanel';
import { KnowledgeBaseModal } from '../components/KnowledgeBaseModal';
import { buildSystemInstructionForPersona } from '../data/personas';
import { extractMemoriesWithGemini, extractLocalMemories, recallRelevantMemories } from '../services/memoryService';
import { KnowledgeBaseService } from '../services/knowledgeBaseService';

interface ChatModeProps {
  mode: 'chat-pro' | 'chat-fast';
}

export const ChatMode: React.FC<ChatModeProps> = ({ mode }) => {
  const { isDarkMode, getAccentClass, getBorderClass } = useTheme();
  const { userProfile, memory, setMemory, activePersona, setActivePersona } = useSettings();
  
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem(`omnichat_conversations_${mode}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
          memories: Array.isArray(c.memories) ? c.memories.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          })) : [],
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }))
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    const saved = localStorage.getItem(`omnichat_current_conv_${mode}`);
    return saved || null;
  });

  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => {
    localStorage.setItem(`omnichat_conversations_${mode}`, JSON.stringify(conversations));
  }, [conversations, mode]);

  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem(`omnichat_current_conv_${mode}`, currentConversationId);
    } else {
      localStorage.removeItem(`omnichat_current_conv_${mode}`);
    }
  }, [currentConversationId, mode]);

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const currentConversationIdRef = useRef(currentConversationId);
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setConversations(prevConvs => {
      const convId = currentConversationIdRef.current;
      if (!convId) return prevConvs;
      
      return prevConvs.map(c => {
        if (c.id === convId) {
          const newMessages = typeof updater === 'function' ? updater(c.messages) : updater;
          return {
            ...c,
            updatedAt: new Date(),
            messages: newMessages
          };
        }
        return c;
      });
    });
  };

  const createNewChat = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      updatedAt: new Date(),
      messages: [],
      memories: []
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isKnowledgeBaseModalOpen, setIsKnowledgeBaseModalOpen] = useState(false);
  
  const [language, setLanguage] = useState('English');
  const [urlContext, setUrlContext] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  
  const currentMemories: MemoryItem[] = currentConversation?.memories || [];
  const activeDocsCount = KnowledgeBaseService.getDocuments().filter(d => d.isActive).length;
  const activeUrlsCount = KnowledgeBaseService.getUrls().filter(u => u.isActive).length;

  const handleAddMemory = (item: { category: MemoryCategory; content: string }) => {
    const convId = currentConversationIdRef.current;
    if (!convId) return;

    const newMemory: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      category: item.category,
      content: item.content,
      timestamp: new Date(),
      source: 'user'
    };

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          memories: [...(c.memories || []), newMemory]
        };
      }
      return c;
    }));
  };

  const handleRemoveMemory = (id: string) => {
    const convId = currentConversationIdRef.current;
    if (!convId) return;

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          memories: (c.memories || []).filter(m => m.id !== id)
        };
      }
      return c;
    }));
  };

  const handleClearMemories = () => {
    const convId = currentConversationIdRef.current;
    if (!convId) return;

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          memories: []
        };
      }
      return c;
    }));
  };

  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initChat = (dynamicGroundingContext: string = '') => {
    const ai = getAiInstance();
    const modelName = mode === 'chat-pro' ? 'gemini-3.1-pro-preview' : 'gemini-3.1-flash-lite-preview';
    
    // Build system instruction with personality, memory recall rules, and knowledge base grounding
    const systemInstruction = buildSystemInstructionForPersona(activePersona, {
      language,
      userName: userProfile.name,
      userPreferences: userProfile.preferences,
      conversationMemories: currentMemories,
      longTermMemories: memory,
      knowledgeBaseContext: dynamicGroundingContext
    });
    
    const config: any = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };
    
    if (mode === 'chat-pro') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }
    
    if (urlContext.trim()) {
      config.tools = config.tools || [];
      config.tools.push({ urlContext: {} });
    }

    if (useWebSearch) {
      config.tools = config.tools || [];
      config.tools.push({ googleSearch: {} });
    }
    
    // Memory Tool to enable autonomous retention
    config.tools = config.tools || [];
    config.tools.push({
      functionDeclarations: [{
        name: "save_memory",
        description: "Save a key detail, fact, user preference, or project goal to conversation and long-term memory.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            fact: {
              type: Type.STRING,
              description: "The fact, preference, topic, or goal to remember (e.g., 'User's name is Maya', 'User loves astrophotography', 'User is building an e-commerce platform')"
            },
            category: {
              type: Type.STRING,
              description: "Category of the memory: 'preference', 'topic', 'goal', or 'fact'"
            }
          },
          required: ["fact"]
        }
      }]
    });
    
    const history = messages
      .filter(m => !m.isStreaming && m.text)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

    chatRef.current = ai.chats.create({
      model: modelName,
      history: history.length > 0 ? history : undefined,
      config,
    });
  };

  useEffect(() => {
    initChat();
  }, [mode, language, activePersona, urlContext, useWebSearch, currentConversationId, userProfile, memory, currentMemories.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    let convId = currentConversationIdRef.current;
    if (!convId) {
      convId = Date.now().toString();
      const newConv: Conversation = {
        id: convId,
        title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
        updatedAt: new Date(),
        messages: [],
        memories: []
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(convId);
      currentConversationIdRef.current = convId;
    } else {
      setConversations(prev => prev.map(c => {
        if (c.id === convId && c.messages.length === 0) {
          return { ...c, title: text.substring(0, 30) + (text.length > 30 ? '...' : '') };
        }
        return c;
      }));
    }

    // 1. KNOWLEDGE BASE RETRIEVAL
    const kbResults = KnowledgeBaseService.search(text, 4);
    const retrievedSources: RetrievedSource[] = kbResults;

    // Build grounding context if sources were found
    const kbGroundingContext = kbResults.length > 0 
      ? KnowledgeBaseService.buildGroundingContext(text, kbResults) 
      : '';

    // Re-init chat session with fresh grounding context for this turn
    initChat(kbGroundingContext);

    // 2. MEMORY EXTRACTION & RECALL
    // Immediate heuristic extraction of user identity, interests, preferences
    const localNewMemories = extractLocalMemories(text);
    if (localNewMemories.length > 0) {
      setConversations(prev => prev.map(c => {
        if (c.id === convId) {
          const existing = c.memories || [];
          const toAdd = localNewMemories.filter(nm => !existing.some(em => em.content.toLowerCase() === nm.content.toLowerCase()));
          return {
            ...c,
            memories: [...existing, ...toAdd]
          };
        }
        return c;
      }));
    }

    // AI-driven deep extraction in parallel
    extractMemoriesWithGemini(text, currentMemories).then(extracted => {
      if (extracted && extracted.length > 0) {
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            const existing = c.memories || [];
            const toAdd = extracted.filter(nm => !existing.some(em => em.content.toLowerCase() === nm.content.toLowerCase()));
            if (toAdd.length > 0) {
              return {
                ...c,
                memories: [...existing, ...toAdd]
              };
            }
          }
          return c;
        }));
      }
    }).catch(e => console.warn('Deep memory extraction error:', e));

    // Determine relevant recalled memories for this turn
    const combinedMemories = [...currentMemories, ...localNewMemories];
    const recalledFacts = recallRelevantMemories(text, combinedMemories);

    let messageToSend = text;
    if (kbGroundingContext) {
      messageToSend = `${kbGroundingContext}\n\nUser Question:\n${text}`;
    } else if (urlContext.trim() && messages.length === 0) {
      messageToSend = `Context URL: ${urlContext}\n\n${text}`;
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text, timestamp: new Date(), status: 'sent' };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { 
      id: modelMessageId, 
      role: 'model', 
      text: '', 
      isStreaming: true, 
      timestamp: new Date(),
      recalledMemories: recalledFacts.length > 0 ? recalledFacts : (combinedMemories.length > 0 ? combinedMemories.slice(0, 3).map(m => m.content) : undefined),
      retrievedSources: retrievedSources.length > 0 ? retrievedSources : undefined
    }]);

    try {
      let responseStream = await chatRef.current.sendMessageStream({ message: messageToSend });
      
      let fullText = '';
      let chunks: any[] = [];
      let functionCalls: any[] = [];
      
      let isFirstChunk = true;
      for await (const chunk of responseStream) {
        if (isFirstChunk) {
          setMessages((prev) => prev.map((msg) => msg.id === userMessage.id ? { ...msg, status: 'delivered' } : msg));
          isFirstChunk = false;
        }
        if (chunk.text) fullText += chunk.text;
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          chunks = chunk.candidates[0].groundingMetadata.groundingChunks;
        }
        if (chunk.functionCalls) {
          functionCalls.push(...chunk.functionCalls);
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: fullText, groundingChunks: chunks } : msg
          )
        );
      }

      // Handle function calls (save_memory)
      if (functionCalls.length > 0) {
        const toolResponses = functionCalls.map(call => {
          if (call.name === 'save_memory') {
            const fact = call.args?.fact;
            const category = (call.args?.category as MemoryCategory) || 'fact';
            if (fact) {
              setMemory(prev => {
                if (!prev.includes(fact)) return [...prev, fact];
                return prev;
              });

              setConversations(prev => prev.map(c => {
                if (c.id === convId) {
                  const existing = c.memories || [];
                  if (!existing.some(em => em.content.toLowerCase() === fact.toLowerCase())) {
                    return {
                      ...c,
                      memories: [...existing, {
                        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                        category,
                        content: fact,
                        timestamp: new Date(),
                        source: 'auto'
                      }]
                    };
                  }
                }
                return c;
              }));
            }
            return {
              functionResponse: {
                name: 'save_memory',
                response: { status: 'success', fact_saved: fact }
              }
            };
          }
          return null;
        }).filter(Boolean);

        if (toolResponses.length > 0) {
          const followUpStream = await chatRef.current.sendMessageStream({ message: toolResponses });
          for await (const chunk of followUpStream) {
            if (chunk.text) fullText += chunk.text;
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              chunks = chunk.candidates[0].groundingMetadata.groundingChunks;
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMessageId ? { ...msg, text: fullText, groundingChunks: chunks } : msg
              )
            );
          }
        }
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error?.message || 'Sorry, an error occurred while processing your request. Please try again.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId ? { ...msg, text: `**Error:** ${errorMessage}` } : msg
        )
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === modelMessageId) return { ...msg, isStreaming: false };
          if (msg.id === userMessage.id) return { ...msg, status: 'read' };
          return msg;
        })
      );
    }
  };

  const handleSelectExamplePrompt = (prompt: string, persona: PersonaConfig) => {
    setActivePersona(persona);
    handleSendMessage(prompt);
  };

  return (
    <div className={`flex h-full relative ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Group orientation="horizontal" className="w-full h-full">
        {/* Sidebar Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={40} className={`hidden md:flex flex-col border-r ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className={`p-3 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Chat History</h3>
            <button 
              onClick={createNewChat} 
              title="New Chat"
              className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id 
                    ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900') 
                    : (isDarkMode ? 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200/50 text-slate-600 hover:text-slate-800')
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare size={14} className="shrink-0 opacity-50" />
                  <span className="text-sm truncate">{conv.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-500 transition-all"
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className={`text-center p-4 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No past conversations
              </div>
            )}
          </div>
        </Panel>

        <Separator className="hidden md:block w-1 bg-transparent hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-col-resize" />

        {/* Main Chat Panel */}
        <Panel className="flex flex-col h-full relative">
          <SystemStatus />

          {/* Chat Top Controls Bar */}
          <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b p-3 flex justify-between items-center z-10`}>
            <div className={`flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm overflow-x-auto hide-scrollbar whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mr-2`}>
              <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {mode === 'chat-pro' ? 'Pro Chat' : 'Fast Chat'}
              </span>
              
              {/* Persona Button */}
              <button
                onClick={() => setIsPersonaModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-500'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400'
                }`}
                title="View & customize AI Persona (Friendly, Formal, Witty, or Mentor)"
              >
                <span>{activePersona.avatar || '✨'}</span>
                <span className="font-bold">{activePersona.name}</span>
                <span className="hidden sm:inline opacity-70 font-normal text-[11px]">({activePersona.category.replace('-', ' ')})</span>
              </button>

              {/* Memory Bank Button */}
              <button
                onClick={() => setIsMemoryPanelOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  currentMemories.length > 0
                    ? (isDarkMode ? 'bg-purple-950/50 border-purple-700/60 text-purple-300 hover:border-purple-400' : 'bg-purple-50 border-purple-300 text-purple-700 hover:border-purple-400')
                    : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')
                }`}
                title="View active conversation memories (recalls name, interests, goals)"
              >
                <Brain size={12} className={currentMemories.length > 0 ? "text-purple-400" : ""} />
                <span>Memory System</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  currentMemories.length > 0
                    ? (isDarkMode ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-800')
                    : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700')
                }`}>
                  {currentMemories.length}
                </span>
              </button>

              {/* Knowledge Base Button */}
              <button
                onClick={() => setIsKnowledgeBaseModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isDarkMode 
                    ? 'bg-blue-950/50 border-blue-700/60 text-blue-300 hover:border-blue-400' 
                    : 'bg-blue-50 border-blue-300 text-blue-700 hover:border-blue-400'
                }`}
                title="Access documents and URLs to ground responses"
              >
                <Database size={12} className="text-blue-400" />
                <span>Knowledge Base</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isDarkMode ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'
                }`}>
                  {activeDocsCount} docs
                </span>
              </button>

              <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>{language}</span>
              {urlContext && <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><LinkIcon size={10} className="sm:w-3 sm:h-3"/> URL Context</span>}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the current chat history?')) {
                    setMessages([]);
                    setTimeout(() => initChat(), 0);
                  }
                }}
                title="Clear Current History"
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-red-900/30 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? `bg-opacity-20 ${getAccentClass()}` : `${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}`}
              >
                <Settings2 size={18} />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className={`absolute top-14 left-0 right-0 border-b p-4 shadow-lg z-20 animate-in slide-in-from-top-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><Globe size={14}/> Language</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`w-full p-2 text-sm rounded-lg border focus:ring-2 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-600 focus:ring-emerald-500 text-white' : 'border-slate-300 focus:ring-emerald-500'}`}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Russian">Russian</option>
                    <option value="Korean">Korean</option>
                    <option value="Italian">Italian</option>
                    <option value="Dutch">Dutch</option>
                    <option value="Turkish">Turkish</option>
                    <option value="Vietnamese">Vietnamese</option>
                    <option value="Polish">Polish</option>
                    <option value="Indonesian">Indonesian</option>
                    <option value="Thai">Thai</option>
                  </select>
                </div>
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><UserCircle size={14}/> Personality Archetype</label>
                  <button
                    onClick={() => setIsPersonaModalOpen(true)}
                    className={`w-full p-2 text-sm rounded-lg border text-left flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-300 bg-white'}`}
                  >
                    <span>{activePersona.name} ({activePersona.title})</span>
                    <Edit3 size={14} className="text-emerald-400" />
                  </button>
                </div>
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><LinkIcon size={14}/> URL Context (Optional)</label>
                  <input 
                    type="url" 
                    value={urlContext}
                    onChange={(e) => setUrlContext(e.target.value)}
                    placeholder="https://example.com"
                    className={`w-full p-2 text-sm rounded-lg border focus:ring-2 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-600 focus:ring-emerald-500 text-white placeholder-slate-500' : 'border-slate-300 focus:ring-emerald-500'}`}
                  />
                </div>
                <div className="flex items-center mt-6">
                  <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <input 
                      type="checkbox" 
                      checked={useWebSearch}
                      onChange={(e) => setUseWebSearch(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <Globe size={14}/> Enable Google Search
                  </label>
                </div>
              </div>
              <div className={`mt-4 text-xs text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Note: Changing settings will apply to future messages in this conversation.
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full p-6 text-center max-w-2xl mx-auto animate-in fade-in">
                {/* Persona Identity Badge */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg ${
                  isDarkMode ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-100 border border-emerald-200'
                }`}>
                  {activePersona.avatar || '✨'}
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {activePersona.name}
                  </h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {activePersona.title}
                  </span>
                </div>

                <p className={`text-sm italic mb-4 max-w-md ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  "{activePersona.backstory}"
                </p>

                {/* Tone & Style Guidelines preview */}
                <div className={`w-full p-4 rounded-xl border mb-5 text-left ${
                  isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      Tone of Voice: {activePersona.toneOfVoice}
                    </span>
                    <button
                      onClick={() => setIsPersonaModalOpen(true)}
                      className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1"
                    >
                      <Edit3 size={12} /> Switch Persona
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {activePersona.characteristics.map((trait, idx) => (
                      <span 
                        key={idx} 
                        className={`text-xs px-2 py-1 rounded-md border ${
                          isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>

                  {activePersona.exampleInteractions && activePersona.exampleInteractions.length > 0 && (
                    <button
                      onClick={() => setIsPersonaModalOpen(true)}
                      className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      <span>View {activePersona.exampleInteractions.length} showcase example interactions</span>
                    </button>
                  )}
                </div>

                {/* Status Bar: Memory + Knowledge Base */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    currentMemories.length > 0
                      ? (isDarkMode ? 'bg-purple-950/30 border-purple-800/40 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700')
                      : (isDarkMode ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600')
                  }`}>
                    <div className="flex items-center gap-2">
                      <Brain size={15} className={currentMemories.length > 0 ? "text-purple-400" : ""} />
                      <span>{currentMemories.length} Memories Recalled</span>
                    </div>
                    <button onClick={() => setIsMemoryPanelOpen(true)} className="font-semibold underline">
                      Manage
                    </button>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDarkMode ? 'bg-blue-950/30 border-blue-800/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <BookOpen size={15} className="text-blue-400" />
                      <span>Knowledge Base: {activeDocsCount} Docs, {activeUrlsCount} URLs</span>
                    </div>
                    <button onClick={() => setIsKnowledgeBaseModalOpen(true)} className="font-semibold underline">
                      Open KB
                    </button>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="w-full text-left">
                  <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Sample Prompts to Test Memory & Knowledge Base:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Hi! My name is Maya, I'm an engineer and I love astrophotography.",
                      "What is the return window and warranty policy according to OmniCorp?",
                      "Can you explain quantum superposition without complex jargon?",
                      "What do you currently remember about me and my stated interests?"
                    ].map((promptText, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(promptText)}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                          isDarkMode 
                            ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-emerald-500/50 text-slate-300' 
                            : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-700 shadow-sm'
                        }`}
                      >
                        "{promptText}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`flex flex-col gap-2 p-2 sm:p-4`}>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </Panel>
      </Group>

      {/* Persona Customization & Showcase Modal */}
      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        activePersona={activePersona}
        onSavePersona={(updated) => {
          setActivePersona(updated);
        }}
        onSelectExamplePrompt={handleSelectExamplePrompt}
      />

      {/* Conversation Memory Bank Panel */}
      <MemoryPanel
        isOpen={isMemoryPanelOpen}
        onClose={() => setIsMemoryPanelOpen(false)}
        memories={currentMemories}
        onAddMemory={handleAddMemory}
        onRemoveMemory={handleRemoveMemory}
        onClearMemories={handleClearMemories}
      />

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseModalOpen}
        onClose={() => setIsKnowledgeBaseModalOpen(false)}
        onSelectSampleQuery={(q) => handleSendMessage(q)}
      />
    </div>
  );
};
