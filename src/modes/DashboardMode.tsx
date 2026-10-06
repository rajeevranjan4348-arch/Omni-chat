import React, { useState, useEffect } from 'react';
import {
  Bot, Code, Mic, MapPin, FileAudio, Volume2, VolumeX, Sparkles, MessageSquare,
  Zap, Sun, Cloud, CloudRain, Snowflake, CloudLightning, Wind,
  Clock, Cpu, Globe, TrendingUp, Activity, Search, ArrowRight,
  Calendar, Thermometer, Eye, Droplets, Image
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { WeatherDashboard } from '../components/WeatherDashboard';
import { PremiumCard, PremiumButton, ShimmerLoading } from '../components/PremiumEffects';
import { DashboardClockWidget } from '../components/DashboardClockWidget';
import { SecretVaultModal } from '../components/SecretVaultModal';
import { FrequentVoiceCommandsModal } from '../components/FrequentVoiceCommandsModal';
import { KRISHNA_BACKGROUND_IMAGE } from '../assets/krishnaBgData';

interface DashboardProps {
  onModeChange: (mode: string) => void;
}


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 32
    }
  }
} as const;

const QUICK_ACTIONS = [
  { id: 'omni-chat', label: 'Omni Chat', desc: 'Chat with Gemini AI', icon: Bot, color: 'from-violet-500 to-purple-600' },
  { id: 'chat-fast', label: 'Manus Agent', desc: 'Autonomous AI workspace', icon: Sparkles, color: 'from-blue-500 to-indigo-600' },
  { id: 'coder', label: 'AI Coder', desc: 'Code generation IDE', icon: Code, color: 'from-emerald-500 to-green-600' },
  { id: 'voice-live', label: 'Voice AI', desc: 'Live voice interaction', icon: Mic, color: 'from-rose-500 to-red-600' },
  { id: 'image-gen', label: 'Image Gen', desc: 'Generate high-res artwork', icon: Image, color: 'from-rose-400 to-pink-500' },
];

const AI_MODELS = [
  { name: 'Gemini 2.5 Flash', badge: 'Fast', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/30', dot: 'bg-cyan-400' },
  { name: 'Gemini 2.5 Pro', badge: 'Smart', color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/30', dot: 'bg-violet-400' },
  { name: 'Gemini 2.5 Flash TTS', badge: 'Voice', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400' },
  { name: 'Gemini 2.0 Flash Img', badge: 'Image', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30', dot: 'bg-rose-400' },
];


export const DashboardMode: React.FC<DashboardProps> = ({ onModeChange }) => {
  const { userProfile } = useSettings();
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  // Modals for Secret Vault and Frequent Voice Commands
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isVoiceCommandsOpen, setIsVoiceCommandsOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onModeChange('omni-chat');
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-white relative">
      {/* Lord Krishna Divine Background Image Layer */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 opacity-35"
        style={{ backgroundImage: `url(${KRISHNA_BACKGROUND_IMAGE})` }}
      />
      {/* Dark Gradient Overlay for High Contrast Legibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#0a0a0f]/85 via-[#0a0a0f]/65 to-[#0a0a0f]/90 backdrop-blur-[2px]" />

      <style>{`
        .dash-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          transition: all 0.25s ease;
        }
        .dash-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .action-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .action-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        }
        .glow-purple { box-shadow: 0 0 40px rgba(139,92,246,0.15); }
        .glow-cyan { box-shadow: 0 0 40px rgba(6,182,212,0.15); }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      `}</style>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto p-4 md:p-6 space-y-5 relative z-10"
      >

        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent animate-pulse-slow">
              Welcome back, {userProfile.name || 'User'} 👋
            </h1>
            <p className="text-white/50 text-sm mt-1 flex items-center gap-2">
              <Calendar size={13} />
              {dateStr}
            </p>
          </div>
          
          {/* Top Right Corner Dashboard Clock Widget */}
          <div className="flex items-center gap-2">
            <DashboardClockWidget
              onOpenVault={() => setIsVaultOpen(true)}
            />
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={itemVariants}>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search the web or ask AI anything..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-14 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1"
              >
                Search <ArrowRight size={12} />
              </button>
            </div>
          </form>
        </motion.div>

        {/* Weather */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Weather Card */}
          <div className="md:col-span-1">
            <WeatherDashboard />
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div variants={itemVariants}>
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={13} className="text-violet-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <PremiumCard
                  key={action.id}
                  interactive={true}
                  onClick={() => onModeChange(action.id)}
                  glowColor="rgba(129, 140, 248, 0.15)"
                  className="p-4 text-left cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="text-sm font-semibold text-white">{action.label}</div>
                  <div className="text-[11px] text-white/40 mt-0.5 leading-tight">{action.desc}</div>
                </PremiumCard>
              );
            })}
          </div>
        </motion.div>

      {/* Secret Vault Modal */}
      <SecretVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
      />

      {/* Frequent Voice Commands & Status Modal */}
      <FrequentVoiceCommandsModal
        isOpen={isVoiceCommandsOpen}
        onClose={() => setIsVoiceCommandsOpen(false)}
        onExecuteCommand={(cmd) => {
          const lower = cmd.toLowerCase();
          if (lower.includes('code') || lower.includes('component') || lower.includes('react')) {
            onModeChange('coder');
          } else if (lower.includes('map') || lower.includes('restaurant') || lower.includes('navigate') || lower.includes('location')) {
            onModeChange('search');
          } else if (lower.includes('news')) {
            onModeChange('search');
          } else if (lower.includes('vault') || lower.includes('secret')) {
            setIsVaultOpen(true);
          }
        }}
      />
    </div>
  );
};
