import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Mic, MicOff, Square, Loader2, Volume2, Activity, Plus, Trash2, 
  MessageSquare, Phone, PhoneOff, Calendar, Clock, Lock, Shield, 
  Info, Settings, Check, AlertTriangle, Monitor, Search, Play, Pause, 
  Download, Copy, RefreshCw, Edit2, Radio, Sparkles, ChevronRight, CheckCircle2, History
} from 'lucide-react';
import { getAiInstance } from '../services/gemini';
import { LiveServerMessage, Modality } from '@google/genai';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { auth, saveVoiceCommandToCloud, saveVoiceSessionToCloud, deleteVoiceSessionFromCloud, syncVoiceSessions } from '../lib/firebase';
import { ScreenStreamModal } from '../components/ScreenStreamModal';
import { OrbBloop } from '../components/orb/bloop';
import { BloopState } from '../components/orb/bloop/types';
import { BLOOP_PALETTES, BloopPaletteName } from '../components/orb/bloop/palettes';

export interface VoiceSession {
  id: string;
  title: string;
  updatedAt: Date;
  status: 'Disconnected' | 'Connecting' | 'Connected' | 'Completed';
  duration: string;
  durationSecs?: number;
  audioPath?: string;
  transcript?: string;
  model?: string;
  hasRecording?: boolean;
  audioMimeType?: string;
  type?: 'voice' | 'voice-live' | 'voice-call';
  messages?: VoiceHistoryItem[];
}

export interface VoiceHistoryItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const VoiceMode: React.FC = () => {
  const { color, isDarkMode, getAccentClass, getBorderClass } = useTheme();
  const { micId, ttsVoice, setMicPermissionError } = useSettings();

  const [recordSession, setRecordSession] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(() => {
    return localStorage.getItem('omnichat_voice_record_consent') === 'true';
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const channelMergerRef = useRef<ChannelMergerNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  
  const [sessions, setSessions] = useState<VoiceSession[]>(() => {
    const saved = localStorage.getItem('omnichat_voice_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          type: s.type || 'voice',
          updatedAt: new Date(s.updatedAt),
          messages: Array.isArray(s.messages) ? s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })) : []
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('omnichat_voice_current') || null;
  });

  const [showHistory, setShowHistory] = useState(true);
  // Voice opens on a dedicated history landing screen. The full live-call UI is shown only after a session is selected or a new call is created.
  const [showHistoryLanding, setShowHistoryLanding] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'chat' | 'hud'>('chat');

  // Audio Playback State for Recorded Sessions
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Disconnected');
  
  const callStartTimeRef = useRef<number | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Web Audio API Analyser and Visualizer references
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const volumeMeterRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isConnectedRef = useRef(false);
  const isDarkModeRef = useRef(isDarkMode);
  const colorRef = useRef(color);

  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const isMutedRef = useRef(false);
  const orbPalette = BLOOP_PALETTES[BloopPaletteName.blue];
  const orbState = isConnecting
    ? BloopState.think
    : isAiSpeaking
      ? BloopState.speak
      : isConnected && !isMuted
        ? BloopState.listen
        : BloopState.idle;
  const [showDrawer, setShowDrawer] = useState(true);
  const [isScreenStreamOpen, setIsScreenStreamOpen] = useState(false);
  const [interactionHistory, setInteractionHistory] = useState<VoiceHistoryItem[]>([]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Track which session ID's messages are currently loaded in memory
  const loadedSessionIdRef = useRef<string | null>(null);

  // Load session messages into interactionHistory when switching sessions
  useEffect(() => {
    if (!currentSessionId) {
      setInteractionHistory([]);
      loadedSessionIdRef.current = null;
      return;
    }
    
    // Only load if switching to a different session and not connected
    if (!isConnected && !isConnecting && loadedSessionIdRef.current !== currentSessionId) {
      loadedSessionIdRef.current = currentSessionId;
      const current = sessions.find(s => s.id === currentSessionId);
      if (current) {
        if (current.messages && current.messages.length > 0) {
          setInteractionHistory(current.messages.map(m => ({
            ...m,
            timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
          })));
        } else if (current.transcript) {
          // Reconstruct message bubbles from transcript text
          const parsedLines = current.transcript.split('\n\n').filter(Boolean);
          const reconstructed: VoiceHistoryItem[] = parsedLines.map((line, idx) => {
            const isUser = line.startsWith('User:');
            const text = line.replace(/^(User|Assistant):\s*/, '');
            return {
              id: `hist-${current.id}-${idx}`,
              sender: isUser ? 'user' : 'assistant',
              text: text,
              timestamp: current.updatedAt instanceof Date ? current.updatedAt : new Date(current.updatedAt)
            };
          });
          setInteractionHistory(reconstructed);
        } else {
          setInteractionHistory([]);
        }
      }
    }
  }, [currentSessionId, sessions, isConnected, isConnecting]);

  // Persist interactionHistory to active session in sessions state and localStorage
  useEffect(() => {
    if (interactionHistory.length === 0 || !currentSessionId) return;

    // Keep session state synced with full voice chat history
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const fullTranscript = interactionHistory
          .map(h => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
          .join('\n\n');
        return {
          ...s,
          type: 'voice',
          messages: interactionHistory,
          transcript: fullTranscript,
          updatedAt: new Date()
        };
      }
      return s;
    }));
    
