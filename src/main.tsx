// Early global interceptor to catch and silence benign cancellations (Monaco loader, AbortSignal, manual task stops)
window.addEventListener(
  'unhandledrejection',
  (event) => {
    const reason = event?.reason;
    const isCancellation =
      reason?.type === 'cancelation' ||
      reason?.msg === 'operation is manually canceled' ||
      reason?.name === 'AbortError' ||
      String(reason?.message || reason?.msg || reason || '')
        .toLowerCase()
        .includes('cancel') ||
      String(reason?.message || reason?.msg || reason || '')
        .toLowerCase()
        .includes('abort');

    if (isCancellation) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  },
  true,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import { PremiumEffectsProvider } from './components/PremiumEffects.tsx';
import './utils/logger'; // Initialize logger\n\nif ('serviceWorker' in navigator && import.meta.env.PROD) {\n  window.addEventListener('load', () => {\n    navigator.serviceWorker.register('/sw.js').catch((error) => {\n      console.warn('[Omni Agent] Service worker registration unavailable:', error);\n    });\n  });\n}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <PremiumEffectsProvider>
          <App />
        </PremiumEffectsProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
);
