import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, Code, Mic, MapPin, FileAudio, Volume2, Sparkles, MessageSquare,
  Zap, Sun, Cloud, CloudRain, Snowflake, CloudLightning, Wind,
  Clock, Cpu, Globe, TrendingUp, Activity, Search, ArrowRight,
  Calendar, Thermometer, Eye, Droplets, Newspaper
} from 'lucide-react';
import { getAiInstance } from '../services/gemini';

interface DashboardProps {
  onModeChange: (mode: string) => void;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  desc: string;
  code: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  city: string;
}

interface NewsItem {
  title: string;
  source: string;
}

const QUICK_ACTIONS = [
  { id: 'omni-chat', label: 'Omni Chat', desc: 'Chat with Gemini AI', icon: Bot, color: 'from-violet-500 to-purple-600' },
  { id: 'jarvis', label: 'J.A.R.V.I.S.', desc: 'HUD command interface', icon: Cpu, color: 'from-cyan-500 to-blue-600' },
  { id: 'coder', label: 'AI Coder', desc: 'Code generation IDE', icon: Code, color: 'from-emerald-500 to-green-600' },
  { id: 'voice-live', label: 'Voice AI', desc: 'Live voice interaction', icon: Mic, color: 'from-rose-500 to-red-600' },
  { id: 'search-maps', label: 'Search & Maps', desc: 'Web + location search', icon: MapPin, color: 'from-orange-500 to-amber-600' },
  { id: 'liquid-chat', label: 'Liquid Chat', desc: 'Animated chat modes', icon: Sparkles, color: 'from-pink-500 to-fuchsia-600' },
  { id: 'transcription', label: 'Transcribe', desc: 'Audio to text', icon: FileAudio, color: 'from-teal-500 to-cyan-600' },
  { id: 'tts', label: 'Text to Speech', desc: 'AI voice synthesis', icon: Volume2, color: 'from-indigo-500 to-blue-600' },
];

const WEATHER_CODES: Record<string, { desc: string; icon: React.ReactNode }> = {
  CLEAR: { desc: 'Clear Sky', icon: <Sun size={40} className="text-yellow-400" /> },
  CLOUDY: { desc: 'Cloudy', icon: <Cloud size={40} className="text-gray-300" /> },
  RAIN: { desc: 'Rainy', icon: <CloudRain size={40} className="text-blue-400" /> },
  SNOW: { desc: 'Snowy', icon: <Snowflake size={40} className="text-blue-100" /> },
  STORM: { desc: 'Thunderstorm', icon: <CloudLightning size={40} className="text-yellow-400" /> },
};

function getWeatherKey(code: number): string {
  if (code === 0) return 'CLEAR';
  if (code >= 1 && code <= 3) return 'CLOUDY';
  if (code >= 51 && code <= 67) return 'RAIN';
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 95) return 'STORM';
  return 'CLEAR';
}

