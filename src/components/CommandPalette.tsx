import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Terminal, Compass, Folder, Mail, Calendar, 
  ListTodo, Users, Sparkles, Database, CheckSquare,
  ChevronsRight, HelpCircle, Eye, Command, MessageSquare,
  FileCode, Mic, Volume2, FileAudio, MapPin, ImageIcon,
  Cpu, Code, Clock, Shield, Sparkle, Tag, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppMode } from '../types';
import { sounds, triggerHaptic } from './PremiumEffects';
import { indexKnowledgeBase, SearchItem } from '../services/globalSearch';

export type { SearchItem };

interface CommandPaletteProps {
  currentMode: string;
  onModeChange: (mode: any) => void;
  onClose?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ currentMode, onModeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'chats' | 'files' | 'voice' | 'workspace' | 'modes'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Toggle open/close on Cmd+K or Ctrl+K or custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => {
          const next = !prev;
          if (next) {
            sounds.playClick();
            triggerHaptic('light');
          }
          return next;
        });
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        sounds.playClick();
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
      sounds.playClick();
      triggerHaptic('light');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input & index data when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch('');
      setSelectedIndex(0);
      loadGlobalIndexedItems();
    }
  }, [isOpen]);

  const loadGlobalIndexedItems = async () => {
    setIsLoadingFirebase(true);
    try {
      const indexed = await indexKnowledgeBase((mode) => {
        onModeChange(mode);
        setIsOpen(false);
      });
      setItems(indexed);
    } catch (err) {
      console.warn('[CommandPalette] Global knowledge search indexing error:', err);
    } finally {
      setIsLoadingFirebase(false);
    }
  };

  const filteredItems = items.filter(item => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || 
      item.title.toLowerCase().includes(q) || 
      item.subtitle.toLowerCase().includes(q) ||
      item.sourceLabel.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, activeCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      sounds.playClick();
      triggerHaptic('light');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      sounds.playClick();
      triggerHaptic('light');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  useEffect(() => {
    const activeEl = scrollContainerRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] md:pt-[12vh] px-3 md:px-0">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Main Global Search Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="relative w-full max-w-2xl bg-[#0b0c14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px] max-h-[82vh] backdrop-blur-2xl text-white"
            onKeyDown={handleKeyDown}
          >
            {/* Top Search Bar Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-slate-900/60">
              <Search className="text-cyan-400 shrink-0" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Global Search across Chat History, Files & Firebase Data..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none text-white text-sm md:text-base placeholder-white/35 outline-none font-medium w-full"
              />
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-[11px] font-mono text-white/50 border border-white/10 shrink-0">
                <span>ESC to exit</span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="px-4 py-2.5 flex gap-1.5 border-b border-white/5 bg-slate-950/40 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
              {[
                { id: 'all', label: '🌟 All Data' },
                { id: 'chats', label: '💬 Chat History' },
                { id: 'files', label: '📁 Files & Code' },
                { id: 'voice', label: '🎙️ Voice & Audio' },
                { id: 'workspace', label: '📋 Notes & Logs' },
                { id: 'modes', label: '⚡ App Modes' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id as any);
                    sounds.playClick();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium border ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-white/60 border-transparent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Results List Container */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-white/5 scrollbar-thin scroll-smooth"
            >
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-white/40 flex flex-col items-center justify-center gap-3">
                  <HelpCircle size={32} className="text-white/20 animate-bounce" />
                  <span className="text-xs font-mono">No results matched "{search}".</span>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      data-active={isSelected ? "true" : "false"}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-start gap-3.5 p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-cyan-500/15 via-violet-500/10 to-transparent border border-cyan-500/30 shadow-md' 
                          : 'border border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-white/60'
                      } transition-colors`}>
                        {item.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs md:text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-white/90'}`}>
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300/80 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/20 shrink-0">
                            {item.sourceLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 mt-1 leading-relaxed line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="self-center flex items-center justify-center shrink-0 text-cyan-400 animate-pulse pl-1">
                          <ChevronsRight size={16} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Shortcuts Strip */}
            <div className="p-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[11px] text-white/50 font-mono shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-bold">↑↓</span> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-bold">↵</span> Select
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Indexed items: <strong className="text-cyan-400">{filteredItems.length}</strong></span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
