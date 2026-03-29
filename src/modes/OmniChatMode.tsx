import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAiInstance } from '../services/gemini';
import { useSettings } from '../contexts/SettingsContext';
import { Send, Mic, Square, Loader2, Bot, User, Trash2, RotateCcw, Copy, Check } from 'lucide-react';
import { transcribeAudio } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Msg {
  id: string;
  role: 'user' | 'model';
  text: string;
  streaming?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-white/30 hover:text-white/70"
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export const OmniChatMode: React.FC = () => {
  const { userProfile } = useSettings();

  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = localStorage.getItem('omnichat_omni_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const chatRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const filtered = messages.filter(m => !m.streaming);
    localStorage.setItem('omnichat_omni_messages', JSON.stringify(filtered));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const apiKey = process.env.GEMINI_API_KEY;

  const initChat = useCallback((currentMessages: Msg[] = messages) => {
    if (!apiKey) return;
    const ai = getAiInstance();
    let sys = `You are Omni, a brilliant and warm AI assistant. Be genuinely helpful, clear, and concise. When appropriate, use markdown for structure — code blocks, lists, bold text.`;
    if (userProfile.name) sys += ` The user's name is ${userProfile.name}.`;
    if (userProfile.preferences) sys += ` User context: ${userProfile.preferences}`;

    const history = currentMessages
      .filter(m => !m.streaming && m.text)
      .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: { parts: [{ text: sys }] } },
      history: history.length > 0 ? history : undefined,
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
        { id: `m-${Date.now()}`, role: 'model', text: '**No API key found.** Please add your `GEMINI_API_KEY` in the Secrets panel (the lock icon in the left sidebar), then restart the app.' },
      ]);
      return;
    }
    if (!chatRef.current) initChat(messages);

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    const modelId = `m-${Date.now()}`;
    const modelMsg: Msg = { id: modelId, role: 'model', text: '', streaming: true };

    setMessages(prev => [...prev, userMsg, modelMsg]);
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
      setMessages(prev => prev.map(m =>
        m.id === modelId ? { ...m, text: `**Error:** ${err?.message ?? 'Something went wrong.'}` } : m
      ));
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(m => m.id === modelId ? { ...m, streaming: false } : m));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (!window.confirm('Clear all messages?')) return;
    setMessages([]);
    chatRef.current = null;
  };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(prev => {
      const idx = prev.lastIndexOf(lastUser);
      return prev.slice(0, idx);
    });
    chatRef.current = null;
    setTimeout(() => sendMessage(lastUser.text), 50);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(',')[1];
          try {
            const res = await transcribeAudio(b64, blob.type || 'audio/webm');
            if (res.text) setInput(prev => prev + (prev ? ' ' : '') + res.text);
          } catch {
            alert('Transcription failed. Please try again.');
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const suggestions = [
    'What can you help me with?',
    'Write a short poem about the ocean.',
    'Explain quantum computing simply.',
    'Give me a productivity tip.',
  ];

  return (
    <div className="flex flex-col h-full bg-[#0e1117] text-white">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-[#0e1117]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Omni</p>
            <p className="text-[10px] text-white/40 mt-0.5">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={retryLast}
              title="Retry last message"
              className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            onClick={clearChat}
            title="Clear chat"
            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-900/40">
                <Bot size={30} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Hey, I'm Omni</h1>
              <p className="text-white/40 text-sm">Ask me anything — I'm here to help.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 text-xs text-white/60 hover:text-white/90 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'model'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-900/40'
                    : 'bg-white/10'
                }`}>
                  {msg.role === 'model'
                    ? <Bot size={13} className="text-white" />
                    : <User size={13} className="text-white/70" />
                  }
                </div>

                {/* Bubble */}
                <div className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600/80 text-white rounded-tr-sm'
                    : 'bg-white/[0.06] text-white/90 rounded-tl-sm border border-white/[0.07]'
                }`}>
                  {msg.role === 'model' ? (
                    <>
                      {msg.streaming && !msg.text ? (
                        <span className="inline-flex gap-1 items-center py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                        </span>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-code:text-violet-300 prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-headings:text-white">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div className="absolute -bottom-5 left-2 flex items-center">
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

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-5 pt-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-white/[0.06] border border-white/10 rounded-2xl px-3 py-2.5 focus-within:border-violet-500/50 focus-within:bg-white/[0.08] transition-all shadow-xl shadow-black/30">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              className={`p-1.5 rounded-lg transition-all shrink-0 mb-0.5 ${
                isRecording
                  ? 'text-red-400 bg-red-500/20 animate-pulse'
                  : 'text-white/30 hover:text-white/70 hover:bg-white/10'
              } disabled:opacity-40`}
              title={isRecording ? 'Stop' : 'Voice input'}
            >
              {isRecording ? <Square size={16} className="fill-current" /> : <Mic size={16} />}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isTranscribing || isRecording}
              placeholder={
                isTranscribing ? 'Transcribing…' :
                isRecording ? 'Listening…' :
                'Message Omni…'
              }
              className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder-white/25 leading-relaxed disabled:opacity-50 py-0.5"
              style={{ maxHeight: '160px' }}
            />

            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading || isTranscribing}
              className={`p-1.5 rounded-lg transition-all shrink-0 mb-0.5 ${
                input.trim() && !isLoading && !isTranscribing
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/40'
                  : 'text-white/20 bg-white/5 cursor-not-allowed'
              }`}
            >
              {isLoading
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} className="translate-x-px" />
              }
            </button>
          </div>
          <p className="text-center text-white/20 text-[10px] mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};
