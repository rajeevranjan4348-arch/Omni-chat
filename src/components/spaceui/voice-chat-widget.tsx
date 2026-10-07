'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Cpu, Mic, BrainCircuit, Bot } from 'lucide-react';

interface VoiceChatWidgetProps {
  variant?: 'full' | 'compact' | 'inline';
  statusText?: string;
  isListening?: boolean;
  isThinking?: boolean;
  onMicClick?: () => void;
  className?: string;
}

export const VoiceChatWidget: React.FC<VoiceChatWidgetProps> = ({
  variant = 'full',
  statusText = 'Omni is thinking...',
  isThinking = true,
  isListening = false,
  onMicClick,
  className = ''
}) => {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const thinkingMessages = [
    'Synthesizing knowledge...',
    'Analyzing neural context...',
    'Reasoning with Gemini 3.5...',
    'Generating response...'
  ];

  const currentMessage = statusText || thinkingMessages[pulsePhase];

  if (variant === 'compact' || variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl bg-violet-950/30 border border-violet-500/20 backdrop-blur-md shadow-lg ${className}`}>
        {/* Animated Central Glow Core */}
        <div className="relative flex items-center justify-center w-7 h-7">
          {/* Outer Pulsing Aura */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 opacity-60 blur-sm"
            animate={{
              scale: [0.9, 1.25, 0.9],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />

          {/* Rotating Orbital Ring */}
          <motion.div
            className="absolute -inset-1 rounded-full border border-violet-400/40 border-t-cyan-400 border-r-transparent"
            animate={{ rotate: 360 }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'linear'
            }}
          />

          {/* Inner Core Icon */}
          <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-violet-900/80 border border-violet-300/40 text-cyan-300 shadow-sm">
            <BrainCircuit className="w-3 h-3 animate-pulse text-cyan-300" />
          </div>
        </div>

        {/* Animated Visualizer Equalizer Bars */}
        <div className="flex items-center gap-0.5 h-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-violet-500 via-cyan-400 to-emerald-300"
              animate={{
                height: ['20%', '100%', '30%', '85%', '20%']
              }}
              transition={{
                duration: 0.8 + i * 0.15,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: i * 0.1
              }}
            />
          ))}
        </div>

        {/* Dynamic Status Text */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold bg-gradient-to-r from-violet-200 via-cyan-200 to-white bg-clip-text text-transparent truncate tracking-wide">
            {currentMessage}
          </span>
          <span className="text-[10px] text-violet-300/60 font-mono flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
            SPACE-UI THINKING ENGINE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-sm p-5 rounded-3xl bg-slate-950/80 border border-violet-500/30 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center overflow-hidden ${className}`}>
      {/* Background Radial Lights */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Tag */}
      <div className="w-full flex items-center justify-between mb-4 text-xs font-mono text-violet-300/70 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="tracking-wider uppercase font-semibold">SPACE UI VOICE AI</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-cyan-300">
          LIVE THINKING
        </span>
      </div>

      {/* Main Interactive Center Orb */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Outer Pulsing Glow */}
        <motion.div
          className="absolute w-32 h-30 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 blur-xl opacity-50"
          animate={{
            scale: [0.9, 1.2, 0.9],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Counter Rotating Ring 1 */}
        <motion.div
          className="absolute w-28 h-28 rounded-full border border-dashed border-cyan-400/40"
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Counter Rotating Ring 2 */}
        <motion.div
          className="absolute w-24 h-24 rounded-full border border-violet-400/50 border-t-transparent border-b-cyan-300"
          animate={{ rotate: -360 }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Central Button Orb */}
        <button
          type="button"
          onClick={onMicClick}
          className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-b from-slate-900 to-violet-950 border border-violet-400/40 shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer group"
        >
          <div className="absolute inset-0 rounded-full bg-violet-500/10 group-hover:bg-cyan-500/20 transition-colors" />
          {isListening ? (
            <Mic className="w-8 h-8 text-emerald-400 animate-pulse" />
          ) : (
            <BrainCircuit className="w-8 h-8 text-cyan-300 animate-bounce" />
          )}
        </button>
      </div>

      {/* Equalizer Waveform Indicator */}
      <div className="flex items-center gap-1.5 h-6 my-2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-violet-600 via-cyan-400 to-white"
            animate={{
              height: ['25%', '100%', '35%', '90%', '25%']
            }}
            transition={{
              duration: 0.6 + (i % 3) * 0.2,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: i * 0.08
            }}
          />
        ))}
      </div>

      {/* Status Message Footer */}
      <div className="mt-3 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-semibold bg-gradient-to-r from-violet-200 via-cyan-200 to-white bg-clip-text text-transparent"
          >
            {currentMessage}
          </motion.p>
        </AnimatePresence>
        <span className="text-[11px] text-violet-300/50 font-mono mt-1 block">
          Multi-modal reasoning & synthesis engine
        </span>
      </div>
    </div>
  );
};

export default VoiceChatWidget;
