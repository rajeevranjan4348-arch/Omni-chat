import React, { createContext, useContext, useState, useEffect } from 'react';
import { PersonaConfig } from '../types';
import { DEFAULT_PERSONA, PRESET_PERSONAS } from '../data/personas';

interface UserProfile {
  name: string;
  preferences: string;
  avatarUrl?: string;
}

interface SettingsContextType {
  micId: string;
  setMicId: (id: string) => void;
  sensitivity: number;
  setSensitivity: (val: number) => void;
  ttsVoice: string;
  setTtsVoice: (voice: string) => void;
  availableMics: MediaDeviceInfo[];
  wakeWordSensitivity: number;
  setWakeWordSensitivity: (val: number) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  memory: string[];
  setMemory: (memory: string[] | ((prev: string[]) => string[])) => void;
  activePersona: PersonaConfig;
  setActivePersona: (persona: PersonaConfig) => void;
  resetToDefaultPersona: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [micId, setMicId] = useState<string>('default');
  const [sensitivity, setSensitivity] = useState<number>(50);
  const [wakeWordSensitivity, setWakeWordSensitivity] = useState<number>(50);
  const [ttsVoice, setTtsVoice] = useState<string>('Zephyr');
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  
  const [activePersona, setActivePersona] = useState<PersonaConfig>(() => {
    const saved = localStorage.getItem('omnichat_active_persona');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_PERSONA;
  });

  const resetToDefaultPersona = () => {
    setActivePersona(DEFAULT_PERSONA);
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('omnichat_user_profile');
    return saved ? JSON.parse(saved) : { name: '', preferences: '' };
  });

  const [memory, setMemory] = useState<string[]>(() => {
    const saved = localStorage.getItem('omnichat_memory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('omnichat_active_persona', JSON.stringify(activePersona));
  }, [activePersona]);

  useEffect(() => {
    localStorage.setItem('omnichat_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('omnichat_memory', JSON.stringify(memory));
  }, [memory]);

  useEffect(() => {
    const getMics = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAvailableMics(audioInputs);
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };
    getMics();
  }, []);

  return (
    <SettingsContext.Provider value={{ 
      micId, setMicId, 
      sensitivity, setSensitivity, 
      ttsVoice, setTtsVoice, 
      availableMics,
      wakeWordSensitivity, setWakeWordSensitivity,
      userProfile, setUserProfile,
      memory, setMemory,
      activePersona, setActivePersona,
      resetToDefaultPersona
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};

