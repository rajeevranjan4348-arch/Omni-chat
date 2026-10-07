import React from 'react';
import { FileText, Image as ImageIcon, Video, Archive, File, Trash2, Download, Search, Library as LibraryIcon } from 'lucide-react';
import { getLibraryItems, removeFromLibrary, clearLibrary, LibraryItem } from '../services/libraryStore';
import { useTheme } from '../contexts/ThemeContext';

function isImage(type: string) { return type.startsWith('image/'); }
function isVideo(type: string) { return type.startsWith('video/'); }
function isArchive(type: string) { return type.includes('zip') || type.includes('rar') || type.includes('7z'); }

export const LibraryMode: React.FC = () => {
  const { isDarkMode, getBorderClass, getAccentClass } = useTheme();
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'image' | 'video' | 'file'>('all');

  const load = React.useCallback(async () => {
    try { setItems(await getLibraryItems()); } catch (e) { console.error('[Library] Failed to load:', e); }
  }, []);

  React.useEffect(() => {
    load();
    window.addEventListener('omnichat-library-update', load);
    return () => window.removeEventListener('omnichat-library-update', load);
  }, [load]);

  const visible = items.filter(item => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'image' && isImage(item.type)) || (filter === 'video' && isVideo(item.type)) || (filter === 'file' && !isImage(item.type) && !isVideo(item.type));
    return matchesQuery && matchesFilter;
  });

  const download = (item: LibraryItem) => {
    const a = document.createElement('a');
    a.href = 'data:' + item.type + ';base64,' + item.base64;
    a.download = item.name;
    a.click();
  };

  return (
    <div className={`h-full overflow-y-auto p-4 sm:p-6 ${isDarkMode ? 'bg-transparent text-white' : 'bg-white text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LibraryIcon size={22} className={getAccentClass()} />
              <h1 className="text-xl sm:text-2xl font-bold">Library</h1>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/45' : 'text-slate-500'}`}>All files uploaded to Omni are stored here on this device.</p>
          </div>
          {items.length > 0 && (
            <button onClick={() => { if (confirm('Clear all Library files?')) clearLibrary(); }} className="px-3 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors">Clear all</button>
          )}
        </div>

        <div className={`flex flex-wrap gap-2 p-2 rounded-2xl border ${getBorderClass()} ${isDarkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className={`flex items-center gap-2 flex-1 min-w-[180px] px-3 py-2 rounded-xl ${isDarkMode ? 'bg-black/20' : 'bg-white'}`}>
            <Search size={15} className="opacity-50" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search library..." className="bg-transparent outline-none text-sm w-full" />
          </div>
          {(['all','image','video','file'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === f ? 'bg-cyan-500/20 text-cyan-300' : 'opacity-60 hover:opacity-100'}`}>{f === 'all' ? 'All' : f === 'image' ? 'Photos' : f === 'video' ? 'Videos' : 'Files'}</button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-10 text-center ${getBorderClass()}`}>
            <LibraryIcon size={32} className="mx-auto opacity-30 mb-3" />
            <p className="font-semibold">{items.length ? 'No matching files' : 'Your Library is empty'}</p>
            <p className="text-xs opacity-50 mt-1">Upload a photo, video, PDF or file in Omni Chat to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visible.map(item => (
              <div key={item.id} className={`group rounded-2xl border overflow-hidden ${getBorderClass()} ${isDarkMode ? 'bg-white/[0.03]' : 'bg-white'}`}>
                {isImage(item.type) ? (
                  <img src={'data:' + item.type + ';base64,' + item.base64} alt={item.name} className="w-full h-36 object-cover bg-black/20" />
                ) : isVideo(item.type) ? (
                  <video src={'data:' + item.type + ';base64,' + item.base64} controls className="w-full h-36 object-cover bg-black" />
                ) : (
                  <div className="h-36 flex items-center justify-center bg-black/10">
                    {isArchive(item.type) ? <Archive size={40} className="opacity-40" /> : <FileText size={40} className="opacity-40" />}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold truncate" title={item.name}>{item.name}</p>
                  <p className="text-[10px] opacity-50 mt-1">{new Date(item.createdAt).toLocaleString()} · {(item.size / 1024 / 1024).toFixed(1)} MB</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => download(item)} className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/20"><Download size={13} className="inline mr-1" />Download</button>
                    <button onClick={() => removeFromLibrary(item.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Remove"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
