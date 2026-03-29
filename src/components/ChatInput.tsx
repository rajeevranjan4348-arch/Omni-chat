import React, { useState, useRef } from 'react';
import { Send, Loader2, Mic, Square } from 'lucide-react';
import { transcribeAudio } from '../services/gemini';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, placeholder = "Type your message..." }) => {
  const { isDarkMode, getBorderClass, getAccentClass } = useTheme();
  const { micId } = useSettings();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isTranscribing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Audio = base64data.split(',')[1];
          
          try {
            const response = await transcribeAudio(base64Audio, audioBlob.type || 'audio/webm');
            if (response.text) {
              setInput((prev) => prev + (prev ? ' ' : '') + response.text);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            alert('Failed to transcribe audio. Please try again.');
          } finally {
            setIsTranscribing(false);
          }
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access the microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className={`p-3 sm:p-4 border-t ${getBorderClass()} ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 sm:gap-3 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isTranscribing}
          className={`p-2.5 sm:p-3 rounded-full transition-all shrink-0 ${
            isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-md shadow-red-500/20' 
              : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRecording ? "Stop recording" : "Use microphone"}
        >
          {isRecording ? <Square size={18} className="fill-current sm:w-5 sm:h-5" /> : <Mic size={18} className="sm:w-5 sm:h-5" />}
        </button>
        
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTranscribing ? "Transcribing..." : isRecording ? "Listening..." : placeholder}
            disabled={isLoading || isTranscribing || isRecording}
            className={`w-full pl-4 pr-12 py-3 sm:py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-all shadow-sm text-sm sm:text-base ${
              isDarkMode 
                ? `bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500 disabled:bg-slate-800/50` 
                : `bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-emerald-500 disabled:bg-slate-50`
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isTranscribing || isRecording}
            className={`absolute right-1.5 p-2 sm:p-2.5 rounded-xl text-white transition-all disabled:opacity-40 disabled:scale-95 ${
              input.trim() && !isLoading && !isTranscribing && !isRecording
                ? (isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/20 scale-100' : 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 scale-100')
                : (isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400')
            }`}
          >
            {isLoading || isTranscribing ? <Loader2 size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" /> : <Send size={16} className="sm:w-[18px] sm:h-[18px] translate-x-[1px] translate-y-[1px]" />}
          </button>
        </div>
      </form>
    </div>
  );
};
