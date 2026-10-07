import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sun, Cloud, CloudRain, Snowflake, CloudLightning, Wind, Thermometer, 
  Droplets, Eye, ShieldAlert, Navigation, Search, Plus, Trash2, X, RefreshCw, 
  Compass, Sunrise, Sunset, Moon, Activity, Map, Play, Pause, ChevronRight, 
  ChevronDown, Sparkles, AlertTriangle, ArrowLeft, Heart, Layers, CloudDrizzle, 
  SunDim, Clock, Volume2, VolumeX, Cpu, Zap, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WeatherBackgroundEffects } from './WeatherBackgroundEffects';
import { WeatherAIAssistant } from './WeatherAIAssistant';
import { WeatherNotifications } from './WeatherNotifications';
import { WeatherSoundSynth } from '../utils/weatherSoundSynth';
import { WeatherCompactWidget } from './WeatherCompactWidget';
import { WeatherHourlyCurve } from './WeatherHourlyCurve';
import { 
  SolarArcCard, AqiCard, WindCompassCard, UvIndexCard, 
  HumidityCard, VisibilityPressureCard, DailyForecastRow 
} from './WeatherMetricCards';

export interface WeatherData {
  temp: number;
  feelsLike: number;
  desc: string;
  code: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  city: string;
  lat: number;
  lon: number;
  uvIndex: number;
  pressure: number;
  dewPoint: number;
  sunrise: string;
  sunset: string;
  moonPhase: string;
  aqi: number;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
}

export interface HourlyForecastItem {
  time: string;
  temp: number;
  rainProb: number;
  windSpeed: number;
  uv: number;
  humidity: number;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  code: number;
  tempMax: number;
  tempMin: number;
  rainProb: number;
  humidity: number;
  windSpeed: number;
  uv: number;
  pressure: number;
  visibility: number;
  dewPoint: number;
  sunrise: string;
  sunset: string;
  moonPhase: string;
  aqi: number;
  hourly: HourlyForecastItem[];
}

export interface SavedCity {
  name: string;
  lat: number;
  lon: number;
}

// Map WMO Weather Codes to descriptive details
export const WEATHER_CODES: Record<number, { desc: string; icon: React.ReactNode; bgClass: string; textColor: string; glow: string }> = {
  0: { desc: 'Clear Sky', icon: <Sun size={36} className="text-amber-400" />, bgClass: 'from-sky-400 to-blue-600', textColor: 'text-amber-300', glow: 'shadow-amber-500/20' },
  1: { desc: 'Mainly Clear', icon: <SunDim size={36} className="text-amber-300" />, bgClass: 'from-sky-400 via-sky-500 to-blue-600', textColor: 'text-amber-200', glow: 'shadow-amber-400/20' },
  2: { desc: 'Partly Cloudy', icon: <Cloud size={36} className="text-slate-300" />, bgClass: 'from-slate-400 via-sky-500 to-indigo-700', textColor: 'text-slate-200', glow: 'shadow-slate-500/20' },
  3: { desc: 'Overcast', icon: <Cloud size={36} className="text-slate-400" />, bgClass: 'from-slate-500 to-slate-800', textColor: 'text-slate-300', glow: 'shadow-slate-600/20' },
  45: { desc: 'Foggy', icon: <Cloud size={36} className="text-slate-500/70" />, bgClass: 'from-slate-700 to-zinc-900', textColor: 'text-slate-400', glow: 'shadow-slate-800/20' },
  48: { desc: 'Depositing Rime Fog', icon: <Cloud size={36} className="text-slate-500/70" />, bgClass: 'from-slate-700 to-zinc-900', textColor: 'text-slate-400', glow: 'shadow-slate-800/20' },
  51: { desc: 'Light Drizzle', icon: <CloudDrizzle size={36} className="text-blue-300" />, bgClass: 'from-cyan-600 to-indigo-900', textColor: 'text-blue-200', glow: 'shadow-blue-400/20' },
  53: { desc: 'Moderate Drizzle', icon: <CloudDrizzle size={36} className="text-blue-300" />, bgClass: 'from-cyan-600 to-indigo-900', textColor: 'text-blue-200', glow: 'shadow-blue-500/20' },
  55: { desc: 'Dense Drizzle', icon: <CloudDrizzle size={36} className="text-blue-400" />, bgClass: 'from-cyan-700 to-indigo-950', textColor: 'text-blue-300', glow: 'shadow-blue-600/20' },
  61: { desc: 'Slight Rain', icon: <CloudRain size={36} className="text-blue-400" />, bgClass: 'from-blue-600 to-slate-900', textColor: 'text-blue-300', glow: 'shadow-blue-500/25' },
  63: { desc: 'Moderate Rain', icon: <CloudRain size={36} className="text-blue-400" />, bgClass: 'from-blue-700 to-slate-950', textColor: 'text-blue-300', glow: 'shadow-blue-600/30' },
  65: { desc: 'Heavy Rain', icon: <CloudRain size={36} className="text-blue-500" />, bgClass: 'from-blue-900 via-slate-900 to-black', textColor: 'text-blue-400', glow: 'shadow-blue-700/40' },
  71: { desc: 'Slight Snowfall', icon: <Snowflake size={36} className="text-sky-200" />, bgClass: 'from-sky-300 via-slate-800 to-indigo-950', textColor: 'text-sky-200', glow: 'shadow-sky-300/20' },
  73: { desc: 'Moderate Snowfall', icon: <Snowflake size={36} className="text-sky-200" />, bgClass: 'from-sky-300 via-slate-800 to-indigo-950', textColor: 'text-sky-200', glow: 'shadow-sky-400/35' },
  75: { desc: 'Heavy Snowfall', icon: <Snowflake size={36} className="text-sky-300" />, bgClass: 'from-sky-400 via-slate-900 to-black', textColor: 'text-sky-300', glow: 'shadow-sky-500/50' },
  95: { desc: 'Thunderstorm', icon: <CloudLightning size={36} className="text-yellow-400" />, bgClass: 'from-indigo-950 via-slate-900 to-black', textColor: 'text-yellow-300', glow: 'shadow-yellow-500/30' },
  96: { desc: 'Thunderstorm with Hail', icon: <CloudLightning size={36} className="text-yellow-400" />, bgClass: 'from-indigo-950 via-slate-900 to-black', textColor: 'text-yellow-300', glow: 'shadow-yellow-500/40' },
  99: { desc: 'Severe Thunderstorm', icon: <CloudLightning size={36} className="text-yellow-500" />, bgClass: 'from-purple-950 via-slate-900 to-black', textColor: 'text-yellow-400', glow: 'shadow-yellow-600/50' }
};

