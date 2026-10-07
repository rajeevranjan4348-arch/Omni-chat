import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Sparkles, Volume2, VolumeX, ChevronDown, Check, ShieldCheck, SunMedium } from 'lucide-react';

interface AnalogLiveClockWidgetProps {
  onOpenVault?: () => void;
  cityName?: string;
}

const PRESET_CITIES = [
  { name: 'New Delhi', timeZone: 'Asia/Kolkata', region: 'India (IST)' },
  { name: 'Local Time', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, region: 'Your Device' },
  { name: 'London', timeZone: 'Europe/London', region: 'UK (GMT/BST)' },
  { name: 'New York', timeZone: 'America/New_York', region: 'USA (EDT/EST)' },
  { name: 'Tokyo', timeZone: 'Asia/Tokyo', region: 'Japan (JST)' },
  { name: 'Dubai', timeZone: 'Asia/Dubai', region: 'UAE (GST)' },
  { name: 'Singapore', timeZone: 'Asia/Singapore', region: 'Singapore (SGT)' },
  { name: 'Sydney', timeZone: 'Australia/Sydney', region: 'Australia (AEST)' },
];

export const AnalogLiveClockWidget: React.FC<AnalogLiveClockWidgetProps> = ({
  onOpenVault,
  cityName
}) => {
  // Current time state
  const [now, setNow] = useState<Date>(() => new Date());
  
  // Selected Timezone / City (default New Delhi as seen in user's image)
  const [selectedCity, setSelectedCity] = useState(PRESET_CITIES[0]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  
  // High Graphics preferences
  const [isSmoothSweep, setIsSmoothSweep] = useState(true);
  const [is24Hour, setIs24Hour] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [clockFinish, setClockFinish] = useState<'obsidian' | 'sapphire' | 'titanium'>('obsidian');

  // Secret Vault Hidden Trigger (Triple Tap or Vault Button)
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showSecretFeedback, setShowSecretFeedback] = useState(false);

  // Audio Context Ref for luxury watch mechanical escapement tick
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSecondRef = useRef<number>(-1);

  // Function to synthesize high-precision mechanical escapement tick
  const playTickAudio = (isAccentTick: boolean) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      const baseFreq = isAccentTick ? 3400 : 2800;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.012);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isAccentTick ? 2800 : 2200, ctx.currentTime);
      filter.Q.setValueAtTime(3.5, ctx.currentTime);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.014);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.016);
    } catch {
      // Audio autoplay policy handled silently
    }
  };

  // High-frequency animation loop for smooth sub-millisecond sweep
  useEffect(() => {
    const updateLoop = () => {
      const currentDate = new Date();
      setNow(currentDate);

      // Audio tick trigger on second transition
      const currentSec = currentDate.getSeconds();
      if (currentSec !== lastSecondRef.current) {
        lastSecondRef.current = currentSec;
        if (soundEnabled) {
          playTickAudio(currentSec === 0 || currentSec % 15 === 0);
        }
      }

      if (isSmoothSweep) {
        animFrameRef.current = requestAnimationFrame(updateLoop);
      }
    };

    if (isSmoothSweep) {
      animFrameRef.current = requestAnimationFrame(updateLoop);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    } else {
      const interval = setInterval(() => {
        const currentDate = new Date();
        setNow(currentDate);
        if (soundEnabled) {
          const currentSec = currentDate.getSeconds();
          playTickAudio(currentSec === 0 || currentSec % 15 === 0);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isSmoothSweep, soundEnabled]);

  // Sync city name if passed externally
  useEffect(() => {
    if (cityName) {
      const match = PRESET_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
      if (match) setSelectedCity(match);
    }
  }, [cityName]);

  // Handle hidden triple-tap for Secret Vault
  const handleCardTap = () => {
    const timestamp = Date.now();
    if (timestamp - lastTapTime < 750) {
      const nextCount = tapCount + 1;
      setTapCount(nextCount);
      if (nextCount >= 3) {
        setTapCount(0);
        setShowSecretFeedback(true);
        setTimeout(() => setShowSecretFeedback(false), 2200);
        if (onOpenVault) onOpenVault();
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(timestamp);
  };

  // Calculate precise hand angles
  const getHandAngles = () => {
    try {
      const dateString = now.toLocaleString('en-US', { timeZone: selectedCity.timeZone });
      const targetDate = new Date(dateString);
      
      const ms = isSmoothSweep ? now.getMilliseconds() : 0;
      const seconds = targetDate.getSeconds() + (isSmoothSweep ? ms / 1000 : 0);
      const minutes = targetDate.getMinutes() + seconds / 60;
      const hours = (targetDate.getHours() % 12) + minutes / 60;

      const secAngle = seconds * 6; // 360 / 60
      const minAngle = minutes * 6; // 360 / 60
      const hourAngle = hours * 30; // 360 / 12

      return { secAngle, minAngle, hourAngle, targetDate };
    } catch {
      const ms = isSmoothSweep ? now.getMilliseconds() : 0;
      const seconds = now.getSeconds() + (isSmoothSweep ? ms / 1000 : 0);
      const minutes = now.getMinutes() + seconds / 60;
      const hours = (now.getHours() % 12) + minutes / 60;

      return {
        secAngle: seconds * 6,
        minAngle: minutes * 6,
        hourAngle: hours * 30,
        targetDate: now
      };
    }
  };

  const { secAngle, minAngle, hourAngle, targetDate } = getHandAngles();

  // Formatted digital strings
  const hoursRaw = targetDate.getHours();
  const displayHours = is24Hour 
    ? String(hoursRaw).padStart(2, '0') 
    : String(hoursRaw % 12 || 12).padStart(2, '0');
  const displayMinutes = String(targetDate.getMinutes()).padStart(2, '0');
  const displaySeconds = String(targetDate.getSeconds()).padStart(2, '0');
  const ampm = hoursRaw >= 12 ? 'PM' : 'AM';

  const weekdayStr = targetDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    timeZone: selectedCity.timeZone 
  });
  const dateStr = targetDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    timeZone: selectedCity.timeZone 
  });

  // Calculate GMT offset
  const getGmtOffset = () => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: selectedCity.timeZone,
        timeZoneName: 'shortOffset'
      }).formatToParts(now);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart ? tzPart.value : 'LIVE';
    } catch {
      return 'LIVE';
    }
  };

  // Center Coordinates for SVG (200 x 200 viewport)
  const cx = 100;
  const cy = 100;
  const r = 88;

  return (
    <div
      onClick={handleCardTap}
      role="region"
      aria-label={`Live High Graphics Clock for ${selectedCity.name}: ${displayHours}:${displayMinutes} ${is24Hour ? '' : ampm}`}
      className="group relative w-full h-full min-h-[235px] rounded-[28px] overflow-hidden cursor-pointer select-none border border-white/20 hover:border-white/35 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.45)] text-white bg-gradient-to-br from-[#0c101c]/95 via-[#080b14]/95 to-[#04060b]/98 flex flex-col justify-between p-5"
    >
      {/* Background Ambient Radial Glow */}
      <div className="absolute inset-0 bg-radial-at-tr from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/12 blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* TOP ROW: Location & Status Badges */}
      <div className="relative z-20 flex items-center justify-between">
        {/* City Selector Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCityDropdownOpen(!isCityDropdownOpen);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all text-xs font-semibold text-white/95 cursor-pointer shadow-sm"
            title="Change City"
          >
            <MapPin size={13} className="text-cyan-400 shrink-0 animate-pulse" />
            <span className="truncate max-w-[130px] font-medium tracking-wide">{selectedCity.name}</span>
            <ChevronDown size={12} className={`text-white/60 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* City Dropdown Menu */}
          <AnimatePresence>
            {isCityDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-8 z-50 w-52 rounded-2xl bg-slate-900/98 border border-white/20 shadow-2xl backdrop-blur-2xl p-1.5 space-y-0.5 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Select Timezone
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                  {PRESET_CITIES.map((city) => {
                    const isSelected = city.timeZone === selectedCity.timeZone && city.name === selectedCity.name;
                    return (
                      <button
                        key={city.name}
                        onClick={() => {
                          setSelectedCity(city);
                          setIsCityDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        <div className="truncate">
                          <div>{city.name}</div>
                          <div className="text-[10px] text-white/40">{city.region}</div>
                        </div>
                        {isSelected && <Check size={13} className="text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LIVE Status & Vault Indicator */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 backdrop-blur-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="tracking-wider">LIVE</span>
            <span className="text-[10px] text-cyan-400/80 font-mono font-normal">
              {getGmtOffset()}
            </span>
          </div>

          {/* Discreet Vault Trigger Button */}
          {onOpenVault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVault();
              }}
              className="p-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Open Secret Vault"
            >
              <ShieldCheck size={13} className="text-violet-400" />
            </button>
          )}
        </div>
      </div>

      {/* MIDDLE SECTION: Digital Readout & High Graphics Analog Timepiece */}
      <div className="relative z-10 flex items-center justify-between my-auto py-1 gap-3">
        
        {/* Left: Digital Readout & City Information */}
        <div className="flex flex-col justify-center">
          {/* Main Digital Clock */}
          <div className="flex items-baseline font-mono tracking-tight text-white drop-shadow-md">
            <span className="text-4xl sm:text-5xl font-light">{displayHours}:{displayMinutes}</span>
            <span className="text-base sm:text-lg font-bold text-cyan-400 ml-1.5 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
              :{displaySeconds}
            </span>
            {!is24Hour && (
              <span className="text-xs sm:text-sm font-semibold text-white/70 ml-2 tracking-normal font-sans">
                {ampm}
              </span>
            )}
          </div>

          {/* Date & Weekday display */}
          <div className="text-sm font-medium text-white/90 mt-1 flex items-center gap-2 drop-shadow-sm">
            <span className="text-cyan-300 font-semibold">{weekdayStr}</span>
            <span className="text-white/40">•</span>
            <span>{dateStr}</span>
          </div>

          {/* City Subtitle (as in user's image "New Delhi") */}
          <div className="text-xs text-white/60 mt-1 flex items-center gap-1.5 font-medium">
            <span className="text-white/90 font-semibold">{selectedCity.name}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/40 text-[11px] truncate max-w-[120px]">{selectedCity.region}</span>
          </div>
        </div>

        {/* Right: Photorealistic High Graphics Analog Watch Dial */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="relative w-[138px] h-[138px] sm:w-[150px] sm:h-[150px] flex items-center justify-center">
            
            {/* SVG Ultra High Graphics Watch Dial */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] filter"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* 1. Metallic Outer Bezel Brushed Gradient */}
                <linearGradient id="bezelOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="25%" stopColor="#8a99ad" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#1a202c" stopOpacity="0.8" />
                  <stop offset="75%" stopColor="#4a5568" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
                </linearGradient>

                {/* 2. Deep Rehaut / Chapter Ring Gradient */}
                <radialGradient id="rehautGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="75%" stopColor="#0c1019" />
                  <stop offset="92%" stopColor="#151b27" />
                  <stop offset="100%" stopColor="#05080f" />
                </radialGradient>

                {/* 3. Watch Face Dial Background (Matte Obsidian or Sapphire) */}
                <radialGradient id="dialFaceGrad" cx="45%" cy="40%" r="60%">
                  {clockFinish === 'sapphire' ? (
                    <>
                      <stop offset="0%" stopColor="#132438" />
                      <stop offset="60%" stopColor="#09131f" />
                      <stop offset="100%" stopColor="#040910" />
                    </>
                  ) : clockFinish === 'titanium' ? (
                    <>
                      <stop offset="0%" stopColor="#222b38" />
                      <stop offset="70%" stopColor="#141a24" />
                      <stop offset="100%" stopColor="#0b0f15" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#141822" />
                      <stop offset="65%" stopColor="#0a0d13" />
                      <stop offset="100%" stopColor="#030407" />
                    </>
                  )}
                </radialGradient>

                {/* 4. Sapphire Glass Curved Glare Overlay */}
                <linearGradient id="sapphireGlare" x1="0%" y1="0%" x2="70%" y2="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                  <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.06" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* 5. Hand Drop Shadows */}
                <filter id="shadowHour" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.75" />
                </filter>
                <filter id="shadowMinute" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="2" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.8" />
                </filter>
                <filter id="shadowSecond" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.9" />
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00e5ff" floodOpacity="0.4" />
                </filter>
                
                {/* 6. Electric Blue Second Hand Gradient */}
                <linearGradient id="blueHandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#00d2ff" />
                  <stop offset="100%" stopColor="#0099ff" />
                </linearGradient>

                {/* 7. Center Hub Gradient */}
                <linearGradient id="centerCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>

              {/* OUTER WATCH CASE BEZEL (Multi-layered Metallic Chamfer) */}
              <circle cx={cx} cy={cy} r="98" fill="url(#bezelOuterGrad)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.4" />
              <circle cx={cx} cy={cy} r="95" fill="#0b0e14" />
              <circle cx={cx} cy={cy} r="93" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.2" />

              {/* REHAUT CHAPTER RING */}
              <circle cx={cx} cy={cy} r="91" fill="url(#rehautGrad)" />

              {/* INNER DIAL FACE (with subtle concentric guilloché micro-grooves) */}
              <circle cx={cx} cy={cy} r={r} fill="url(#dialFaceGrad)" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.12" />
              <circle cx={cx} cy={cy} r="70" fill="none" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.04" />
              <circle cx={cx} cy={cy} r="50" fill="none" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.04" />
              <circle cx={cx} cy={cy} r="32" fill="none" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.04" />

              {/* 60 MINUTE / SECOND TICK MARKS */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i * 6) * (Math.PI / 180);
                const isCardinalHour = i % 15 === 0; // 12, 3, 6, 9
                const isHour = i % 5 === 0;

                const innerR = isCardinalHour ? r - 8 : isHour ? r - 6.5 : r - 3.5;
                const outerR = r - 1.5;

                const x1 = cx + innerR * Math.sin(angle);
                const y1 = cy - innerR * Math.cos(angle);
                const x2 = cx + outerR * Math.sin(angle);
                const y2 = cy - outerR * Math.cos(angle);

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isCardinalHour ? '#ffffff' : isHour ? '#e2e8f0' : 'rgba(255,255,255,0.28)'}
                    strokeWidth={isCardinalHour ? 2.4 : isHour ? 1.6 : 0.8}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* CARDINAL NUMERALS: 12, 3, 6, 9 (Exact clean modern typography from image) */}
              <text
                x={cx}
                y={cy - 57}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="18"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
              >
                12
              </text>
              <text
                x={cx + 60}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="18"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
              >
                3
              </text>
              <text
                x={cx}
                y={cy + 59}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="18"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
              >
                6
              </text>
              <text
                x={cx - 60}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="18"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
              >
                9
              </text>

              {/* 1. HOUR HAND (Faceted 3D Baton Hand with Luminous Inlay) */}
              <g 
                transform={`rotate(${hourAngle}, ${cx}, ${cy})`}
                filter="url(#shadowHour)"
                style={{
                  transition: isSmoothSweep ? 'none' : 'transform 0.15s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
                }}
              >
                {/* Hand Body Base */}
                <rect
                  x={cx - 3.2}
                  y={cy - 44}
                  width="6.4"
                  height="48"
                  rx="3.2"
                  fill="#ffffff"
                />
                {/* 3D Chamfer spine highlight (left side light, right side subtle shadow) */}
                <path
                  d={`M ${cx - 3.2} ${cy + 4} L ${cx - 3.2} ${cy - 42} L ${cx} ${cy - 44} L ${cx} ${cy + 4} Z`}
                  fill="#ffffff"
                />
                <path
                  d={`M ${cx} ${cy + 4} L ${cx} ${cy - 44} L ${cx + 3.2} ${cy - 42} L ${cx + 3.2} ${cy + 4} Z`}
                  fill="#cbd5e1"
                />
                {/* Luminous Core Inlay */}
                <rect
                  x={cx - 1.4}
                  y={cy - 40}
                  width="2.8"
                  height="34"
                  rx="1.4"
                  fill="#e0f2fe"
                />
              </g>

              {/* 2. MINUTE HAND (Longer Slender Faceted Sword Hand) */}
              <g 
                transform={`rotate(${minAngle}, ${cx}, ${cy})`}
                filter="url(#shadowMinute)"
                style={{
                  transition: isSmoothSweep ? 'none' : 'transform 0.15s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
                }}
              >
                {/* Slender Minute Hand */}
                <rect
                  x={cx - 2.4}
                  y={cy - 68}
                  width="4.8"
                  height="72"
                  rx="2.4"
                  fill="#ffffff"
                />
                {/* 3D Highlight & Shadow split */}
                <path
                  d={`M ${cx - 2.4} ${cy + 4} L ${cx - 2.4} ${cy - 66} L ${cx} ${cy - 68} L ${cx} ${cy + 4} Z`}
                  fill="#ffffff"
                />
                <path
                  d={`M ${cx} ${cy + 4} L ${cx} ${cy - 68} L ${cx + 2.4} ${cy - 66} L ${cx + 2.4} ${cy + 4} Z`}
                  fill="#cbd5e1"
                />
                {/* Luminous Inner Inlay */}
                <rect
                  x={cx - 1}
                  y={cy - 64}
                  width="2"
                  height="56"
                  rx="1"
                  fill="#e0f2fe"
                />
              </g>

              {/* 3. ELECTRIC BLUE SECOND HAND (Authentic Design matching User Image) */}
              <g 
                transform={`rotate(${secAngle}, ${cx}, ${cy})`}
                filter="url(#shadowSecond)"
                style={{
                  transition: isSmoothSweep ? 'none' : 'transform 0.12s cubic-bezier(0.3, 1.8, 0.4, 0.8)'
                }}
              >
                {/* Fine Needle Point to Outer Perimeter */}
                <line
                  x1={cx}
                  y1={cy + 18}
                  x2={cx}
                  y2={cy - 78}
                  stroke="url(#blueHandGrad)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                {/* Counterweight Tail Lollipop/Donut Ring (as in image) */}
                <circle
                  cx={cx}
                  cy={cy + 12}
                  r="3.5"
                  fill="#050811"
                  stroke="#00d2ff"
                  strokeWidth="1.6"
                />
              </g>

              {/* CENTER HUB / PINION (Multi-Tiered Polished Steel & Cyan Core) */}
              <circle cx={cx} cy={cy} r="6.5" fill="url(#centerCapGrad)" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx={cx} cy={cy} r="4.2" fill="#00d2ff" />
              <circle cx={cx} cy={cy} r="1.8" fill="#020617" />

              {/* SAPPHIRE CRYSTAL SPECULAR GLARE OVERLAY */}
              <path
                d={`M ${cx - 78} ${cy - 30} A 88 88 0 0 1 ${cx + 78} ${cy - 30} C ${cx + 40} ${cy - 10} ${cx - 40} ${cy - 10} ${cx - 78} ${cy - 30} Z`}
                fill="url(#sapphireGlare)"
                pointerEvents="none"
              />
            </svg>

          </div>
        </div>

      </div>

      {/* BOTTOM ROW: Controls & High Graphics Toggles */}
      <div className="relative z-10 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs text-white/60">
        
        {/* Left: Motion Sweep / Tick & Audio Escapement */}
        <div className="flex items-center gap-2">
          {/* Sweep vs Tick Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSmoothSweep(!isSmoothSweep);
            }}
            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-[10px] font-medium text-white/80 flex items-center gap-1 cursor-pointer"
            title="Toggle Smooth Sweep vs Quartz Tick"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSmoothSweep ? 'bg-cyan-400' : 'bg-amber-400'}`} />
            {isSmoothSweep ? 'Smooth Sweep' : 'Quartz Tick'}
          </button>

          {/* Sound Escapement Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-1 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled 
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title={soundEnabled ? 'Disable mechanical tick sound' : 'Enable luxury watch mechanical tick'}
          >
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>

          {/* 12h / 24h Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIs24Hour(!is24Hour);
            }}
            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-[10px] font-medium text-white/80 cursor-pointer"
            title="Toggle 12h / 24h"
          >
            {is24Hour ? '24H' : '12H'}
          </button>
        </div>

        {/* Right: Dial Finish Theme Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40 hidden sm:inline">Finish:</span>
          <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
            {(['obsidian', 'sapphire', 'titanium'] as const).map((finish) => (
              <button
                key={finish}
                onClick={(e) => {
                  e.stopPropagation();
                  setClockFinish(finish);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer capitalize ${
                  clockFinish === finish 
                    ? 'bg-cyan-500/25 text-cyan-300 font-bold' 
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {finish === 'obsidian' ? 'Obsidian' : finish === 'sapphire' ? 'Blue' : 'Titanium'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secret Vault Unlocked Toast Feedback */}
      <AnimatePresence>
        {showSecretFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-1.5 z-50 pointer-events-none"
          >
            <Sparkles size={12} />
            <span>Vault Unlocked 🔓</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
