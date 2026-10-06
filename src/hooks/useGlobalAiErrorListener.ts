import { useEffect, useState, useRef } from 'react';
import { analyzeAndAutoFixError } from '../services/gemini';

export interface GlobalAiErrorLog {
  id: string;
  timestamp: number;
  message: string;
  source?: string;
  aiDiagnostic?: {
    rootCause?: string;
    suggestedFix?: string;
    autoRecoveryCode?: string;
  };
  recovered: boolean;
  isRetrying?: boolean;
  retryAttempted?: boolean;
}

/**
 * Categorizes whether an error or error message represents a transient network issue
 * (e.g., fetch failure, network disconnect, timeout, 502/503/504 server issues, 429 rate limit/overload).
 */
export function isTransientNetworkError(errOrMsg: any): boolean {
  if (!errOrMsg) return false;
  let text = '';
  let status = 0;

  if (typeof errOrMsg === 'string') {
    text = errOrMsg;
  } else if (typeof errOrMsg === 'object') {
    text = (errOrMsg.message || errOrMsg.msg || errOrMsg.name || '') + ' ' + (errOrMsg.stack || '') + ' ' + (errOrMsg.statusText || '');
    status = errOrMsg.status || errOrMsg.statusCode || errOrMsg.code || 0;
  } else {
    text = String(errOrMsg);
  }

  const lower = text.toLowerCase();

  // Exclude non-transient error signatures (syntax, bad auth/key, user cancellation)
  if (
    lower.includes('syntaxerror') ||
    lower.includes('invalid_argument') ||
    lower.includes('invalid api key') ||
    lower.includes('unauthorized') ||
    lower.includes('401')
  ) {
    return false;
  }

  // Transient network error signatures
  const isNetworkKeyword = (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('net::err_') ||
    lower.includes('socket hang up') ||
    lower.includes('connection reset') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('econnaborted') ||
    lower.includes('timeout') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('service unavailable') ||
    lower.includes('bad gateway') ||
    lower.includes('gateway timeout') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('offline')
  );

  const isTransientStatus = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

  return isNetworkKeyword || isTransientStatus;
}

/**
 * Utility wrapper for AI API requests that automatically performs a single re-try
 * when a transient network error is encountered.
 */
export async function executeAiWithTransientRetry<T>(
  requestFn: () => Promise<T>,
  options?: { source?: string; reqId?: string }
): Promise<T> {
  const reqId = options?.reqId || 'ai-req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  try {
    return await requestFn();
  } catch (err: any) {
    if (isTransientNetworkError(err)) {
      console.warn(`[Global AI Listener] Transient network error detected in AI API request (${err?.message || err}). Attempting single auto re-try...`);

      window.dispatchEvent(new CustomEvent('ai-request-retry-status', {
        detail: {
          reqId,
          status: 'retrying',
          error: err,
          source: options?.source || 'AI API Engine'
        }
      }));

      // Single exponential backoff delay before re-try (1000ms)
      await new Promise(res => setTimeout(res, 1000));

      try {
        const result = await requestFn();
        console.info(`[Global AI Listener] AI API request successfully recovered on single re-try!`);

        window.dispatchEvent(new CustomEvent('ai-request-retry-status', {
          detail: {
            reqId,
            status: 'recovered',
            source: options?.source || 'AI API Engine'
          }
        }));

        return result;
      } catch (retryErr: any) {
        console.error(`[Global AI Listener] Single re-try attempt failed for AI API request:`, retryErr);

        window.dispatchEvent(new CustomEvent('ai-request-retry-status', {
          detail: {
            reqId,
            status: 'failed',
            error: retryErr,
            source: options?.source || 'AI API Engine'
          }
        }));

        throw retryErr;
      }
    }
    throw err;
  }
}