export function getWeatherDetails(code: number) {
  return WEATHER_CODES[code] || { 
    desc: 'Partly Cloudy', 
    icon: <Cloud size={36} className="text-slate-300" />, 
    bgClass: 'from-slate-600 to-slate-900', 
    textColor: 'text-slate-300', 
    glow: 'shadow-slate-500/20' 
  };
}

export function generateFallbackWeatherData(lat: number, lon: number, cityName: string): WeatherData {
  let baseTemp = 28;
  let code = 2; // Partly Cloudy default
  let humidity = 58;
  let windSpeed = 12;

  const lowerCity = cityName.toLowerCase();
  if (lowerCity.includes('delhi')) {
    baseTemp = 28;
    code = 2; // Partly Cloudy
    humidity = 48;
    windSpeed = 10;
  } else if (lowerCity.includes('london')) {
    baseTemp = 15;
    code = 61; // Slight Rain
    humidity = 80;
    windSpeed = 18;
  } else if (lowerCity.includes('york')) {
    baseTemp = 20;
    code = 1; // Mainly Clear
    humidity = 60;
    windSpeed = 14;
  } else if (lowerCity.includes('tokyo')) {
    baseTemp = 22;
    code = 0; // Clear Sky
    humidity = 55;
    windSpeed = 9;
  }

  // Generate 36 hours of hourly forecast
  const hourlyList: HourlyForecastItem[] = [];
  const startHour = new Date();
  for (let i = 0; i < 36; i++) {
    const hr = new Date(startHour.getTime() + i * 3600000);
    const hourVal = hr.getHours();
    const tempOffset = Math.sin(((hourVal - 6) / 24) * 2 * Math.PI) * 4;
    hourlyList.push({
      time: i === 0 ? 'Now' : hr.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
      temp: Math.round(baseTemp + tempOffset),
      rainProb: code >= 51 ? Math.round(60 + Math.sin(i) * 20) : Math.round(10 + Math.sin(i) * 10),
      windSpeed: Math.round(windSpeed + Math.sin(i * 1.5) * 3),
      uv: hourVal >= 10 && hourVal <= 16 ? Math.round(6 - Math.abs(13 - hourVal) * 1.5) : 0,
      humidity: Math.round(humidity - tempOffset * 2)
    });
  }

  // Generate 7 days of daily forecast
  const dailyList: DailyForecastItem[] = [];
  const baseDate = new Date();
  for (let i = 0; i < 7; i++) {
    const curDate = new Date(baseDate.getTime() + i * 86400000);
    const dayName = i === 0 ? 'Today' : curDate.toLocaleDateString('en-US', { weekday: 'short' });
    const daySeed = Math.sin(i * 1.5);
    
    let dayCode = code;
    if (i > 0) {
      const codeOptions = [0, 1, 2, 3, 61, 95];
      const optIdx = Math.abs(Math.floor(daySeed * 10)) % codeOptions.length;
      dayCode = codeOptions[optIdx];
    }

    const dayTempMax = Math.round(baseTemp + 4 + daySeed * 3);
    const dayTempMin = Math.round(baseTemp - 5 + daySeed * 2);

    const dayHourlyList: HourlyForecastItem[] = [];
    for (let h = 0; h < 24; h++) {
      const hTime = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate(), h);
      const tempOffset = Math.sin(((h - 6) / 24) * 2 * Math.PI) * 4;
      dayHourlyList.push({
        time: hTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        temp: Math.round(((dayTempMax + dayTempMin) / 2) + tempOffset),
        rainProb: dayCode >= 51 ? 70 : 15,
        windSpeed: Math.round(windSpeed + Math.sin(h) * 2),
        uv: h >= 10 && h <= 16 ? 5 : 0,
        humidity: Math.round(humidity + Math.sin(h) * 5)
      });
    }

    dailyList.push({
      date: curDate.toISOString().substring(0, 10),
      dayName,
      code: dayCode,
      tempMax: dayTempMax,
      tempMin: dayTempMin,
      rainProb: dayCode >= 51 ? 80 : 10,
      humidity: Math.round(humidity + daySeed * 10),
      windSpeed: Math.round(windSpeed + daySeed * 4),
      uv: dayCode === 0 ? 8 : dayCode < 3 ? 5 : 2,
      pressure: 1013,
      visibility: 8,
      dewPoint: Math.round(baseTemp - 8),
      sunrise: '06:14 AM',
      sunset: '06:22 PM',
      moonPhase: 'Waxing Gibbous',
      aqi: lowerCity.includes('delhi') ? 188 : 42,
      hourly: dayHourlyList
    });
  }

  return {
    temp: baseTemp,
    feelsLike: baseTemp + 2,
    desc: getWeatherDetails(code).desc,
    code,
    humidity,
    windSpeed,
    visibility: 8,
    city: cityName,
    lat,
    lon,
    uvIndex: 5,
    pressure: 1013,
    dewPoint: Math.round(baseTemp - 8),
    sunrise: dailyList[0].sunrise,
    sunset: dailyList[0].sunset,
    moonPhase: dailyList[0].moonPhase,
    aqi: dailyList[0].aqi,
    hourly: hourlyList,
    daily: dailyList
  };
}

