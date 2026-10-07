/**
 * BroadcastChannel Tab Synchronization Utility
 *
 * Synchronizes 'activeMode' and 'pinnedChats' across multiple open browser tabs
 * in real-time, with automatic request-response handshakes for newly opened tabs
 * and a robust window 'storage' event fallback mechanism.
 */

import { AppMode } from '../types';

export const CHANNEL_NAME = 'omnichat_tab_sync_channel';
export const PINNED_CHATS_STORAGE_KEY = 'omnichat_pinned_chats';
export const ACTIVE_MODE_STORAGE_KEY = 'omnichat_active_mode';

export type BroadcastSyncPayload =
  | { type: 'ACTIVE_MODE_CHANGE'; activeMode: AppMode }
  | { type: 'PINNED_CHATS_CHANGE'; pinnedChats: string[] }
  | { type: 'REQUEST_INITIAL_STATE' }
  | { type: 'STATE_RESPONSE'; activeMode: AppMode; pinnedChats: string[] };

export type BroadcastSyncEvent = BroadcastSyncPayload & { sourceTabId: string };

// Unique identifier for this browser tab instance to prevent echo loops
export const TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

type Listener = (event: BroadcastSyncEvent) => void;

class BroadcastSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<Listener> = new Set();
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.isSupported = true;
        this.channel.onmessage = (e: MessageEvent<BroadcastSyncEvent>) => {
          if (e.data && e.data.sourceTabId !== TAB_ID) {
            this.notifyListeners(e.data);
          }
        };
      } catch (err) {
        console.warn('[BroadcastSync] BroadcastChannel init error, using storage fallback:', err);
        this.isSupported = false;
      }
    }

    // Storage event fallback for cross-tab sync when BroadcastChannel is unsupported or restricted
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === ACTIVE_MODE_STORAGE_KEY && e.newValue) {
          this.notifyListeners({
            type: 'ACTIVE_MODE_CHANGE',
            activeMode: e.newValue as AppMode,
            sourceTabId: 'storage_event'
          });
        } else if (e.key === PINNED_CHATS_STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              this.notifyListeners({
                type: 'PINNED_CHATS_CHANGE',
                pinnedChats: parsed,
                sourceTabId: 'storage_event'
              });
            }
          } catch (err) {}
        }
      });
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: BroadcastSyncEvent) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[BroadcastSync] Listener callback error:', e);
      }
    });
  }

  public broadcast(event: BroadcastSyncPayload) {
    const fullEvent = { ...event, sourceTabId: TAB_ID } as BroadcastSyncEvent;
    
    if (this.channel && this.isSupported) {
      try {
        this.channel.postMessage(fullEvent);
      } catch (e) {
        console.warn('[BroadcastSync] Failed to postMessage via channel:', e);
      }
    }
  }

  public broadcastActiveMode(activeMode: AppMode) {
    try {
      localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, activeMode);
    } catch (e) {}
    this.broadcast({ type: 'ACTIVE_MODE_CHANGE', activeMode });
  }

  public broadcastPinnedChats(pinnedChats: string[]) {
    try {
      localStorage.setItem(PINNED_CHATS_STORAGE_KEY, JSON.stringify(pinnedChats));
    } catch (e) {}
    this.broadcast({ type: 'PINNED_CHATS_CHANGE', pinnedChats });
  }

  public requestInitialState() {
    this.broadcast({ type: 'REQUEST_INITIAL_STATE' });
  }

  public respondInitialState(activeMode: AppMode, pinnedChats: string[]) {
    this.broadcast({ type: 'STATE_RESPONSE', activeMode, pinnedChats });
  }
}

export const broadcastSync = new BroadcastSyncManager();

/**
 * Helper to retrieve stored pinned chat IDs from LocalStorage
 */
export function getStoredPinnedChats(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(PINNED_CHATS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/**
 * Helper to save pinned chat IDs to LocalStorage and broadcast to other tabs
 */
export function persistAndBroadcastPinnedChats(pinnedChats: string[]): void {
  try {
    localStorage.setItem(PINNED_CHATS_STORAGE_KEY, JSON.stringify(pinnedChats));
  } catch (e) {}
  broadcastSync.broadcastPinnedChats(pinnedChats);
}
