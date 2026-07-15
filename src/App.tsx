import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppMode } from './types';
import { ChatMode } from './modes/ChatMode';
import { VoiceMode } from './modes/VoiceMode';
import { SearchMapsMode } from './modes/SearchMapsMode';
import { AudioTranscriptionMode } from './modes/AudioTranscriptionMode';
import { TextToSpeechMode } from './modes/TextToSpeechMode';
import { JarvisMode } from './modes/JarvisMode';
import { CoderMode } from './modes/CoderMode';
import { SettingsMode } from './modes/SettingsMode';
import { LogsMode } from './modes/LogsMode';
import { LiquidChatMode } from './modes/LiquidChatMode';
import { OmniChatMode } from './modes/OmniChatMode';
import { DashboardMode } from './modes/DashboardMode';
import { Menu, X } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { useSettings } from './contexts/SettingsContext';
import { useWakeWord } from './hooks/useWakeWord';

const MODE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  jarvis: 'J.A.R.V.I.S. HUD',
  'chat-pro': 'Pro Chat',
  'chat-fast': 'Fast Chat',
  'liquid-chat': 'Liquid Chat',
  'omni-chat': 'Omni Chat',
  'voice-live': 'Voice',
  'search-maps': 'Search & Maps',
  transcription: 'Transcription',
  tts: 'Text to Speech',
  coder: 'AI Coder',
  settings: 'Settings',
  logs: 'Logs',
};

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode | 'liquid-chat'>('omni-chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [wakeWordTriggered, setWakeWordTriggered] = useState(false);
  const { getBgClass, getTextClass } = useTheme();
  const { wakeWordSensitivity } = useSettings();

  const wakeWords = React.useMemo(() => ['hey omni', 'omni ai', 'hey jarvis', 'jarvis'], []);

  useWakeWord(() => {
    setCurrentMode('jarvis');
    setWakeWordTriggered(true);
    setTimeout(() => setWakeWordTriggered(false), 1000);
  }, wakeWords, wakeWordSensitivity);

  const renderMode = () => {
    switch (currentMode) {
      case 'dashboard':
        return <DashboardMode onModeChange={handleModeChange} />;
      case 'jarvis':
        return <JarvisMode wakeWordTriggered={wakeWordTriggered} />;
      case 'chat-pro':
      case 'chat-fast':
        return <ChatMode key={currentMode} mode={currentMode} />;
      case 'liquid-chat':
        return <LiquidChatMode />;
      case 'omni-chat':
        return <OmniChatMode />;
      case 'voice-live':
        return <VoiceMode />;
      case 'search-maps':
        return <SearchMapsMode />;
      case 'transcription':
        return <AudioTranscriptionMode />;
      case 'tts':
        return <TextToSpeechMode />;
      case 'coder':
        return <CoderMode />;
      case 'settings':
        return <SettingsMode />;
      case 'logs':
        return <LogsMode />;
      default:
        return <div>Select a mode</div>;
    }
  };

  const handleModeChange = (mode: AppMode | 'liquid-chat') => {
    setCurrentMode(mode);
    setIsSidebarOpen(false);
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden relative ${getBgClass()} ${getTextClass()}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out h-full`}>
        <Sidebar currentMode={currentMode} onModeChange={handleModeChange} />
      </div>

      <main className={`flex-1 h-full overflow-hidden relative ${getBgClass()}`}>
        {/* Mobile Menu Button */}
        <button
          className="md:hidden absolute top-3 left-3 z-50 p-2 bg-black/50 text-white rounded-lg backdrop-blur-md border border-white/10 shadow-lg"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <ErrorBoundary key={currentMode} modeName={MODE_LABELS[currentMode]}>
          {renderMode()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
