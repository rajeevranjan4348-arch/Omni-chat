import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppMode } from './types';
import { ManusMode } from './modes/ManusMode';
import { VoiceMode } from './modes/VoiceMode';
import { SearchMapsMode } from './modes/SearchMapsMode';
import { AudioTranscriptionMode } from './modes/AudioTranscriptionMode';
import { TextToSpeechMode } from './modes/TextToSpeechMode';
import { JarvisMode } from './modes/JarvisMode';
import { CoderMode } from './modes/CoderMode';
import { SettingsMode } from './modes/SettingsMode';
import { LiquidChatMode } from './modes/LiquidChatMode';
import { OmniChatMode } from './modes/OmniChatMode';
import { DashboardMode } from './modes/DashboardMode';
import { ImageGenerationMode } from './modes/ImageGenerationMode';
import { WorkspaceMode } from './modes/WorkspaceMode';
import { CommandPalette } from './components/CommandPalette';
import { Menu, X, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './contexts/ThemeContext';
import { useSettings } from './contexts/SettingsContext';
import { useWakeWord } from './hooks/useWakeWord';
import { MicrophoneErrorModal } from './components/MicrophoneErrorModal';
import { auth, saveVoiceCommandToCloud } from './lib/firebase';
import { startVoiceCommandCompressorService } from './services/voiceCommandCompressor';
import { useGlobalPerfObserver } from './hooks/useGlobalPerfObserver';
import { useGlobalAiErrorListener } from './hooks/useGlobalAiErrorListener';
import { usePeriodicAutoSave } from './hooks/usePeriodicAutoSave';
import { useTabSync } from './hooks/useTabSync';
import { broadcastSync } from './utils/broadcastSync';

const MODE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  jarvis: 'J.A.R.V.I.S. HUD',
  'chat-fast': 'Manus Agent',
  'liquid-chat': 'Liquid Chat',
  'omni-chat': 'Omni Chat',
  'voice-live': 'Voice',
  'search-maps': 'Search & Maps',
  transcription: 'Transcription',
  tts: 'Text to Speech',
  'image-gen': 'Image Generation',
  coder: 'AI Coder',
  workspace: 'Workspace Central',
  settings: 'Settings',
};

const VALID_MODES: AppMode[] = [
  'dashboard',
  'jarvis',
  'chat-fast',
  'liquid-chat',
  'omni-chat',
  'voice-live',
  'search-maps',
  'transcription',
  'tts',
  'image-gen',
  'coder',
  'workspace',
  'settings'
];

