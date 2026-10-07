import React from 'react';
import { 
  Sunrise, Sunset, Wind, Compass, Droplets, Sun, Eye, 
  Activity, Gauge, Moon, ShieldAlert, Sparkles, Navigation
} from 'lucide-react';

interface WeatherMetricsProps {
  weather: any;
  unit: 'C' | 'F';
}

/**
 * 1. Sunrise & Sunset Solar Arc
 */
export const SolarArcCard: React.FC<{ sunrise: string; sunset: string }> = ({ sunrise, sunset }) => {
  // Compute approximate sun position along arc
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parse sunrise & sunset e.g. "06:14 AM"
  const parseTimeToMinutes = (tStr: string) => {
    try {
      const [time, period] = tStr.split(' ');
      const [h, m] = time.split(':').map(Number);
      let hours = h;
      if (period?.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (period?.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return hours * 60 + m;
    } catch {
      return 6 * 60; // fallback 6 AM
    }
  };

  const riseMin = parseTimeToMinutes(sunrise);
  const setMin = parseTimeToMinutes(sunset);
  const dayLengthMin = Math.max(setMin - riseMin, 60);

  let progress = (currentMinutes - riseMin) / dayLengthMin;
  const isDaytime = progress >= 0 && progress <= 1;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Arc math: semicircle with r = 70, center (90, 80)
  const angle = Math.PI - clampedProgress * Math.PI; // from PI to 0
  const sunX = 90 + 65 * Math.cos(angle);
  const sunY = 75 - 55 * Math.sin(angle);

  // Remaining daylight
  const remainingMinutes = Math.max(0, setMin - currentMinutes);
  const remHours = Math.floor(remainingMinutes / 60);
  const remMins = remainingMinutes % 60;

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-white/70">
          <Sunrise size={14} className="text-amber-400" /> Sun & Day Length
        </span>
        <span className="text-[10px] text-amber-300/80 font-mono">
          {isDaytime ? `${remHours}h ${remMins}m left` : 'Night time'}
        </span>
      </div>

      {/* SVG Solar Arc */}
      <div className="relative w-full flex items-center justify-center my-1">
        <svg viewBox="0 0 180 85" className="w-full max-w-[200px] overflow-visible">
          <defs>
            <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Horizon line */}
          <line x1="10" y1="75" x2="170" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Semicircle arc */}
          <path 
            d="M 25 75 A 65 55 0 0 1 155 75" 
            fill="none" 
            stroke="url(#arcGrad)" 
            strokeWidth="2.5" 
            strokeDasharray="4 2"
          />

          {/* Moving Sun or Moon node */}
          {isDaytime ? (
            <g>
              <circle cx={sunX} cy={sunY} r="8" fill="#f59e0b" className="animate-pulse" opacity="0.4" />
              <circle cx={sunX} cy={sunY} r="5" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
            </g>
          ) : (
            <g>
              <circle cx={sunX} cy={sunY} r="6" fill="#38bdf8" opacity="0.3" />
              <circle cx={sunX} cy={sunY} r="4" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Sunrise size={14} className="text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] text-white/40">Sunrise</div>
            <div className="font-mono font-semibold text-white/90">{sunrise}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Sunset size={14} className="text-orange-400 shrink-0" />
          <div>
            <div className="text-[10px] text-white/40">Sunset</div>
            <div className="font-mono font-semibold text-white/90">{sunset}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. Air Quality Index (AQI) Card
 */
export const AqiCard: React.FC<{ aqi: number }> = ({ aqi }) => {
  let label = 'Good';
  let color = '#10b981';
  let advice = 'Air quality is satisfactory and poses little or no risk.';
  let percentage = Math.min(100, (aqi / 300) * 100);

  if (aqi > 50 && aqi <= 100) {
    label = 'Moderate';
    color = '#f59e0b';
    advice = 'Air quality is acceptable; however, very sensitive people may notice symptoms.';
  } else if (aqi > 100 && aqi <= 150) {
    label = 'Sensitive Groups';
    color = '#f97316';
    advice = 'Members of sensitive groups may experience health effects.';
  } else if (aqi > 150 && aqi <= 200) {
    label = 'Poor / Unhealthy';
    color = '#ef4444';
    advice = 'Everyone may begin to experience health effects. Wear a mask outdoors.';
  } else if (aqi > 200) {
    label = 'Very Unhealthy';
    color = '#a855f7';
    advice = 'Health alert: serious risk for the general population.';
  }

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-white/70">
          <Activity size={14} className="text-emerald-400" /> Air Quality (AQI)
        </span>
        <span 
          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ backgroundColor: `${color}25`, color }}
        >
          {label}
        </span>
      </div>

      <div className="my-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">{aqi}</span>
          <span className="text-xs text-white/50 font-medium">US AQI</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-white/10 mt-2 overflow-hidden relative">
          <div 
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <div className="mt-2 text-[11px] text-white/60 leading-snug border-t border-white/5 pt-2">
        {advice}
      </div>
    </div>
  );
};

