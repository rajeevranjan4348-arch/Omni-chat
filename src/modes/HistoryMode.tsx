import React, { useState, useMemo, useCallback } from 'react';
import {
  History, Search, Trash2, MessageSquare, Clock, Bot,
  Zap, Sparkles, X, ChevronRight, Calendar, Filter,
  SortAsc, SortDesc, AlertTriangle, Archive, ExternalLink
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────────── */
interface AnyMessage {
  id?: string;
  role: string;
  text?: string;
  content?: string;
}

interface RawConversation {
  id: string;
  title: string;
  updatedAt: number | string | Date;
  createdAt?: number | string | Date;
  messages: AnyMessage[];
}

interface HistoryConversation {
  id: string;
  title: string;
  source: 'omni-chat' | 'chat-pro' | 'chat-fast' | 'liquid-chat';
  updatedAt: number;
  createdAt: number;
  messages: AnyMessage[];
  preview: string;
  storageKey: string;
}

const SOURCE_META = {
  'omni-chat':   { label: 'Omni Chat',        icon: Bot,         color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/25',  dot: 'bg-violet-400',  badge: 'text-violet-300 bg-violet-500/20' },
  'chat-pro':    { label: 'Pro Chat',          icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25', dot: 'bg-emerald-400', badge: 'text-emerald-300 bg-emerald-500/20' },
  'chat-fast':   { label: 'Fast Chat',         icon: Zap,         color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/25',    dot: 'bg-amber-400',   badge: 'text-amber-300 bg-amber-500/20' },
  'liquid-chat': { label: 'Liquid Chat',       icon: Sparkles,    color: 'text-pink-400',    bg: 'bg-pink-500/15 border-pink-500/25',      dot: 'bg-pink-400',    badge: 'text-pink-300 bg-pink-500/20' },
} as const;

/* ─── Helpers ───────────────────────────────────────────── */
function toTimestamp(v: number | string | Date | undefined): number {
  if (!v) return Date.now();
  if (typeof v === 'number') return v;
  return new Date(v).getTime();
}

function loadSource(key: string, source: HistoryConversation['source']): HistoryConversation[] {
  try {
    const raw: RawConversation[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(c => {
      const msgs = c.messages || [];
      const previewMsg = [...msgs].reverse().find(m => m.role === 'model');
      const preview = (previewMsg?.text || previewMsg?.content || '').slice(0, 120);
      return {
        id: c.id,
        title: c.title || 'Untitled Chat',
        source,
        updatedAt: toTimestamp(c.updatedAt),
        createdAt: toTimestamp(c.createdAt || c.updatedAt),
        messages: msgs,
        preview: preview || 'No messages yet',
        storageKey: key,
      };
    });
  } catch { return []; }
}

function loadAllConversations(): HistoryConversation[] {
  return [
    ...loadSource('omnichat_conversations_v2', 'omni-chat'),
    ...loadSource('omnichat_conversations_chat-pro', 'chat-pro'),
    ...loadSource('omnichat_conversations_chat-fast', 'chat-fast'),
  ].sort((a, b) => b.updatedAt - a.updatedAt);
}

function deleteFromSource(storageKey: string, id: string) {
  try {
    const raw: RawConversation[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updated = raw.filter(c => c.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch { /* ignore */ }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return formatDate(ts);
}

/* ─── Conversation Detail Panel ─────────────────────────── */
function ConversationDetail({
  conv, onClose, onDelete
}: {
  conv: HistoryConversation;
  onClose: () => void;
  onDelete: () => void;
}) {
  const meta = SOURCE_META[conv.source];
  const Icon = meta.icon;
  const userMsgs = conv.messages.filter(m => m.role === 'user').length;
  const aiMsgs = conv.messages.filter(m => m.role === 'model').length;

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(10,10,18,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex-1 min-w-0 pr-3">
          <div className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-2 ${meta.badge} border-current/20`}>
            <Icon size={10} />
            {meta.label}
          </div>
          <h2 className="text-sm font-semibold text-white leading-snug">{conv.title}</h2>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/30">
            <span className="flex items-center gap-1"><Clock size={10}/> {timeAgo(conv.updatedAt)}</span>
            <span>{userMsgs} sent · {aiMsgs} replies</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-400 text-white/30 transition-colors" title="Delete">
            <Trash2 size={14}/>
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white transition-colors">
            <X size={14}/>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}>
        {conv.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-white/20">
            <MessageSquare size={24} className="mb-2"/>
            <span className="text-xs">Empty conversation</span>
          </div>
        ) : conv.messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const text = msg.text || msg.content || '';
          return (
            <div key={msg.id || i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5 ${isUser ? 'bg-violet-500/30 text-violet-300' : 'bg-white/8 text-white/40'}`}>
                {isUser ? 'U' : 'AI'}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isUser
                ? 'bg-violet-500/20 text-white/80 rounded-tr-sm'
                : 'bg-white/5 text-white/60 rounded-tl-sm border border-white/6'}`}>
                {text.slice(0, 400)}{text.length > 400 && <span className="text-white/30"> …(truncated)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main HistoryMode ──────────────────────────────────── */
interface HistoryModeProps {
  onModeChange: (mode: string) => void;
}

type SortOrder = 'newest' | 'oldest' | 'most-messages';
type FilterSource = 'all' | HistoryConversation['source'];

export const HistoryMode: React.FC<HistoryModeProps> = ({ onModeChange }) => {
  const [conversations, setConversations] = useState<HistoryConversation[]>(() => loadAllConversations());
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selected, setSelected] = useState<HistoryConversation | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const reload = useCallback(() => {
    setConversations(loadAllConversations());
    setSelected(null);
  }, []);

  const handleDelete = useCallback((conv: HistoryConversation) => {
    if (!window.confirm(`Delete "${conv.title}"?`)) return;
    deleteFromSource(conv.storageKey, conv.id);
    setConversations(prev => prev.filter(c => !(c.id === conv.id && c.source === conv.source)));
    if (selected?.id === conv.id) setSelected(null);
  }, [selected]);

  const handleClearAll = useCallback(() => {
    ['omnichat_conversations_v2', 'omnichat_conversations_chat-pro', 'omnichat_conversations_chat-fast']
      .forEach(k => localStorage.removeItem(k));
    setConversations([]);
    setSelected(null);
    setConfirmClearAll(false);
  }, []);

  const filtered = useMemo(() => {
    let list = [...conversations];
    if (filterSource !== 'all') list = list.filter(c => c.source === filterSource);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some(m => (m.text || m.content || '').toLowerCase().includes(q))
      );
    }
    if (sortOrder === 'oldest') list.sort((a, b) => a.updatedAt - b.updatedAt);
    else if (sortOrder === 'most-messages') list.sort((a, b) => b.messages.length - a.messages.length);
    else list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }, [conversations, search, filterSource, sortOrder]);

  /* Group by date */
  const groups = useMemo(() => {
    if (sortOrder !== 'newest' && sortOrder !== 'oldest') {
      return [{ label: `${filtered.length} conversation${filtered.length !== 1 ? 's' : ''}`, items: filtered }];
    }
    const now = Date.now();
    const today: HistoryConversation[] = [];
    const yesterday: HistoryConversation[] = [];
    const week: HistoryConversation[] = [];
    const older: HistoryConversation[] = [];
    filtered.forEach(c => {
      const diff = now - c.updatedAt;
      if (diff < 86400000) today.push(c);
      else if (diff < 172800000) yesterday.push(c);
      else if (diff < 604800000) week.push(c);
      else older.push(c);
    });
    const out = [];
    if (today.length) out.push({ label: 'Today', items: today });
    if (yesterday.length) out.push({ label: 'Yesterday', items: yesterday });
    if (week.length) out.push({ label: 'This Week', items: week });
    if (older.length) out.push({ label: 'Older', items: older });
    return out;
  }, [filtered, sortOrder]);

  const totalMessages = conversations.reduce((s, c) => s + c.messages.length, 0);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'linear-gradient(160deg,#0a0a12,#0d0b18)' }}>
      <style>{`
        .hist-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; cursor: pointer; transition: all 0.18s ease; }
        .hist-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(139,92,246,0.3); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
        .hist-card.active { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.45); }
        .hist-scroll::-webkit-scrollbar { width: 4px; }
        .hist-scroll::-webkit-scrollbar-track { background: transparent; }
        .hist-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }
        @keyframes hist-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .hist-in { animation: hist-in 0.3s ease both; }
      `}</style>

      {/* ── Left: List Panel ──────────────────────────── */}
      <div className={`flex flex-col h-full transition-all duration-300 ${selected ? 'w-full md:w-[420px]' : 'w-full'} shrink-0`}
        style={{ borderRight: selected ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <History size={18} className="text-violet-400"/>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Chat History</h1>
                <p className="text-[11px] text-white/30">{conversations.length} conversations · {totalMessages} messages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reload} title="Refresh"
                className="p-2 rounded-xl hover:bg-white/6 text-white/30 hover:text-white/70 transition-colors text-[11px] font-medium">
                ↻
              </button>
              {conversations.length > 0 && (
                <button onClick={() => setConfirmClearAll(true)}
                  className="p-2 rounded-xl hover:bg-red-500/12 text-white/25 hover:text-red-400 transition-colors" title="Clear all">
                  <Archive size={15}/>
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {(Object.entries(SOURCE_META) as [HistoryConversation['source'], typeof SOURCE_META['omni-chat']][]).map(([src, meta]) => {
              const count = conversations.filter(c => c.source === src).length;
              const Icon = meta.icon;
              return (
                <button key={src}
                  onClick={() => setFilterSource(filterSource === src ? 'all' : src)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${filterSource === src ? `${meta.bg} border-current/30` : 'bg-white/3 border-white/6 hover:bg-white/6'}`}>
                  <Icon size={13} className={filterSource === src ? meta.color : 'text-white/30'}/>
                  <span className="text-[10px] font-bold text-white">{count}</span>
                  <span className="text-[9px] text-white/30 leading-none text-center">{meta.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + Sort */}
        <div className="px-4 pb-3 flex gap-2 shrink-0">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={13} className="text-white/25 shrink-0"/>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent outline-none text-xs text-white/80 placeholder-white/25"/>
            {search && <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/60"><X size={11}/></button>}
          </div>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="text-[11px] bg-white/5 border border-white/8 text-white/60 rounded-xl px-2 outline-none cursor-pointer">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most-messages">Most msgs</option>
          </select>
        </div>

        {/* Confirm clear */}
        {confirmClearAll && (
          <div className="mx-4 mb-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-red-400"/>
              <span className="text-xs font-semibold text-red-300">Delete all {conversations.length} conversations?</span>
            </div>
            <p className="text-[11px] text-white/40 mb-2">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleClearAll} className="flex-1 py-1.5 rounded-lg bg-red-500/25 hover:bg-red-500/35 text-red-300 text-xs font-medium transition-colors">Delete All</button>
              <button onClick={() => setConfirmClearAll(false)} className="flex-1 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 text-xs transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto hist-scroll px-3 pb-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
              <History size={32}/>
              <div className="text-center">
                <p className="text-sm font-medium">{search || filterSource !== 'all' ? 'No matches found' : 'No history yet'}</p>
                <p className="text-[11px] mt-1">{search || filterSource !== 'all' ? 'Try adjusting your search or filter' : 'Start chatting to see conversations here'}</p>
              </div>
              {!search && filterSource === 'all' && (
                <button onClick={() => onModeChange('omni-chat')}
                  className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-xl px-3 py-1.5 transition-colors flex items-center gap-1.5">
                  <Bot size={11}/> Open Omni Chat <ChevronRight size={11}/>
                </button>
              )}
            </div>
          ) : (
            groups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
                <div className="flex items-center gap-2 px-1 py-1.5 mb-1.5">
                  <Calendar size={10} className="text-white/20"/>
                  <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{group.label}</span>
                  <span className="text-[10px] text-white/15">({group.items.length})</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((conv, i) => {
                    const meta = SOURCE_META[conv.source];
                    const Icon = meta.icon;
                    return (
                      <div key={`${conv.source}-${conv.id}`}
                        onClick={() => setSelected(selected?.id === conv.id && selected.source === conv.source ? null : conv)}
                        className={`hist-card hist-in p-3.5 ${selected?.id === conv.id && selected.source === conv.source ? 'active' : ''}`}
                        style={{ animationDelay: `${i * 0.04}s` }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg}`}>
                            <Icon size={14} className={meta.color}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-white/85 truncate">{conv.title}</p>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(conv); }}
                                className="p-1 rounded-lg hover:bg-red-500/15 hover:text-red-400 text-white/20 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                title="Delete">
                                <Trash2 size={11}/>
                              </button>
                            </div>
                            <p className="text-[11px] text-white/35 truncate leading-snug mb-1.5">{conv.preview}</p>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.badge}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                {meta.label}
                              </span>
                              <span className="text-[10px] text-white/25 flex items-center gap-1">
                                <Clock size={9}/>{timeAgo(conv.updatedAt)}
                              </span>
                              <span className="text-[10px] text-white/20">
                                {conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Jump to chat buttons */}
        {conversations.length > 0 && (
          <div className="px-4 pb-4 pt-2 shrink-0 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => onModeChange('omni-chat')}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium text-violet-300 border border-violet-500/25 hover:bg-violet-500/12 transition-colors">
              <Bot size={12}/> Omni Chat
            </button>
            <button onClick={() => onModeChange('chat-pro')}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/12 transition-colors">
              <MessageSquare size={12}/> Pro Chat
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Detail Panel ───────────────────────── */}
      {selected && (
        <div className="hidden md:flex flex-1 flex-col h-full overflow-hidden">
          <ConversationDetail
            conv={selected}
            onClose={() => setSelected(null)}
            onDelete={() => handleDelete(selected)}
          />
        </div>
      )}
    </div>
  );
};
