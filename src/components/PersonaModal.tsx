import React, { useState } from 'react';
import { PersonaConfig, ExampleInteraction } from '../types';
import { PRESET_PERSONAS, DEFAULT_PERSONA, FRIENDLY_CASUAL_PERSONA, FORMAL_INFORMATIVE_PERSONA, WITTY_SARCASTIC_PERSONA, MENTOR_PERSONA } from '../data/personas';
import { 
  X, Sparkles, Check, RotateCcw, Plus, Trash2, BookOpen, 
  Volume2, ShieldCheck, HeartHandshake, MessageSquare, ArrowRight, Play, Award, CheckCircle2 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: PersonaConfig;
  onSavePersona: (persona: PersonaConfig) => void;
  onSelectExamplePrompt?: (prompt: string, persona: PersonaConfig) => void;
}

export const PersonaModal: React.FC<PersonaModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  onSavePersona,
  onSelectExamplePrompt
}) => {
  const { isDarkMode, getAccentClass } = useTheme();

  const [activeTab, setActiveTab] = useState<'archetypes' | 'examples' | 'customize'>('archetypes');
  const [selectedPersona, setSelectedPersona] = useState<PersonaConfig>(activePersona);
  const [formData, setFormData] = useState<PersonaConfig>(activePersona);
  const [newCharacteristic, setNewCharacteristic] = useState('');
  const [newGuideline, setNewGuideline] = useState('');

  if (!isOpen) return null;

  const handleSelectArchetype = (preset: PersonaConfig) => {
    setSelectedPersona(preset);
    setFormData({ ...preset });
  };

  const handleApplyPersona = (personaToApply = formData) => {
    onSavePersona(personaToApply);
    onClose();
  };

  const handleTryExample = (example: ExampleInteraction) => {
    onSavePersona(selectedPersona);
    if (onSelectExamplePrompt) {
      onSelectExamplePrompt(example.userPrompt, selectedPersona);
    }
    onClose();
  };

  const handleAddCharacteristic = () => {
    if (!newCharacteristic.trim()) return;
    setFormData(prev => ({
      ...prev,
      characteristics: [...prev.characteristics, newCharacteristic.trim()]
    }));
    setNewCharacteristic('');
  };

  const handleRemoveCharacteristic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.filter((_, i) => i !== index)
    }));
  };

  const handleAddGuideline = () => {
    if (!newGuideline.trim()) return;
    setFormData(prev => ({
      ...prev,
      styleGuidelines: [...(prev.styleGuidelines || []), newGuideline.trim()]
    }));
    setNewGuideline('');
  };

  const handleRemoveGuideline = (index: number) => {
    setFormData(prev => ({
      ...prev,
      styleGuidelines: (prev.styleGuidelines || []).filter((_, i) => i !== index)
    }));
  };

  const examplesList: ExampleInteraction[] = selectedPersona.exampleInteractions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-inner ${isDarkMode ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-100'}`}>
              {selectedPersona.avatar || '✨'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">{selectedPersona.name}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  selectedPersona.id === activePersona.id
                    ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                    : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                }`}>
                  {selectedPersona.id === activePersona.id ? 'Currently Active' : 'Selected Preset'}
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedPersona.title} • {selectedPersona.category.replace('-', ' ').toUpperCase()}
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

        {/* Tab Navigation */}
        <div className={`px-5 pt-3 border-b flex gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/60'}`}>
          <button
            onClick={() => setActiveTab('archetypes')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'archetypes'
                ? (isDarkMode ? 'border-emerald-400 text-emerald-400' : 'border-emerald-600 text-emerald-600')
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Sparkles size={16} />
            Personality Archetypes
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'examples'
                ? (isDarkMode ? 'border-emerald-400 text-emerald-400' : 'border-emerald-600 text-emerald-600')
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <MessageSquare size={16} />
            Showcase: {examplesList.length} Example Interactions
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'customize'
                ? (isDarkMode ? 'border-emerald-400 text-emerald-400' : 'border-emerald-600 text-emerald-600')
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Volume2 size={16} />
            Tone & Custom Tuning
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: ARCHETYPES */}
          {activeTab === 'archetypes' && (
            <div className="space-y-5">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select Defined Personality & Tone
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectArchetype(p)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        selectedPersona.id === p.id 
                          ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/50' : 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-400 shadow-sm')
                          : (isDarkMode ? 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{p.avatar}</span>
                          <div>
                            <span className="font-bold text-sm block">{p.name}</span>
                            <span className="text-[11px] text-slate-400 block">{p.title}</span>
                          </div>
                        </div>
                        {selectedPersona.id === p.id && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check size={12} />
                          </div>
                        )}
                      </div>

                      <p className={`text-xs line-clamp-2 my-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {p.toneOfVoice}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-700/40 text-slate-400">
                        <span className="capitalize font-medium text-emerald-400">{p.category.replace('-', ' ')}</span>
                        <span>{p.exampleInteractions?.length || 0} Showcase Dialogs</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality Detail Card */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                    Conversational Tone & Voice Profile
                  </span>
                  <p className="text-xs sm:text-sm leading-relaxed font-medium">
                    "{selectedPersona.toneOfVoice}"
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Guiding Style Principles
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedPersona.styleGuidelines?.map((g, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-xs italic ${isDarkMode ? 'bg-slate-900/60 border-slate-700/60 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <span className="font-semibold not-italic text-emerald-400 mr-1">Sample Greeting:</span>
                  "{selectedPersona.sampleGreeting}"
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setActiveTab('examples')}
                    className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>View {examplesList.length} Showcase Example Interactions for {selectedPersona.name}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXAMPLE INTERACTIONS SHOWCASE */}
          {activeTab === 'examples' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>{selectedPersona.avatar}</span>
                    <span>{selectedPersona.name} — Example Interactions Showcase</span>
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Real multi-turn interaction examples demonstrating {selectedPersona.name}'s conversational tone, active memory callbacks, and grounded knowledge base explanations.
                  </p>
                </div>
              </div>

              {/* Interactions List */}
              <div className="space-y-4">
                {examplesList.map((ex, index) => (
                  <div 
                    key={ex.id}
                    className={`p-4 rounded-xl border space-y-3 transition-all ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {/* Title & Scenario */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm">{ex.title}</h4>
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="font-semibold text-slate-300">Scenario:</span> {ex.scenario}
                        </p>
                      </div>

                      <button
                        onClick={() => handleTryExample(ex)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                        title="Load this prompt into live chat with this persona"
                      >
                        <Play size={12} className="fill-current" />
                        <span>Try In Chat</span>
                      </button>
                    </div>

                    {/* Dialogue Bubbles */}
                    <div className="space-y-2 text-xs sm:text-sm">
                      {/* User prompt */}
                      <div className="flex items-start gap-2.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 mt-1 ${isDarkMode ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                          User
                        </span>
                        <div className={`flex-1 p-2.5 rounded-xl ${isDarkMode ? 'bg-indigo-950/40 border border-indigo-800/40 text-indigo-200' : 'bg-indigo-50 border border-indigo-100 text-indigo-900'}`}>
                          "{ex.userPrompt}"
                        </div>
                      </div>

                      {/* Assistant response */}
                      <div className="flex items-start gap-2.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 mt-1 ${isDarkMode ? 'bg-emerald-900/60 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                          {selectedPersona.name}
                        </span>
                        <div className={`flex-1 p-3 rounded-xl whitespace-pre-line leading-relaxed ${isDarkMode ? 'bg-slate-900/80 border border-slate-700/80 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-800'}`}>
                          {ex.assistantResponse}
                        </div>
                      </div>
                    </div>

                    {/* Traits Demonstrated */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-700/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                        <Award size={12} className="text-amber-400" />
                        Traits:
                      </span>
                      {ex.traitsDemonstrated.map((t, idx) => (
                        <span 
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isDarkMode ? 'bg-slate-700/70 text-slate-300 border border-slate-600' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMIZE & TONE TUNING */}
          {activeTab === 'customize' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium mb-1">Avatar Emoji</label>
                  <input 
                    type="text"
                    value={formData.avatar}
                    onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                    maxLength={4}
                    className={`w-full p-2.5 text-center text-lg rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium mb-1">Chatbot Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full p-2.5 text-sm rounded-xl border outline-none font-semibold ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium mb-1">Role / Title</label>
                  <input 
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full p-2.5 text-sm rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Tone of Voice */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-emerald-400">
                  Tone of Voice & Conversational Style
                </label>
                <textarea 
                  value={formData.toneOfVoice}
                  onChange={e => setFormData({ ...formData, toneOfVoice: e.target.value })}
                  rows={2}
                  className={`w-full p-3 text-xs sm:text-sm rounded-xl border outline-none resize-none leading-relaxed ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Backstory */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-400">
                  Origin & Backstory
                </label>
                <textarea 
                  value={formData.backstory}
                  onChange={e => setFormData({ ...formData, backstory: e.target.value })}
                  rows={3}
                  className={`w-full p-3 text-xs sm:text-sm rounded-xl border outline-none resize-none leading-relaxed ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Style Guidelines */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-400">
                  Active Style Guidelines
                </label>
                <div className="space-y-1.5 mb-2.5">
                  {(formData.styleGuidelines || []).map((guide, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="flex-1 pr-2">• {guide}</span>
                      <button onClick={() => handleRemoveGuideline(idx)} className="text-slate-400 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newGuideline}
                    onChange={e => setNewGuideline(e.target.value)}
                    placeholder="Add custom conversational guideline..."
                    className={`flex-1 p-2 text-xs rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <button onClick={handleAddGuideline} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'}`}>
          <button
            type="button"
            onClick={() => handleSelectArchetype(DEFAULT_PERSONA)}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApplyPersona(activeTab === 'customize' ? formData : selectedPersona)}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
            >
              Apply {selectedPersona.name} ({selectedPersona.category.replace('-', ' ')})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
