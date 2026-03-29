import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { getAiInstance } from '../services/gemini';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  FileText,
  Upload,
  Trash2,
  X,
  FileType,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  mimeType: string;
}

const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'text/csv': 'CSV',
  'application/json': 'JSON',
  'text/html': 'HTML',
  'text/xml': 'XML',
  'application/xml': 'XML',
  'text/javascript': 'JS',
  'text/typescript': 'TS',
  'application/x-typescript': 'TS',
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  return SUPPORTED_TYPES[type] ?? 'FILE';
}

export const DocumentChatMode: React.FC = () => {
  const { isDarkMode, getAccentClass, getBorderClass } = useTheme();
  const { userProfile, memory } = useSettings();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildSystemInstruction = useCallback(() => {
    let sys = `You are OmniChat AI, a highly capable document analysis assistant. The user has uploaded one or more files. Your job is to answer questions about the content of these documents accurately and helpfully.

When answering:
- Reference specific parts of the document when relevant.
- If something is not in the documents, say so clearly.
- Keep responses concise unless detail is requested.
- Support comparisons across multiple documents if more than one is uploaded.`;

    if (userProfile.name) sys += `\n\nThe user's name is ${userProfile.name}.`;
    if (userProfile.preferences) sys += `\n\nUser context: ${userProfile.preferences}`;
    if (memory?.length) sys += `\n\nMemory:\n- ${memory.join('\n- ')}`;

    return sys;
  }, [userProfile, memory]);

  const initChat = useCallback(
    (files: UploadedFile[]) => {
      if (files.length === 0) return;

      const ai = getAiInstance();
      const systemInstruction = buildSystemInstruction();

      const filesSummary = files
        .map((f) => `File: "${f.name}" (${SUPPORTED_TYPES[f.mimeType] ?? f.mimeType})\n\nContent:\n${f.content}`)
        .join('\n\n---\n\n');

      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: {
            parts: [
              {
                text: `${systemInstruction}\n\n=== UPLOADED DOCUMENTS ===\n\n${filesSummary}\n\n=== END OF DOCUMENTS ===`,
              },
            ],
          },
        },
      });
    },
    [buildSystemInstruction]
  );

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const processFile = async (file: File): Promise<UploadedFile | null> => {
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`"${file.name}" is too large. Maximum size is 20 MB.`);
      return null;
    }

    const mime = file.type || 'text/plain';
    if (!SUPPORTED_TYPES[mime] && !mime.startsWith('text/')) {
      setUploadError(`"${file.name}" is not a supported file type.`);
      return null;
    }

    let content = '';
    if (mime === 'application/pdf') {
      const base64 = await readFileAsBase64(file);
      content = `[PDF base64 data - ${formatBytes(file.size)}]\n${base64}`;
    } else {
      content = await readFileAsText(file);
    }

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      type: getFileIcon(mime),
      mimeType: mime,
      content,
    };
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setIsProcessing(true);

    const fileArr = Array.from(files);
    const processed: UploadedFile[] = [];

    for (const file of fileArr) {
      const result = await processFile(file);
      if (result) processed.push(result);
    }

    if (processed.length > 0) {
      setUploadedFiles((prev) => {
        const next = [...prev, ...processed];
        initChat(next);
        return next;
      });
      setMessages([]);
    }

    setIsProcessing(false);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (next.length > 0) initChat(next);
      else chatRef.current = null;
      return next;
    });
    setMessages([]);
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setMessages([]);
    chatRef.current = null;
    setUploadError(null);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !chatRef.current || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const modelMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: modelMsgId, role: 'model', text: '', isStreaming: true, timestamp: new Date() },
    ]);

    try {
      const stream = await chatRef.current.sendMessageStream({ message: text });
      let fullText = '';

      for await (const chunk of stream) {
        if (chunk.text) fullText += chunk.text;
        setMessages((prev) =>
          prev.map((m) => (m.id === modelMsgId ? { ...m, text: fullText } : m))
        );
      }
    } catch (err: any) {
      const errText = err?.message ?? 'An error occurred. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId ? { ...m, text: `**Error:** ${errText}` } : m
        )
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === modelMsgId ? { ...m, isStreaming: false } : m))
      );
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    []
  );

  const bg = isDarkMode ? 'bg-slate-900' : 'bg-slate-50';
  const surface = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const border = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const text = isDarkMode ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex h-full ${bg} ${text}`}>
      {/* Left Panel - File Upload */}
      <div className={`w-72 shrink-0 flex flex-col border-r ${border} ${surface} hidden md:flex`}>
        <div className={`p-4 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <FileText size={18} className={getAccentClass()} />
            <span className="font-semibold text-sm">Documents</span>
          </div>
          {uploadedFiles.length > 0 && (
            <button
              onClick={clearAll}
              title="Clear all"
              className={`p-1.5 rounded-md text-xs ${isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'} transition-colors`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`m-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 p-5 cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
              : isDarkMode
              ? 'border-slate-600 hover:border-slate-400 hover:bg-slate-700/30'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100/60'
          }`}
        >
          {isProcessing ? (
            <Loader2 size={24} className={`animate-spin ${getAccentClass()}`} />
          ) : (
            <Upload size={22} className={muted} />
          )}
          <p className={`text-xs text-center ${muted}`}>
            {isProcessing ? 'Processing...' : 'Drop files here or click to upload'}
          </p>
          <p className={`text-[10px] text-center ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            PDF, TXT, MD, CSV, JSON, HTML, XML, JS, TS · Max 20 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.csv,.json,.html,.xml,.js,.ts,.jsx,.tsx,text/*,application/pdf,application/json,application/xml"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {uploadError && (
          <div className={`mx-3 mb-2 p-2.5 rounded-lg flex items-start gap-2 text-xs ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="ml-auto shrink-0">
              <X size={12} />
            </button>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {uploadedFiles.map((f) => (
            <div
              key={f.id}
              className={`group flex items-center gap-2.5 p-2.5 rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {f.type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.name}</p>
                <p className={`text-[10px] ${muted}`}>{formatBytes(f.size)}</p>
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {uploadedFiles.length > 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs border-dashed border-2 transition-colors ${isDarkMode ? 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300' : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
            >
              <Plus size={13} /> Add more files
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header */}
        <div className={`px-4 py-3 border-b ${border} ${surface} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2">
            <FileType size={18} className={getAccentClass()} />
            <span className="font-semibold text-sm">Document Chat</span>
            {uploadedFiles.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} loaded
              </span>
            )}
          </div>
          {uploadedFiles.length > 0 && (
            <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <CheckCircle2 size={14} />
              Ready to chat
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {uploadedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <FileText size={36} className={muted} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">Document Chat</h2>
                <p className={`text-sm max-w-xs ${muted}`}>
                  Upload a PDF, text file, CSV, or any document on the left, then ask questions about its contents.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-md shadow-emerald-900/20"
              >
                <Upload size={16} />
                Upload a Document
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.csv,.json,.html,.xml,.js,.ts,.jsx,.tsx,text/*,application/pdf,application/json,application/xml"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                <CheckCircle2 size={28} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  {uploadedFiles.length === 1
                    ? `"${uploadedFiles[0].name}" is ready`
                    : `${uploadedFiles.length} documents loaded`}
                </h2>
                <p className={`text-sm max-w-sm ${muted}`}>
                  Ask anything about {uploadedFiles.length === 1 ? 'this document' : 'these documents'} — summarize, extract data, compare sections, or ask specific questions.
                </p>
              </div>
              <div className={`flex flex-wrap justify-center gap-2 max-w-md`}>
                {[
                  'Summarize this document',
                  'What are the key points?',
                  'List all important dates',
                  'What is the main topic?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendMessage(q)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${isDarkMode ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-100 text-slate-600'}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-4 max-w-4xl mx-auto w-full">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {uploadedFiles.length > 0 && (
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask a question about your document..."
          />
        )}
      </div>
    </div>
  );
};