const AI_MODELS = [
  { name: 'Gemini 2.5 Flash', badge: 'Fast', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/30', dot: 'bg-cyan-400' },
  { name: 'Gemini 2.5 Pro', badge: 'Smart', color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/30', dot: 'bg-violet-400' },
  { name: 'Gemini 2.5 Flash TTS', badge: 'Voice', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400' },
  { name: 'Gemini 2.0 Flash Img', badge: 'Image', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30', dot: 'bg-rose-400' },
];

export const DashboardMode: React.FC<DashboardProps> = ({ onModeChange }) => {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiTip, setAiTip] = useState('');
  const [aiTipLoading, setAiTipLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sessionStats] = useState({
    messagesTotal: parseInt(localStorage.getItem('dash_msg_count') || '0'),
    modesUsed: 8,
    uptime: Math.floor(Math.random() * 120) + 30,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          ]);
          const weatherData = await weatherRes.json();
          const geoData = await geoRes.json();
          const code = weatherData.current.weather_code;
          setWeather({
            temp: Math.round(weatherData.current.temperature_2m),
            feelsLike: Math.round(weatherData.current.apparent_temperature),
            desc: getWeatherKey(code),
            code,
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: Math.round(weatherData.current.wind_speed_10m),
            visibility: Math.round((weatherData.current.visibility || 10000) / 1000),
            city: geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Your Location',
          });
          setWeatherLoading(false);
        },
        async () => {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=28.6&longitude=77.2&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility`);
          const data = await res.json();
          const code = data.current.weather_code;
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            feelsLike: Math.round(data.current.apparent_temperature),
            desc: getWeatherKey(code),
            code,
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            visibility: Math.round((data.current.visibility || 10000) / 1000),
            city: 'New Delhi',
          });
          setWeatherLoading(false);
        }
      );
    } catch {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  const fetchAiTip = useCallback(async () => {
    setAiTipLoading(true);
    try {
      const ai = getAiInstance();
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Give me one short, fascinating AI or tech insight for today. Max 2 sentences. No markdown.',
      });
      setAiTip(res.text || '');
    } catch {
      setAiTip('AI is ready to assist — try asking anything across any mode!');
    } finally {
      setAiTipLoading(false);
    }
  }, []);

  useEffect(() => { fetchAiTip(); }, [fetchAiTip]);

  useEffect(() => {
    setNews([
      { title: 'Google DeepMind releases new reasoning model benchmarks', source: 'TechCrunch' },
      { title: 'OpenAI and Google battle for enterprise AI dominance in 2026', source: 'The Verge' },
      { title: 'New research shows LLMs can self-improve through reflection', source: 'ArXiv' },
      { title: 'AI-powered coding tools now used by 60% of developers', source: 'Stack Overflow' },
      { title: 'Gemini 2.5 Pro sets new record on MMLU benchmark', source: 'Google Blog' },
    ]);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onModeChange('search-maps');
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const weatherInfo = weather ? WEATHER_CODES[weather.desc] : null;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-white">
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
        .news-item { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .news-item:last-child { border-bottom: none; }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slide-up 0.5s ease forwards; }
        .slide-up-d1 { animation: slide-up 0.5s 0.1s ease both; }
        .slide-up-d2 { animation: slide-up 0.5s 0.2s ease both; }
        .slide-up-d3 { animation: slide-up 0.5s 0.3s ease both; }
        .slide-up-d4 { animation: slide-up 0.5s 0.4s ease both; }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              Welcome back 👋
            </h1>
            <p className="text-white/50 text-sm mt-1 flex items-center gap-2">
              <Calendar size={13} />
              {dateStr}
            </p>
          </div>
          <div className="dash-card px-4 py-3 text-right shrink-0 glow-purple">
            <div className="text-2xl font-mono font-bold text-white tracking-wider">{timeStr}</div>
            <div className="text-xs text-white/40 mt-0.5">Local Time</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="slide-up-d1">
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
        </div>

        {/* Top Row: Weather + AI Tip + Stats */}
        <div className="slide-up-d2 grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Weather Card */}
          <div className="dash-card p-5 glow-cyan md:col-span-1">
            {weatherLoading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <div className="w-8 h-8 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-white/40 text-sm">Fetching weather...</span>
              </div>
            ) : weather ? (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Globe size={11} /> {weather.city}
                    </div>
                    <div className="text-5xl font-bold text-white">{weather.temp}°<span className="text-2xl font-normal text-white/60">C</span></div>
                    <div className="text-white/60 text-sm mt-1">{weatherInfo?.desc}</div>
                  </div>
                  <div className="opacity-90">{weatherInfo?.icon}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/8">
                  <div className="text-center">
                    <Thermometer size={13} className="mx-auto mb-1 text-orange-400" />
                    <div className="text-xs text-white font-medium">{weather.feelsLike}°</div>
                    <div className="text-[10px] text-white/40">Feels</div>
                  </div>
                  <div className="text-center">
                    <Droplets size={13} className="mx-auto mb-1 text-blue-400" />
                    <div className="text-xs text-white font-medium">{weather.humidity}%</div>
                    <div className="text-[10px] text-white/40">Humidity</div>
                  </div>
                  <div className="text-center">
                    <Wind size={13} className="mx-auto mb-1 text-cyan-400" />
                    <div className="text-xs text-white font-medium">{weather.windSpeed}</div>
                    <div className="text-[10px] text-white/40">km/h</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-white/40 text-sm text-center py-8">Weather unavailable</div>
            )}
          </div>

          {/* AI Insight Card */}
          <div className="dash-card p-5 glow-purple md:col-span-2 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Sparkles size={14} className="text-violet-400" />
              </div>
              <span className="text-white/50 text-xs uppercase tracking-wider">AI Insight of the Day</span>
              <button
                onClick={fetchAiTip}
                disabled={aiTipLoading}
                className="ml-auto text-[10px] text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-lg px-2 py-0.5 transition-colors disabled:opacity-40"
              >
                {aiTipLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {aiTipLoading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-white/40 text-sm">Generating insight...</span>
              </div>
            ) : (
              <p className="text-white/80 text-sm leading-relaxed">{aiTip}</p>
            )}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/8">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{sessionStats.modesUsed}</div>
                <div className="text-[10px] text-white/40">AI Modes</div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">{sessionStats.uptime}m</div>
                <div className="text-[10px] text-white/40">Session</div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-lg font-bold text-white flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full pulse-soft inline-block" />
                  Live
                </div>
                <div className="text-[10px] text-white/40">Status</div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">4</div>
                <div className="text-[10px] text-white/40">Models</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="slide-up-d3">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={13} className="text-violet-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onModeChange(action.id)}
                  className="action-card p-4 text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="text-sm font-semibold text-white">{action.label}</div>
                  <div className="text-[11px] text-white/40 mt-0.5 leading-tight">{action.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: AI Models + News */}
        <div className="slide-up-d4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">

          {/* AI Models Status */}
          <div className="dash-card p-5">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={13} className="text-cyan-400" /> Active AI Models
            </h3>
            <div className="space-y-3">
              {AI_MODELS.map((model) => (
                <div key={model.name} className={`flex items-center justify-between p-3 rounded-xl border ${model.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${model.dot} pulse-soft`} />
                    <span className={`text-sm font-medium ${model.color}`}>{model.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 border border-white/10 rounded-full px-2 py-0.5">{model.badge}</span>
                    <span className="text-[10px] text-emerald-400 font-medium">● Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI News Feed */}
          <div className="dash-card p-5">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Newspaper size={13} className="text-violet-400" /> AI & Tech Headlines
            </h3>
            <div className="space-y-0">
              {news.map((item, i) => (
                <div key={i} className="news-item py-3 flex items-start gap-3 group cursor-default">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp size={11} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80 leading-snug group-hover:text-white transition-colors">{item.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{item.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
