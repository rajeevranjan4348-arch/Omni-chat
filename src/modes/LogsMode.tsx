import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Trash2, Search, Filter } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { appLogger, LogEntry } from '../utils/logger';

export const LogsMode: React.FC = () => {
  const { getAccentClass, getBorderClass, isDarkMode } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial load
    setLogs(appLogger.getLogs());

    // Subscribe to new logs
    const unsubscribe = appLogger.subscribe(() => {
      setLogs(appLogger.getLogs());
    });

    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClear = () => {
    appLogger.clearLogs();
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-amber-500';
      default: return isDarkMode ? 'text-blue-400' : 'text-blue-600';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return isDarkMode ? 'bg-red-500/10' : 'bg-red-50';
      case 'warn': return isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50';
      default: return 'transparent';
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${isDarkMode ? 'text-white bg-black/20' : 'text-slate-900 bg-slate-50/50'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${getBorderClass()} flex items-center justify-between bg-black/10 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <Terminal size={24} className={getAccentClass()} />
          <div>
            <h2 className="font-bold text-lg">Application Logs</h2>
            <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
              Real-time system and application events
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`} />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all ${
                isDarkMode 
                  ? 'bg-black/50 border border-white/10 focus:border-white/30 text-white placeholder-white/30' 
                  : 'bg-white border border-slate-200 focus:border-slate-400 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="relative flex items-center">
            <Filter size={16} className={`absolute left-3 pointer-events-none ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`} />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className={`appearance-none pl-9 pr-8 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer outline-none ${
                isDarkMode 
                  ? 'bg-black/50 border-white/10 text-white hover:border-white/20 focus:border-white/30' 
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:border-slate-400 shadow-sm'
              }`}
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>

          <button 
            onClick={handleClear}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      {/* Log Viewer */}
      <div className={`flex-1 overflow-y-auto p-4 font-mono text-sm ${isDarkMode ? 'bg-[#0d0d0d]' : 'bg-white'}`}>
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
            <Terminal size={48} />
            <p>No logs found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`py-1.5 px-3 rounded flex items-start gap-4 border-l-2 ${getLevelBg(log.level)} ${
                  log.level === 'error' ? 'border-red-500' : 
                  log.level === 'warn' ? 'border-amber-500' : 
                  'border-transparent'
                } hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
              >
                <span className={`shrink-0 opacity-50 text-xs mt-0.5`}>
                  {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                </span>
                <span className={`shrink-0 w-12 font-bold text-xs uppercase mt-0.5 ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className={`break-all whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
