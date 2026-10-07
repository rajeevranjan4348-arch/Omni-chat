import React from 'react';
import { motion } from 'motion/react';
import { 
  Navigation, ChevronRight, Sun, Cloud, CloudRain, CloudDrizzle, 
  Snowflake, CloudLightning, SunDim, Sparkles, Droplets
} from 'lucide-react';
import { WeatherBackgroundEffects } from './WeatherBackgroundEffects';

interface HourlyForecastItem {
  time: string;
  temp: number;
  rainProb: number;
  windSpeed: number;
  uv: number;
  humidity: number;
}

interface DailyForecastItem {
  date: string;
  dayName: string;
  code: number;
  tempMax: number;
  tempMin: number;
  rainProb: number;
  humidity: number;
  windSpeed: number;
}

export interface CompactWeatherData {
  temp: number;
  feelsLike: number;
  desc: string;
  code: number;
  city: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  aqi: number;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
}

interface WeatherCompactWidgetProps {
  weather: CompactWeatherData | null;
  loading: boolean;
  unit: 'C' | 'F';
  isPerformanceMode?: boolean;
  onOpenFull: () => void;
}

// Map AQI to pill color and label
function getAqiBadge(aqi: number) {
  if (aqi <= 50) {
    return {
      label: 'Good',
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400'
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      dot: 'bg-amber-400'
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive',
      bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      dot: 'bg-orange-400'
    };
  }
  if (aqi <= 200) {
    return {
      label: 'Poor',
      bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      dot: 'bg-rose-400'
    };
  }
  return {
    label: 'Hazardous',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400'
  };
}

// Weather icon helper
function getMiniWeatherIcon(code: number, size = 18) {
  if (code === 0) return <Sun size={size} className="text-amber-400" />;
  if (code === 1) return <SunDim size={size} className="text-amber-300" />;
  if (code === 2 || code === 3) return <Cloud size={size} className="text-slate-300" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className="text-cyan-300" />;
  if (code >= 61 && code <= 65) return <CloudRain size={size} className="text-blue-400" />;
  if (code >= 71 && code <= 75) return <Snowflake size={size} className="text-sky-200" />;
  if (code >= 95) return <CloudLightning size={size} className="text-yellow-400" />;
  return <Cloud size={size} className="text-slate-300" />;
}

