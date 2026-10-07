import { useEffect, useState, useCallback, useRef } from 'react';
import { AppMode } from '../types';
import {
  broadcastSync,
  getStoredPinnedChats,
  persistAndBroadcastPinnedChats,
  BroadcastSyncEvent,
  ACTIVE_MODE_STORAGE_KEY
} from '../utils/broadcastSync';

interface UseTabSyncOptions {
  activeMode?: AppMode;
  onActiveModeChange?: (mode: AppMode) => void;
}

export function useTabSync(options?: UseTabSyncOptions) {
  const { activeMode, onActiveModeChange } = options || {};
  const [pinnedChats, setPinnedChatsState] = useState<string[]>(() => getStoredPinnedChats());

  const activeModeRef = useRef(activeMode);
  const pinnedChatsRef = useRef(pinnedChats);
  const onActiveModeChangeRef = useRef(onActiveModeChange);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    pinnedChatsRef.current = pinnedChats;
  }, [pinnedChats]);

  useEffect(() => {
    onActiveModeChangeRef.current = onActiveModeChange;
  }, [onActiveModeChange]);

  // Handler for incoming BroadcastChannel events
  useEffect(() => {
    const unsubscribe = broadcastSync.subscribe((event: BroadcastSyncEvent) => {
      switch (event.type) {
        case 'ACTIVE_MODE_CHANGE':
          if (event.activeMode && onActiveModeChangeRef.current && event.activeMode !== activeModeRef.current) {
            onActiveModeChangeRef.current(event.activeMode);
          }
          break;

        case 'PINNED_CHATS_CHANGE':
          if (Array.isArray(event.pinnedChats)) {
            setPinnedChatsState(event.pinnedChats);
          }
          break;

        case 'REQUEST_INITIAL_STATE':
          // Respond to newly opened tabs with our current tab's state
          if (activeModeRef.current) {
            broadcastSync.respondInitialState(activeModeRef.current, pinnedChatsRef.current);
          }
          break;

        case 'STATE_RESPONSE':
          if (event.activeMode && onActiveModeChangeRef.current && event.activeMode !== activeModeRef.current) {
            onActiveModeChangeRef.current(event.activeMode);
          }
          if (Array.isArray(event.pinnedChats) && JSON.stringify(event.pinnedChats) !== JSON.stringify(pinnedChatsRef.current)) {
            setPinnedChatsState(event.pinnedChats);
          }
          break;

        default:
          break;
      }
    });

    // Request current state from existing active tabs on mount
    broadcastSync.requestInitialState();

    return () => {
      unsubscribe();
    };
  }, []);

  // Update pinned chats and broadcast to all tabs
  const updatePinnedChats = useCallback((newPinnedChats: string[] | ((prev: string[]) => string[])) => {
    setPinnedChatsState(prev => {
      const next = typeof newPinnedChats === 'function' ? newPinnedChats(prev) : newPinnedChats;
      persistAndBroadcastPinnedChats(next);
      return next;
    });
  }, []);

  // Toggle pin status for a specific chat thread ID
  const togglePinChat = useCallback((chatId: string) => {
    updatePinnedChats(prev => {
      const isPinned = prev.includes(chatId);
      const next = isPinned ? prev.filter(id => id !== chatId) : [...prev, chatId];
      return next;
    });
  }, [updatePinnedChats]);

  // Broadcast activeMode whenever local tab changes mode explicitly
  const setAndBroadcastActiveMode = useCallback((newMode: AppMode) => {
    if (onActiveModeChangeRef.current) {
      onActiveModeChangeRef.current(newMode);
    }
    broadcastSync.broadcastActiveMode(newMode);
  }, []);

  return {
    pinnedChats,
    setPinnedChats: updatePinnedChats,
    togglePinChat,
    setAndBroadcastActiveMode
  };
}
