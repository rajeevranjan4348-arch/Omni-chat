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

    let isMounted = true;

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are normal lifecycle events (e.g. pauses, user speaking stopping, or mode changes)
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // If microphone permission is not granted, stop trying to auto-restart cleanly
        recognition.onend = null;
        if (isMounted) setIsListeningForWakeWord(false);
        console.warn('Wake word microphone access not allowed or pending user grant.');
        return;
      }

      if (event.error === 'network') {
        // Transient network hiccup with speech recognition service
        return;
      }

      console.warn('Wake word recognition event:', event.error);
    };

    let restartTimer: any = null;

    recognition.onend = () => {
      if (!isMounted) return;
      setIsListeningForWakeWord(false);
      // Automatically restart listening for wake word with a small delay to prevent rapid looping
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (!isMounted) return;
        try {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        } catch {
          // Ignore if already started or busy
        }
      }, 400);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Ignore start failure
    }

    return () => {
      isMounted = false;
      clearTimeout(restartTimer);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent auto-restart on unmount
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [onWakeWordDetected, hasInteracted, wakeWords, sensitivity]);

  return { isListeningForWakeWord };
};
