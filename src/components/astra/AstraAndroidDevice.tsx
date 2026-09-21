// =============================================================================
// ASTRA ANDROID SIMULATOR (Jetpack Compose Interactive Replica)
// Package: com.astra.agent
// Renders the full Android Application UI, Room DB, Tasks & Research Engine
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  astraDb,
  Conversation,
  Message,
  MemoryEntity,
  TaskEntity,
  ToolCallEntity,
  AuditLogEntity,
  Project,
  Automation,
} from '../../services/astraDatabase';
import {
  AgentRuntime,
  AgentState,
  AgentStep,
  ResearchEngine,
  ResearchReport,
  ResearchStepResult,
  ModelRouter,
} from '../../services/astraBackendEngine';
import { generateSpeech } from '../../services/gemini';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Smartphone,
  Send,
  Sparkles,
  Bot,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Volume2,
  Paperclip,
  Database,
  Cpu,
  Layers,
  Shield,
  Clock,
  Code2,
  ExternalLink,
  ChevronRight,
  ListFilter,
  Check,
  Zap,
  BookOpen,
  ArrowRight,
  Lock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AstraAndroidDevice: React.FC = () => {
  const { isDarkMode } = useTheme();

  // Navigation tabs in Android App
  const [androidTab, setAndroidTab] = useState<'chat' | 'tasks' | 'research' | 'room_db' | 'system'>('chat');

  // Database reactive state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('conv-welcome');
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<MemoryEntity[]>([]);
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallEntity[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);

  // Agent Runtime state
  const [agentState, setAgentState] = useState<AgentState>('IDLE');
  const [agentStateMessage, setAgentStateMessage] = useState<string>('Standby');
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  // Chat input
  const [chatInput, setChatInput] = useState('');
  const [imageAttached, setImageAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Deep Research state
  const [researchQuery, setResearchQuery] = useState('Quantum Error Correction Milestones 2026');
  const [isResearching, setIsResearching] = useState(false);
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);
  const [researchSteps, setResearchSteps] = useState<ResearchStepResult[]>([]);

  // Room DB table selector
  const [selectedDbTable, setSelectedDbTable] = useState<
    'conversations' | 'messages' | 'memories' | 'tasks' | 'tool_calls' | 'audit_logs' | 'projects' | 'automations'
  >('tasks');

  // Android Permission Dialog (Stage 8)
  const [permissionDialog, setPermissionDialog] = useState<{
    step: AgentStep;
    resolve: (approved: boolean) => void;
  } | null>(null);

  // Audio Playback
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Code inspection drawer
  const [showCodeInspect, setShowCodeInspect] = useState(false);
  const [codeTab, setCodeTab] = useState<'kotlin' | 'backend'>('kotlin');

  // Load Database State
  const refreshDb = () => {
    setConversations(astraDb.getAllConversations());
    setMessages(astraDb.getMessagesForConversation(activeConvId));
    setMemories(astraDb.getAllMemories());
    setTasks(astraDb.getAllTasks());
    setToolCalls(astraDb.getAllToolCalls());
    setAuditLogs(astraDb.getAllAuditLogs());
    setProjects(astraDb.getAllProjects());
    setAutomations(astraDb.getAllAutomations());
  };

  useEffect(() => {
    refreshDb();
    const unsub = astraDb.subscribe(() => {
      refreshDb();
    });
    return unsub;
  }, [activeConvId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentState]);

  // Handle Send Chat
  const handleSendMessage = async () => {
    if (!chatInput.trim() && !imageAttached) return;
    if (isAgentRunning) return;

    const userText = chatInput.trim();
    setChatInput('');

    // Insert User message into Room DB
    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      conversationId: activeConvId,
      parentId: null,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    astraDb.insertMessage(userMsg);

    setIsAgentRunning(true);

    const runtime = new AgentRuntime(
      (state, msg) => {
        setAgentState(state);
        if (msg) setAgentStateMessage(msg);
      },
      (steps) => {
        setActiveSteps(steps);
      }
    );

    try {
      const taskRecord = await runtime.runTask(
        userText,
        { activeConvId, imageAttached: !!imageAttached },
        async (stepToApprove) => {
          return new Promise<boolean>((resolve) => {
            setPermissionDialog({
              step: stepToApprove,
              resolve,
            });
          });
        }
      );

      // Insert Assistant message into Room DB
      const assistantMsg: Message = {
        id: 'msg-' + Date.now(),
        conversationId: activeConvId,
        parentId: userMsg.id,
        role: 'assistant',
        content: taskRecord.result || 'Task finished successfully.',
        timestamp: Date.now(),
      };
      astraDb.insertMessage(assistantMsg);
    } catch (e: any) {
      console.error(e);
      setAgentState('FAILED');
      setAgentStateMessage('Execution halted.');
    } finally {
      setIsAgentRunning(false);
      setImageAttached(null);
      setTimeout(() => {
        setAgentState('IDLE');
        setAgentStateMessage('Standby');
      }, 4000);
    }
  };

  // Run Deep Research Engine
  const handleRunResearch = async () => {
    if (!researchQuery.trim() || isResearching) return;
    setIsResearching(true);
    setResearchReport(null);
    setResearchSteps([]);

    const engine = new ResearchEngine((step) => {
      setResearchSteps((prev) => [...prev, step]);
    });

    try {
      const report = await engine.research(researchQuery, 3, 5);
      setResearchReport(report);

      // Log into Room DB
      astraDb.insertAuditLog({
        id: 'audit-' + Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        tool: 'ResearchEngine',
        action: `Synthesized 6-stage deep report: "${researchQuery}"`,
        permission: 'LOW',
        approval: 'AUTO_GRANTED',
        result: 'COMPLETED',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsResearching(false);
    }
  };

  // TTS Speech
  const handleTTS = async (text: string) => {
    if (isAudioPlaying) return;
    setIsAudioPlaying(true);
    try {
      const res = await generateSpeech(text.slice(0, 300), 'Puck');
      const cand = res.candidates?.[0]?.content?.parts?.[0] as any;
      if (cand?.inlineData?.data) {
        const audio = new Audio(`data:audio/mp3;base64,${cand.inlineData.data}`);
        audio.onended = () => setIsAudioPlaying(false);
        audio.play();
      } else {
        setIsAudioPlaying(false);
      }
    } catch {
      setIsAudioPlaying(false);
    }
  };

  return (
    <div className="w-full flex flex-col xl:flex-row items-start justify-center gap-6 p-2 sm:p-4">
      {/* ANDROID DEVICE CONTAINER */}
      <div className="w-full max-w-[440px] mx-auto shrink-0 flex flex-col items-center">
        {/* Hardware Mock Frame */}
        <div className="w-full rounded-[44px] p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative">
          {/* Side Hardware Buttons */}
          <div className="absolute -left-5 top-28 w-1 h-12 bg-slate-700 rounded-l-md" />
          <div className="absolute -left-5 top-44 w-1 h-12 bg-slate-700 rounded-l-md" />
          <div className="absolute -right-5 top-32 w-1 h-16 bg-slate-700 rounded-r-md" />

          {/* Screen Bezel & Display */}
          <div className="w-full h-[760px] rounded-[36px] overflow-hidden flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-inner relative">
            {/* Status Bar */}
            <div className="w-full h-8 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-400 select-none bg-slate-950/80 z-20 shrink-0">
              <span className="font-mono">10:42</span>
              {/* Camera Notch Hole */}
              <div className="w-4 h-4 rounded-full bg-black border border-slate-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span>5G</span>
                <span>📶</span>
                <span>98%</span>
              </div>
            </div>

            {/* Android App Bar */}
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-black shadow-sm shadow-emerald-500/30">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-bold tracking-tight text-white">com.astra.agent</h2>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      v2.4
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">Jetpack Compose • Room DB</p>
                </div>
              </div>

              {/* Live State Machine Badge */}
              <div className="flex items-center gap-1.5">
                <div
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 border transition-all ${
                    agentState === 'IDLE'
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : agentState === 'WAITING_APPROVAL'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                      : agentState === 'FAILED' || agentState === 'CANCELLED'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      agentState === 'IDLE'
                        ? 'bg-slate-500'
                        : agentState === 'WAITING_APPROVAL'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  {agentState}
                </div>
              </div>
            </div>

            {/* Sub-Banner: Agent State Message if active */}
            {agentState !== 'IDLE' && (
              <div className="px-3 py-1 bg-emerald-950/50 border-b border-emerald-800/40 text-[10px] text-emerald-300 flex items-center justify-between shrink-0">
                <span className="truncate max-w-[280px]">⚡ {agentStateMessage}</span>
                <span className="text-[9px] font-mono text-emerald-400">Gemini 3.1 Pro</span>
              </div>
            )}

            {/* TAB CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* TAB 1: CHAT */}
              {androidTab === 'chat' && (
                <div className="flex flex-col h-full justify-between space-y-3">
                  {/* Messages list */}
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[510px]">
                    {messages.map((m) => {
                      const isUser = m.role === 'user';
                      return (
                        <div
                          key={m.id}
                          className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                              isUser
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white font-bold'
                            }`}
                          >
                            {isUser ? <User size={13} /> : <Bot size={13} />}
                          </div>

                          <div
                            className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                              isUser
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                            }`}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>

                            {!isUser && (
                              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                <span>
                                  {new Date(m.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTTS(m.content)}
                                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                                >
                                  <Volume2 size={11} /> Speak
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* If Agent is executing steps, show live steps card */}
                    {isAgentRunning && activeSteps.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Sparkles size={11} /> Autonomous Step Execution
                          </span>
                          <span>{activeSteps.filter((s) => s.state === 'COMPLETED').length}/{activeSteps.length}</span>
                        </div>
                        <div className="space-y-1">
                          {activeSteps.map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center justify-between text-[10px] p-1.5 rounded bg-slate-950 border border-slate-800"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-slate-400">[{step.tool}]</span>
                                <span className="text-slate-300 truncate">{step.description}</span>
                              </div>
                              <span
                                className={`text-[9px] font-bold px-1 rounded uppercase ${
                                  step.state === 'COMPLETED'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : step.state === 'RUNNING'
                                    ? 'bg-blue-500/20 text-blue-300 animate-pulse'
                                    : step.state === 'WAITING_APPROVAL'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'text-slate-500'
                                }`}
                              >
                                {step.state}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Bar */}
                  <div className="pt-2 border-t border-slate-800">
                    {imageAttached && (
                      <div className="mb-2 relative inline-block">
                        <img
                          src={`data:image/jpeg;base64,${imageAttached}`}
                          alt="attached"
                          className="w-12 h-12 object-cover rounded-lg border border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setImageAttached(null)}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5">
                      <input
                        type="file"
                        ref={fileRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const b64 = (reader.result as string).split(',')[1];
                            setImageAttached(b64);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-slate-400 hover:text-white p-1"
                        title="Attach Camera/Gallery Image"
                      >
                        <Paperclip size={14} />
                      </button>

                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Ask Astra or command agent..."
                        className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                      />

                      <button
                        type="button"
                        disabled={isAgentRunning || (!chatInput.trim() && !imageAttached)}
                        onClick={handleSendMessage}
                        className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TASKS & AGENT */}
              {androidTab === 'tasks' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Launch Autonomous Mission (com.astra.agent.AgentRuntime)
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'Synthesize high-concurrency event architecture and unit tests',
                        'Audit Android intent execution safety and app launcher permissions',
                        'Perform deep fact-checking on quantum computing error-correction',
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setChatInput(item);
                            setAndroidTab('chat');
                          }}
                          className="text-left text-xs p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-white transition-all"
                        >
                          ⚡ {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tasks List from Room DB */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Room Database Tasks ({tasks.length})
                    </h3>
                    <div className="space-y-2">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No tasks executed yet.</p>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200 truncate max-w-[200px]">
                                {task.goal}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  task.state === 'COMPLETED'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {task.state}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              ID: {task.id} • {new Date(task.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEEP RESEARCH */}
              {androidTab === 'research' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      6-Step Deep Research Engine
                    </span>
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      placeholder="Research topic or scientific inquiry..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={isResearching || !researchQuery.trim()}
                      onClick={handleRunResearch}
                      className="w-full py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isResearching ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Executing Research Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <Search size={12} />
                          <span>Run 6-Step Research</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Research Steps Progress */}
                  {researchSteps.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pipeline Stages ({researchSteps.length}/6)
                      </span>
                      {researchSteps.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[9px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-200">{s.step}</span>
                            <span className="text-slate-400 text-[10px] truncate max-w-[140px]">
                              {s.title}
                            </span>
                          </div>
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Research Report Output */}
                  {researchReport && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <span className="font-bold text-emerald-400">Synthesized Report</span>
                        <span className="text-[9px] font-mono px-1.5 rounded bg-emerald-500/20 text-emerald-300">
                          {researchReport.confidenceScore}% Confidence
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed text-slate-300 max-h-48 overflow-y-auto pr-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {researchReport.summary}
                        </ReactMarkdown>
                      </div>

                      {/* Citations */}
                      {researchReport.citations.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1">
                          <span className="text-[9px] font-bold uppercase text-slate-400 block">
                            Verified Citations:
                          </span>
                          {researchReport.citations.map((c, i) => (
                            <a
                              key={i}
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block p-1 rounded bg-slate-950 text-[10px] text-blue-400 hover:underline truncate"
                            >
                              🔗 {c.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ROOM DATABASE LIVE EXPLORER */}
              {androidTab === 'room_db' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Room Database (astra_database)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">9 DAOs Active</span>
                  </div>

                  {/* Table Selector Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 hide-scrollbar">
                    {(
                      [
                        'tasks',
                        'tool_calls',
                        'audit_logs',
                        'memories',
                        'conversations',
                        'messages',
                        'automations',
                        'projects',
                      ] as const
                    ).map((tbl) => (
                      <button
                        key={tbl}
                        type="button"
                        onClick={() => setSelectedDbTable(tbl)}
                        className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-mono font-bold capitalize border transition-all ${
                          selectedDbTable === tbl
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {tbl.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Table Content Viewer */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 min-h-[320px] max-h-[460px] overflow-y-auto font-mono text-[10px] space-y-2">
                    {selectedDbTable === 'tasks' && (
                      tasks.length === 0 ? <p className="text-slate-500">Empty table: tasks</p> :
                      tasks.map((t) => (
                        <div key={t.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-emerald-400 font-bold">TASK #{t.id.slice(-6)}: {t.goal}</div>
                          <div className="text-slate-400">State: {t.state} | {new Date(t.createdAt).toLocaleTimeString()}</div>
                          {t.result && <div className="text-slate-300 text-[9px] mt-1 truncate">Output: {t.result}</div>}
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'tool_calls' && (
                      toolCalls.length === 0 ? <p className="text-slate-500">Empty table: tool_calls</p> :
                      toolCalls.map((tc) => (
                        <div key={tc.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-blue-400 font-bold">TOOL: {tc.toolName} ({tc.permissionLevel})</div>
                          <div className="text-slate-400">Approval: {tc.approvalStatus} | Task: {tc.taskId.slice(-6)}</div>
                          <div className="text-slate-500 text-[9px] truncate">Input: {tc.inputJson}</div>
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'audit_logs' && (
                      auditLogs.length === 0 ? <p className="text-slate-500">Empty table: audit_logs</p> :
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-purple-400 font-bold">{log.tool}: {log.action}</div>
                          <div className="text-slate-400">Status: {log.result} | Permission: {log.permission}</div>
                          <div className="text-slate-500 text-[9px]">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'memories' && (
                      memories.length === 0 ? <p className="text-slate-500">Empty table: memories</p> :
                      memories.map((mem) => (
                        <div key={mem.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-amber-400 font-bold">{mem.key} (Priority {mem.importance}/5)</div>
                          <div className="text-slate-300">{mem.value}</div>
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'conversations' && (
                      conversations.map((c) => (
                        <div key={c.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-slate-200 font-bold">{c.title}</div>
                          <div className="text-slate-500">{c.id} {c.pinned ? '📌 Pinned' : ''}</div>
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'messages' && (
                      messages.map((m) => (
                        <div key={m.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-blue-300 font-bold">[{m.role.toUpperCase()}]</div>
                          <div className="text-slate-300 truncate">{m.content}</div>
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'automations' && (
                      automations.map((a) => (
                        <div key={a.id} className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-emerald-300 font-bold">{a.name}</div>
                            <div className="text-slate-400">{a.triggerType}: {a.triggerConfig}</div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            {a.enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      ))
                    )}

                    {selectedDbTable === 'projects' && (
                      projects.map((p) => (
                        <div key={p.id} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                          <div className="text-white font-bold">{p.name}</div>
                          <div className="text-slate-400">{p.description}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM & AUTOMATIONS */}
              {androidTab === 'system' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Active Automations
                    </span>
                    {automations.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{a.name}</div>
                          <div className="text-[10px] text-slate-400">{a.triggerConfig}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => astraDb.toggleAutomation(a.id)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            a.enabled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {a.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Android Safety Sandbox (Category 18)
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Android IsolatedProcess & Hilt Dagger injection enforce strict hardware permissions. No tool bypasses security policies or executes without verified audit logs.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Android Navigation Bar (Compose Navigation) */}
            <div className="px-2 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-around shrink-0 z-10">
              {[
                { id: 'chat', label: 'Chat', icon: Bot },
                { id: 'tasks', label: 'Tasks', icon: Zap },
                { id: 'research', label: 'Research', icon: Search },
                { id: 'room_db', label: 'Room DB', icon: Database },
                { id: 'system', label: 'System', icon: Shield },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = androidTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAndroidTab(item.id as any)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                      isSelected
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[9px]">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Android Bottom Navigation Pill Bar */}
            <div className="w-full h-4 flex items-center justify-center bg-slate-950 shrink-0">
              <div className="w-28 h-1 rounded-full bg-slate-700" />
            </div>

            {/* NATIVE ANDROID RUNTIME PERMISSION MODAL */}
            {permissionDialog && (
              <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end p-4 animate-in fade-in">
                <div className="w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-3 text-left">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Shield size={20} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      Android Permission Request
                    </h3>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Allow Astra Agent to execute:
                    </h4>
                    <p className="text-xs text-slate-300 font-medium mt-1">
                      "{permissionDialog.step.description}"
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                    <div>Tool: <strong className="text-slate-200">{permissionDialog.step.tool}</strong></div>
                    <div>Permission Level: <strong className="text-red-400">{permissionDialog.step.permissionLevel}</strong></div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        permissionDialog.resolve(false);
                        setPermissionDialog(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                    >
                      Don't Allow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        permissionDialog.resolve(true);
                        setPermissionDialog(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all"
                    >
                      Allow While Using
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPANION ARCHITECTURE & LIVE CODE EXPLORER */}
      <div className="flex-1 w-full max-w-2xl space-y-4">
        {/* Architecture Header Card */}
        <div className={`p-4 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Smartphone size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Astra Android Implementation & Backend Engine
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono">
                    com.astra.agent
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Room DB Entities, DAOs, Retrofit API, Multi-Model Router & 6-Step Research
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCodeInspect(!showCodeInspect)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Code2 size={14} />
              <span>{showCodeInspect ? 'Hide Code' : 'Inspect Code'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-center">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Room Tables</span>
              <span className="text-xs font-bold text-emerald-400">9 Entities</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Agent States</span>
              <span className="text-xs font-bold text-blue-400">11 States</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Research Engine</span>
              <span className="text-xs font-bold text-purple-400">6 Stages</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Permission Levels</span>
              <span className="text-xs font-bold text-amber-400">3 Gated</span>
            </div>
          </div>
        </div>

        {/* Live Architecture Component Map */}
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers size={14} className="text-emerald-400" />
            Active Subsystem Telemetry
          </h4>

          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  1. Room Database Persistence (SQLite Layer)
                </span>
                <span className="text-[11px] text-slate-400">
                  Active tables: conversations, messages, files, memories, tasks, tool_calls, audit_logs, projects, automations
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                SYNCHRONIZED
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  2. ModelRouter & Provider Fallbacks
                </span>
                <span className="text-[11px] text-slate-400">
                  Routing between Gemini 3.1 Pro, Gemini 3 Flash, GPT-4o, and Claude 3.5 Sonnet
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                ROUTED
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  3. ResearchEngine (6-Step Evidence Synthesis)
                </span>
                <span className="text-[11px] text-slate-400">
                  SEARCH → EXTRACT → COMPARE → VERIFY → SYNTHESIZE → CITE
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                GROUNDED
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  4. Android Security Sandbox & Human Approval Gate
                </span>
                <span className="text-[11px] text-slate-400">
                  Mandatory runtime gate for HIGH-impact tool calls (Stage 8)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                ENFORCED
              </span>
            </div>
          </div>
        </div>

        {/* Code Inspection Modal / Expandable Box */}
        {showCodeInspect && (
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCodeTab('kotlin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    codeTab === 'kotlin'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Kotlin (com.astra.agent)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('backend')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    codeTab === 'backend'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Backend Node.js (server.js)
                </button>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Read-only Reference</span>
            </div>

            <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 text-[11px] font-mono overflow-x-auto max-h-96 border border-slate-800 leading-relaxed">
              {codeTab === 'kotlin' ? `// =============================================================================
// ASTRA AI AGENT — Android Implementation (com.astra.agent)
// =============================================================================
package com.astra.agent

// 9 Room Entities
@Entity(tableName = "conversations") data class Conversation(...)
@Entity(tableName = "messages") data class Message(...)
@Entity(tableName = "files") data class FileEntity(...)
@Entity(tableName = "memories") data class MemoryEntity(...)
@Entity(tableName = "tasks") data class TaskEntity(...)
@Entity(tableName = "tool_calls") data class ToolCallEntity(...)
@Entity(tableName = "audit_logs") data class AuditLogEntity(...)
@Entity(tableName = "projects") data class Project(...)
@Entity(tableName = "automations") data class Automation(...)

// State Machine
enum class AgentState {
  IDLE, THINKING, PLANNING, SEARCHING, READING, USING_TOOL,
  WAITING_APPROVAL, EXECUTING, VERIFYING, COMPLETED, FAILED, CANCELLED
}

// Security Checkpoint
enum class PermissionLevel { LOW, MEDIUM, HIGH }` : `// =============================================================================
// ASTRA AI AGENT — Backend Implementation (server.js)
// =============================================================================

// ModelRouter
class ModelRouter {
  selectModel({ taskType, costSensitivity, latencySensitivity, userPreference }) {
    // Select between Gemini, OpenAI, Claude
  }
}

// AgentRuntime
class AgentRuntime {
  registerTools() {
    return {
      'web_search': this.searchWeb,
      'calculator': this.calculator,
      'code_execution': this.executeCode,
      'file_parse': this.parseFile,
      'image_generation': this.generateImage
    };
  }

  async runTask(goal, context) {
    // 1. Planning via LLM
    // 2. Permission gate & approvals
    // 3. Tool execution & Room DB logging
    // 4. Self-verification
  }
}

// ResearchEngine: 6-Stage Process
// SEARCH -> EXTRACT -> COMPARE -> VERIFY -> SYNTHESIZE -> CITE`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