/**
 * 3. Wind & Compass Card
 */
export const WindCompassCard: React.FC<{ speed: number; unit: 'C' | 'F' }> = ({ speed, unit }) => {
  // speed in km/h or mph
  const displaySpeed = unit === 'F' ? Math.round(speed * 0.621371) : speed;
  const speedUnit = unit === 'F' ? 'mph' : 'km/h';
  const rotation = (speed * 17) % 360; // directional aesthetic rotation

  const getWindDescription = (s: number) => {
    if (s < 5) return 'Calm';
    if (s < 15) return 'Light Breeze';
    if (s < 25) return 'Moderate Breeze';
    if (s < 38) return 'Fresh Wind';
    return 'Strong Gale';
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-white/70">
          <Wind size={14} className="text-cyan-400" /> Wind & Gusts
        </span>
        <span className="text-[10px] text-cyan-300 font-medium">{getWindDescription(speed)}</span>
      </div>

      <div className="flex items-center justify-between my-2">
        <div>
          <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {displaySpeed} <span className="text-sm font-normal text-white/50">{speedUnit}</span>
          </div>
          <div className="text-[11px] text-white/60 mt-1">
            Gusts up to {Math.round(displaySpeed * 1.35)} {speedUnit}
          </div>
        </div>

        {/* Compass Dial with rotating needle */}
        <div className="relative w-14 h-14 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
          <span className="absolute top-1 text-[8px] font-bold text-white/40">N</span>
          <span className="absolute bottom-1 text-[8px] font-bold text-white/40">S</span>
          <span className="absolute left-1 text-[8px] font-bold text-white/40">W</span>
          <span className="absolute right-1 text-[8px] font-bold text-white/40">E</span>
          
          <div 
            className="w-8 h-8 flex items-center justify-center transition-transform duration-700"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <Navigation size={16} className="text-cyan-400 fill-cyan-400" />
          </div>
        </div>
      </div>

      <div className="text-[11px] text-white/50 border-t border-white/5 pt-2 flex justify-between">
        <span>Direction: NW ({rotation}°)</span>
        <span>Beaufort: {Math.min(12, Math.floor(speed / 6))}</span>
      </div>
    </div>
  );
};

/**
 * 4. UV Index Card
 */
export const UvIndexCard: React.FC<{ uv: number }> = ({ uv }) => {
  let label = 'Low';
  let color = '#10b981';
  let advice = 'No protection required. Safe for normal outdoor activities.';

  if (uv >= 3 && uv <= 5) {
    label = 'Moderate';
    color = '#f59e0b';
    advice = 'Wear sunscreen and seek shade around midday.';
  } else if (uv >= 6 && uv <= 7) {
    label = 'High';
    color = '#f97316';
    advice = 'Protection essential. Hat, sunglasses, and SPF 30+ recommended.';
  } else if (uv >= 8) {
    label = 'Very High';
    color = '#ef4444';
    advice = 'Extra precautions required. Minimize midday sun exposure.';
  }

  const uvPercent = Math.min(100, (uv / 11) * 100);

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-white/70">
          <Sun size={14} className="text-amber-400" /> UV Index
        </span>
        <span 
          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ backgroundColor: `${color}25`, color }}
        >
          {label}
        </span>
      </div>

      <div className="my-1">
        <div className="text-3xl font-extrabold font-mono text-white tracking-tight">{uv}</div>
        <div className="w-full h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(10, uvPercent)}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <div className="mt-2 text-[11px] text-white/60 leading-snug border-t border-white/5 pt-2">
        {advice}
      </div>
    </div>
  );
};

/**
 * 5. Humidity & Dew Point Card
 */
export const HumidityCard: React.FC<{ humidity: number; dewPoint: number; unit: 'C' | 'F' }> = ({
  humidity,
  dewPoint,
  unit
}) => {
  const displayDew = unit === 'F' ? Math.round((dewPoint * 9) / 5 + 32) : dewPoint;

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-white/70">
          <Droplets size={14} className="text-blue-400" /> Humidity
        </span>
        <span className="text-[10px] text-blue-300 font-mono">
          Dew Point {displayDew}°
        </span>
      </div>

      <div className="my-1">
        <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
          {humidity}<span className="text-base font-normal text-white/60">%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
            style={{ width: `${humidity}%` }}
          />
        </div>
      </div>

      <div className="mt-2 text-[11px] text-white/60 border-t border-white/5 pt-2">
        {humidity > 70 ? 'High moisture level. Feels sticky.' : humidity < 35 ? 'Dry air. Stay hydrated.' : 'Comfortable ambient moisture level.'}
      </div>
    </div>
  );
};

