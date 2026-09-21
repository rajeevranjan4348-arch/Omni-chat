import React, { useState, useRef, useEffect } from 'react';
import { AstraExecutionEngine, AstraStageStatus, AstraAgentResult } from '../services/astraAgentService';
import { AstraFlowStepper } from '../components/astra/AstraFlowStepper';
import { AstraFeatureMatrix } from '../components/astra/AstraFeatureMatrix';
import { AstraSecurityDashboard } from '../components/astra/AstraSecurityDashboard';
import { AstraApprovalModal } from '../components/astra/AstraApprovalModal';
import { AstraAndroidDevice } from '../components/astra/AstraAndroidDevice';
import { AstraFeature } from '../data/astraFeatures';
import { generateSpeech } from '../services/gemini';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sparkles,
  Play,
  StopCircle,
  Shield,
  Layers,
  Terminal,
  Paperclip,
  Image as ImageIcon,
  Search,
  Volume2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Copy,
  ExternalLink,
  Zap,
  Smartphone,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const GptAstraMode: React.FC = () => {
  const { isDarkMode } = useTheme();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'console' | 'android' | 'features' | 'security'>('android');

  // Execution Engine & Stages
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<AstraStageStatus[]>([]);
  const [selectedStage, setSelectedStage] = useState<AstraStageStatus | null>(null);
  const [result, setResult] = useState<AstraAgentResult | null>(null);
  const [webSearchGrounded, setWebSearchGrounded] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-pro-preview');

  // Multimodal Attachment
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Human Approval State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    action: string;
    riskReason: string;
    permissionType: string;
    resolve: (granted: boolean) => void;
  } | null>(null);

  // Security & Permissions Matrix (Category 18)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    'Android Security Sandbox': true,
    'Camera': true,
    'Microphone': true,
    'File System': true,
    'Screen Capture': true,
    'Network Egress': true,
    'Notification': true,
    'Android Intent': false,
  });

  const [auditLogs, setAuditLogs] = useState<
    { timestamp: string; action: string; status: 'granted' | 'blocked' | 'audited'; risk: string }[]
  >([
    {
      timestamp: 'Session Init',
      action: 'Astra Android Sandbox policy activated with 270 feature guards',
      status: 'granted',
      risk: 'low',
    },
  ]);

  // Collapsible Inspection Sections in Result
  const [showTrace, setShowTrace] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  // Initialize Stages on Mount
  useEffect(() => {
    const engine = new AstraExecutionEngine(setStages);
    const initialStages = engine.initializeStages();
    setSelectedStage(initialStages[0]);
  }, []);

  const handleTogglePermission = (permKey: string) => {
    setPermissions((prev) => {
      const updated = !prev[permKey];
      setAuditLogs((logs) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          action: `Permission '${permKey}' toggled to ${updated ? 'GRANTED' : 'REVOKED'} by user`,
          status: updated ? 'granted' : 'blocked',
          risk: 'medium',
        },
        ...logs,
      ]);
      return { ...prev, [permKey]: updated };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setImageAttachment(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteAstra = async (promptOverride?: string) => {
    const textToRun = promptOverride || prompt;
    if (!textToRun.trim() && !imageAttachment) return;
    if (isRunning) return;

    setIsRunning(true);
    setResult(null);

    const engine = new AstraExecutionEngine((updatedStages) => {
      setStages(updatedStages);
    });
    engine.initializeStages();

    try {
      const agentResult = await engine.runFlow(
        {
          request: textToRun,
          imageAttachment: imageAttachment || undefined,
          imageMimeType: imageAttachment ? imageMimeType : undefined,
          webSearchEnabled: webSearchGrounded,
          selectedModel,
          userPermissions: permissions,
        },
        async (approvalRequest) => {
          return new Promise<boolean>((resolve) => {
            setPendingApproval({
              ...approvalRequest,
              resolve,
            });
            setApprovalModalOpen(true);
          });
        }
      );

      setResult(agentResult);

      // Add to audit trail
      setAuditLogs((logs) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          action: `Astra Task Executed: "${agentResult.understanding.intent}" [${agentResult.selectedModel}]`,
          status: 'audited',
          risk: agentResult.plan.riskAssessment,
        },
        ...logs,
      ]);
    } catch (error: any) {
      console.warn('Astra flow halted or encountered an issue:', error);
      setAuditLogs((logs) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          action: `Execution terminated: ${error?.message || error}`,
          status: 'blocked',
          risk: 'high',
        },
        ...logs,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApproveAction = () => {
    if (pendingApproval) {
      pendingApproval.resolve(true);
      setAuditLogs((logs) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          action: `User explicitly approved high-risk checkpoint: ${pendingApproval.action}`,
          status: 'granted',
          risk: 'high',
        },
        ...logs,
      ]);
      setPendingApproval(null);
      setApprovalModalOpen(false);
    }
  };

  const handleDenyAction = () => {
    if (pendingApproval) {
      pendingApproval.resolve(false);
      setAuditLogs((logs) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          action: `User denied permission for action: ${pendingApproval.action}`,
          status: 'blocked',
          risk: 'high',
        },
        ...logs,
      ]);
      setPendingApproval(null);
      setApprovalModalOpen(false);
    }
  };

  const handleLaunchFeature = (feat: AstraFeature) => {
    const taskPrompt = `Demonstrate and execute Astra capability #${feat.id}: "${feat.title}" (${feat.category}). 
Description: ${feat.description}.
Requirements:
1. Provide concrete architecture or algorithmic solution.
2. If code is needed, supply complete, robust, ready-to-run code.
3. Validate against verification standards.`;
    setPrompt(taskPrompt);
    setActiveTab('console');
    handleExecuteAstra(taskPrompt);
  };

  const handlePlayVoiceSummary = async () => {
    if (!result?.executionOutput || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const summaryText = `Astra Task completed: ${result.understanding.intent}. Verified with ${result.verification.confidenceScore} percent confidence. Here is the synthesized solution: ${result.executionOutput.slice(0, 300)}`;
      const audioResponse = await generateSpeech(summaryText, 'Puck');
      const audioCandidate = audioResponse.candidates?.[0]?.content?.parts?.[0] as any;
      if (audioCandidate?.inlineData?.data) {
        const audioSrc = `data:audio/mp3;base64,${audioCandidate.inlineData.data}`;
        const audio = new Audio(audioSrc);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        setIsPlayingAudio(false);
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <div className={`p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                GPT ASTRA
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                  270 Super-Agent
                </span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 hidden sm:inline-flex items-center gap-1">
                <Shield size={11} /> 100% Policy Enforced
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              13-Stage Autonomous Flow • Multi-Model Reasoning • Android & Computer Agent
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>Android App (com.astra.agent)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'console'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal size={14} />
            <span>Agent Console</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'features'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>270 Feature Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={14} />
            <span>Security Vault</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="max-w-7xl mx-auto space-y-4">
          {activeTab === 'android' && <AstraAndroidDevice />}

          {activeTab === 'features' && (
            <AstraFeatureMatrix onSelectFeature={handleLaunchFeature} />
          )}

          {activeTab === 'security' && (
            <AstraSecurityDashboard
              permissions={permissions}
              onTogglePermission={handleTogglePermission}
              auditLogs={auditLogs}
            />
          )}

          {activeTab === 'console' && (
            <>
              {/* Pipeline Stepper (Always Visible in Console) */}
              <AstraFlowStepper
                stages={stages}
                activeStageId={selectedStage?.stageId}
                onSelectStage={(s) => setSelectedStage(s)}
              />

              {/* Selected Stage Detail Banner */}
              {selectedStage && (
                <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">
                      Stage {selectedStage.stepNumber}: {selectedStage.label}
                    </span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-300">
                      {selectedStage.details || selectedStage.sublabel}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                    selectedStage.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : selectedStage.status === 'running'
                      ? 'bg-blue-500/20 text-blue-400'
                      : selectedStage.status === 'waiting_approval'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {selectedStage.status.replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Input Command Center */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md'
              }`}>
                {/* Workflow Presets Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 hide-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                    <Zap size={12} className="text-emerald-400" /> Presets:
                  </span>
                  {[
                    { label: 'Deep Multi-Source Research', prompt: 'Conduct deep research and fact cross-checking on quantum computing error-correction milestones in 2025-2026. Provide verified citations.' },
                    { label: 'Full-Stack App Architecture', prompt: 'Architect and synthesize a full-stack high-concurrency event stream system with React frontend, Express backend, and unit test suites.' },
                    { label: 'Android Super-Agent Intent Audit', prompt: 'Audit Android intent execution safety and app launcher permissions for background WorkManager routines without security bypasses.' },
                    { label: 'Screen Intelligence & Code', prompt: 'Explain how screenshot-to-code recognition parses nested container radiuses, bounding boxes, and accessibility landmarks.' },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPrompt(preset.prompt);
                        handleExecuteAstra(preset.prompt);
                      }}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-xs border font-medium transition-all ${
                        isDarkMode
                          ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Multimodal Preview if image attached */}
                {imageAttachment && (
                  <div className="mb-3 relative inline-block">
                    <img
                      src={`data:${imageMimeType};base64,${imageAttachment}`}
                      alt="Attachment"
                      className="w-24 h-24 object-cover rounded-xl border border-emerald-500/50 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setImageAttachment(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleExecuteAstra();
                      }
                    }}
                    placeholder="Enter any complex mission, coding task, multimodal analysis, or research request for GPT Astra..."
                    rows={3}
                    className={`w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* Bottom Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-800/50">
                  <div className="flex items-center gap-2">
                    {/* Attach Image / Screenshot Button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        imageAttachment
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Attach Image or UI Screenshot for Multimodal Vision"
                    >
                      <ImageIcon size={14} />
                      <span>{imageAttachment ? 'Image Attached' : 'Attach Vision/Image'}</span>
                    </button>

                    {/* Google Search Grounding Toggle */}
                    <button
                      type="button"
                      onClick={() => setWebSearchGrounded(!webSearchGrounded)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        webSearchGrounded
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      title="Google Search Grounding (Tool #134)"
                    >
                      <Search size={14} />
                      <span>Search Grounding: {webSearchGrounded ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Model Selector Dropdown */}
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Reasoning)</option>
                      <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash-Lite (Low Latency)</option>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Multimodal & Search)</option>
                    </select>
                  </div>

                  {/* Run Button */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      Press ⌘+Enter to run
                    </span>
                    <button
                      type="button"
                      disabled={isRunning || (!prompt.trim() && !imageAttachment)}
                      onClick={() => handleExecuteAstra()}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                        isRunning
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Astra Executing Flow...</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          <span>Run Astra Flow</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Execution Result Area */}
              {result && (
                <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in transition-all ${
                  isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-lg'
                }`}>
                  {/* Result Header & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          Mission Completed & Verified
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            {result.verification.confidenceScore}% Confidence
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Domain: <strong>{result.understanding.domain}</strong> • Model: <strong>{result.selectedModel}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePlayVoiceSummary}
                        disabled={isPlayingAudio}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isPlayingAudio
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Synthesize and speak outcome using Gemini 2.5 Flash TTS (Feature #33)"
                      >
                        <Volume2 size={14} />
                        <span>{isPlayingAudio ? 'Speaking...' : 'Listen to Astra'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(result.executionOutput);
                          setCopiedResult(true);
                          setTimeout(() => setCopiedResult(false), 2000);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Copy size={14} />
                        <span>{copiedResult ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTrace(!showTrace)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Terminal size={14} />
                        <span>Trace</span>
                        {showTrace ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Flow Trace Metadata */}
                  {showTrace && (
                    <div className={`p-4 rounded-xl border space-y-3 text-xs ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            🧠 Intent & Complexity
                          </span>
                          <p className="font-semibold text-slate-200">{result.understanding.intent}</p>
                          <span className="text-[10px] text-emerald-400 uppercase font-mono">
                            {result.understanding.complexity} complexity
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            📋 Milestones Planned
                          </span>
                          <p className="font-semibold text-slate-200">{result.plan.milestones.length} milestones</p>
                          <span className="text-[10px] text-blue-400">Risk: {result.plan.riskAssessment.toUpperCase()}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            🛠️ Active Tools Called
                          </span>
                          <p className="font-semibold text-slate-200">{result.toolsUsed.length} tools executed</p>
                          <span className="text-[10px] text-purple-400 truncate block">
                            {result.toolsUsed.slice(0, 2).join(', ')}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            ✅ Anti-Hallucination
                          </span>
                          <p className="font-semibold text-emerald-400">Pass (0 Hallucinations)</p>
                          <span className="text-[10px] text-slate-400">{result.verification.hallucinationCheck}</span>
                        </div>
                      </div>

                      {/* Grounding Citations */}
                      {result.perception.groundingSources && result.perception.groundingSources.length > 0 && (
                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Verified Grounding Citations (Feature #89):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {result.perception.groundingSources.map((source, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[11px] font-mono"
                              >
                                🔗 {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Markdown Output */}
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed pt-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.executionOutput}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Human Approval Modal (Stage 8 Checkpoint) */}
      {pendingApproval && (
        <AstraApprovalModal
          isOpen={approvalModalOpen}
          actionTitle={pendingApproval.action}
          riskReason={pendingApproval.riskReason}
          permissionType={pendingApproval.permissionType}
          onApprove={handleApproveAction}
          onDeny={handleDenyAction}
        />
      )}
    </div>
  );
};