export default function App() {
  useGlobalPerfObserver(90);
  useGlobalAiErrorListener();
  const [currentMode, setCurrentMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem('omnichat_active_mode');
      if (saved && VALID_MODES.includes(saved as AppMode)) {
        return saved as AppMode;
      }
    } catch (e) {}
    return 'dashboard';
  });

  const { setAndBroadcastActiveMode } = useTabSync({
    activeMode: currentMode,
    onActiveModeChange: (newMode) => {
      if (VALID_MODES.includes(newMode)) {
        setCurrentMode(newMode);
      }
    }
  });

  usePeriodicAutoSave('omnichat_active_mode', currentMode, {
    intervalMs: 1500
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [wakeWordTriggered, setWakeWordTriggered] = useState(false);
  const [voiceSearchTrigger, setVoiceSearchTrigger] = useState<number>(0);
  const { getBgClass, getTextClass, wallpaper } = useTheme();
  const { wakeWordSensitivity } = useSettings();


  const wakeWords = React.useMemo(() => [
    'hey ai', 'hey a.i.', 'hey eye', 'hey i', 'hi ai', 'ok ai', 'hey a i', 'hay ai',
    'hey omni', 'omni ai', 'omni', 'hey jarvis', 'jarvis', 'hey assistant', 'computer'
  ], []);

  const { wakeWordTriggerBanner } = useWakeWord((transcript) => {
    setCurrentMode('jarvis');
    setWakeWordTriggered(true);

    // JARVIS-style wake acknowledgement. The existing UI is untouched.
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Yes sir, kya hua?');
        utterance.rate = 1.02;
        utterance.pitch = 0.9;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.debug('[JARVIS] wake acknowledgement unavailable', e);
    }
    setTimeout(() => setWakeWordTriggered(false), 1200);

    // Persist wake-word trigger transcript
    try {
      const raw = localStorage.getItem('omnichat_voice_commands');
      const list = raw ? JSON.parse(raw) : [];
      const newItem = {
        id: 'vc-ww-' + Date.now(),
        timestamp: Date.now(),
        source: 'wake-word',
        text: transcript,
        title: 'Wake-word Triggered',
        activeModeContext: currentMode,
        targetMode: 'jarvis',
        sensitivity: wakeWordSensitivity,
        context: {
          activeMode: currentMode,
          targetMode: 'jarvis',
          sensitivity: wakeWordSensitivity,
          listener: 'Web Speech API Wake-word Engine',
          triggeredAt: new Date().toISOString()
        },
        messages: [
          { role: 'user', text: transcript },
          { role: 'model', text: `Wake-word listener captured prompt from ${currentMode} mode. Switched to J.A.R.V.I.S. HUD.` }
        ]
      };
      list.unshift(newItem);
      localStorage.setItem('omnichat_voice_commands', JSON.stringify(list.slice(0, 100)));

      if (auth.currentUser) {
        saveVoiceCommandToCloud(newItem).catch(err => {
          console.error('Failed to save wake-word to cloud:', err);
        });
      }
    } catch (e) {
      console.error('Failed to log wake-word transcript:', e);
    }
  }, wakeWords, wakeWordSensitivity);

  React.useEffect(() => {
    const sweepVoiceCommands = () => {
      try {
        const raw = localStorage.getItem('omnichat_voice_commands');
        if (!raw) return;

        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 100) {
          const originalLength = list.length;
          // Sort descending by timestamp/updatedAt
          const sortedList = [...list].sort((a, b) => {
            const timeA = a.timestamp || a.updatedAt || 0;
            const timeB = b.timestamp || b.updatedAt || 0;
            return timeB - timeA;
          });

          const truncated = sortedList.slice(0, 100);
          localStorage.setItem('omnichat_voice_commands', JSON.stringify(truncated));
          console.info(`[Voice Log Sweeper] Truncated voice commands log from ${originalLength} to 100 entries to prevent local storage bloat.`);
        }
      } catch (e) {
        console.error('Failed during periodic voice commands sweep:', e);
      }
    };

    // Run sweep immediately on mount
    sweepVoiceCommands();

    // Set up an interval to scan every 15 seconds
    const interval = setInterval(sweepVoiceCommands, 15000);

    // Initialize background Firebase voice commands compressor service
    const stopCompressor = startVoiceCommandCompressorService(30000);

    return () => {
      clearInterval(interval);
      stopCompressor();
    };
  }, []);

  const renderMode = () => {
    switch (currentMode) {
      case 'dashboard':
        return <DashboardMode onModeChange={handleModeChange} />;
      case 'jarvis':
        return <JarvisMode wakeWordTriggered={wakeWordTriggered} />;
      case 'chat-fast':
        return <ManusMode />;
      case 'liquid-chat':
        return <LiquidChatMode />;
      case 'omni-chat':
        return <OmniChatMode />;
      case 'voice-live':
        return <VoiceMode />;
      case 'search-maps':
        return <SearchMapsMode voiceSearchTrigger={voiceSearchTrigger} />;
      case 'transcription':
        return <AudioTranscriptionMode />;
      case 'tts':
        return <TextToSpeechMode />;
      case 'image-gen':
        return <ImageGenerationMode />;
      case 'coder':
        return <CoderMode />;
      case 'workspace':
        return <WorkspaceMode />;
      case 'settings':
        return <SettingsMode />;
      default:
        return <DashboardMode onModeChange={handleModeChange} />;
    }
  };

  const handleModeChange = (mode: AppMode) => {
    setAndBroadcastActiveMode(mode);
    setIsSidebarOpen(false);
  };

  const handleVoiceSearchTrigger = () => {
    setAndBroadcastActiveMode('search-maps');
    setVoiceSearchTrigger(Date.now());
    setIsSidebarOpen(false);
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden relative ${wallpaper ? 'bg-transparent' : getBgClass()} ${getTextClass()}`} style={wallpaper ? { background: 'transparent' } : undefined}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out h-full transform-gpu will-change-transform`}>
        <Sidebar 
          currentMode={currentMode} 
          onModeChange={handleModeChange} 
        />
      </div>


      <main className={`flex-1 h-full overflow-hidden relative flex flex-col ${wallpaper ? 'bg-transparent' : getBgClass()}`} style={wallpaper ? { background: 'transparent' } : undefined}>
        {/* Wake Word Trigger Toast Banner */}

        <AnimatePresence>
          {wakeWordTriggerBanner && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-cyan-300 pointer-events-none"
            >
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 animate-bounce">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  Wake Word Detected: "{wakeWordTriggerBanner}"
                </div>
                <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <Volume2 size={14} className="text-emerald-400 animate-pulse" />
                  <span>AI: "Yes Boss."</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden absolute top-3 left-3 z-50 p-2 bg-black/50 text-white rounded-lg backdrop-blur-md border border-white/10 shadow-lg"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
          <ErrorBoundary key={currentMode} modeName={MODE_LABELS[currentMode]}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMode}
                initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.988 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.99 }}
                transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
                style={{ willChange: 'opacity, filter, transform' }}
                className="w-full h-full flex flex-col min-h-0 overflow-hidden transform-gpu"
              >
                {renderMode()}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </main>

      
      <CommandPalette currentMode={currentMode} onModeChange={handleModeChange} />
      <MicrophoneErrorModal />
    </div>
  );
}
