import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAiInstance, transcribeAudio } from '../services/gemini';
import { useSettings } from '../contexts/SettingsContext';
import { Send, Mic, Square, Loader2, Bot, User, Trash2, RotateCcw, Copy, Check, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ─── Keyframe animations ─────────────────────────────── */
const STYLES = `
  @keyframes omni-float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-22px) scale(1.04); }
  }
  @keyframes omni-float2 {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(18px) scale(0.96); }
  }
  @keyframes omni-float3 {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    33%       { transform: translateY(-14px) translateX(10px); }
    66%       { transform: translateY(10px) translateX(-8px); }
  }
  @keyframes omni-pulse-ring {
    0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
    70%  { transform: scale(1);    box-shadow: 0 0 0 14px rgba(139,92,246,0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139,92,246,0); }
  }
  @keyframes omni-spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes omni-msg-in {
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes omni-fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes omni-glow {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }
  @keyframes omni-particle {
    0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
    50%  { opacity: 0.3; }
    100% { transform: translateY(-60px) translateX(20px) scale(0.4); opacity: 0; }
  }
  @keyframes omni-typing-dot {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40%           { transform: scale(1);   opacity: 1; }
  }
  @keyframes omni-border-glow {
    0%, 100% { border-color: rgba(139,92,246,0.25); box-shadow: 0 0 0 0 rgba(139,92,246,0); }
    50%       { border-color: rgba(139,92,246,0.6);  box-shadow: 0 0 18px rgba(139,92,246,0.15); }
  }
  @keyframes omni-card-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .omni-msg-in    { animation: omni-msg-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
  .omni-fade-up   { animation: omni-fade-up 0.5s ease both; }
  .omni-card-0    { animation: omni-card-in 0.4s 0.1s ease both; }
  .omni-card-1    { animation: omni-card-in 0.4s 0.2s ease both; }
  .omni-card-2    { animation: omni-card-in 0.4s 0.3s ease both; }
  .omni-card-3    { animation: omni-card-in 0.4s 0.4s ease both; }
`;

/* ─── Animated background orbs ──────────────────────── */
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
        animation: 'omni-float 9s ease-in-out infinite',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', right: '-8%',
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)',
        animation: 'omni-float2 11s ease-in-out infinite',
        filter: 'blur(50px)',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '20%',
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
        animation: 'omni-float3 13s ease-in-out infinite',
        filter: 'blur(35px)',
      }} />
      <div style={{
        position: 'absolute', top: '20%', left: '30%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
        animation: 'omni-float2 7s 2s ease-in-out infinite',
        filter: 'blur(30px)',
      }} />
    </div>
  );
}

