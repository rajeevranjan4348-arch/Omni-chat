import React from 'react';
import { 
  Sparkles, Code, FileCode, Mic, FileAudio, 
  Database, FileText, Compass, ImageIcon, MapPin, 
  Volume2, Shield, Cpu 
} from 'lucide-react';
import { auth, db, getWorkspaceLogs } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { sounds } from '../components/PremiumEffects';

export interface SearchItem {
  id: string;
  category: 'chats' | 'files' | 'voice' | 'workspace' | 'modes' | 'logs';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  sourceLabel: string;
  updatedAt?: number;
  highlightText?: string;
  action: () => void;
}

export interface StoredFileMetadata {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  url?: string;
  source: string;
  description?: string;
  tags?: string[];
  updatedAt: number;
}

const toTs = (v: any): number => {
  if (!v) return Date.now();
  if (typeof v === 'number') return v;
  const parsed = new Date(v).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
};

/**
 * Save file metadata to Firebase Firestore under users/{userId}/stored_files
 */
export async function saveFileMetadataToFirebase(metadata: StoredFileMetadata): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const fileId = metadata.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'users', user.uid, 'stored_files', fileId);
    await setDoc(docRef, {
      userId: user.uid,
      id: fileId,
      name: metadata.name,
      size: metadata.size || 0,
      mimeType: metadata.mimeType || 'application/octet-stream',
      url: metadata.url || '',
      source: metadata.source || 'OmniChat Knowledge Base',
      description: metadata.description || '',
      tags: metadata.tags || [],
      updatedAt: metadata.updatedAt || Date.now()
    });
  } catch (err) {
    console.warn('[GlobalSearch] Could not save file metadata to Firebase:', err);
  }
}

/**
 * Sync a chat session to Firebase Firestore under users/{userId}/chat_history
 */
export async function syncChatSessionToFirebase(chat: any): Promise<void> {
  const user = auth.currentUser;
  if (!user || !chat?.id) return;
  try {
    const docRef = doc(db, 'users', user.uid, 'chat_history', chat.id);
    const msgs = (chat.messages || []).slice(-30).map((m: any) => ({
      role: m.role || 'user',
      text: (m.text || m.content || '').slice(0, 1500),
      timestamp: toTs(m.timestamp)
    }));

    await setDoc(docRef, {
      userId: user.uid,
      id: chat.id,
      title: chat.title || 'Chat Session',
      source: chat.source || 'omni-chat',
      messagesCount: (chat.messages || []).length,
      lastMessage: msgs[msgs.length - 1]?.text || '',
      messages: msgs,
      updatedAt: toTs(chat.updatedAt || Date.now())
    });
  } catch (err) {
    console.warn('[GlobalSearch] Could not sync chat session to Firebase:', err);
  }
}

/**
 * Indexes the entire OmniChat knowledge base:
 * - Chat history from both LocalStorage and Firebase Firestore
 * - Stored file metadata from Firebase and local sessions
 * - Voice logs, Keep notes, and Workspace documents
 */
