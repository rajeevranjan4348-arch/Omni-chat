import { useState, useEffect } from 'react';
import { loader } from '@monaco-editor/react';

/**
 * Safe wrapper around @monaco-editor/loader that gracefully catches
 * and suppresses the benign { type: 'cancelation', msg: 'operation is manually canceled' }
 * rejection on unmount, avoiding unhandled promise rejections.
 */
export function useSafeMonaco() {
  const [monaco, setMonaco] = useState<any>(() => (loader as any).__getMonacoInstance?.());

  useEffect(() => {
    let isMounted = true;

    if (!monaco) {
      const cancelable = loader.init();

      cancelable
        .then((instance) => {
          if (isMounted) {
            setMonaco(instance);
          }
        })
        .catch((error) => {
          // Gracefully absorb cancellation error when component unmounts
          if (
            error?.type === 'cancelation' ||
            error?.msg === 'operation is manually canceled' ||
            String(error?.message || error?.msg || error || '').toLowerCase().includes('cancel')
          ) {
            return;
          }
          console.error('[Monaco] Initialization error:', error);
        });

      return () => {
        isMounted = false;
        try {
          cancelable.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      };
    }
  }, [monaco]);

  return monaco;
}

export default useSafeMonaco;
