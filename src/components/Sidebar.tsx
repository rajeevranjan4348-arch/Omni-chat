import React from 'react';
import { AppMode } from '../types';
import { MessageSquare, Zap, Mic, MapPin, FileAudio, Volume2, Cpu, Code, Settings, TerminalSquare, Sparkles, Bot, LayoutDashboard, History } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  currentMode: AppMode | 'liquid-chat';
  onModeChange: (mode: AppMode | 'liquid-chat') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange }) => {
  const { getSidebarClass, getAccentClass, getBorderClass } = useTheme();

  const modes: { id: AppMode | 'liquid-chat'; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'history', label: 'Chat History', icon: <History size={20} /> },
    { id: 'jarvis', label: 'J.A.R.V.I.S. HUD', icon: <Cpu size={20} /> },
    { id: 'coder', label: 'AI Coder IDE', icon: <Code size={20} /> },
    { id: 'liquid-chat', label: 'Liquid Chat', icon: <Sparkles size={20} /> },
    { id: 'omni-chat', label: 'Omni Chat', icon: <Bot size={20} /> },
    { id: 'chat-pro', label: 'Pro Chat (Thinking)', icon: <MessageSquare size={20} /> },
    { id: 'chat-fast', label: 'Fast Chat', icon: <Zap size={20} /> },
    { id: 'voice-live', label: 'Voice (Live API)', icon: <Mic size={20} /> },
    { id: 'search-maps', label: 'Search & Maps', icon: <MapPin size={20} /> },
    { id: 'transcription', label: 'Transcription', icon: <FileAudio size={20} /> },
    { id: 'tts', label: 'Text to Speech', icon: <Volume2 size={20} /> },
    { id: 'logs', label: 'Application Logs', icon: <TerminalSquare size={20} /> },
  ];

  return (
    <div className={`w-64 flex flex-col h-full border-r shrink-0 ${getSidebarClass()} ${getBorderClass()}`}>
      <div className={`p-4 border-b ${getBorderClass()}`}>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className={getAccentClass()} />
          OmniChat AI
        </h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {modes.map((mode) => (
            <li key={mode.id}>
              <button
                onClick={() => onModeChange(mode.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentMode === mode.id
                    ? `bg-white/10 ${getAccentClass()} font-medium`
                    : 'hover:bg-black/20 hover:text-white text-white/70'
                }`}
              >
                {mode.icon}
                {mode.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className={`p-4 border-t ${getBorderClass()}`}>
        <button
          onClick={() => onModeChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentMode === 'settings'
              ? `bg-white/10 ${getAccentClass()} font-medium`
              : 'hover:bg-black/20 hover:text-white text-white/70'
          }`}
        >
          <Settings size={20} />
          Settings
        </button>
      </div>
    </div>
  );
};
