import React from 'react';
import { AppMode } from '../types';
import { 
  LayoutDashboard, Zap, Mic, 
  Code, Settings, 
  Sparkles, Bot, Image, Compass, Library
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { PremiumButton } from './PremiumEffects';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onVoiceSearchTrigger?: () => void;
}

interface SidebarItem {
  id: AppMode;
  label: string;
  icon: React.ReactNode;
}

interface SidebarCategory {
  title: string;
  icon: React.ReactNode;
  items: SidebarItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange }) => {
  const { getSidebarClass, getAccentClass, getBorderClass, isDarkMode } = useTheme();
  const [alertCount, setAlertCount] = React.useState(0);

  React.useEffect(() => {
    const checkAlerts = () => {
      try {
        const raw = localStorage.getItem('omnichat_workspace_alerts');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const unread = list.filter((a: any) => a.unread).length;
            setAlertCount(unread);
            return;
          }
        }
        // Initial setup for Keep and Chat alerts
        const initialAlerts = [
          { id: 'alert-chat-1', source: 'Google Chat', text: 'Sarah Connor: Need the project review slides before EOD.', timestamp: Date.now() - 3600000, unread: true },
          { id: 'alert-keep-1', source: 'Google Keep', text: 'Checklist Sync: Verify sheets row count and sync formulas.', timestamp: Date.now() - 7200000, unread: true }
        ];
        localStorage.setItem('omnichat_workspace_alerts', JSON.stringify(initialAlerts));
        setAlertCount(2);
      } catch (e) {
        console.error('Failed to load workspace alerts:', e);
      }
    };

    checkAlerts();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'omnichat_workspace_alerts') {
        checkAlerts();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('omnichat-workspace-alerts-update', checkAlerts);

    // Simulate real-time alerts sync
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem('omnichat_workspace_alerts');
        const list = raw ? JSON.parse(raw) : [];
        if (!list.some((a: any) => a.id === 'alert-chat-simulated')) {
          list.unshift({
            id: 'alert-chat-simulated',
            source: 'Google Chat',
            text: 'System: Real-time macro execution engine initialized.',
            timestamp: Date.now(),
            unread: true
          });
          localStorage.setItem('omnichat_workspace_alerts', JSON.stringify(list));
          window.dispatchEvent(new Event('omnichat-workspace-alerts-update'));
        }
      } catch (e) {
        console.error(e);
      }
    }, 15000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('omnichat-workspace-alerts-update', checkAlerts);
      clearTimeout(timer);
    };
  }, []);

  const categories: SidebarCategory[] = [
    {
      title: 'Portal',
      icon: <Compass size={12} className="opacity-60" />,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      ]
    },
    {
      title: 'AI Conversational',
      icon: <Bot size={12} className="opacity-60" />,
      items: [
        { id: 'omni-chat', label: 'Omni Chat', icon: <Bot size={18} /> },
      ]
    },
    {
      title: 'Agents & Coding',
      icon: <Library size={12} className="opacity-60" />,
      items: [
        { id: 'chat-fast', label: 'Manus Agent', icon: <Sparkles size={18} /> },
        { id: 'coder', label: 'AI Coder IDE', icon: <Code size={18} /> },
      ]
    },
    {
      title: 'Creative & Utilities',
      icon: <Zap size={12} className="opacity-60" />,
      items: [
        { id: 'voice-live', label: 'Voice (Live API)', icon: <Mic size={18} /> },
        { id: 'image-gen', label: 'Image Generation', icon: <Image size={18} /> },
      ]
    },
    {
      title: 'Workspace Sync',
      icon: <Library size={12} className="opacity-60" />,
      items: [
        { id: 'workspace', label: 'Workspace Desk', icon: <Library size={18} /> },
      ]
    }
  ];

  return (
    <div className={`w-64 flex flex-col h-full border-r shrink-0 transition-all ${getSidebarClass()} ${getBorderClass()}`}>
      {/* Brand Header */}
      <div className={`p-4 border-b flex items-center justify-between ${getBorderClass()}`}>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className={`${getAccentClass()} animate-pulse`} size={20} />
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            OmniChat AI
          </span>
        </h1>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-white/40 font-mono">v1.2</span>
        </div>
      </div>

      {/* Categories & Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2 scrollbar-thin">
        {categories.map((category, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
              {category.icon}
              <span>{category.title}</span>
            </div>
            <ul className="space-y-0.5">
              {category.items.map((item) => {
                const isActive = currentMode === item.id;
                return (
                  <li key={item.id}>
                    <PremiumButton
                      onClick={() => onModeChange(item.id)}
                      hapticType="light"
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                        isActive
                          ? `bg-white/10 ${getAccentClass()} font-semibold border-l-2 border-l-${isActive ? 'current' : 'transparent'} shadow-sm`
                          : 'hover:bg-white/5 hover:text-white text-white/60'
                      }`}
                    >
                      <span className={`${isActive ? getAccentClass() : 'text-inherit/80'} relative flex items-center justify-center`}>
                        {item.icon}
                        {item.id === 'workspace' && alertCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                          </span>
                        )}
                      </span>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.id === 'workspace' && alertCount > 0 && (
                        <span className="text-[10px] bg-violet-500/20 text-violet-300 font-bold px-1.5 py-0.5 rounded-full border border-violet-500/30 transition-transform scale-105 duration-300">
                          {alertCount}
                        </span>
                      )}
                    </PremiumButton>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Settings */}
      <div className={`p-3 border-t ${getBorderClass()} bg-black/10`}>
        {/* Settings button */}
        <PremiumButton
          onClick={() => onModeChange('settings')}
          hapticType="medium"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
            currentMode === 'settings'
              ? `bg-white/10 ${getAccentClass()} font-semibold`
              : 'hover:bg-white/5 hover:text-white text-white/60'
          }`}
        >
          <Settings size={18} />
          Settings
        </PremiumButton>
      </div>
    </div>
  );
};