export function useGlobalAiErrorListener() {
  const [activeError, setActiveError] = useState<GlobalAiErrorLog | null>(null);
  const retriedRequestsSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isBenignError = (msg: any) => {
      let text = '';
      if (typeof msg === 'string') {
        text = msg;
      } else if (msg && typeof msg === 'object') {
        text = (msg.message || msg.msg || msg.type || msg.name || '') + ' ' + JSON.stringify(msg);
      } else {
        text = String(msg || '');
      }
      const lower = text.toLowerCase();
      return (
        lower.includes('permission denied') ||
        lower.includes('notallowederror') ||
        lower.includes('permission dismissed') ||
        lower.includes('not-allowed') ||
        lower.includes('microphone') ||
        lower.includes('audiocapture') ||
        lower.includes('getusermedia') ||
        lower.includes('aborterror') ||
        lower.includes('abort') ||
        lower.includes('cancel') ||
        lower.includes('cancelation') ||
        lower.includes('cancellation') ||
        lower.includes('manually canceled') ||
        lower.includes('manually cancelled') ||
        lower.includes('operation is manually canceled') ||
        lower.includes('operation is manually cancelled') ||
        lower.includes('the request is not allowed by the user agent') ||
        lower.includes('resizeobserver') ||
        lower.includes('websocket') ||
        lower.includes('no-speech') ||
        lower.includes('audio-capture') ||
        lower.includes('user aborted')
      );
    };

    const processAiErrorWithRetry = async (
      rawError: any,
      sourceLabel: string,
      retryFn?: () => Promise<any>
    ) => {
      if (isBenignError(rawError)) return;

      const errMsg = typeof rawError === 'string' 
        ? rawError 
        : (rawError?.message || String(rawError || 'AI API Execution Error'));

      const isTransient = isTransientNetworkError(rawError) || isTransientNetworkError(errMsg);
      const reqSignature = sourceLabel + ':' + errMsg.slice(0, 80);

      // Single re-try logic for transient network issues
      if (isTransient && !retriedRequestsSet.current.has(reqSignature)) {
        retriedRequestsSet.current.add(reqSignature);

        console.warn(`[Global AI Listener] Categorized error as transient network issue. Initiating single auto re-try...`);

        const retryLogId = 'retry-' + Date.now();
        setActiveError({
          id: retryLogId,
          timestamp: Date.now(),
          message: `Transient network issue detected (${errMsg.slice(0, 100)}). Automatically attempting single re-try...`,
          source: sourceLabel,
          recovered: false,
          isRetrying: true,
          retryAttempted: true,
        });

        if (retryFn) {
          try {
            await new Promise(res => setTimeout(res, 1000));
            await retryFn();

            setActiveError(prev => prev ? {
              ...prev,
              message: 'AI API request successfully recovered after transient network re-try!',
              recovered: true,
              isRetrying: false,
            } : null);

            setTimeout(() => {
              setActiveError(null);
            }, 4000);
            return;
          } catch (retryFailedErr) {
            console.error('[Global AI Listener] Auto re-try attempt failed:', retryFailedErr);
          }
        }
      }

      // If non-transient or re-try failed, proceed with AI diagnostic log
      const errorLog: GlobalAiErrorLog = {
        id: 'err-' + Date.now(),
        timestamp: Date.now(),
        message: errMsg,
        source: sourceLabel,
        recovered: false,
        isRetrying: false,
        retryAttempted: retriedRequestsSet.current.has(reqSignature)
      };

      setActiveError(errorLog);

      try {
        const diagnostic = await analyzeAndAutoFixError(errMsg, rawError?.stack || '', sourceLabel);
        setActiveError(prev => prev ? {
          ...prev,
          aiDiagnostic: diagnostic,
          recovered: true
        } : null);

        setTimeout(() => {
          setActiveError(null);
        }, 5000);
      } catch (err) {
        console.error('Failed to run AI error analysis:', err);
      }
    };

    const handleGlobalError = async (event: ErrorEvent) => {
      if (isBenignError(event.message) || isBenignError(event.error)) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return;
      }
      console.warn('[Global AI Listener] Intercepted runtime error:', event.message);

      const retryFn = typeof (event.error as any)?.retry === 'function' ? (event.error as any).retry : undefined;
      await processAiErrorWithRetry(event.error || event.message, 'Global Runtime', retryFn);
    };

    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      if (isBenignError(event.reason)) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return;
      }
      const reasonMsg = event.reason?.message || (typeof event.reason === 'object' ? JSON.stringify(event.reason) : String(event.reason || 'Unhandled Promise Rejection'));
      if (isBenignError(reasonMsg)) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return;
      }
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      console.warn('[Global AI Listener] Intercepted unhandled promise rejection:', reasonMsg);

      const retryFn = typeof event.reason?.retry === 'function' ? event.reason.retry : undefined;
      await processAiErrorWithRetry(event.reason || reasonMsg, 'Async AI Engine', retryFn);
    };

    const handleCustomRetryStatus = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      const { reqId, status, error, source } = customEvt.detail || {};

      if (status === 'retrying') {
        setActiveError({
          id: reqId,
          timestamp: Date.now(),
          message: `Transient network issue detected. Automatically attempting single re-try...`,
          source: source || 'AI API Request',
          recovered: false,
          isRetrying: true,
          retryAttempted: true,
        });
      } else if (status === 'recovered') {
        setActiveError({
          id: reqId,
          timestamp: Date.now(),
          message: `AI API request successfully recovered after transient network re-try!`,
          source: source || 'AI API Request',
          recovered: true,
          isRetrying: false,
          retryAttempted: true,
        });
        setTimeout(() => setActiveError(null), 4000);
      } else if (status === 'failed') {
        processAiErrorWithRetry(error || 'AI API re-try attempt failed', source || 'AI API Request');
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('ai-request-retry-status', handleCustomRetryStatus);

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('ai-request-retry-status', handleCustomRetryStatus);
    };
  }, []);

  return { activeError, dismissError: () => setActiveError(null) };
}
