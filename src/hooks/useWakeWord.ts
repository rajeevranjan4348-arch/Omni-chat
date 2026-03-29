import { useEffect, useState, useRef } from 'react';

export const useWakeWord = (
  onWakeWordDetected: () => void,
  wakeWords: string[] = ['hey omni', 'hey jarvis'],
  sensitivity: number = 50
) => {
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!hasInteracted) return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported for wake word detection.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListeningForWakeWord(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i][0];
        const transcript = result.transcript.toLowerCase();
        const confidence = result.confidence;
        
        // Map 0-100 sensitivity to 1.0-0.0 confidence threshold
        // 100 sensitivity = 0.0 threshold (accept anything)
        // 0 sensitivity = 1.0 threshold (must be perfectly confident)
        // 50 sensitivity = 0.5 threshold
        const threshold = 1.0 - (sensitivity / 100);
        
        const detected = wakeWords.some(word => transcript.includes(word.toLowerCase()));
        
        if (detected && confidence >= threshold) {
          onWakeWordDetected();
          // Restart recognition to clear the transcript
          recognition.stop();
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        if (event.error === 'not-allowed') {
          // If not allowed, stop trying to auto-restart and don't spam console
          recognition.onend = null;
          setIsListeningForWakeWord(false);
          console.warn('Wake word recognition blocked by browser (not-allowed). User must grant microphone permission.');
        } else {
          console.error('Wake word recognition error:', event.error);
        }
      }
    };

    recognition.onend = () => {
      setIsListeningForWakeWord(false);
      // Automatically restart listening for wake word
      try {
        if (recognition.onend) {
          recognition.start();
        }
      } catch (e) {
        // Ignore if already started
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to start wake word detection:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent auto-restart on unmount
        recognitionRef.current.stop();
      }
    };
  }, [onWakeWordDetected, hasInteracted, wakeWords, sensitivity]);

  return { isListeningForWakeWord };
};
