import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Volume2, Activity } from 'lucide-react';
import { getAiInstance } from '../services/gemini';
import { LiveServerMessage, Modality } from '@google/genai';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

export const VoiceMode: React.FC = () => {
  const { isDarkMode, getBorderClass } = useTheme();
  const { micId, ttsVoice } = useSettings();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Disconnected');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    setStatus('Connecting...');

    try {
      const ai = getAiInstance();
      
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsVoice } },
          },
          systemInstruction: { parts: [{ text: "You are a helpful voice assistant. Keep your responses concise and conversational." }] },
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setStatus('Connected. Listening...');
            startAudioCapture(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              playAudioChunk(base64Audio);
            }
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => {
            setIsConnected(false);
            setStatus('Disconnected');
            stopAudioCapture();
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError('Connection error occurred.');
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect to Live API');
      setIsConnecting(false);
      setStatus('Disconnected');
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    stopAudioCapture();
    setIsConnected(false);
    setIsConnecting(false);
    setStatus('Disconnected');
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const startAudioCapture = async (sessionPromise: Promise<any>) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: micId === 'default' ? true : { deviceId: { exact: micId } } 
      });
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
        }
        
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        
        sessionPromise.then((session) => {
          session.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        });
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone.');
      disconnect();
    }
  };

  const stopAudioCapture = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }
    
    playbackQueueRef.current.push(float32);
    
    if (!isPlayingRef.current) {
      processPlaybackQueue();
    }
  };

  const processPlaybackQueue = () => {
    if (playbackQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const chunk = playbackQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000); // Output sample rate is 24000
    audioBuffer.getChannelData(0).set(chunk);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      processPlaybackQueue();
    };
    
    source.start();
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className={`flex flex-col h-full items-center justify-center p-8 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`max-w-2xl w-full rounded-2xl shadow-sm border p-8 flex flex-col items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${
          isConnected ? (isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-500') : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')
        }`}>
          {isConnected ? <Activity size={40} className="animate-pulse" /> : <Volume2 size={40} />}
        </div>
        
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Live Voice Conversation</h2>
        <p className={`text-center mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Have a real-time, low-latency voice conversation with Gemini using the Live API.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting && !isConnected}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isConnected 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isConnecting && !isConnected ? (
              <Loader2 size={40} className="text-white animate-spin" />
            ) : isConnected ? (
              <Square size={40} className="text-white fill-current" />
            ) : (
              <Mic size={40} className="text-white" />
            )}
          </button>
          
          <div className="flex flex-col items-center mt-4">
            <span className={`font-medium ${isConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
              {status}
            </span>
            {error && (
              <span className="text-red-500 text-sm mt-2 text-center max-w-md">
                {error}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
