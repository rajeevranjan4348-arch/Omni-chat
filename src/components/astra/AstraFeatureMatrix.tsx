import React, { useState, useMemo } from 'react';
import { ASTRA_CATEGORIES, ASTRA_ALL_270_FEATURES, AstraFeature } from '../../data/astraFeatures';
import { Search, Shield, Zap, Sparkles, Filter, CheckCircle2, Play, ExternalLink, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface AstraFeatureMatrixProps {
  onSelectFeature: (feature: AstraFeature) => void;
}

export const AstraFeatureMatrix: React.FC<AstraFeatureMatrixProps> = ({ onSelectFeature }) => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sandboxed' | 'permission'>('all');

  const filteredFeatures = useMemo(() => {
    return ASTRA_ALL_270_FEATURES.filter((feature) => {
      // Category filter
      if (selectedCategory !== 'all' && feature.categoryId !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'permission' && !feature.requiresPermission) {
        return false;
      }
      if (statusFilter === 'sandboxed' && feature.status !== 'sandboxed') {
        return false;
      }
      if (statusFilter === 'active' && feature.status !== 'active') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = feature.title.toLowerCase().includes(q);
        const matchDesc = feature.description.toLowerCase().includes(q);
        const matchId = feature.id.toString() === q;
        const matchTag = feature.tags.some((t) => t.toLowerCase().includes(q));
        const matchCat = feature.category.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchId || matchTag || matchCat;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, statusFilter]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner Stats */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">
            270
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2 text-slate-100">
              GPT Astra Master Capability Directory
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                100% Policy Enforced
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              270 verifiable capabilities spanning 20 domains, gated by the 13-stage Core Astra Flow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-center px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <span className="block font-bold text-emerald-400">20</span>
            <span className="text-[10px] text-slate-400">Categories</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <span className="block font-bold text-blue-400">270</span>
            <span className="text-[10px] text-slate-400">Features</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <span className="block font-bold text-purple-400">13</span>
            <span className="text-[10px] text-slate-400">Flow Stages</span>
          </div>
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search across all 270 features (e.g. OCR, Refactoring, Android intent, Reasoning)..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {(['all', 'active', 'sandboxed', 'permission'] as const).map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => setStatusFilter(filterVal)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                statusFilter === filterVal
                  ? (isDarkMode ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-emerald-600 text-white border-emerald-600 shadow-sm')
                  : (isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
              }`}
            >
              {filterVal === 'permission' ? 'Requires Approval' : filterVal}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Scroller */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            selectedCategory === 'all'
              ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
              : (isDarkMode ? 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')
          }`}
        >
          🌟 All Categories ({ASTRA_ALL_270_FEATURES.length})
        </button>

        {ASTRA_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isSelected
                  ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                  : (isDarkMode ? 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.title}</span>
              <span className="text-[10px] opacity-70">({cat.range})</span>
            </button>
          );
        })}
      </div>

      {/* Features Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredFeatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Sparkles size={32} className="mb-2 opacity-50 text-emerald-500" />
            <p className="text-sm font-semibold">No features found matching "{searchQuery}"</p>
            <p className="text-xs mt-1">Try searching for concepts like "Vision", "Reasoning", "Code", or "Security".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFeatures.map((feat) => {
              return (
                <div
                  key={feat.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all hover:border-emerald-500/60 group ${
                    isDarkMode ? 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/80' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{feat.icon}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{feat.id}
                          </span>
                          <h3 className="text-xs font-bold tracking-tight text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {feat.title}
                          </h3>
                        </div>
                      </div>

                      {feat.requiresPermission ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5 whitespace-nowrap">
                          <Shield size={10} /> Gate
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 whitespace-nowrap">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-400 mb-3">
                      {feat.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {feat.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 dark:bg-slate-800 text-slate-400 border border-slate-700/50"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">
                      {feat.category}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectFeature(feat)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/40 transition-all"
                    >
                      <Play size={11} />
                      Launch in Astra
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