/**
 * 6. Visibility & Pressure Card
 */
export const VisibilityPressureCard: React.FC<{ visibility: number; pressure: number }> = ({
  visibility,
  pressure
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-white/70">
          <Eye size={14} className="text-emerald-400" /> Visibility & Pressure
        </span>
        <span className="text-[10px] text-emerald-300">
          {visibility >= 10 ? 'Clear' : 'Hazy'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 my-1">
        <div>
          <div className="text-2xl font-extrabold font-mono text-white">{visibility} km</div>
          <div className="text-[10px] text-white/50 uppercase font-semibold">Visibility</div>
        </div>
        <div>
          <div className="text-2xl font-extrabold font-mono text-white">{pressure}</div>
          <div className="text-[10px] text-white/50 uppercase font-semibold">hPa Pressure</div>
        </div>
      </div>

      <div className="text-[11px] text-white/50 border-t border-white/5 pt-2">
        Barometer steady. Standard atmospheric pressure.
      </div>
    </div>
  );
};

/**
 * 7. Visual 7-Day Temperature Range Bar Row
 */
export const DailyForecastRow: React.FC<{
  day: {
    dayName: string;
    date: string;
    code: number;
    tempMax: number;
    tempMin: number;
    rainProb: number;
  };
  weekMin: number;
  weekMax: number;
  currentTemp?: number;
  isToday: boolean;
  unit: 'C' | 'F';
  getIcon: (code: number) => React.ReactNode;
  onClick: () => void;
}> = ({
  day,
  weekMin,
  weekMax,
  currentTemp,
  isToday,
  unit,
  getIcon,
  onClick
}) => {
  const displayMin = unit === 'F' ? Math.round((day.tempMin * 9) / 5 + 32) : day.tempMin;
  const displayMax = unit === 'F' ? Math.round((day.tempMax * 9) / 5 + 32) : day.tempMax;
  const dispWeekMin = unit === 'F' ? Math.round((weekMin * 9) / 5 + 32) : weekMin;
  const dispWeekMax = unit === 'F' ? Math.round((weekMax * 9) / 5 + 32) : weekMax;

  const totalRange = Math.max(dispWeekMax - dispWeekMin, 1);
  const leftPercent = Math.max(0, Math.min(100, ((displayMin - dispWeekMin) / totalRange) * 100));
  const widthPercent = Math.max(8, Math.min(100 - leftPercent, ((displayMax - displayMin) / totalRange) * 100));

  let dotPercent = 50;
  if (isToday && currentTemp !== undefined) {
    const dispCurr = unit === 'F' ? Math.round((currentTemp * 9) / 5 + 32) : currentTemp;
    dotPercent = Math.max(0, Math.min(100, ((dispCurr - displayMin) / Math.max(displayMax - displayMin, 1)) * 100));
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group select-none text-xs"
    >
      {/* Day label */}
      <span className="w-16 font-semibold text-white/90 group-hover:text-cyan-300 transition-colors">
        {isToday ? 'Today' : day.dayName}
      </span>

      {/* Weather Icon & Rain % */}
      <div className="flex items-center gap-1.5 w-16 justify-center">
        {getIcon(day.code)}
        {day.rainProb > 0 ? (
          <span className="text-[10px] font-mono text-cyan-400 font-semibold">
            {day.rainProb}%
          </span>
        ) : null}
      </div>

      {/* Low Temp */}
      <span className="w-9 text-right font-mono text-white/50 font-medium">
        {displayMin}°
      </span>

      {/* Horizontal Gradient Range Bar */}
      <div className="flex-1 mx-3 h-1.5 rounded-full bg-white/10 relative overflow-visible">
        <div 
          className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400"
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`
          }}
        />
        {/* Current temperature dot indicator on "Today" */}
        {isToday && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border border-slate-900 shadow-md z-10"
            style={{
              left: `calc(${leftPercent}% + ${widthPercent * (dotPercent / 100)}% - 5px)`
            }}
          />
        )}
      </div>

      {/* High Temp */}
      <span className="w-9 text-right font-mono text-white font-bold">
        {displayMax}°
      </span>
    </div>
  );
};