const PRESET_POPULAR_CITIES = [
  { name: 'Delhi', lat: 28.61, lon: 77.20 },
  { name: 'Mumbai', lat: 19.07, lon: 72.87 },
  { name: 'Bengaluru', lat: 12.97, lon: 77.59 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Paris', lat: 48.85, lon: 2.35 },
  { name: 'Dubai', lat: 25.20, lon: 55.27 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
];

export const WeatherDashboard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [unit, setUnit] = useState<'C' | 'F'>(() => {
    return (localStorage.getItem('weather_unit') as 'C' | 'F') || 'C';
  });
  const [hourlyMaxHours, setHourlyMaxHours] = useState<number>(24);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [localTheme, setLocalTheme] = useState<'glass-dark' | 'glass-light'>('glass-dark');

  // Performance Boost mode
  const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(() => {
    return localStorage.getItem('weather_perf_boost') === 'true';
  });

  // Saved cities
  const [savedCities, setSavedCities] = useState<SavedCity[]>(() => {
    const saved = localStorage.getItem('weather_saved_cities');
    return saved ? JSON.parse(saved) : [
      { name: 'Delhi', lat: 28.61, lon: 77.20 },
      { name: 'New York', lat: 40.71, lon: -74.01 },
      { name: 'London', lat: 51.51, lon: -0.13 },
      { name: 'Tokyo', lat: 35.68, lon: 139.69 }
    ];
  });
  const [currentCityIndex, setCurrentCityIndex] = useState(0);

  // Sound effects
  const synthRef = useRef<WeatherSoundSynth | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [refreshRotate, setRefreshRotate] = useState(0);

  useEffect(() => {
    localStorage.setItem('weather_unit', unit);
  }, [unit]);

  useEffect(() => {
    localStorage.setItem('weather_saved_cities', JSON.stringify(savedCities));
  }, [savedCities]);

  useEffect(() => {
    localStorage.setItem('weather_perf_boost', String(isPerformanceMode));
    if (isPerformanceMode) {
      document.body.classList.add('perf-boost');
    } else {
      document.body.classList.remove('perf-boost');
    }
  }, [isPerformanceMode]);

  // Audio sound effects in expanded view
  useEffect(() => {
    if (!weather || !isExpanded || soundMuted) {
      if (synthRef.current) synthRef.current.stop();
      return;
    }
    const code = weather.code;
    let effectType = 'sunny';
    if (code === 0 || code === 1) effectType = 'sunny';
    else if (code === 2 || code === 3) effectType = 'cloudy';
    else if (code === 45 || code === 48) effectType = 'foggy';
    else if (code >= 51 && code <= 55) effectType = 'drizzle';
    else if (code >= 61 && code <= 65) effectType = 'rainy';
    else if (code >= 71 && code <= 75) effectType = 'snowy';
    else if (code >= 95) effectType = 'thunderstorm';

    if (!synthRef.current) synthRef.current = new WeatherSoundSynth();
    synthRef.current.start(effectType, {
      windSpeed: weather.windSpeed,
      isNight: new Date().getHours() >= 18 || new Date().getHours() < 5,
      isMorning: new Date().getHours() >= 5 && new Date().getHours() < 11
    });

    return () => {
      if (synthRef.current) synthRef.current.stop();
    };
  }, [weather, isExpanded, soundMuted]);

  // Parse Open-Meteo response
  const parseWeatherData = (raw: any, cityName: string, lat: number, lon: number): WeatherData => {
    const current = raw.current || {};
    const hourly = raw.hourly || {};
    const daily = raw.daily || {};

    const hourlyList: HourlyForecastItem[] = [];
    const nowHourStr = new Date().toISOString().substring(0, 13) + ':00';
    let startIdx = 0;
    if (hourly && hourly.time) {
      const idx = hourly.time.findIndex((t: string) => t >= nowHourStr);
      startIdx = idx >= 0 ? idx : 0;
      for (let i = startIdx; i < startIdx + 36 && i < hourly.time.length; i++) {
        hourlyList.push({
          time: i === startIdx ? 'Now' : new Date(hourly.time[i]).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
          temp: Math.round(hourly.temperature_2m[i]),
          rainProb: Math.round(hourly.precipitation_probability?.[i] || 0),
          windSpeed: Math.round(hourly.wind_speed_10m?.[i] || 10),
          uv: Math.round(hourly.uv_index?.[i] || 0),
          humidity: Math.round(hourly.relative_humidity_2m?.[i] || 50)
        });
      }
    }

    const dailyList: DailyForecastItem[] = [];
    if (daily && daily.time) {
      for (let i = 0; i < 7 && i < daily.time.length; i++) {
        const dateObj = new Date(daily.time[i] + 'T00:00:00');
        const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const code = daily.weather_code[i];
        const tempMax = Math.round(daily.temperature_2m_max[i]);
        const tempMin = Math.round(daily.temperature_2m_min[i]);
        const rainProb = Math.round(daily.precipitation_probability_max?.[i] || 0);
        const humidity = Math.round(daily.relative_humidity_2m_max?.[i] || 60);
        const windSpeed = Math.round(daily.wind_speed_10m_max?.[i] || 15);
        const uv = Math.round(daily.uv_index_max?.[i] || 2);

        const dayHourlyList: HourlyForecastItem[] = [];
        const dayStartIdx = i * 24;
        if (hourly && hourly.time) {
          for (let h = dayStartIdx; h < dayStartIdx + 24 && h < hourly.time.length; h++) {
            dayHourlyList.push({
              time: new Date(hourly.time[h]).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
              temp: Math.round(hourly.temperature_2m[h]),
              rainProb: Math.round(hourly.precipitation_probability?.[h] || 0),
              windSpeed: Math.round(hourly.wind_speed_10m?.[h] || 10),
              uv: Math.round(hourly.uv_index?.[h] || 0),
              humidity: Math.round(hourly.relative_humidity_2m?.[h] || 50)
            });
          }
        }

        const isDelhi = cityName.toLowerCase().includes('delhi');
        const simulatedAqi = isDelhi ? 188 : Math.max(22, Math.min(160, Math.floor((Math.sin(i * 1.2) + 1.2) * 45)));

        dailyList.push({
          date: daily.time[i],
          dayName,
          code,
          tempMax,
          tempMin,
          rainProb,
          humidity,
          windSpeed,
          uv,
          pressure: Math.round(hourly?.pressure_msl?.[dayStartIdx + 12] || 1013),
          visibility: Math.round((hourly?.visibility?.[dayStartIdx + 12] || 10000) / 1000),
          dewPoint: Math.round(hourly?.dew_point_2m?.[dayStartIdx + 12] || (tempMax - 8)),
          sunrise: daily.sunrise?.[i] ? new Date(daily.sunrise[i]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:14 AM',
          sunset: daily.sunset?.[i] ? new Date(daily.sunset[i]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:22 PM',
          moonPhase: ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'][Math.floor(((new Date(daily.time[i]).getDate() + i) % 29) / 3.7)],
          aqi: simulatedAqi,
          hourly: dayHourlyList
        });
      }
    }

    const curCode = current.weather_code ?? 2;
    const curTemp = Math.round(current.temperature_2m ?? 28);
    const isDelhi = cityName.toLowerCase().includes('delhi');

    return {
      temp: curTemp,
      feelsLike: Math.round(current.apparent_temperature ?? curTemp + 2),
      desc: getWeatherDetails(curCode).desc,
      code: curCode,
      humidity: Math.round(current.relative_humidity_2m ?? 50),
      windSpeed: Math.round(current.wind_speed_10m ?? 12),
      visibility: Math.round((current.visibility || 10000) / 1000),
      city: cityName,
      lat,
      lon,
      uvIndex: Math.round(hourly?.uv_index?.[startIdx] || 5),
      pressure: Math.round(hourly?.pressure_msl?.[startIdx] || 1013),
      dewPoint: Math.round(hourly?.dew_point_2m?.[startIdx] || (curTemp - 8)),
      sunrise: dailyList[0]?.sunrise || '06:14 AM',
      sunset: dailyList[0]?.sunset || '06:22 PM',
      moonPhase: dailyList[0]?.moonPhase || 'Waxing Gibbous',
      aqi: isDelhi ? 188 : (dailyList[0]?.aqi || 42),
      hourly: hourlyList,
      daily: dailyList
    };
  };

  const fetchWeatherForLocation = useCallback(async (lat: number, lon: number, cityName: string) => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility&hourly=temperature_2m,precipitation_probability,wind_speed_10m,uv_index,relative_humidity_2m,pressure_msl,visibility,dew_point_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_max,wind_speed_10m_max,uv_index_max,sunrise,sunset&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      const parsed = parseWeatherData(data, cityName, lat, lon);
      setWeather(parsed);
    } catch (err) {
      console.warn('Fallback weather for', cityName, err);
      const fallback = generateFallbackWeatherData(lat, lon, cityName);
      setWeather(fallback);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedCities.length > 0) {
      const city = savedCities[currentCityIndex];
      fetchWeatherForLocation(city.lat, city.lon, city.name);
    }
  }, [currentCityIndex, savedCities, fetchWeatherForLocation]);

  // GPS User location
  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          let city = 'Current Location';
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
              headers: { 'Accept-Language': 'en' }
            });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              city = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Current Location';
            }
          } catch (e) {
            console.warn(e);
          }
          const existsIdx = savedCities.findIndex(c => Math.abs(c.lat - latitude) < 0.1 && Math.abs(c.lon - longitude) < 0.1);
          if (existsIdx >= 0) {
            setCurrentCityIndex(existsIdx);
          } else {
            const newCity = { name: city, lat: latitude, lon: longitude };
            setSavedCities(prev => [newCity, ...prev]);
            setCurrentCityIndex(0);
          }
          setShowLocationModal(false);
        } finally {
          setWeatherLoading(false);
        }
      },
      (err) => {
        console.warn('GPS failed:', err);
        setWeatherLoading(false);
      }
    );
  };

  // Search input change
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSelectCity = (c: { name: string; lat: number; lon: number }) => {
    const existsIdx = savedCities.findIndex(s => s.name.toLowerCase() === c.name.toLowerCase());
    if (existsIdx >= 0) {
      setCurrentCityIndex(existsIdx);
    } else {
      setSavedCities(prev => [c, ...prev]);
      setCurrentCityIndex(0);
    }
    setShowLocationModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Week min and max for range bars
  const weekMin = weather?.daily ? Math.min(...weather.daily.map(d => d.tempMin)) : 20;
  const weekMax = weather?.daily ? Math.max(...weather.daily.map(d => d.tempMax)) : 35;

  const displayTemp = weather ? (unit === 'F' ? Math.round((weather.temp * 9) / 5 + 32) : weather.temp) : 28;
  const displayHigh = weather?.daily[0] ? (unit === 'F' ? Math.round((weather.daily[0].tempMax * 9) / 5 + 32) : weather.daily[0].tempMax) : displayTemp + 3;
  const displayLow = weather?.daily[0] ? (unit === 'F' ? Math.round((weather.daily[0].tempMin * 9) / 5 + 32) : weather.daily[0].tempMin) : displayTemp - 4;
  const displayFeelsLike = weather ? (unit === 'F' ? Math.round((weather.feelsLike * 9) / 5 + 32) : weather.feelsLike) : displayTemp + 2;

  const activeWeatherInfo = weather ? getWeatherDetails(weather.code) : null;
  const selectedDayData = selectedDayIndex !== null && weather ? weather.daily[selectedDayIndex] : null;

  return (
    <div className="w-full">
      {/* 1. COMPACT WEATHER WIDGET (Image 1 style) */}
      <WeatherCompactWidget
        weather={weather}
        loading={weatherLoading}
        unit={unit}
        isPerformanceMode={isPerformanceMode}
        onOpenFull={() => setIsExpanded(true)}
      />

      {/* 2. EXPANDED FULL WEATHER EXPERIENCE (Video 2 style) */}
      <AnimatePresence>
        {isExpanded && weather && (
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`fixed inset-0 z-50 overflow-y-auto ${
              localTheme === 'glass-dark' 
                ? 'bg-slate-950/95 text-white' 
                : 'bg-slate-900/95 text-white'
            } ${isPerformanceMode ? 'backdrop-blur-sm' : 'backdrop-blur-2xl'} flex flex-col`}
          >
            {/* Ambient Background Aura */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25">
              <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-500/20 blur-[130px]" />
              <div className="absolute top-[30%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[150px]" />
              <WeatherBackgroundEffects code={weather.code} isWidget={false} isBoostEnabled={isPerformanceMode} />
            </div>

            {/* TOP HEADER CONTROLS BAR */}
            <div className="sticky top-0 z-30 px-4 md:px-6 py-3.5 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-slate-950/40">
              
              {/* Back / Close button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title="Close and return"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* City name with dropdown to open location selector */}
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold transition-all cursor-pointer group"
                >
                  <MapPin size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate max-w-[130px] md:max-w-[200px]">{weather.city}</span>
                  <ChevronDown size={14} className="text-white/50 group-hover:text-white" />
                </button>
              </div>

              {/* Quick City Pills (Desktop) */}
              <div className="hidden lg:flex items-center gap-1.5">
                {savedCities.slice(0, 4).map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentCityIndex(i)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      currentCityIndex === i 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm' 
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="px-2.5 py-1 rounded-full text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5 flex items-center gap-1"
                >
                  <Search size={11} /> More
                </button>
              </div>

              {/* Utility Action Buttons: Unit Switch, GPS, Refresh, Close */}
              <div className="flex items-center gap-2">
                
                {/* °C / °F Unit Toggle */}
                <button
                  onClick={() => setUnit(prev => prev === 'C' ? 'F' : 'C')}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer"
                  title="Switch Temperature Unit"
                >
                  <span className={unit === 'C' ? 'text-cyan-400 font-extrabold' : 'text-white/40'}>°C</span>
                  <span className="text-white/30 mx-0.5">/</span>
                  <span className={unit === 'F' ? 'text-cyan-400 font-extrabold' : 'text-white/40'}>°F</span>
                </button>

                {/* Auto GPS */}
                <button
                  onClick={handleGPSLocation}
                  className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition-all cursor-pointer hidden sm:flex items-center gap-1 text-xs font-semibold"
                  title="Current GPS Location"
                >
                  <Navigation size={13} />
                  <span>GPS</span>
                </button>

                {/* Pull to refresh */}
                <button
                  onClick={() => {
                    setRefreshRotate(r => r + 360);
                    fetchWeatherForLocation(weather.lat, weather.lon, weather.city);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                  title="Refresh weather data"
                >
                  <RefreshCw 
                    size={16} 
                    className={weatherLoading ? 'animate-spin text-cyan-400' : ''} 
                    style={{ transform: `rotate(${refreshRotate}deg)`, transition: 'transform 0.5s ease' }}
                  />
                </button>

                {/* Sound mute toggle */}
                {weather && ((weather.code >= 51 && weather.code <= 65) || weather.code >= 95) && (
                  <button
                    onClick={() => setSoundMuted(m => !m)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 transition-all cursor-pointer"
                    title={soundMuted ? 'Unmute weather ambiance' : 'Mute weather ambiance'}
                  >
                    {soundMuted ? <VolumeX size={16} className="text-white/40" /> : <Volume2 size={16} />}
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

            </div>

            {/* EXPANDED CONTENT WRAPPER */}
            <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 z-10 relative">
              
              {/* SEVERE METEOROLOGICAL NOTIFICATION CENTER */}
              <WeatherNotifications weather={weather} />

              {/* 1. HERO WEATHER OVERVIEW CARD (Matching Video 2) */}
              <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-white/5 via-white/[0.03] to-white/5 border border-white/15 p-6 md:p-8 shadow-2xl backdrop-blur-md">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  {/* Left: City, Temperature & Condition */}
                  <div>
                    <div className="flex items-center gap-2 text-white/60 text-xs font-semibold uppercase tracking-wider">
                      <MapPin size={13} className="text-cyan-400" />
                      <span>{weather.city}</span>
                      <span className="opacity-40">•</span>
                      <span>LAT: {weather.lat.toFixed(1)}° LON: {weather.lon.toFixed(1)}°</span>
                    </div>

                    <div className="mt-2 text-6xl md:text-7xl font-extralight tracking-[-0.04em] text-white">
                      {displayTemp}°
                    </div>

                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xl md:text-2xl font-medium text-white/95">
                        {weather.desc}
                      </span>
                      <span className="text-sm font-normal text-white/60">
                        Feels like {displayFeelsLike}°
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
                      <span>H: {displayHigh}°</span>
                      <span className="opacity-30">•</span>
                      <span>L: {displayLow}°</span>
                      <span className="opacity-30">•</span>
                      <span className="text-cyan-300 font-medium">Humidity {weather.humidity}%</span>
                    </div>
                  </div>

                  {/* Right: AQI Badge & Big Glowing Icon */}
                  <div className="flex flex-col md:items-end justify-between gap-4">
                    
                    {/* Air Quality Pill */}
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>AQI {weather.aqi} • {weather.aqi <= 50 ? 'Good' : weather.aqi <= 100 ? 'Moderate' : 'Poor'}</span>
                    </div>

                    {/* Big Condition Icon */}
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center scale-110">
                      {activeWeatherInfo?.icon}
                    </div>

                  </div>

                </div>

              </div>

              {/* 2. HOURLY FORECAST WITH CONTINUOUS TEMPERATURE CURVE & NODES (Video 2 signature feature!) */}
              <div className="p-5 md:p-6 rounded-[28px] bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">
                      Hourly Forecast
                    </h3>
                  </div>

                  {/* 24h / 36h tab selector */}
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                    <button
                      onClick={() => setHourlyMaxHours(24)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        hourlyMaxHours === 24 
                          ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/20' 
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      24 Hours
                    </button>
                    <button
                      onClick={() => setHourlyMaxHours(36)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        hourlyMaxHours === 36 
                          ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/20' 
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      36 Hours
                    </button>
                  </div>
                </div>

                {/* Continuous Connected Temperature Curve Line Graph */}
                <WeatherHourlyCurve
                  hourlyData={weather.hourly}
                  unit={unit}
                  maxHours={hourlyMaxHours}
                />
              </div>

              {/* 3. 7-DAY EXTENDED FORECAST SECTION WITH TEMPERATURE RANGE BARS */}
              <div className="p-5 md:p-6 rounded-[28px] bg-white/5 border border-white/10 backdrop-blur-md">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" /> 7-Day Forecast
                </h3>

                <div className="divide-y divide-white/5">
                  {weather.daily.map((day, idx) => (
                    <DailyForecastRow
                      key={day.date}
                      day={day}
                      weekMin={weekMin}
                      weekMax={weekMax}
                      currentTemp={weather.temp}
                      isToday={idx === 0}
                      unit={unit}
                      getIcon={(code) => getWeatherDetails(code).icon}
                      onClick={() => setSelectedDayIndex(selectedDayIndex === idx ? null : idx)}
                    />
                  ))}
                </div>

                {/* Day Deep-Dive Detail Drawer if a day is clicked */}
                <AnimatePresence>
                  {selectedDayData && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
                    >
                      <div className="p-4 rounded-2xl bg-white/5 border border-cyan-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300">
                            Deep-Dive: {selectedDayData.dayName} ({selectedDayData.date})
                          </span>
                          <button
                            onClick={() => setSelectedDayIndex(null)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white/5">
                            <span className="text-[10px] text-white/40 uppercase">Sunrise / Sunset</span>
                            <div className="font-mono font-semibold text-white/90 mt-0.5">{selectedDayData.sunrise} • {selectedDayData.sunset}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5">
                            <span className="text-[10px] text-white/40 uppercase">Moon Phase</span>
                            <div className="font-semibold text-white/90 mt-0.5">{selectedDayData.moonPhase}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5">
                            <span className="text-[10px] text-white/40 uppercase">AQI Rating</span>
                            <div className="font-mono font-semibold text-emerald-400 mt-0.5">{selectedDayData.aqi}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5">
                            <span className="text-[10px] text-white/40 uppercase">Precipitation</span>
                            <div className="font-mono font-semibold text-cyan-300 mt-0.5">{selectedDayData.rainProb}%</div>
                          </div>
                        </div>

                        {/* Hourly curve for that day */}
                        <div className="pt-2">
                          <WeatherHourlyCurve hourlyData={selectedDayData.hourly} unit={unit} maxHours={24} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 4. COMPREHENSIVE WEATHER METRICS GRID (Video 2 matching 2x2 or 3x2 cards) */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" /> Weather Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Air Quality */}
                  <AqiCard aqi={weather.aqi} />

                  {/* UV Index */}
                  <UvIndexCard uv={weather.uvIndex} />

                  {/* Wind & Compass */}
                  <WindCompassCard speed={weather.windSpeed} unit={unit} />

                  {/* Humidity & Dew Point */}
                  <HumidityCard humidity={weather.humidity} dewPoint={weather.dewPoint} unit={unit} />

                  {/* Solar Arc (Sunrise/Sunset) */}
                  <SolarArcCard sunrise={weather.sunrise} sunset={weather.sunset} />

                  {/* Visibility & Pressure */}
                  <VisibilityPressureCard visibility={weather.visibility} pressure={weather.pressure} />
                </div>
              </div>

              {/* 5. SMART AI METEOROLOGIST ASSISTANT */}
              <div className="pt-2">
                <WeatherAIAssistant weather={weather} />
              </div>

            </div>

            {/* LOCATION SELECTOR & SEARCH MODAL */}
            <AnimatePresence>
              {showLocationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-[28px] p-6 shadow-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <MapPin size={18} className="text-cyan-400" /> Select Location
                      </h4>
                      <button
                        onClick={() => setShowLocationModal(false)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search city (e.g. Delhi, London, Tokyo)..."
                        className="w-full bg-white/5 border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 focus:bg-white/10"
                        autoFocus
                      />
                    </div>

                    {/* Live Search Results */}
                    {searchResults.length > 0 && (
                      <div className="max-h-44 overflow-y-auto divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
                        {searchResults.map((r, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              handleSelectCity({
                                name: r.display_name.split(',')[0],
                                lat: parseFloat(r.lat),
                                lon: parseFloat(r.lon)
                              });
                            }}
                            className="p-3 text-xs hover:bg-cyan-500/20 cursor-pointer text-white/90 transition-colors"
                          >
                            <div className="font-semibold text-white">{r.display_name.split(',')[0]}</div>
                            <div className="text-[10px] text-white/40 truncate">{r.display_name}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Auto GPS Option */}
                    <button
                      onClick={handleGPSLocation}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Navigation size={14} /> Use Current GPS Location
                    </button>

                    {/* Popular Preset Cities */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
                        Popular Cities
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_POPULAR_CITIES.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => handleSelectCity(c)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/20 text-xs font-medium text-white transition-all text-center truncate cursor-pointer"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