/* ─── Floating particles on welcome screen ───────────── */
function Particles() {
  const dots = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 30 + Math.random() * 50,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 4,
    dur: 3 + Math.random() * 3,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {dots.map(d => (
        <div key={d.id} style={{
          position: 'absolute',
          left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size,
          borderRadius: '50%',
          background: `rgba(${139 + Math.random() * 30},${92 + Math.random() * 30},246,0.6)`,
          animation: `omni-particle ${d.dur}s ${d.delay}s ease-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Animated Omni avatar ──────────────────────────── */
function OmniAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 72 : size === 'sm' ? 28 : 36;
  const iconSize = size === 'lg' ? 32 : size === 'sm' ? 13 : 16;
  return (
    <div style={{
      width: dim, height: dim, borderRadius: '50%', position: 'relative', flexShrink: 0,
      animation: size === 'lg' ? 'omni-pulse-ring 2.5s ease-out infinite' : undefined,
    }}>
      {size === 'lg' && (
        <div style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(139,92,246,0.8), rgba(99,102,241,0.4), rgba(168,85,247,0.8), rgba(139,92,246,0.8))',
          animation: 'omni-spin-slow 4s linear infinite',
          padding: 2,
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0e1117' }} />
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #a855f7 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: size === 'lg'
          ? '0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)'
          : '0 0 10px rgba(139,92,246,0.4)',
      }}>
        <Bot size={iconSize} color="white" />
      </div>
    </div>
  );
}

/* ─── Copy button ───────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded text-white/25 hover:text-white/60"
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/* ─── Main component ────────────────────────────────── */
interface Msg { id: string; role: 'user' | 'model'; text: string; streaming?: boolean; }

export const OmniChatMode: React.FC = () => {
  const { userProfile } = useSettings();
  const apiKey = process.env.GEMINI_API_KEY;

  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem('omnichat_omni_messages') || '[]'); }
    catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const chatRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    localStorage.setItem('omnichat_omni_messages', JSON.stringify(messages.filter(m => !m.streaming)));
  }, [messages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const initChat = useCallback((currentMessages: Msg[] = messages) => {
    if (!apiKey) return;
    const ai = getAiInstance();
    let sys = `You are Omni, a brilliant and warm AI assistant. Be genuinely helpful, clear, and concise. When appropriate, use markdown for structure.`;
    if (userProfile.name) sys += ` The user's name is ${userProfile.name}.`;
    if (userProfile.preferences) sys += ` User context: ${userProfile.preferences}`;
    const history = currentMessages.filter(m => !m.streaming && m.text).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: { parts: [{ text: sys }] } },
      history: history.length ? history : undefined,
    });
  }, [messages, userProfile, apiKey]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (!apiKey) {
      setMessages(prev => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text },
        { id: `m-${Date.now()}`, role: 'model', text: '**No API key found.** Add your `GEMINI_API_KEY` in the Secrets panel, then restart the app.' },
      ]);
      return;
    }
    if (!chatRef.current) initChat(messages);

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    const modelId = `m-${Date.now() + 1}`;
    setMessages(prev => [...prev, userMsg, { id: modelId, role: 'model', text: '', streaming: true }]);
    setIsLoading(true);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const stream = await chatRef.current.sendMessageStream({ message: text });
      let full = '';
      for await (const chunk of stream) {
        if (chunk.text) full += chunk.text;
        setMessages(prev => prev.map(m => m.id === modelId ? { ...m, text: full } : m));
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === modelId ? { ...m, text: `**Error:** ${err?.message ?? 'Something went wrong.'}` } : m));
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(m => m.id === modelId ? { ...m, streaming: false } : m));
    }
  };

  const clearChat = () => {
    if (!messages.length || !window.confirm('Clear all messages?')) return;
    setMessages([]); chatRef.current = null;
  };

  const retryLast = () => {
    const last = [...messages].reverse().find(m => m.role === 'user');
    if (!last) return;
    setMessages(prev => prev.slice(0, prev.lastIndexOf(last)));
    chatRef.current = null;
    setTimeout(() => sendMessage(last.text), 50);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setIsTranscribing(true);
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(',')[1];
          try {
            const res = await transcribeAudio(b64, blob.type || 'audio/webm');
            if (res.text) setInput(p => p + (p ? ' ' : '') + res.text);
          } catch { alert('Transcription failed.'); }
          finally { setIsTranscribing(false); }
        };
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); setIsRecording(true);
    } catch { alert('Could not access microphone.'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const SUGGESTIONS = [
    { emoji: '✨', text: 'What can you help me with?' },
    { emoji: '🌊', text: 'Write a short poem about the ocean.' },
    { emoji: '⚛️', text: 'Explain quantum computing simply.' },
    { emoji: '🚀', text: 'Give me a productivity tip.' },
  ];

  return (
    <>
      <style>{STYLES}</style>
      <div className="flex flex-col h-full text-white relative" style={{ background: 'linear-gradient(160deg, #0b0d14 0%, #0e1020 50%, #0d0b14 100%)' }}>
        <BackgroundOrbs />

        {/* ── Top bar ───────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(11,13,20,0.7)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            <OmniAvatar size="sm" />
            <div>
              <p className="text-sm font-semibold leading-none tracking-wide">Omni</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'omni-glow 2s ease-in-out infinite' }} />
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Powered by Gemini</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button onClick={retryLast} title="Retry"
                className="p-2 rounded-lg transition-all hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                <RotateCcw size={15} />
              </button>
            )}
            <button onClick={clearChat} title="Clear chat"
              className="p-2 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-400"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* ── Messages ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto relative z-10 px-4 py-6">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full gap-10 text-center relative">
              <Particles />

              {/* Avatar hero */}
              <div className="omni-fade-up flex flex-col items-center gap-5">
                <OmniAvatar size="lg" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-1.5"
                    style={{ background: 'linear-gradient(135deg,#c4b5fd,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Hey, I'm Omni
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14 }}>
                    Your AI companion — ask me absolutely anything.
                  </p>
                </div>
              </div>

              {/* Suggestion cards */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {SUGGESTIONS.map((s, i) => (
                  <button key={s.text} onClick={() => sendMessage(s.text)}
                    className={`omni-card-${i} text-left px-4 py-3 rounded-2xl flex flex-col gap-1.5 transition-all group`}
                    style={{
                      background: 'rgba(139,92,246,0.06)',
                      border: '1px solid rgba(139,92,246,0.18)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.12)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.18)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.text}</span>
                  </button>
                ))}
              </div>

              {/* Bottom hint */}
              <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                <Sparkles size={12} />
                <span>Powered by Gemini 2.5 Flash</span>
              </div>
            </div>
          ) : (
            /* Chat messages */
            <div className="max-w-2xl mx-auto w-full space-y-5">
              {messages.map(msg => (
                <div key={msg.id} className={`omni-msg-in flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {msg.role === 'model' ? (
                    <OmniAvatar size="sm" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <User size={13} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                    style={msg.role === 'user' ? {
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(99,102,241,0.85) 100%)',
                      boxShadow: '0 4px 20px rgba(139,92,246,0.25)',
                    } : {
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                    }}>
                    {msg.role === 'model' ? (
                      <>
                        {msg.streaming && !msg.text ? (
                          <span className="inline-flex gap-1.5 items-center py-1">
                            {[0, 1, 2].map(i => (
                              <span key={i} style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: 'rgba(139,92,246,0.7)',
                                display: 'inline-block',
                                animation: `omni-typing-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
                              }} />
                            ))}
                          </span>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-code:text-violet-300 prose-code:bg-violet-950/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-headings:text-white prose-headings:font-semibold">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          </div>
                        )}
                        <div className="absolute -bottom-5 left-2">
                          <CopyButton text={msg.text} />
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ─────────────────────────────── */}
        <div className="shrink-0 px-4 pb-5 pt-2 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div
              className="flex items-end gap-2 rounded-2xl px-3 py-2.5 transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${inputFocused ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: inputFocused
                  ? '0 0 0 3px rgba(139,92,246,0.08), 0 8px 32px rgba(0,0,0,0.3)'
                  : '0 4px 20px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(20px)',
                animation: isLoading ? 'omni-border-glow 1.8s ease-in-out infinite' : undefined,
              }}
            >
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isTranscribing}
                title={isRecording ? 'Stop' : 'Voice input'}
                className="p-1.5 rounded-lg transition-all shrink-0 mb-0.5 disabled:opacity-40"
                style={{
                  color: isRecording ? '#f87171' : 'rgba(255,255,255,0.3)',
                  background: isRecording ? 'rgba(239,68,68,0.15)' : 'transparent',
                  animation: isRecording ? 'omni-glow 1s ease-in-out infinite' : undefined,
                }}
              >
                {isRecording ? <Square size={16} className="fill-current" /> : <Mic size={16} />}
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={isLoading || isTranscribing || isRecording}
                placeholder={isTranscribing ? 'Transcribing…' : isRecording ? 'Listening…' : 'Message Omni…'}
                className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed disabled:opacity-50 py-0.5"
                style={{ color: 'rgba(255,255,255,0.9)', caretColor: '#8b5cf6', maxHeight: 160 }}
              />

              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || isTranscribing}
                className="p-1.5 rounded-xl transition-all shrink-0 mb-0.5 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !isLoading && !isTranscribing
                    ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
                    : 'rgba(255,255,255,0.05)',
                  color: input.trim() && !isLoading && !isTranscribing ? 'white' : 'rgba(255,255,255,0.2)',
                  boxShadow: input.trim() && !isLoading && !isTranscribing
                    ? '0 4px 14px rgba(139,92,246,0.4)'
                    : 'none',
                  transform: input.trim() && !isLoading && !isTranscribing ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} style={{ transform: 'translateX(1px)' }} />}
              </button>
            </div>

            <p className="text-center mt-2" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
