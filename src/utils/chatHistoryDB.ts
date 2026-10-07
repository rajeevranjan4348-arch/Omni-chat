/**
 * OmniChat History Persistent Storage Utility
 * Uses IndexedDB for multi-megabyte thread storage (including attachments)
 * with LocalStorage fallback and Firebase Firestore cloud synchronization.
 */

import { syncChatSessionToFirebase } from '../services/globalSearch';

const DB_NAME = 'OmniChatHistoryDB';
const STORE_NAME = 'conversations';
const LOCAL_STORAGE_KEY = 'omnichat_omni_sessions';
const CURRENT_SESSION_KEY = 'omnichat_omni_current_session';

export interface Msg {
  id: string;
  role: 'user' | 'model';
  text: string;
  streaming?: boolean;
  attachments?: any[];
  pinned?: boolean;
  timestamp?: number;
}

export interface ConversationThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
}

/**
 * Initialize IndexedDB Database for Chat History
 */
export function initChatHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      console.warn('[ChatHistoryDB] IndexedDB opening error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save all conversation threads to IndexedDB
 */
export async function saveConversationsToIDB(threads: ConversationThread[]): Promise<void> {
  try {
    const db = await initChatHistoryDB();
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Put each sanitized thread into IDB
    for (const thread of threads) {
      if (!thread.id) continue;
      const cleanMessages = (thread.messages || []).map((m: any) => ({
        id: m.id || `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: m.role || 'user',
        text: m.text || '',
        pinned: Boolean(m.pinned),
        attachments: Array.isArray(m.attachments) ? m.attachments.slice(0, 10) : [],
        timestamp: m.timestamp || Date.now()
      }));

      store.put({
        id: thread.id,
        title: thread.title || 'New Chat',
        updatedAt: thread.updatedAt || Date.now(),
        messages: cleanMessages
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[ChatHistoryDB] IDB save warning, falling back to LocalStorage:', err);
  }
}

/**
 * Get all conversation threads from IndexedDB
 */
export async function getConversationsFromIDB(): Promise<ConversationThread[] | null> {
  try {
    const db = await initChatHistoryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: ConversationThread[] = request.result || [];
        if (results.length > 0) {
          // Sort by updatedAt descending
          results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          resolve(results);
        } else {
          resolve(null);
        }
      };

      request.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[ChatHistoryDB] IDB read failed:', err);
    return null;
  }
}

/**
 * Delete a specific conversation thread from IndexedDB
 */
export async function deleteConversationFromIDB(threadId: string): Promise<void> {
  try {
    const db = await initChatHistoryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(threadId);

      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[ChatHistoryDB] IDB delete failed:', err);
  }
}

/**
 * Comprehensive Chat History Persistence Engine:
 * Reads from IndexedDB & LocalStorage at boot, and syncs across IDB, LocalStorage, & Firebase Cloud.
 */
export async function loadPersistentChatHistory(): Promise<{ threads: ConversationThread[]; activeId: string }> {
  let threads: ConversationThread[] | null = null;

  // 1. Try reading from IndexedDB first for full fidelity
  threads = await getConversationsFromIDB();

  // 2. Fall back to LocalStorage if IDB is empty or uninitialized
  if (!threads || threads.length === 0) {
    try {
      const savedLs = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedLs) {
        threads = JSON.parse(savedLs);
      }
    } catch (e) {
      console.warn('[ChatHistoryDB] LocalStorage load error:', e);
    }
  }

  // 3. Fall back to legacy single-chat format migration
  if (!threads || threads.length === 0) {
    try {
      const oldSaved = localStorage.getItem('omnichat_omni_messages');
      if (oldSaved) {
        const parsed = JSON.parse(oldSaved);
        if (parsed && parsed.length > 0) {
          threads = [{
            id: Date.now().toString(),
            title: parsed.find((m: any) => m.role === 'user')?.text?.substring(0, 30) || 'Previous Omni Chat',
            updatedAt: Date.now(),
            messages: parsed
          }];
        }
      }
    } catch (e) {}
  }

  // Ensure at least one default conversation exists
  if (!threads || threads.length === 0) {
    threads = [{
      id: '1',
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: []
    }];
  }

  const activeId = localStorage.getItem(CURRENT_SESSION_KEY) || threads[0].id || '1';

  return { threads, activeId };
}

/**
 * Persists updated conversation threads into IndexedDB, LocalStorage, and Firebase Cloud
 */
export async function persistChatHistory(
  threads: ConversationThread[],
  currentActiveId?: string
): Promise<void> {
  if (!threads || threads.length === 0) return;

  // 1. LocalStorage auto-save for fast synchronous reads
  try {
    const sanitizedLs = threads.map(t => ({
      id: t.id,
      title: t.title,
      updatedAt: t.updatedAt,
      messages: (t.messages || []).slice(-40).map(m => ({
        id: m.id,
        role: m.role,
        text: (m.text || '').slice(0, 10000),
        pinned: m.pinned,
        timestamp: m.timestamp
      }))
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitizedLs));
    if (currentActiveId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentActiveId);
    }
  } catch (e) {
    console.warn('[ChatHistoryDB] LocalStorage write error:', e);
  }

  // 2. Full-fidelity IndexedDB storage (retains full attachments and complete history)
  await saveConversationsToIDB(threads);

  // 3. Firebase Cloud Firestore backup for recent thread
  const activeThread = threads.find(t => t.id === currentActiveId) || threads[0];
  if (activeThread && activeThread.messages.length > 0) {
    syncChatSessionToFirebase(activeThread).catch(() => {});
  }
}