    try {
      const raw = localStorage.getItem('omnichat_voice_commands');
      let list = raw ? JSON.parse(raw) : [];
      
      const currentSessionPrefix = `vc-live-${currentSessionId || 'global'}`;
      list = list.filter((item: any) => !item.id.startsWith(currentSessionPrefix));
      
      const newItems: any[] = [];
      for (let i = 0; i < interactionHistory.length; i++) {
        const msg = interactionHistory[i];
        if (msg.sender === 'user') {
          const nextMsg = interactionHistory[i + 1];
          const responseText = (nextMsg && nextMsg.sender === 'assistant') ? nextMsg.text : undefined;
          
          const newItem = {
            id: `${currentSessionPrefix}-${i}`,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date(msg.timestamp).getTime(),
            source: 'voice-live',
            type: 'voice',
            text: msg.text,
            title: `Voice Command`,
            messages: [
              { role: 'user', text: msg.text },
              ...(responseText ? [{ role: 'model', text: responseText }] : [])
            ]
          };
          newItems.push(newItem);

          if (auth.currentUser) {
            saveVoiceCommandToCloud(newItem).catch(err => {
              console.error('Failed to sync voice command to cloud:', err);
            });
          }
        }
      }
      
      const combined = [...newItems, ...list];
      localStorage.setItem('omnichat_voice_commands', JSON.stringify(combined.slice(0, 150)));
    } catch (e) {
      console.error('Failed to save voice commands from VoiceMode:', e);
    }
  }, [interactionHistory, currentSessionId]);

  // Audio Playback Handler for recorded sessions
  const handlePlayRecording = async (sessionId: string) => {
    if (playingAudioId === sessionId && audioBlobUrl) {
      if (audioElemRef.current) {
        if (audioElemRef.current.paused) {
          audioElemRef.current.play();
        } else {
          audioElemRef.current.pause();
        }
      }
      return;
    }

    try {
      setIsLoadingAudio(true);
      setAudioPlaybackError(null);
      const { getRecordingFromIDB, decryptAudioBlob } = await import('../utils/audioDB');
      const recData = await getRecordingFromIDB(sessionId);
      if (!recData) {
        setAudioPlaybackError('No encrypted audio recording found in local storage.');
        setIsLoadingAudio(false);
        return;
      }
      const sess = sessions.find(s => s.id === sessionId);
      const mime = sess?.audioMimeType || 'audio/webm';
      const decryptedBlob = await decryptAudioBlob(recData.encryptedBuffer, recData.iv, mime);
      const url = URL.createObjectURL(decryptedBlob);
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
      setAudioBlobUrl(url);
      setPlayingAudioId(sessionId);
      setIsLoadingAudio(false);
    } catch (err: any) {
      console.error('Failed to load/decrypt recording:', err);
      setAudioPlaybackError('Failed to decrypt audio recording.');
      setIsLoadingAudio(false);
    }
  };

  const handleCopyTranscript = (transcriptText?: string) => {
    const textToCopy = transcriptText || interactionHistory.map(m => `${m.sender === 'user' ? 'You' : 'Gemini'}: ${m.text}`).join('\n\n');
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim(), updatedAt: new Date() } : s));
    setEditingSessionId(null);
  };

  // Filtered voice sessions for search in Voice History panel
  const filteredSessions = useMemo(() => {
    if (!historySearchQuery.trim()) return sessions;
    const q = historySearchQuery.toLowerCase();
    return sessions.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.transcript && s.transcript.toLowerCase().includes(q))
    );
  }, [sessions, historySearchQuery]);

  const startVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const themeColorMap: Record<string, { primary: string; secondary: string; tertiary: string }> = {
      emerald: {
        primary: 'rgba(16, 185, 129, 0.8)',
        secondary: 'rgba(52, 211, 153, 0.5)',
        tertiary: 'rgba(110, 231, 183, 0.3)',
      },
      indigo: {
        primary: 'rgba(99, 102, 241, 0.8)',
        secondary: 'rgba(129, 140, 248, 0.5)',
        tertiary: 'rgba(165, 180, 252, 0.3)',
      },
      rose: {
        primary: 'rgba(244, 63, 94, 0.8)',
        secondary: 'rgba(251, 113, 133, 0.5)',
        tertiary: 'rgba(253, 164, 175, 0.3)',
      },
      amber: {
        primary: 'rgba(245, 158, 11, 0.8)',
        secondary: 'rgba(251, 191, 36, 0.5)',
        tertiary: 'rgba(252, 211, 77, 0.3)',
      },
      cyan: {
        primary: 'rgba(6, 182, 212, 0.8)',
        secondary: 'rgba(34, 211, 238, 0.5)',
        tertiary: 'rgba(103, 232, 249, 0.3)',
      },
      fuchsia: {
        primary: 'rgba(217, 70, 239, 0.8)',
        secondary: 'rgba(232, 121, 249, 0.5)',
        tertiary: 'rgba(240, 171, 252, 0.3)',
      },
      orange: {
        primary: 'rgba(249, 115, 22, 0.8)',
        secondary: 'rgba(251, 146, 60, 0.5)',
        tertiary: 'rgba(253, 186, 116, 0.3)',
      },
      slate: {
        primary: 'rgba(71, 85, 105, 0.8)',
        secondary: 'rgba(100, 116, 139, 0.5)',
        tertiary: 'rgba(148, 163, 184, 0.3)',
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Handle high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      // Draw background
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const connected = isConnectedRef.current && analyser && !isMutedRef.current;
      const dark = isDarkModeRef.current;

      let amplitude = 0;
      let dataArray = new Uint8Array(0);

      if (connected) {
        try {
          const bufferLength = analyser.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);

          // Calculate average volume/amplitude (RMS)
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          amplitude = rms * 2.0;
        } catch (e) {
          console.error('Error analyzing audio data:', e);
        }
      }

      // Update volume meter level directly for performance (60 FPS smooth updates)
      let volPercentage = 0;
      if (connected && !isMutedRef.current) {
        const rmsValue = amplitude / 2.0;
        volPercentage = Math.min(100, Math.round(rmsValue * 400));
      }

      const volBar = volumeMeterRef.current;
      const volLabel = document.getElementById('volume-db-label');
      
      if (volBar) {
        volBar.style.width = `${volPercentage}%`;
        if (volPercentage > 75) {
          volBar.style.backgroundColor = '#ef4444'; // Red (Clipping)
        } else if (volPercentage > 15) {
          volBar.style.backgroundColor = '#10b981'; // Emerald (Optimal)
        } else {
          volBar.style.backgroundColor = '#3b82f6'; // Blue (Quiet)
        }
      }
      
      if (volLabel) {
        if (!isConnectedRef.current) {
          volLabel.textContent = 'Disconnected';
        } else if (isMutedRef.current) {
          volLabel.textContent = 'Muted';
        } else {
          volLabel.textContent = volPercentage > 75 
            ? 'Too Loud' 
            : volPercentage > 15 
              ? 'Optimal' 
              : 'Too Quiet';
        }
      }

      const time = Date.now() * 0.004;
      const currentThemeColor = colorRef.current || 'slate';
      const colors = themeColorMap[currentThemeColor] || themeColorMap.slate;

      // Draw 3 distinct flowing waves
      const layers = [
        { 
          color: colors.primary, 
          speed: 0.08, 
          frequency: 3, 
          phaseShift: 0,
          lineWidth: 2.5
        },
        { 
          color: colors.secondary, 
          speed: -0.06, 
          frequency: 4, 
          phaseShift: Math.PI / 3,
          lineWidth: 1.5
        },
        { 
          color: colors.tertiary, 
          speed: 0.04, 
          frequency: 2, 
          phaseShift: Math.PI / 1.5,
          lineWidth: 1.0
        },
      ];

      layers.forEach((layer) => {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.lineWidth;
        
        if (dark && connected && amplitude > 0.02) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = layer.color;
        } else {
          ctx.shadowBlur = 0;
        }

        for (let x = 0; x < width; x++) {
          const normX = x / width;
          // Capsule envelope (pinches the left and right ends to 0)
          const envelope = Math.sin(normX * Math.PI);

          let audioOffset = 0;
          if (connected && dataArray.length > 0) {
            const dataIndex = Math.floor(normX * dataArray.length);
            audioOffset = (dataArray[dataIndex] - 128) / 128;
          }

          // Modulation base: idle wave amplitude is 4px, connected is up to 40px
          const ampBase = connected ? (amplitude * 35 + 4) : 5;
          const speedFactor = connected ? 1.6 : 0.4;
          
          const angle = normX * Math.PI * layer.frequency + (time * speedFactor) + layer.phaseShift;
          const waveValue = Math.sin(angle);

          const y = (height / 2) + (audioOffset * 30 + waveValue * ampBase) * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    localStorage.setItem('omnichat_voice_sessions', JSON.stringify(sessions));
    if (auth.currentUser) {
      syncVoiceSessions(sessions).then(merged => {
        const localIds = sessions.map(s => s.id).join(',');
        const mergedIds = merged.map(s => s.id).join(',');
        if (localIds !== mergedIds) {
          setSessions(merged.map((s: any) => ({
            ...s,
            updatedAt: new Date(s.updatedAt)
          })));
        }
      }).catch(err => console.error('Error syncing voice sessions:', err));
    }
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('omnichat_voice_current', currentSessionId);
    } else {
      localStorage.removeItem('omnichat_voice_current');
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createNewSession = () => {
    if (currentSession && currentSession.status === 'Disconnected' && currentSession.duration === '--' && (!currentSession.messages || currentSession.messages.length === 0)) {
      // Already an empty default session exists
      return;
    }
    const newSession: VoiceSession = {
      id: Date.now().toString(),
      title: `Voice Call #${sessions.length + 1}`,
      updatedAt: new Date(),
      status: 'Disconnected',
      duration: '--',
      type: 'voice',
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInteractionHistory([]);
    setShowHistoryLanding(false);
    loadedSessionIdRef.current = newSession.id;
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this voice session call log?')) {
      if (isConnected && currentSessionId === id) {
        disconnect();
      }
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
      try {
        const { deleteRecordingFromIDB } = await import('../utils/audioDB');
        await deleteRecordingFromIDB(id);
        if (auth.currentUser) {
          await deleteVoiceSessionFromCloud(id);
        }
      } catch (err) {
        console.error('Failed to delete recording data:', err);
      }
    }
  };

  const updateSessionStatus = (sessId: string, updates: Partial<VoiceSession>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessId) {
        return {
          ...s,
          ...updates,
          updatedAt: new Date()
        };
      }
      return s;
    }));
  };

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const connect = async () => {
    if (!currentSessionId) return;
    if (!hasGivenConsent) {
      setShowConsentModal(true);
      return;
    }
    await startConnection(recordSession);
  };

  const startConnection = async (shouldRecord: boolean) => {
    setIsConnecting(true);
    setError(null);
    setStatus('Connecting...');
    setIsMuted(false);
    updateSessionStatus(currentSessionId!, { status: 'Connecting' });

    try {
      const ai = getAiInstance();
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsVoice } },
          },
          systemInstruction: { parts: [{ text: "You are a helpful voice assistant. Keep your responses concise and conversational." }] },
          outputAudioTranscription: {}, // Model output transcription
          inputAudioTranscription: {}, // User input transcription
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setStatus('Connected. Listening...');
            callStartTimeRef.current = Date.now();
            if (currentSessionId) {
              updateSessionStatus(currentSessionId, { status: 'Connected' });
            }
            startAudioCapture(sessionPromise, shouldRecord);
          },
          onmessage: async (message: LiveServerMessage) => {
            const msg = message as any;
            if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = msg.serverContent.modelTurn.parts[0].inlineData.data;
              playAudioChunk(base64Audio);
            }
            if (msg.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
            }

            // Handle user transcription
            if (msg.serverContent?.userTurn) {
              const text = msg.serverContent.userTurn.parts
                ?.map((p: any) => p.text)
                .filter(Boolean)
                .join('');
              if (text) {
                setInteractionHistory((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.sender === 'user') {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...last,
                      text: text, // userTurn contains full accumulated turn text
                    };
                    return updated;
                  } else {
                    return [
                      ...prev,
                      {
                        id: 'user-' + Date.now(),
                        sender: 'user',
                        text: text,
                        timestamp: new Date(),
                      },
                    ];
                  }
                });
              }
            }

            // Handle assistant/model transcription
            if (msg.serverContent?.modelTurn) {
              const text = msg.serverContent.modelTurn.parts
                ?.map((p: any) => p.text)
                .filter(Boolean)
                .join('');
              if (text) {
                setInteractionHistory((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.sender === 'assistant') {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...last,
                      text: last.text + text, // modelTurn parts can stream in chunk-by-chunk
                    };
                    return updated;
                  } else {
                    return [
                      ...prev,
                      {
                        id: 'assistant-' + Date.now(),
                        sender: 'assistant',
                        text: text,
                        timestamp: new Date(),
                      },
                    ];
                  }
                });
              }
            }
          },
          onclose: () => {
            handleDisconnectCleanup(shouldRecord);
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
      if (currentSessionId) {
        updateSessionStatus(currentSessionId, { status: 'Disconnected' });
      }
    }
  };

  const handleDisconnectCleanup = (shouldRecord: boolean) => {
    setIsConnected(false);
    setIsConnecting(false);
    setStatus('Disconnected');
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    setIsAiSpeaking(false);

    if (callStartTimeRef.current && currentSessionId) {
      const durationMs = Date.now() - callStartTimeRef.current;
      const formatted = formatDuration(durationMs);
      
      const fullTranscript = interactionHistory
        .map(h => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n\n');
      const updatedSess = { 
        status: 'Completed' as const, 
        duration: formatted,
        durationSecs: Math.floor(durationMs / 1000),
        audioPath: `/storage/emulated/0/AI/history/session_${currentSessionId}.m4a`,
        transcript: fullTranscript || 'No speech transcription captured.',
        type: 'voice' as const,
        messages: interactionHistory,
        model: 'Gemini 3.1 Flash Live',
        hasRecording: shouldRecord,
        audioMimeType: mediaRecorderRef.current?.mimeType || 'audio/webm'
      };

      updateSessionStatus(currentSessionId, updatedSess);

      if (auth.currentUser) {
        const currentSessObj = sessions.find(s => s.id === currentSessionId);
        if (currentSessObj) {
          saveVoiceSessionToCloud({
            ...currentSessObj,
            ...updatedSess,
            updatedAt: new Date()
          }).catch(e => console.error('Error syncing voice session update to cloud:', e));
        }
      }

      callStartTimeRef.current = null;
    } else if (currentSessionId) {
      updateSessionStatus(currentSessionId, { status: 'Disconnected' });
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    stopAudioCapture();
    handleDisconnectCleanup(recordSession);
  };

  const startAudioCapture = async (sessionPromise: Promise<any>, shouldRecord: boolean) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: micId === 'default' ? true : { deviceId: { exact: micId } } 
      });
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      
      // Create and configure the AnalyserNode for real-time waveform visualization
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Create Microphone Gain control
      const micGain = audioContextRef.current.createGain();
      micGain.gain.value = isMutedRef.current ? 0 : 1;
      micGainRef.current = micGain;
      source.connect(micGain);

      // Setup stereo recording if session recording enabled
      if (shouldRecord) {
        // Create destination for recorder
        const dest = audioContextRef.current.createMediaStreamDestination();
        mediaStreamDestinationRef.current = dest;

        // Create ChannelMerger for stereo: Left channel is user microphone, Right is AI response
        const merger = audioContextRef.current.createChannelMerger(2);
        channelMergerRef.current = merger;
        merger.connect(dest);

        // User Mic goes to Channel 0 (Left) of Merger
        micGain.connect(merger, 0, 0);

        const chunks: Blob[] = [];
        chunksRef.current = chunks;

        let recorder: MediaRecorder;
        const options = { mimeType: 'audio/webm' };
        try {
          recorder = new MediaRecorder(dest.stream, options);
        } catch (e) {
          try {
            recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/ogg' });
          } catch (e2) {
            recorder = new MediaRecorder(dest.stream);
          }
        }

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        const currentSessIdForStop = currentSessionId;
        recorder.onstop = async () => {
          if (chunks.length === 0) return;
          const mimeType = recorder.mimeType || 'audio/webm';
          const finalBlob = new Blob(chunks, { type: mimeType });

          // Encrypt and save to IndexedDB
          try {
            const { encryptAudioBlob, saveRecordingToIDB } = await import('../utils/audioDB');
            const { encryptedBuffer, iv } = await encryptAudioBlob(finalBlob);
            if (currentSessIdForStop) {
              await saveRecordingToIDB(currentSessIdForStop, encryptedBuffer, iv);
              console.log('Stereo voice session recording encrypted & saved to IndexedDB!');
            }
          } catch (err) {
            console.error('Failed to encrypt/save voice session recording:', err);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000); // 1-second chunks
      }

      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (isMutedRef.current) {
          return;
        }

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
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        });
      };

      micGain.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.warn('Microphone access blocked or unavailable:', err);
      setError('Could not access microphone. Grant microphone permissions or open in new tab.');
      setMicPermissionError(true);
      disconnect();
    }
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
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
    analyserRef.current = null;
    channelMergerRef.current = null;
    mediaStreamDestinationRef.current = null;
    micGainRef.current = null;
  };

  const playAudioChunk = (base64Audio: string) => {
    setIsAiSpeaking(true);
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
      setIsAiSpeaking(false);
      return;
    }
    
    isPlayingRef.current = true;
    const chunk = playbackQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000); // Output sample rate is 24000
    audioBuffer.getChannelData(0).set(chunk);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect to the same analyser to visualize AI playback responses on the waveform as well!
    if (analyserRef.current) {
      source.connect(analyserRef.current);
    }
    
    // Route to user speakers
    source.connect(audioContextRef.current.destination);

    // Route AI playback to Channel 1 (Right) of the Stereo Recording Merger
    if (recordSession && channelMergerRef.current) {
      source.connect(channelMergerRef.current, 0, 1);
    }
    
    source.onended = () => {
      processPlaybackQueue();
      if (playbackQueueRef.current.length === 0) setIsAiSpeaking(false);
    };
    
    source.start();
  };

  useEffect(() => {
    startVisualizer();
    return () => {
      stopVisualizer();
      disconnect();
    };
  }, []);

  if (showHistoryLanding) {
    return (
      <div className={`flex h-full w-full flex-col overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <History size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Voice History</h1>
              <p className="text-[11px] opacity-55">Choose a previous voice conversation or start a new call.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={createNewSession}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all shrink-0"
          >
            <Plus size={14} /> New Call
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search voice history..."
                className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'}`}
              />
            </div>

            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-semibold opacity-55">
                {filteredSessions.length} saved {filteredSessions.length === 1 ? 'conversation' : 'conversations'}
              </span>
              <span className="text-[10px] opacity-40">Voice Live</span>
            </div>

            {filteredSessions.length === 0 ? (
              <div className={`min-h-[280px] rounded-2xl border flex flex-col items-center justify-center text-center p-6 ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                  <Mic size={28} />
                </div>
                <h2 className="text-sm font-bold mb-1">No voice conversations yet</h2>
                <p className="text-xs opacity-55 max-w-sm mb-5">Start a new voice call to create your first voice conversation history.</p>
                <button
                  type="button"
                  onClick={createNewSession}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Phone size={14} /> Start New Call
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSessions.map((s) => {
                  const turnCount = s.messages?.length || (s.transcript ? s.transcript.split('\\n\\n').length : 0);
                  const lastMsg = s.messages && s.messages.length > 0
                    ? s.messages[s.messages.length - 1].text
                    : (s.transcript ? s.transcript.slice(-120) : '');

                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setCurrentSessionId(s.id);
                        setInteractionHistory(s.messages || []);
                        loadedSessionIdRef.current = s.id;
                        setShowHistoryLanding(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCurrentSessionId(s.id);
                          setInteractionHistory(s.messages || []);
                          loadedSessionIdRef.current = s.id;
                          setShowHistoryLanding(false);
                        }
                      }}
                      className={`group rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                            {s.status === 'Connected' ? <Phone size={15} /> : <Mic size={15} />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold truncate">{s.title}</h3>
                            <p className="text-[10px] opacity-45 mt-0.5">{s.updatedAt.toLocaleString()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => deleteSession(s.id, e)}
                          className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mt-4 text-[10px] opacity-55">
                        <span className="flex items-center gap-1"><Clock size={10} /> {s.duration !== '--' ? s.duration : 'Not started'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MessageSquare size={10} /> {turnCount} {turnCount === 1 ? 'turn' : 'turns'}</span>
                        {s.hasRecording && <span className="text-emerald-400 flex items-center gap-1"><Shield size={10} /> Audio</span>}
                      </div>

                      {lastMsg && (
                        <p className="mt-2.5 text-[10px] opacity-45 truncate">{lastMsg}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full relative overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Voice History Collapsible Sidebar (Left) */}
      <AnimatePresence initial={false}>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            style={{ willChange: 'width, opacity' }}
            className={`flex flex-col h-full border-r shrink-0 relative z-10 overflow-hidden ${
              isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div style={{ width: 300 }} className="flex flex-col h-full p-3.5">
              {/* Header with Title and New Call button */}
              <div className="flex items-center justify-between mb-3 shrink-0 pb-2 border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <Mic size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider">Voice History</h3>
                    <span className="text-[10px] opacity-60">Live Calls</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createNewSession}
                  disabled={isConnected || isConnecting}
                  title="New Voice Call"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-50`}
                >
                  <Plus size={14} /> <span>New Call</span>
                </button>
              </div>

              {/* Search Voice Sessions Input */}
              <div className="relative mb-2.5 shrink-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search voice transcripts..."
                  className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border transition-all outline-none ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sessions Counter */}
              <div className="flex items-center justify-between px-1 mb-2 shrink-0 text-[10px] opacity-60 font-medium">
                <span>{filteredSessions.length} voice {filteredSessions.length === 1 ? 'call' : 'calls'} saved</span>
              </div>

              {/* Voice Sessions List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 hide-scrollbar">
                {filteredSessions.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 opacity-50">
                    <Mic size={24} className="mb-2 opacity-30 text-rose-400" />
                    <p className="text-xs font-medium">No voice conversations found</p>
                    <p className="text-[10px] opacity-60 mt-0.5">Start speaking with Gemini to create voice chat history.</p>
                  </div>
                ) : (
                  filteredSessions.map(s => {
                    const isSelected = currentSessionId === s.id;
                    const turnCount = s.messages?.length || (s.transcript ? s.transcript.split('\n\n').length : 0);
                    const lastMsg = s.messages && s.messages.length > 0 
                      ? s.messages[s.messages.length - 1].text 
                      : (s.transcript ? s.transcript.slice(-90) : '');

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (!isConnected && !isConnecting) {
                            setCurrentSessionId(s.id);
                          }
                        }}
                        className={`group relative flex flex-col p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? (isDarkMode 
                                ? 'bg-white/10 border-blue-500/50 text-white shadow-md' 
                                : 'bg-blue-50/80 border-blue-300 text-slate-900 shadow-sm')
                            : (isDarkMode 
                                ? 'hover:bg-white/5 border-transparent text-white/70 hover:text-white' 
                                : 'hover:bg-slate-100 border-transparent text-slate-700 hover:text-slate-900')
                        } ${(isConnected || isConnecting) && !isSelected ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        {/* Top Line: Icon, Title, Voice badge & Delete */}
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                            {s.status === 'Connected' ? (
                              <Phone size={13} className="shrink-0 text-emerald-400 animate-pulse" />
                            ) : (
                              <Mic size={13} className="shrink-0 text-rose-400" />
                            )}
                            
                            {editingSessionId === s.id ? (
                              <input
                                type="text"
                                value={editingTitleText}
                                onChange={(e) => setEditingTitleText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameSession(s.id, editingTitleText);
                                  if (e.key === 'Escape') setEditingSessionId(null);
                                }}
                                onBlur={() => handleRenameSession(s.id, editingTitleText)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs px-1.5 py-0.5 rounded bg-black/40 border border-blue-400 text-white outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs truncate font-semibold">{s.title}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Voice
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(s.id);
                                setEditingTitleText(s.title);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                              title="Rename Call"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button                              type="button"
                              onClick={(e) => deleteSession(s.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-500 transition-all"
                              title="Delete Call"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Metrics: Duration, Turn count, Audio Recorded indicator */}
                        <div className="flex items-center justify-between text-[10px] opacity-60 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {s.duration !== '--' ? s.duration : '0s'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={10} />
                              {turnCount} {turnCount === 1 ? 'turn' : 'turns'}
                            </span>
                          </div>

                          {s.hasRecording && (
                            <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                              <Shield size={10} /> Audio
                            </span>
                          )}
                        </div>

                        {/* Bottom line: Snippet preview */}
                        {lastMsg && (
                          <p className="text-[10px] opacity-50 truncate font-mono text-left">
                            {lastMsg}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Main Panel (Center) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        
        {/* Header Bar with Session Controls & Mode Switches */}
        <div className={`p-3.5 border-b flex items-center justify-between shrink-0 gap-3 ${
          isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
        }`}>
          {/* Left: Session Title, Voice Type Badge, Status */}
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
              <Mic size={16} />
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold truncate">
                  {currentSession?.title || 'Live Voice Conversation'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] opacity-60">
                <span>Gemini 3.1 Flash Live</span>
                {currentSession?.duration && currentSession.duration !== '--' && (
                  <>
                    <span>•</span>
                    <span>Duration: {currentSession.duration}</span>
                  </>
                )}
                <span>•</span>
                <span className={isConnected ? "text-emerald-400 font-semibold flex items-center gap-1" : ""}>
                  {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Controls & Toggles */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Call / Disconnect Quick Button */}
            {isConnected ? (
              <button
                type="button"
                onClick={disconnect}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
              >
                <PhoneOff size={14} /> <span>End Call</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={isConnecting || !currentSessionId}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Phone size={14} /> <span>Start Voice Call</span>
              </button>
            )}

            {/* Switch between Voice Chat History & Visualizer when disconnected and messages exist */}
            {!isConnected && interactionHistory.length > 0 && (
              <div className={`flex items-center p-0.5 rounded-lg border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('chat')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeViewTab === 'chat'
                      ? (isDarkMode ? 'bg-white/15 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="View Voice Chat History"
                >
                  <MessageSquare size={13} /> <span>History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('hud')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeViewTab === 'hud'
                      ? (isDarkMode ? 'bg-white/15 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="View Call HUD & Waveform Visualizer"
                >
                  <Activity size={13} /> <span>HUD</span>
                </button>
              </div>
            )}

            {/* Copy Voice Transcript */}
            {interactionHistory.length > 0 && (
              <button
                type="button"
                onClick={() => handleCopyTranscript()}
                title="Copy Full Voice Transcript"
                className={`p-1.5 rounded-lg border transition-all ${
                  copiedTranscript 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : (isDarkMode ? 'border-white/10 hover:bg-white/10 text-white/70' : 'border-slate-200 hover:bg-slate-100 text-slate-600')
                }`}
              >
                {copiedTranscript ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}

            {/* Live Transcript Drawer Toggle (only during call) */}
            {isConnected && (
              <button
                type="button"
                onClick={() => setShowDrawer(!showDrawer)}
                title="Toggle Live Transcript Drawer"
                className={`p-1.5 rounded-lg transition-colors border ${
                  showDrawer 
                    ? `bg-black/10 dark:bg-white/10 border-blue-500/30 ${getAccentClass()}` 
                    : (isDarkMode ? 'border-white/10 text-white/60 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-200')
                }`}
              >
                <Activity size={16} />
              </button>
            )}

            {/* Toggle Voice History Sidebar Button */}
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              title="Toggle Voice History Panel"
              className={`p-1.5 rounded-lg border transition-all ${
                showHistory 
                  ? `bg-rose-500/10 border-rose-500/30 text-rose-400` 
                  : (isDarkMode ? 'border-white/10 text-white/60 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-200')
              }`}
            >
              <History size={16} />
            </button>
          </div>
        </div>

        {/* Audio Recording Player Bar */}
        {currentSession?.hasRecording && (
          <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 text-xs gap-3 ${
            isDarkMode ? 'bg-black/20 border-white/10 text-blue-200' : 'bg-slate-50 border-slate-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handlePlayRecording(currentSession.id)}
                disabled={isLoadingAudio}
                className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-sm shrink-0 transition-all flex items-center justify-center disabled:opacity-50"
                title={playingAudioId === currentSession.id ? "Pause Audio" : "Play Recorded Voice Audio"}
              >
                {isLoadingAudio ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : playingAudioId === currentSession.id ? (
                  <Pause size={13} />
                ) : (
                  <Play size={13} className="ml-0.5" />
                )}
              </button>
              
              <span className="font-semibold text-xs opacity-80">
                Voice Call Recording
              </span>
            </div>

            {audioBlobUrl && playingAudioId === currentSession.id && (
              <div className="flex items-center gap-3 shrink-0">
                <audio 
                  ref={audioElemRef}
                  src={audioBlobUrl} 
                  controls 
                  autoPlay
                  className="h-7 max-w-[200px] sm:max-w-[280px]"
                />
                <a
                  href={audioBlobUrl}
                  download={`voice_call_${currentSession.id}.webm`}
                  className="p-1.5 rounded-lg border border-blue-400/30 hover:bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1 font-semibold"
                  title="Download Recording"
                >
                  <Download size={13} />
                </a>
              </div>
            )}

            {audioPlaybackError && (
              <span className="text-red-400 text-[10px] font-semibold">{audioPlaybackError}</span>
            )}
          </div>
        )}
 
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center">
          
          {/* CASE A: Voice Chat History Conversation View */}
          {!isConnected && activeViewTab === 'chat' && interactionHistory.length > 0 ? (
            <div className="w-full max-w-3xl flex flex-col h-full">
              {/* Header Info Banner */}
              <div className={`p-3 rounded-xl border mb-4 flex items-center justify-between text-xs shrink-0 ${
                isDarkMode ? 'bg-black/20 border-white/5 text-white/70' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-rose-400">Voice Chat History</span>
                  <span>•</span>
                  <span>{interactionHistory.length} speech {interactionHistory.length === 1 ? 'turn' : 'turns'} captured</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyTranscript()}
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Copy size={11} /> {copiedTranscript ? 'Copied to clipboard' : 'Copy transcript'}
                </button>
              </div>

              {/* Chat Message Turns List */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
                {interactionHistory.map((item) => {
                  const isUser = item.sender === 'user';
                  const timeFormatted = item.timestamp instanceof Date 
                    ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                    >
                      {/* Speaker Badge & Time */}
                      <div className="flex items-center gap-2 mb-1 px-1 text-[10px] opacity-60">
                        {isUser ? (
                          <>
                            <span>{timeFormatted}</span>
                            <span>•</span>
                            <span className="font-bold text-blue-400 flex items-center gap-1">
                              <Mic size={11} /> You (Voice Input)
                            </span>
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Voice
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-violet-400 flex items-center gap-1">
                              <Sparkles size={11} /> Gemini Voice (Response)
                            </span>
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              Voice
                            </span>
                            <span>•</span>
                            <span>{timeFormatted}</span>
                          </>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className="group relative max-w-[90%] sm:max-w-[80%]">
                        <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : (isDarkMode ? 'bg-white/10 text-slate-100 rounded-tl-none border border-white/5' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm')
                        }`}>
                          {item.text}
                        </div>

                        {/* Quick Copy Action */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(item.id, item.text)}
                          className={`absolute ${isUser ? '-left-7' : '-right-7'} top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/20 text-slate-400 hover:text-white transition-all`}
                          title="Copy message"
                        >
                          {copiedMsgId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Call Resume Banner */}
              <div className={`p-4 rounded-2xl border mt-2 flex items-center justify-between gap-4 shrink-0 ${
                isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Mic size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Continue Voice Conversation</h4>
                    <p className="text-[10px] opacity-60">Hands-free low-latency speech conversation with Gemini Live</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={connect}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all shrink-0"
                >
                  <Phone size={14} /> <span>Resume Call</span>
                </button>
              </div>
            </div>
          ) : (
            /* CASE B: Live Call HUD & Waveform Visualizer */
            <div className={`max-w-2xl w-full rounded-2xl shadow-sm border p-6 md:p-8 flex flex-col items-center ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              
              <div className="relative flex items-center justify-center w-full h-[220px] mb-2" aria-label="Voice activity orb">
                <OrbBloop
                  size={210}
                  audioMode="ambient"
                  demoMode={true}
                  state={orbState}
                  bloopColorMain={orbPalette.main}
                  bloopColorLow={orbPalette.low}
                  bloopColorMid={orbPalette.mid}
                  bloopColorHigh={orbPalette.high}
                  watercolorStrength={0.5}
                  watercolorAnimated={false}
                  className="drop-shadow-[0_0_28px_rgba(56,189,248,0.18)]"
                />
              </div>

              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${
                isConnected 
                  ? (isMuted ? 'bg-amber-950/40 text-amber-500' : (isDarkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-100 text-emerald-500')) 
                  : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400')
              }`}>
                {isConnected ? (
                  isMuted ? <MicOff size={40} className="animate-pulse" /> : <Activity size={40} className="animate-pulse" />
                ) : (
                  <Volume2 size={40} />
                )}
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Live Voice Conversation</h2>
              <p className="opacity-60 text-sm text-center mb-6 max-w-md">
                Have a real-time, low-latency voice conversation with Gemini using the Live API.
              </p>
   
              {currentSession && (
                <div className={`w-full mb-6 rounded-xl p-4 border flex flex-col gap-3 text-xs ${
                  isDarkMode ? 'bg-black/20 border-white/5 text-white/70' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex justify-around items-center">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="opacity-60" />
                      <span>Call: {currentSession.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="opacity-60" />
                      <span>Duration: {currentSession.duration !== '--' ? currentSession.duration : 'Not Started'}</span>                    </div>
                  </div>
                  
                  <div className="border-t border-slate-200/40 dark:border-white/5 pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} className={recordSession ? "text-emerald-500 animate-pulse" : "text-amber-500"} />
                      <span className="font-semibold">
                        {recordSession ? "Encrypted Recording Enabled" : "Call Recording Disabled"}
                      </span>
                    </div>
                    {!isConnected && (
                      <button
                        type="button"
                        onClick={() => setRecordSession(!recordSession)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                          recordSession
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-500 hover:bg-blue-600/20'
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20'
                        }`}
                      >
                        <Lock size={10} /> {recordSession ? "Turn Off" : "Turn On"}
                      </button>
                    )}
                  </div>
                </div>
              )}
   
              {/* Real-time Web Audio API Waveform Visualizer */}
              <div className={`w-full h-24 rounded-xl overflow-hidden border mb-4 relative ${
                isDarkMode 
                  ? 'bg-black/40 border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                  : 'bg-slate-50/80 border-slate-200/60 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)]'
              }`}>
                <canvas ref={canvasRef} className="w-full h-full block" />
                
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-black/60 text-white/80 font-mono">
                  {isConnected ? (isMuted ? 'Muted' : 'Live') : 'Idle'}
                </div>
              </div>
  
              {/* Visual Input Volume Sensitivity Bar */}
              <div className={`w-full mb-8 p-3 rounded-xl border ${
                isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-150'
              }`}>
                <div className="flex items-center justify-between mb-1.5 text-[11px] font-medium opacity-70">
                  <span className="flex items-center gap-1">
                    <Mic size={11} /> Input Gain Sensitivity
                  </span>
                  <span id="volume-db-label" className="font-mono text-[10px]">
                    {isConnected ? (isMuted ? 'Muted' : 'Detecting...') : 'Disconnected'}
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${
                  isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                }`}>
                  <div 
                    ref={volumeMeterRef} 
                    className="h-full w-0 rounded-full transition-all duration-75 ease-out"
                    style={{ backgroundColor: '#3b82f6' }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[9px] opacity-40 font-mono">
                  <span>0%</span>
                  <span>Optimal (20% - 70%)</span>
                  <span>Peak</span>
                </div>
              </div>
   
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex items-center justify-center gap-6">
                  {/* Mute/Pause Button (only when connected) */}
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                      className={`p-4 rounded-full border transition-all ${
                        isMuted
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20'
                          : 'bg-slate-500/10 border-slate-500/25 text-slate-400 hover:bg-slate-500/20'
                      }`}
                    >
                      {isMuted ? <MicOff size={24} className="animate-pulse" /> : <Mic size={24} />}
                    </button>
                  )}
  
                  {/* Screen Capture Stream AI Vision Button */}
                  <button
                    type="button"
                    onClick={() => setIsScreenStreamOpen(true)}
                    title="Screen Capture & AI Vision Stream"
                    className="p-4 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Monitor size={24} />
                  </button>
  
                  {/* Main Action Button */}
                  <button
                    onClick={isConnected ? disconnect : connect}
                    disabled={(isConnecting && !isConnected) || !currentSessionId}
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
                      isConnected 
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isConnecting && !isConnected ? (
                      <Loader2 size={36} className="text-white animate-spin" />
                    ) : isConnected ? (
                      <PhoneOff size={36} className="text-white" />
                    ) : (
                      <Phone size={36} className="text-white" />
                    )}
                  </button>
  
                  {/* Drawer/Transcript Toggle Button (only when connected) */}
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setShowDrawer(!showDrawer)}
                      title={showDrawer ? "Hide Live Transcript" : "Show Live Transcript"}
                      className={`p-4 rounded-full border transition-all ${
                        showDrawer
                          ? `${getAccentClass()} bg-slate-500/10`
                          : 'bg-slate-500/10 border-slate-500/25 text-slate-400 hover:bg-slate-500/20'
                      }`}
                    >
                      <MessageSquare size={24} />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col items-center mt-4">
                  <span className={`font-medium ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`}>
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
          )}
        </div>
      </div>

      {/* Live Transcript Drawer Sidebar (Right) */}
      <AnimatePresence initial={false}>
        {showDrawer && isConnected && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            style={{ willChange: 'width, opacity' }}
            className={`flex flex-col h-full border-l shrink-0 relative z-10 overflow-hidden ${
              isDarkMode ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div style={{ width: 320 }} className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-4 shrink-0 border-b pb-2 dark:border-white/10 border-slate-200">
                <span className={`text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  <Activity size={12} className="text-emerald-500 animate-pulse" /> Live Transcript
                </span>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="text-[10px] hover:underline font-semibold opacity-60 hover:opacity-100"
                >
                  Close
                </button>
              </div>

              {/* Chat-like message bubble transcript list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
                {interactionHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-50">
                    <MessageSquare size={28} className="mb-2 opacity-40" />
                    <p className="text-xs">Start speaking to see real-time transcription history.</p>
                  </div>
                ) : (
                  interactionHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 mb-1 text-[9px] opacity-40 px-1">
                        <span>{item.sender === 'user' ? 'You' : 'Gemini'}</span>
                        <span>•</span>
                        <span>{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className={`p-2.5 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                        item.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                      }`}>
                        {item.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl relative ${
                isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-left">Recording & Privacy Consent</h3>
                  <p className="text-[10px] uppercase tracking-wider opacity-60 font-mono text-left">Cryptographic Security</p>
                </div>
              </div>

              <div className="space-y-3.5 my-4 text-xs text-left leading-relaxed opacity-90">
                <p>
                  To provide a complete <strong>Voice Recording History</strong> experience, this app can record your voice session audio (including both your microphone and Gemini's voice responses).
                </p>
                
                <div className={`p-3 rounded-xl border flex gap-2.5 ${
                  isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Lock size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-500">AES-256 GCM Local Encryption</p>
                    <p className="text-[11px] opacity-80">
                      Audio is fully encrypted locally in IndexedDB using standard Web Cryptography. The key is derived securely from your user session and never shared.
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex gap-2.5 ${
                  isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-blue-500">Dual-Track Stereo Recording</p>
                    <p className="text-[11px] opacity-80">
                      The recording splits audio into independent stereo tracks (Left: Your microphone input, Right: Assistant audio output).
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-amber-500 flex gap-1.5 font-medium">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  Recording starts ONLY during active calls and can be disabled at any time.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 mt-6 border-t pt-4 dark:border-white/10 border-slate-200">
                <button
                  type="button"
                  onClick={async () => {
                    setRecordSession(true);
                    setHasGivenConsent(true);
                    localStorage.setItem('omnichat_voice_record_consent', 'true');
                    setShowConsentModal(false);
                    await startConnection(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> Agree & Enable Recording
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    setRecordSession(false);
                    setHasGivenConsent(true);
                    localStorage.setItem('omnichat_voice_record_consent', 'true');
                    setShowConsentModal(false);
                    await startConnection(false);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs border transition-all ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' 
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Call Without Recording
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="w-full py-2 text-xs font-medium opacity-60 hover:opacity-100 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ScreenStreamModal
        isOpen={isScreenStreamOpen}
        onClose={() => setIsScreenStreamOpen(false)}
        onSendToChat={(text) => {
          setInteractionHistory(prev => [
            {
              id: 'screen-' + Date.now(),
              sender: 'assistant',
              text: text,
              timestamp: new Date()
            },
            ...prev
          ]);
        }}
      />

    </div>
  );
};