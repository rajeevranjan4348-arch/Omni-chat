import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Cloud, CloudRain, CloudDrizzle, Snowflake, 
  CloudLightning, SunDim
} from 'lucide-react';

export interface AnimatedWeatherHeroIconProps {
  code: number;
  size?: number;
  className?: string;
}

/**
 * Categorizes weather code to generate a unique key for smooth condition transitions
 */
export function getWeatherCategoryKey(code: number): string {
  if (code === 0 || code === 1) return `sunny-${code}`;
  if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) {
    const isHeavy = (code >= 63 && code <= 65) || code === 82;
    return `rain-${isHeavy ? 'heavy' : 'drizzle'}-${code}`;
  }
  if (code >= 95) return `thunderstorm-${code}`;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return `snow-${code}`;
  if (code === 45 || code === 48) return `fog-${code}`;
  return `cloudy-${code}`;
}

/**
 * Renders the visual animated scene for a specific weather condition
 */
function renderHeroIconContent(code: number, size: number) {
  // 1. CLEAR / SUNNY
  if (code === 0 || code === 1) {
    return (
      <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
        {/* Pulsing Sun Glow Aura */}
        <div 
          className="absolute inset-0 rounded-full bg-amber-400/25 blur-md animate-weather-sun-pulse" 
          aria-hidden="true" 
        />
        
        {/* Slowly Rotating Outer Rays Ring */}
        <div className="relative z-10 flex items-center justify-center animate-weather-sun-spin">
          {code === 0 ? (
            <Sun size={size} className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
          ) : (
            <SunDim size={size} className="text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]" />
          )}
        </div>
      </div>
    );
  }

  // 2. RAIN / SHOWERS / DRIZZLE
  if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) {
    const isHeavy = (code >= 63 && code <= 65) || code === 82;
    return (
      <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
        {/* Cloud Atmosphere Glow */}
        <div 
          className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md animate-pulse" 
          aria-hidden="true" 
        />

        {/* Floating Rain Cloud */}
        <div className="relative z-10 animate-weather-cloud-float">
          {isHeavy ? (
            <CloudRain size={size} className="text-blue-300 drop-shadow-[0_2px_8px_rgba(96,165,250,0.5)]" />
          ) : (
            <CloudDrizzle size={size} className="text-cyan-300 drop-shadow-[0_2px_8px_rgba(103,232,249,0.5)]" />
          )}

          {/* Gentle Falling Raindrops Effect */}
          <div className="absolute -bottom-2.5 left-0 right-0 h-4 overflow-visible pointer-events-none">
            {/* Drop 1 */}
            <span 
              className="absolute left-2.5 w-[1.5px] h-2.5 rounded-full bg-cyan-300/90 animate-weather-raindrop"
              style={{ animationDelay: '0s', animationDuration: '1.1s' }}
            />
            {/* Drop 2 */}
            <span 
              className="absolute left-5 w-[2px] h-3 rounded-full bg-sky-400/90 animate-weather-raindrop"
              style={{ animationDelay: '0.4s', animationDuration: '0.95s' }}
            />
            {/* Drop 3 */}
            <span 
              className="absolute left-8 w-[1.5px] h-2.5 rounded-full bg-blue-300/90 animate-weather-raindrop"
              style={{ animationDelay: '0.75s', animationDuration: '1.2s' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 3. THUNDERSTORM
  if (code >= 95) {
    return (
      <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
        {/* Electric Flash Backdrop */}
        <div 
          className="absolute inset-0 rounded-full bg-yellow-400/20 blur-md animate-weather-lightning" 
          aria-hidden="true" 
        />
        
        {/* Floating Dark Storm Cloud with Lightning */}
        <div className="relative z-10 animate-weather-cloud-float">
          <CloudLightning size={size} className="text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]" />

          {/* Storm Rain Drops */}
          <div className="absolute -bottom-2.5 left-0 right-0 h-4 pointer-events-none">
            <span 
              className="absolute left-2.5 w-[1.5px] h-3 rounded-full bg-sky-300 animate-weather-raindrop"
              style={{ animationDelay: '0.1s', animationDuration: '0.8s' }}
            />
            <span 
              className="absolute left-7 w-[1.5px] h-3 rounded-full bg-cyan-300 animate-weather-raindrop"
              style={{ animationDelay: '0.5s', animationDuration: '0.85s' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 4. SNOW / ICE
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return (
      <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
        <div 
          className="absolute inset-0 rounded-full bg-sky-300/20 blur-md animate-pulse" 
          aria-hidden="true" 
        />
        
        <div className="relative z-10 animate-weather-cloud-float">
          <Snowflake size={size} className="text-sky-200 drop-shadow-[0_0_10px_rgba(186,230,253,0.7)]" />

          {/* Gentle Fluttering Snowflakes */}
          <div className="absolute -bottom-2.5 left-0 right-0 h-4 pointer-events-none">
            <span 
              className="absolute left-2 w-1.5 h-1.5 rounded-full bg-white/90 animate-weather-snow-sway"
              style={{ animationDelay: '0s', animationDuration: '2.2s' }}
            />
            <span 
              className="absolute left-5 w-1 h-1 rounded-full bg-sky-100/90 animate-weather-snow-sway"
              style={{ animationDelay: '0.8s', animationDuration: '2.6s' }}
            />
            <span 
              className="absolute left-8 w-1.5 h-1.5 rounded-full bg-white/90 animate-weather-snow-sway"
              style={{ animationDelay: '1.4s', animationDuration: '2.0s' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 5. FOG / MIST
  if (code === 45 || code === 48) {
    return (
      <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
        <div 
          className="absolute inset-0 rounded-full bg-slate-300/15 blur-md" 
          aria-hidden="true" 
        />
        <div className="relative z-10 flex flex-col items-center">
          <Cloud size={size - 4} className="text-slate-300 drop-shadow-sm animate-weather-cloud-float" />
          
          {/* Drifting Mist Bars */}
          <div className="w-9 h-1 rounded-full bg-slate-200/40 mt-1 animate-weather-cloud-wisp" />
          <div 
            className="w-7 h-0.5 rounded-full bg-slate-300/30 mt-0.5 animate-weather-cloud-wisp"
            style={{ animationDelay: '1.5s' }}
          />
        </div>
      </div>
    );
  }

  // 6. CLOUDY / OVERCAST (code 2, 3 and fallback)
  return (
    <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
      {/* Soft Ambient Cloud Glow */}
      <div 
        className="absolute inset-0 rounded-full bg-indigo-300/15 blur-md" 
        aria-hidden="true" 
      />

      {/* Floating Secondary Mini-Cloud behind */}
      <div 
        className="absolute -top-1 -right-1 z-0 opacity-40 animate-weather-cloud-wisp"
        style={{ animationDuration: '7s' }}
      >
        <Cloud size={size * 0.58} className="text-slate-300" />
      </div>

      {/* Primary Floating Cloud Icon */}
      <div className="relative z-10 animate-weather-cloud-float">
        <Cloud 
          size={size} 
          className="text-slate-100 drop-shadow-[0_4px_12px_rgba(255,255,255,0.25)]" 
        />
      </div>
    </div>
  );
}

/**
 * AnimatedWeatherHeroIcon with cross-fade animation when condition icon updates
 */
export const AnimatedWeatherHeroIcon: React.FC<AnimatedWeatherHeroIconProps> = ({ 
  code, 
  size = 38,
  className = ''
}) => {
  const conditionKey = getWeatherCategoryKey(code);
  const containerDimension = Math.max(48, size + 10);

  return (
    <div 
      className={`relative flex items-center justify-center select-none pointer-events-none overflow-visible ${className}`}
      style={{ width: containerDimension, height: containerDimension }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={conditionKey}
          initial={{ 
            opacity: 0, 
            scale: 0.78, 
            filter: 'blur(5px)',
            rotate: -8
          }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            filter: 'blur(0px)',
            rotate: 0
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.78, 
            filter: 'blur(5px)',
            rotate: 8
          }}
          transition={{ 
            duration: 0.45, 
            ease: [0.16, 1, 0.3, 1] 
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {renderHeroIconContent(code, size)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
