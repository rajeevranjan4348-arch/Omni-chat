import React, { useRef } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, CloudDrizzle, SunDim, Droplets } from 'lucide-react';

export interface HourlyItem {
  time: string;
  temp: number;
  rainProb: number;
  windSpeed?: number;
  uv?: number;
  humidity?: number;
  code?: number;
}

interface WeatherHourlyCurveProps {
  hourlyData: HourlyItem[];
  unit: 'C' | 'F';
  maxHours?: number;
}

function getWeatherIcon(temp: number, rainProb: number, hourStr: string) {
  const isNight = hourStr.includes('PM') ? parseInt(hourStr) >= 7 : (hourStr.includes('AM') && (parseInt(hourStr) < 6 || parseInt(hourStr) === 12));
  
  if (rainProb >= 60) {
    return <CloudRain size={16} className="text-blue-400" />;
  }
  if (rainProb >= 30) {
    return <CloudDrizzle size={16} className="text-cyan-300" />;
  }
  if (isNight) {
    return <Cloud size={16} className="text-slate-300" />;
  }
  if (temp >= 28) {
    return <Sun size={16} className="text-amber-400" />;
  }
  return <SunDim size={16} className="text-amber-300" />;
}

export const WeatherHourlyCurve: React.FC<WeatherHourlyCurveProps> = ({
  hourlyData,
  unit,
  maxHours = 24
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = hourlyData.slice(0, maxHours);

  if (items.length === 0) return null;

  // Convert temps to chosen unit
  const displayTemps = items.map(item => 
    unit === 'F' ? Math.round((item.temp * 9) / 5 + 32) : item.temp
  );

  const minTemp = Math.min(...displayTemps);
  const maxTemp = Math.max(...displayTemps);
  const tempRange = Math.max(maxTemp - minTemp, 4); // avoid division by zero

  // Layout parameters for SVG
  const itemWidth = 68;
  const svgWidth = items.length * itemWidth;
  const svgHeight = 110;
  const yPaddingTop = 26;
  const yPaddingBottom = 34;
  const usableHeight = svgHeight - yPaddingTop - yPaddingBottom;

  // Compute (x, y) coordinates for each hourly point
  const points = displayTemps.map((temp, i) => {
    const x = i * itemWidth + itemWidth / 2;
    // higher temp = lower y (closer to top)
    const normalized = (temp - minTemp) / tempRange;
    const y = yPaddingTop + usableHeight * (1 - normalized);
    return { x, y, temp, raw: items[i] };
  });

  // Construct smooth bezier curve SVG path
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Shaded area path below curve
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const fillD = `${pathD} L ${lastX} ${svgHeight} L ${firstX} ${svgHeight} Z`;

  return (
    <div className="w-full select-none">
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ width: `${svgWidth}px` }} className="relative pt-2 pb-1">
          {/* SVG Line Graph with temperature curve */}
          <svg 
            width={svgWidth} 
            height={svgHeight} 
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="hourlyTempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38bdf8" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Filled area under curve */}
            <path d={fillD} fill="url(#hourlyTempGrad)" />

            {/* Continuous Connected Temperature Line */}
            <path 
              d={pathD} 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.9)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Circular Nodes and Temperatures above nodes */}
            {points.map((pt, idx) => (
              <g key={`node-${idx}`}>
                {/* Vertical subtle indicator guideline */}
                <line 
                  x1={pt.x} 
                  y1={pt.y + 6} 
                  x2={pt.x} 
                  y2={svgHeight} 
                  stroke="rgba(255, 255, 255, 0.06)" 
                  strokeDasharray="2 3" 
                  strokeWidth="1" 
                />

                {/* Node outer pulse/glow ring */}
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="6" 
                  fill="rgba(56, 189, 248, 0.25)" 
                />

                {/* Node center white circle */}
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="3.5" 
                  fill="#ffffff" 
                  stroke="#0284c7" 
                  strokeWidth="1.5"
                  filter="url(#nodeGlow)"
                />

                {/* Temperature label above node */}
                <text 
                  x={pt.x} 
                  y={pt.y - 10} 
                  textAnchor="middle" 
                  fill="#ffffff" 
                  fontSize="13" 
                  fontWeight="700" 
                  className="font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                >
                  {pt.temp}°
                </text>
              </g>
            ))}
          </svg>

          {/* Forecast Metadata below the curve (Icon, Rain prob, Time) */}
          <div className="flex w-full mt-1">
            {items.map((item, idx) => {
              const pt = points[idx];
              return (
                <div 
                  key={`meta-${idx}`}
                  style={{ width: `${itemWidth}px` }}
                  className="flex flex-col items-center justify-start text-center shrink-0 px-1"
                >
                  {/* Weather Icon */}
                  <div className="h-6 flex items-center justify-center">
                    {getWeatherIcon(item.temp, item.rainProb, item.time)}
                  </div>

                  {/* Precipitation Probability */}
                  <div className="h-4 mt-0.5 flex items-center justify-center">
                    {item.rainProb > 0 ? (
                      <span className="text-[10px] font-mono font-medium text-cyan-300 flex items-center gap-0.5">
                        <Droplets size={8} className="text-cyan-400" />
                        {item.rainProb}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/30 font-mono">0%</span>
                    )}
                  </div>

                  {/* Time label */}
                  <span className="text-[11px] font-medium text-white/70 mt-1">
                    {idx === 0 ? 'Now' : item.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
