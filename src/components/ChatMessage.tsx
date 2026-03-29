import React, { useState } from 'react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Bot, User, Volume2, Loader2, Square, Check, CheckCheck } from 'lucide-react';
import { generateSpeech } from '../services/gemini';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { isDarkMode, getBorderClass } = useTheme();
  const { userProfile } = useSettings();
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlayAudio = async () => {
    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    if (!message.text) return;

    setIsGenerating(true);
    try {
      const response = await generateSpeech(message.text);
      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      
      if (inlineData && inlineData.data) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const binaryString = window.atob(inlineData.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768.0;
        }
        
        const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPlaying(false);
        source.start(0);
        
        setAudioElement({ pause: () => { source.stop(); audioCtx.close(); } } as any);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return null;
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className={`flex gap-3 sm:gap-4 p-2 sm:p-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${isUser ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white')}`}>
        {isUser ? (
          userProfile.avatarUrl ? (
            <img src={userProfile.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : userProfile.name ? (
            <span className="text-xs sm:text-sm font-bold">{getInitials(userProfile.name)}</span>
          ) : (
            <User size={18} />
          )
        ) : (
          <Bot size={18} />
        )}
      </div>
      
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 mb-1.5 px-1`}>
          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isUser ? (userProfile.name || 'You') : 'OmniChat AI'}
          </span>
          {message.timestamp && (
            <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-1`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {isUser && (
                <span className="opacity-70" title={message.status || 'sent'}>
                  {message.status === 'read' ? (
                    <CheckCheck size={12} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} />
                  ) : message.status === 'delivered' ? (
                    <CheckCheck size={12} className={isDarkMode ? 'text-slate-400' : 'text-slate-400'} />
                  ) : (
                    <Check size={12} className={isDarkMode ? 'text-slate-400' : 'text-slate-400'} />
                  )}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="relative group/bubble">
          <div className={`px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-sm ${
            isUser 
              ? (isDarkMode ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-indigo-500 text-white rounded-tr-sm')
              : (isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200')
          }`}>
            {message.isStreaming && !message.text ? (
              <div className="flex items-center gap-1.5 h-6 px-2">
                <div className={`w-2 h-2 rounded-full animate-bounce ${isUser ? 'bg-white/70' : (isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500')}`} style={{ animationDelay: '0ms' }}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce ${isUser ? 'bg-white/70' : (isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500')}`} style={{ animationDelay: '150ms' }}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce ${isUser ? 'bg-white/70' : (isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500')}`} style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              <MarkdownRenderer content={message.text} forceInvert={isUser} />
            )}
          </div>
          
          {!isUser && !message.isStreaming && message.text && (
            <button 
              onClick={handlePlayAudio}
              disabled={isGenerating}
              className={`absolute -right-10 top-2 p-1.5 rounded-full transition-all opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-400 hover:text-emerald-500 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}
              title="Read aloud"
            >
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : 
               isPlaying ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
            </button>
          )}
        </div>
        
        {message.groundingChunks && message.groundingChunks.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {message.groundingChunks.map((chunk, idx) => {
              if (chunk.web) {
                return (
                  <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className={`text-[10px] sm:text-xs px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300 bg-blue-900/20 border-blue-900/50 hover:bg-blue-900/40' : 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100'}`}>
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{chunk.web.title || new URL(chunk.web.uri).hostname}</span>
                  </a>
                );
              }
              if (chunk.maps) {
                return (
                  <a key={idx} href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className={`text-[10px] sm:text-xs px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border-emerald-900/50 hover:bg-emerald-900/40' : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}>
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{chunk.maps.title || 'View on Google Maps'}</span>
                  </a>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

