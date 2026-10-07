import { generateSpeech } from '../services/gemini';

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function stopCurrentReadAloud() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      // Ignored
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignored
    }
    currentUtterance = null;
  }
}

/**
 * Converts raw PCM16 base64 audio data into a valid WAV Blob Object URL with RIFF header
 */
export function pcmToWavBlobUrl(pcmBase64: string, sampleRate: number = 24000): string {
  const binaryString = window.atob(pcmBase64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  /* RIFF identifier */
  view.setUint32(0, 0x52494646, false); // "RIFF"
  /* RIFF chunk length */
  view.setUint32(4, 36 + len, true);
  /* RIFF type */
  view.setUint32(8, 0x57415645, false); // "WAVE"
  /* format chunk identifier */
  view.setUint32(12, 0x666d7420, false); // "fmt "
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 = PCM) */
  view.setUint16(20, 1, true);
  /* channel count (1 = mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * 1 * 16/8) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (1 * 16/8) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  view.setUint32(36, 0x64617461, false); // "data"
  /* data chunk length */
  view.setUint32(40, len, true);

  const bytes = new Uint8Array(buffer, 44, len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function playTextToSpeech(text: string, voiceName: string = "Zephyr") {
  try {
    stopCurrentReadAloud();
    
    // Clean up text for better pronunciation
    const cleanText = text
      .replace(/[*#`_\-]/g, ' ') // strip md formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip md links
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // safety length limit
      
    if (!cleanText) return null;

    try {
      const response = await generateSpeech(cleanText, voiceName);
      const base64Audio = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const wavUrl = pcmToWavBlobUrl(base64Audio, 24000);
        const audio = new Audio(wavUrl);
        currentAudio = audio;
        
        await new Promise((resolve, reject) => {
          audio.onended = () => resolve(true);
          audio.onerror = (e) => reject(e);
          audio.play().catch(reject);
        });
        return audio;
      }
    } catch (geminiErr) {
      console.warn("[Read Aloud] Gemini TTS generation failed, falling back to Web Speech API:", geminiErr);
    }

    // Web Speech API Fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve(null);
        utterance.onerror = () => resolve(null);
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      });
    }
  } catch (err) {
    console.error("[Read Aloud Error] Failed to play speech:", err);
  }
  return null;
}