export async function indexKnowledgeBase(onModeChange: (mode: any) => void): Promise<SearchItem[]> {
  const globalItems: SearchItem[] = [];

  // 1. Standard App Modes
  const modeLabels: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
    dashboard: { label: 'Dashboard Portal', icon: React.createElement(Compass, { size: 16, className: 'text-cyan-400' }), desc: 'System dashboard, dynamic weather & AI assistant stats' },
    'omni-chat': { label: 'Omni Chat (Default)', icon: React.createElement(Sparkles, { size: 16, className: 'text-violet-400' }), desc: 'Converse with multi-model Gemini agents' },
    'liquid-chat': { label: 'Liquid Chat', icon: React.createElement(Sparkles, { size: 16, className: 'text-pink-400' }), desc: 'Ambient animated chat container with fluid particles' },
    'chat-fast': { label: 'Manus Agent (Taskforce)', icon: React.createElement(Sparkles, { size: 16, className: 'text-emerald-400' }), desc: 'Auto-pilot agent for scheduling complex pipelines' },
    coder: { label: 'AI Coder IDE', icon: React.createElement(Code, { size: 16, className: 'text-teal-400' }), desc: 'Generate, validate, and preview code changes real-time' },
    jarvis: { label: 'J.A.R.V.I.S. HUD Interface', icon: React.createElement(Cpu, { size: 16, className: 'text-amber-400' }), desc: 'Immersive voice & canvas analytics cockpit' },
    'voice-live': { label: 'Voice AI (Live Stream)', icon: React.createElement(Mic, { size: 16, className: 'text-rose-400' }), desc: 'Hands-free deep male voice assistant' },
    'image-gen': { label: 'Image Studio', icon: React.createElement(ImageIcon, { size: 16, className: 'text-purple-400' }), desc: 'Convert text queries into high fidelity visual assets' },
    'search-maps': { label: 'Search & Maps', icon: React.createElement(MapPin, { size: 16, className: 'text-orange-400' }), desc: 'Explore locations and retrieve details with Maps integration' },
    transcription: { label: 'Audio Transcription', icon: React.createElement(FileAudio, { size: 16, className: 'text-sky-400' }), desc: 'Upload or record voice files to extract high precision transcriptions' },
    tts: { label: 'Text to Speech Synth', icon: React.createElement(Volume2, { size: 16, className: 'text-indigo-400' }), desc: 'Convert text blocks into deep lifelike voice speech' },
    workspace: { label: 'Workspace Central', icon: React.createElement(Database, { size: 16, className: 'text-cyan-400' }), desc: 'Connected Gmail, Drive, Calendar, Tasks and Keep Notes' },
    settings: { label: 'Preferences & Voice Settings', icon: React.createElement(Shield, { size: 16, className: 'text-slate-400' }), desc: 'Configure deep male voice, themes and API keys' }
  };

  Object.entries(modeLabels).forEach(([modeId, detail]) => {
    globalItems.push({
      id: `mode-${modeId}`,
      category: 'modes',
      title: detail.label,
      subtitle: detail.desc,
      icon: detail.icon,
      sourceLabel: 'Mode Navigation',
      action: () => {
        onModeChange(modeId as any);
        sounds.playSuccess();
      }
    });
  });

  // 2. Chat History: Omni Chat (Local)
  try {
    const raw = JSON.parse(localStorage.getItem('omnichat_conversations_v2') || '[]');
    if (Array.isArray(raw)) {
      raw.forEach(c => {
        const msgs = c.messages || [];
        const lastMsg = msgs.slice().reverse().find((m: any) => m.role === 'model')?.text || msgs[0]?.text || '';
        globalItems.push({
          id: `omni-${c.id}`,
          category: 'chats',
          title: c.title || 'Omni Chat Session',
          subtitle: lastMsg.slice(0, 120) || 'No messages yet',
          icon: React.createElement(Sparkles, { size: 16, className: 'text-violet-400' }),
          sourceLabel: 'Omni Chat',
          updatedAt: toTs(c.updatedAt),
          action: () => {
            localStorage.setItem('omnichat_omni_current_session', c.id);
            onModeChange('omni-chat');
            sounds.playSuccess();
          }
        });
      });
    }
  } catch (e) {}

  // 3. Chat History: Liquid Chat (Local)
  try {
    const raw = JSON.parse(localStorage.getItem('omnichat_liquid_sessions') || '[]');
    if (Array.isArray(raw)) {
      raw.forEach(s => {
        const msgs = s.messages || [];
        const lastMsg = msgs.slice().reverse().find((m: any) => m.role === 'model')?.text || msgs[0]?.text || '';
        globalItems.push({
          id: `liquid-${s.id}`,
          category: 'chats',
          title: s.title || 'Liquid Chat Session',
          subtitle: lastMsg.slice(0, 120) || 'Fluid conversation stream',
          icon: React.createElement(Sparkles, { size: 16, className: 'text-pink-400' }),
          sourceLabel: 'Liquid Chat',
          updatedAt: toTs(s.updatedAt),
          action: () => {
            localStorage.setItem('omnichat_liquid_current', s.id);
            onModeChange('liquid-chat');
            sounds.playSuccess();
          }
        });
      });
    }
  } catch (e) {}

  // 4. Chat History: Manus Agent (Local)
  try {
    const raw = JSON.parse(localStorage.getItem('omnichat_manus_sessions') || '[]');
    if (Array.isArray(raw)) {
      raw.forEach(s => {
        const msgs = s.messages || [];
        const lastMsg = msgs.slice().reverse().find((m: any) => m.role === 'model')?.text || msgs[0]?.content || s.prompt || '';
        globalItems.push({
          id: `manus-${s.id}`,
          category: 'chats',
          title: s.prompt || s.title || 'Manus Task Pipeline',
          subtitle: lastMsg.slice(0, 120) || 'Agent execution flow',
          icon: React.createElement(Sparkles, { size: 16, className: 'text-emerald-400' }),
          sourceLabel: 'Manus Agent',
          updatedAt: toTs(s.timestamp || s.updatedAt),
          action: () => {
            localStorage.setItem('omnichat_manus_current_session_id', s.id);
            onModeChange('chat-fast');
            sounds.playSuccess();
          }
        });
      });
    }
  } catch (e) {}

  // 5. Coder IDE Projects & Code Files
  try {
    const rawProjects = JSON.parse(localStorage.getItem('omnichat_coder_projects') || '[]');
    if (Array.isArray(rawProjects)) {
      rawProjects.forEach((p: any) => {
        globalItems.push({
          id: `coder-proj-${p.id}`,
          category: 'files',
          title: `Project: ${p.title || 'AI Coder Workspace'}`,
          subtitle: `${(p.files || []).length} code files • ${(p.commits || []).length} commits`,
          icon: React.createElement(Code, { size: 16, className: 'text-teal-400' }),
          sourceLabel: 'Coder IDE Project',
          updatedAt: toTs(p.updatedAt),
          action: () => {
            localStorage.setItem('omnichat_coder_current_project', p.id);
            onModeChange('coder');
            sounds.playSuccess();
          }
        });

        if (Array.isArray(p.files)) {
          p.files.forEach((file: any) => {
            globalItems.push({
              id: `coder-file-${p.id}-${file.name}`,
              category: 'files',
              title: file.name,
              subtitle: (file.content || '').slice(0, 140) || 'Code source file',
              icon: React.createElement(FileCode, { size: 16, className: 'text-cyan-400' }),
              sourceLabel: `File in ${p.title || 'Project'}`,
              updatedAt: toTs(p.updatedAt),
              action: () => {
                localStorage.setItem('omnichat_coder_current_project', p.id);
                onModeChange('coder');
                sounds.playSuccess();
              }
            });
          });
        }
      });
    }
  } catch (e) {}

  // 6. Audio Transcriptions
  try {
    const rawTr = JSON.parse(localStorage.getItem('omnichat_transcription_sessions') || '[]');
    if (Array.isArray(rawTr)) {
      rawTr.forEach(s => {
        globalItems.push({
          id: `tr-${s.id}`,
          category: 'files',
          title: s.title || 'Audio Transcription File',
          subtitle: (s.text || '').slice(0, 120) || 'Extracted audio speech text',
          icon: React.createElement(FileAudio, { size: 16, className: 'text-sky-400' }),
          sourceLabel: 'Transcription',
          updatedAt: toTs(s.updatedAt),
          action: () => {
            localStorage.setItem('omnichat_transcription_current', s.id);
            onModeChange('transcription');
            sounds.playSuccess();
          }
        });
      });
    }
  } catch (e) {}

  // 7. Firebase Firestore Knowledge Base (Cloud Chats, Stored Files, Voice, Notes)
  const user = auth.currentUser;
  if (user) {
    try {
      // 7a. Firebase Cloud Chat History
      try {
        const chatSnap = await getDocs(collection(db, 'users', user.uid, 'chat_history'));
        chatSnap.forEach(docSnap => {
          const data = docSnap.data();
          globalItems.push({
            id: `fb-chat-${docSnap.id}`,
            category: 'chats',
            title: data.title || 'Cloud Chat Conversation',
            subtitle: data.lastMessage || `${data.messagesCount || 0} messages synced in cloud`,
            icon: React.createElement(Sparkles, { size: 16, className: 'text-purple-400' }),
            sourceLabel: 'Firebase Cloud Chat',
            updatedAt: toTs(data.updatedAt),
            action: () => {
              if (data.source) onModeChange(data.source);
              else onModeChange('omni-chat');
              sounds.playSuccess();
            }
          });
        });
      } catch (e) {
        // Chat history collection might be empty or initializing
      }

      // 7b. Firebase Cloud Stored File Metadata
      try {
        const filesSnap = await getDocs(collection(db, 'users', user.uid, 'stored_files'));
        filesSnap.forEach(docSnap => {
          const data = docSnap.data();
          globalItems.push({
            id: `fb-file-${docSnap.id}`,
            category: 'files',
            title: data.name || 'Cloud Document File',
            subtitle: data.description || `${data.mimeType || 'file'} • ${Math.round((data.size || 0) / 1024)} KB`,
            icon: React.createElement(FileText, { size: 16, className: 'text-emerald-400' }),
            sourceLabel: 'Firebase Stored File',
            updatedAt: toTs(data.updatedAt),
            action: () => {
              if (data.url) {
                window.open(data.url, '_blank');
              } else {
                onModeChange('workspace');
              }
              sounds.playSuccess();
            }
          });
        });
      } catch (e) {
        // Stored files collection might be empty or initializing
      }

      // 7c. Firebase Voice Commands
      try {
        const voiceCmdSnap = await getDocs(collection(db, 'users', user.uid, 'voice_commands'));
        voiceCmdSnap.forEach(docSnap => {
          const data = docSnap.data();
          globalItems.push({
            id: `fb-voicecmd-${docSnap.id}`,
            category: 'voice',
            title: data.title || 'Voice Command Recording',
            subtitle: data.text || 'Cloud synchronized voice interaction',
            icon: React.createElement(Mic, { size: 16, className: 'text-rose-400' }),
            sourceLabel: 'Firebase Voice Command',
            updatedAt: toTs(data.updatedAt || data.timestamp),
            action: () => {
              onModeChange('voice-live');
              sounds.playSuccess();
            }
          });
        });
      } catch (e) {}

      // 7d. Firebase Voice Sessions
      try {
        const voiceSessSnap = await getDocs(collection(db, 'users', user.uid, 'voice_sessions'));
        voiceSessSnap.forEach(docSnap => {
          const data = docSnap.data();
          globalItems.push({
            id: `fb-voicesess-${docSnap.id}`,
            category: 'voice',
            title: data.title || 'Voice Call Session',
            subtitle: data.transcript ? data.transcript.slice(0, 120) : `Duration: ${data.duration || '0s'}`,
            icon: React.createElement(Mic, { size: 16, className: 'text-emerald-400' }),
            sourceLabel: 'Firebase Voice Session',
            updatedAt: toTs(data.updatedAt),
            action: () => {
              localStorage.setItem('omnichat_voice_current', docSnap.id);
              onModeChange('voice-live');
              sounds.playSuccess();
            }
          });
        });
      } catch (e) {}

      // 7e. Firebase Keep Notes
      try {
        const keepSnap = await getDocs(collection(db, 'users', user.uid, 'keep_notes'));
        keepSnap.forEach(docSnap => {
          const data = docSnap.data();
          globalItems.push({
            id: `fb-keep-${docSnap.id}`,
            category: 'workspace',
            title: `Note: ${data.title || 'Untitled Note'}`,
            subtitle: data.content || 'Cloud synchronized workspace note',
            icon: React.createElement(FileText, { size: 16, className: 'text-amber-400' }),
            sourceLabel: 'Firebase Keep Note',
            updatedAt: toTs(data.updatedAt || data.createdAt),
            action: () => {
              onModeChange('workspace');
              sounds.playSuccess();
            }
          });
        });
      } catch (e) {}

    } catch (e) {
      console.warn('[GlobalSearch] Firebase search indexing notice:', e);
    }
  }

  // 8. Workspace Audit Logs
  try {
    const logs = await getWorkspaceLogs();
    logs.slice(0, 15).forEach(wLog => {
      globalItems.push({
        id: `wslog-${wLog.id}`,
        category: 'workspace',
        title: `Workspace Activity: ${wLog.service}`,
        subtitle: `${wLog.action} • ${wLog.details}`,
        icon: React.createElement(Database, { size: 16, className: 'text-cyan-400' }),
        sourceLabel: 'Workspace Audit',
        updatedAt: toTs(wLog.timestamp),
        action: () => {
          onModeChange('workspace');
          sounds.playSuccess();
        }
      });
    });
  } catch (e) {}

  // Sort by updatedAt descending
  globalItems.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return globalItems;
}
