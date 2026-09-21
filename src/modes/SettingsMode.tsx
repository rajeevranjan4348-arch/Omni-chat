import React, { useState } from 'react';
import { useTheme, ThemeColor, ThemeFont } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { Palette, Sun, Moon, Mic, Volume2, Type, Sliders, Monitor, Zap, User, Sparkles, Brain, Plus, Trash2, Edit3, RotateCcw } from 'lucide-react';
import { PersonaModal } from '../components/PersonaModal';

export const SettingsMode: React.FC = () => {
  const { color, font, isDarkMode, setColor, setFont, setIsDarkMode, getBgClass, getTextClass, getAccentClass, getBorderClass } = useTheme();
  const { 
    micId, setMicId, 
    sensitivity, setSensitivity, 
    ttsVoice, setTtsVoice, 
    availableMics,
    wakeWordSensitivity, setWakeWordSensitivity,
    userProfile, setUserProfile,
    activePersona, setActivePersona, resetToDefaultPersona,
    memory, setMemory
  } = useSettings();

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [newMemoryInput, setNewMemoryInput] = useState('');

  const colors: { id: ThemeColor; label: string; class: string }[] = [
    { id: 'slate', label: 'Slate', class: 'bg-slate-500' },
    { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
    { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { id: 'rose', label: 'Rose', class: 'bg-rose-500' },
    { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
    { id: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
    { id: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
    { id: 'orange', label: 'Orange', class: 'bg-orange-500' },
  ];

  const fonts: { id: ThemeFont; label: string; desc: string }[] = [
    { id: 'sans', label: 'Inter', desc: 'Clean, modern sans-serif' },
    { id: 'mono', label: 'JetBrains', desc: 'Technical, monospaced' },
    { id: 'serif', label: 'Playfair', desc: 'Elegant, editorial serif' },
    { id: 'display', label: 'Outfit', desc: 'Bold, geometric display' },
    { id: 'handwriting', label: 'Caveat', desc: 'Casual, handwritten style' },
  ];

  const voices = [
    { id: 'Zephyr', label: 'Zephyr (Default)' },
    { id: 'Puck', label: 'Puck' },
    { id: 'Charon', label: 'Charon' },
    { id: 'Kore', label: 'Kore' },
    { id: 'Fenrir', label: 'Fenrir' },
  ];

  return (
    <div className={`flex-1 overflow-y-auto ${getBgClass()} ${getTextClass()}`}>
      <div className="max-w-4xl mx-auto p-8 space-y-10">
        
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
            Manage your preferences, appearance, and audio devices.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Appearance Section */}
          <section className={`p-6 rounded-2xl border ${getBorderClass()} ${isDarkMode ? 'bg-black/20' : 'bg-white shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <Palette size={20} className={getAccentClass()} />
              </div>
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>

            <div className="space-y-6">
              {/* Theme Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Theme Mode</h3>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Toggle light or dark interface</p>
                </div>
                <div className={`flex p-1 rounded-lg border ${getBorderClass()} ${isDarkMode ? 'bg-black/40' : 'bg-slate-100'}`}>
                  <button
                    onClick={() => setIsDarkMode(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isDarkMode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Sun size={14} /> Light
                  </button>
                  <button
                    onClick={() => setIsDarkMode(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isDarkMode ? 'bg-slate-800 shadow-sm text-white' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    <Moon size={14} /> Dark
                  </button>
                </div>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />

              {/* Accent Color */}
              <div>
                <h3 className="font-medium mb-3">Accent Color</h3>
                <div className="flex flex-wrap gap-3">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.id)}
                      className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${c.class}`}
                      title={c.label}
                    >
                      {color === c.id && (
                        <div className="absolute inset-0 rounded-full border-2 border-white dark:border-slate-900 scale-90" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />

              {/* Typography */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Type size={16} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
                  <h3 className="font-medium">Typography</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFont(f.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        font === f.id 
                          ? `border-${color}-500 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}` 
                          : `${getBorderClass()} hover:border-slate-400 dark:hover:border-slate-600`
                      }`}
                    >
                      <span className={`font-medium ${f.id === 'sans' ? 'font-sans' : f.id === 'mono' ? 'font-mono' : f.id === 'serif' ? 'font-serif' : f.id === 'display' ? 'font-display' : 'font-handwriting'}`}>
                        {f.label}
                      </span>
                      <span className={`text-xs mt-1 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                        {f.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Audio & Voice Section */}
          <section className={`p-6 rounded-2xl border ${getBorderClass()} ${isDarkMode ? 'bg-black/20' : 'bg-white shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <Volume2 size={20} className={getAccentClass()} />
              </div>
              <h2 className="text-xl font-semibold">Audio & Voice</h2>
            </div>

            <div className="space-y-6">
              {/* Microphone Input */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mic size={16} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
                  <h3 className="font-medium">Microphone Input</h3>
                </div>
                <select 
                  value={micId} 
                  onChange={e => setMicId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-black/40 border-white/10 focus:border-white/30 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900'
                  }`}
                >
                  <option value="default">Default Microphone</option>
                  {availableMics.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.substring(0,5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />

              {/* TTS Voice */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
                  <h3 className="font-medium">AI Voice (TTS)</h3>
                </div>
                <select 
                  value={ttsVoice} 
                  onChange={e => setTtsVoice(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-black/40 border-white/10 focus:border-white/30 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900'
                  }`}
                >
                  {voices.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />

              {/* Sensitivities */}
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">Voice Sensitivity</h3>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                      {sensitivity}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={sensitivity} 
                    onChange={e => setSensitivity(Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}
                    style={{ accentColor: color === 'slate' ? '#64748b' : color === 'emerald' ? '#10b981' : color === 'indigo' ? '#6366f1' : color === 'rose' ? '#f43f5e' : '#f59e0b' }}
                  />
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                    Adjust how easily the AI detects your voice vs background noise.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">Wake Word Sensitivity</h3>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                      {wakeWordSensitivity}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={wakeWordSensitivity} 
                    onChange={e => setWakeWordSensitivity(Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}
                    style={{ accentColor: color === 'slate' ? '#64748b' : color === 'emerald' ? '#10b981' : color === 'indigo' ? '#6366f1' : color === 'rose' ? '#f43f5e' : '#f59e0b' }}
                  />
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                    Higher sensitivity means easier detection but more false positives.
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* User Profile Section */}
          <section className={`p-6 rounded-2xl border md:col-span-2 ${getBorderClass()} ${isDarkMode ? 'bg-black/20' : 'bg-white shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <User size={20} className={getAccentClass()} />
              </div>
              <h2 className="text-xl font-semibold">User Profile</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium mb-2">Name</label>
                <input 
                  type="text" 
                  value={userProfile.name}
                  onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
                  placeholder="How should the AI call you?"
                  className={`w-full p-2.5 rounded-xl border outline-none transition-colors mb-4 ${
                    isDarkMode 
                      ? 'bg-black/40 border-white/10 focus:border-white/30 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900'
                  }`}
                />
                <label className="block font-medium mb-2">Avatar URL (Optional)</label>
                <input 
                  type="url" 
                  value={userProfile.avatarUrl || ''}
                  onChange={e => setUserProfile({ ...userProfile, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.png"
                  className={`w-full p-2.5 rounded-xl border outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-black/40 border-white/10 focus:border-white/30 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Preferences & Context</label>
                <textarea 
                  value={userProfile.preferences}
                  onChange={e => setUserProfile({ ...userProfile, preferences: e.target.value })}
                  placeholder="e.g., I am a software engineer. I prefer concise answers. I live in New York."
                  rows={6}
                  className={`w-full p-2.5 rounded-xl border outline-none transition-colors resize-none h-[calc(100%-32px)] ${
                    isDarkMode 
                      ? 'bg-black/40 border-white/10 focus:border-white/30 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </section>

          {/* AI Chatbot Personality Section */}
          <section className={`p-6 rounded-2xl border md:col-span-2 ${getBorderClass()} ${isDarkMode ? 'bg-black/20' : 'bg-white shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <Sparkles size={20} className={getAccentClass()} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">AI Chatbot Personality</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                    Name, backstory, tone of voice, and guiding characteristics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetToDefaultPersona}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Reset to default Aria persona"
                >
                  <RotateCcw size={13} /> Reset
                </button>
                <button
                  onClick={() => setIsPersonaModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 size={13} /> Edit Personality
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isDarkMode ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-100'}`}>
                  {activePersona.avatar || '✨'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{activePersona.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      Active Companion
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-emerald-400/90' : 'text-emerald-600'}`}>
                    {activePersona.title}
                  </p>
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Backstory</h4>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-white/80' : 'text-slate-700'}`}>
                  {activePersona.backstory}
                </p>
              </div>

              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Specific Tone of Voice</h4>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-white/80' : 'text-slate-700'}`}>
                  {activePersona.toneOfVoice}
                </p>
              </div>

              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Guiding Characteristics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePersona.characteristics.map((char, i) => (
                    <div key={i} className={`p-2.5 rounded-lg border text-xs leading-relaxed ${isDarkMode ? 'bg-black/20 border-white/5 text-white/70' : 'bg-white border-slate-200 text-slate-700'}`}>
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* AI Long-term Memory Bank Section */}
          <section className={`p-6 rounded-2xl border md:col-span-2 ${getBorderClass()} ${isDarkMode ? 'bg-black/20' : 'bg-white shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <Brain size={20} className={getAccentClass()} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Global Memory Bank</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                    Facts, preferences, and key details stored across all conversations
                  </p>
                </div>
              </div>
              {memory.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all global memories?')) {
                      setMemory([]);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear All ({memory.length})
                </button>
              )}
            </div>

            {/* Add memory item */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMemoryInput}
                onChange={e => setNewMemoryInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newMemoryInput.trim()) {
                    e.preventDefault();
                    if (!memory.includes(newMemoryInput.trim())) {
                      setMemory(prev => [...prev, newMemoryInput.trim()]);
                    }
                    setNewMemoryInput('');
                  }
                }}
                placeholder="Add a global memory or permanent preference (e.g., 'User is learning Japanese')..."
                className={`flex-1 p-2.5 text-sm rounded-xl border outline-none ${
                  isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <button
                onClick={() => {
                  if (newMemoryInput.trim()) {
                    if (!memory.includes(newMemoryInput.trim())) {
                      setMemory(prev => [...prev, newMemoryInput.trim()]);
                    }
                    setNewMemoryInput('');
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} /> Add Fact
              </button>
            </div>

            <div className="space-y-2">
              {memory.length === 0 ? (
                <p className={`text-xs p-4 text-center rounded-xl border border-dashed ${isDarkMode ? 'border-white/10 text-white/40' : 'border-slate-200 text-slate-400'}`}>
                  No global memories stored yet. The AI will automatically save important facts using tools, or you can add them manually above.
                </p>
              ) : (
                memory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isDarkMode ? 'bg-black/20 border-white/5 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-sm">• {item}</span>
                    <button
                      onClick={() => setMemory(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-400 p-1"
                      title="Delete memory"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </div>

      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        activePersona={activePersona}
        onSavePersona={setActivePersona}
      />
    </div>
  );
};