export const WeatherCompactWidget: React.FC<WeatherCompactWidgetProps> = ({
  weather,
  loading,
  unit,
  isPerformanceMode = false,
  onOpenFull
}) => {
  if (loading || !weather) {
    return (
      <div 
        onClick={onOpenFull}
        className="relative w-full max-w-md mx-auto h-[220px] rounded-[28px] overflow-hidden bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-indigo-950/80 border border-white/10 p-5 flex flex-col justify-between text-white/60 animate-pulse cursor-pointer shadow-xl"
      >
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 bg-white/10 rounded-md" />
          <div className="h-4 w-16 bg-white/10 rounded-full" />
        </div>
        <div className="flex justify-between items-center my-auto">
          <div className="space-y-2">
            <div className="h-12 w-20 bg-white/10 rounded-lg" />
            <div className="h-3 w-28 bg-white/10 rounded-md" />
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-full" />
        </div>
        <div className="flex justify-between gap-2 pt-2 border-t border-white/5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 w-12 bg-white/10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Temperatures formatted to current unit
  const temp = unit === 'F' ? Math.round((weather.temp * 9) / 5 + 32) : weather.temp;
  const highTemp = weather.daily[0] 
    ? (unit === 'F' ? Math.round((weather.daily[0].tempMax * 9) / 5 + 32) : weather.daily[0].tempMax) 
    : temp + 3;
  const lowTemp = weather.daily[0] 
    ? (unit === 'F' ? Math.round((weather.daily[0].tempMin * 9) / 5 + 32) : weather.daily[0].tempMin) 
    : temp - 4;

  const aqiInfo = getAqiBadge(weather.aqi);
  const hourly5 = weather.hourly.slice(0, 5);

  // Dynamic atmospheric gradient matching weather
  const getAtmosphereGradient = () => {
    const code = weather.code;
    if (code === 0 || code === 1) {
      return 'from-sky-500 via-blue-600 to-indigo-800';
    }
    if (code === 2 || code === 3) {
      return 'from-slate-600 via-slate-700 to-indigo-900';
    }
    if (code >= 51 && code <= 65) {
      return 'from-cyan-900 via-slate-900 to-indigo-950';
    }
    if (code >= 95) {
      return 'from-indigo-950 via-purple-950 to-slate-950';
    }
    return 'from-slate-700 via-indigo-900 to-slate-900';
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpenFull}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenFull();
        }
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      aria-label={`Weather for ${weather.city}: ${weather.temp} degrees, ${weather.desc}. Tap for full weather forecast`}
      className="group relative w-full max-w-md mx-auto rounded-[28px] overflow-hidden cursor-pointer select-none border border-white/20 hover:border-white/35 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.45)] text-white"
    >
      {/* Background Dynamic Atmospheric Colors */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getAtmosphereGradient()} opacity-90`} />
      <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
      
      {/* Particle & Lighting Overlay */}
      <WeatherBackgroundEffects
        code={weather.code}
        isWidget={true}
        isBoostEnabled={isPerformanceMode}
      />

      {/* Widget Content Container */}
      <div className="relative z-10 p-5 flex flex-col justify-between min-h-[235px]">
        
        {/* TOP ROW: Location & AQI Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium tracking-wide text-white/95 text-sm drop-shadow-sm">
            <Navigation size={13} className="text-white/80 shrink-0 fill-white/20" />
            <span className="font-semibold truncate max-w-[170px]">{weather.city}</span>
          </div>

          {/* AQI Pill Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-sm ${aqiInfo.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${aqiInfo.dot} animate-pulse`} />
            <span>AQI {weather.aqi} • {aqiInfo.label}</span>
          </div>
        </div>

        {/* MIDDLE SECTION: Large Temperature, Condition, H/L & Hero Icon */}
        <div className="flex items-center justify-between my-2">
          <div>
            <div className="text-5xl font-light tracking-[-0.04em] text-white leading-none drop-shadow-md">
              {temp}°
            </div>
            <div className="text-sm font-medium text-white/95 mt-1.5 drop-shadow-sm">
              {weather.desc}
            </div>
            <div className="text-xs font-normal text-white/75 mt-0.5 flex items-center gap-2">
              <span>H: {highTemp}°</span>
              <span className="opacity-40">•</span>
              <span>L: {lowTemp}°</span>
            </div>
          </div>

          {/* Hero Weather Icon with Ambient Glow */}
          <div className="relative flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner group-hover:scale-105 transition-transform">
            <div className="absolute inset-0 rounded-2xl bg-white/20 blur-md opacity-40 pointer-events-none" />
            <div className="relative z-10 scale-125">
              {getMiniWeatherIcon(weather.code, 36)}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: 5-Hour Mini Forecast Row */}
        <div className="pt-2.5 border-t border-white/15">
          <div className="grid grid-cols-5 gap-1 text-center">
            {hourly5.map((h, i) => {
              const hTemp = unit === 'F' ? Math.round((h.temp * 9) / 5 + 32) : h.temp;
              return (
                <div 
                  key={i} 
                  className="flex flex-col items-center py-1 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <span className="text-[10px] text-white/70 font-medium truncate max-w-full">
                    {i === 0 ? 'Now' : h.time.replace(':00', '').replace(' ', '')}
                  </span>
                  
                  <div className="my-1 text-white/90">
                    {getMiniWeatherIcon(weather.code, 15)}
                  </div>
                  
                  <span className="text-xs font-semibold text-white font-mono">
                    {hTemp}°
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tap hint */}
          <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-white/60 group-hover:text-white/90 transition-colors">
            <span className="flex items-center gap-1 font-medium tracking-wide">
              Tap for 24h curve & 7-day outlook
            </span>
            <ChevronRight size={13} className="text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>
    </motion.div>
  );
};
