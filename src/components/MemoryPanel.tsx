import React, { useState } from 'react';
import { MemoryItem, MemoryCategory } from '../types';
import { Brain, Plus, Trash2, X, Tag, Check, Sparkles, Filter, Info, Lightbulb, Target, BookOpen, Compass } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (memory: { category: MemoryCategory; content: string }) => void;
  onRemoveMemory: (id: string) => void;
  onClearMemories: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onRemoveMemory,
  onClearMemories
}) => {
  const { isDarkMode, getAccentClass } = useTheme();

  const [filter, setFilter] = useState<'all' | MemoryCategory>('all');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const filteredMemories = filter === 'all' 
    ? memories 
    : memories.filter(m => m.category === filter);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory({
      category: newCategory,
      content: newContent.trim()
    });
    setNewContent('');
    setIsAdding(false);
  };

  const getCategoryBadge = (cat: MemoryCategory) => {
    switch(cat) {
      case 'preference':
        return {
          label: 'Preference',
          color: isDarkMode ? 'bg-purple-950/60 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <Compass size={12} className="text-purple-400" />
        };
      case 'topic':
        return {
          label: 'Topic',
          color: isDarkMode ? 'bg-blue-950/60 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <BookOpen size={12} className="text-blue-400" />
        };
      case 'goal':
        return {
          label: 'Goal & Constraint',
          color: isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <Target size={12} className="text-emerald-400" />
        };
      case 'fact':
        return {
          label: 'Fact',
          color: isDarkMode ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Lightbulb size={12} className="text-amber-400" />
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-600'}`}>
              <Brain size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Conversation Memory Bank</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                  {memories.length} recalled
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Key details the AI remembers from this dialogue to guide future replies.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className={`px-4 py-2.5 border-b flex items-center gap-1.5 overflow-x-auto text-xs ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white')
                : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200')
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setFilter('preference')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'preference'
                ? (isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white')
                : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200')
            }`}
          >
            Preferences ({memories.filter(m => m.category === 'preference').length})
          </button>
          <button
            onClick={() => setFilter('topic')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'topic'
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200')
            }`}
          >
            Topics ({memories.filter(m => m.category === 'topic').length})
          </button>
          <button
            onClick={() => setFilter('goal')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'goal'
                ? (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white')
                : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200')
            }`}
          >
            Goals ({memories.filter(m => m.category === 'goal').length})
          </button>
          <button
            onClick={() => setFilter('fact')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'fact'
                ? (isDarkMode ? 'bg-amber-600 text-white' : 'bg-amber-600 text-white')
                : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200')
            }`}
          >
            Facts ({memories.filter(m => m.category === 'fact').length})
          </button>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredMemories.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              <Brain size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No memories stored in this category yet.</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                As you chat, the AI automatically remembers your preferences, project goals, and discussed topics! You can also manually add a detail below.
              </p>
            </div>
          ) : (
            filteredMemories.map(mem => {
              const badge = getCategoryBadge(mem.category);
              return (
                <div 
                  key={mem.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 group transition-all ${
                    isDarkMode ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(mem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {mem.source === 'auto' && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                          Auto-learned
                        </span>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {mem.content}
                    </p>
                  </div>

                  <button
                    onClick={() => onRemoveMemory(mem.id)}
                    className="opacity-60 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                    title="Delete this memory"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}

          {/* Add Memory Form */}
          {isAdding ? (
            <form onSubmit={handleAdd} className={`p-3.5 rounded-xl border animate-in slide-in-from-bottom-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">Add Memory Manually</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mb-2">
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as MemoryCategory)}
                  className={`w-full p-2 text-xs rounded-lg border outline-none mb-2 ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="preference">👤 User Preference (e.g. Likes concise answers)</option>
                  <option value="topic">📌 Discussed Topic (e.g. Planning a Tokyo vacation)</option>
                  <option value="goal">🎯 Goal & Constraint (e.g. Needs code in Python 3.11)</option>
                  <option value="fact">💡 Key Fact (e.g. Works as a data scientist)</option>
                </select>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Enter the detail for the AI to remember..."
                  rows={2}
                  className={`w-full p-2.5 text-xs rounded-lg border outline-none resize-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  Save Detail
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className={`w-full py-2 px-3 border border-dashed rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                isDarkMode ? 'border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400' : 'border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-600'
              }`}
            >
              <Plus size={14} /> Add a key detail to memory
            </button>
          )}
        </div>

        {/* Footer info & Clear */}
        <div className={`p-3.5 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800 bg-slate-900/90 text-slate-400' : 'border-slate-100 bg-slate-50/90 text-slate-500'}`}>
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-emerald-500" />
            <span>AI automatically recalls these in every response</span>
          </div>

          {memories.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all memories for this conversation?')) {
                  onClearMemories();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
