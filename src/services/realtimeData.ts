export type RealtimeIntent = 'weather' | 'news' | 'sports' | 'stocks' | 'crypto' | 'github' | 'web' | 'general';

export interface RealtimeRequest {
  intent?: RealtimeIntent;
  query: string;
  location?: string;
  timeRange?: string;
  freshnessRequired?: boolean;
}

export interface RealtimeResult<T = unknown> {
  success: boolean;
  data?: T;
  source?: string;
  retrievedAt?: string;
  publishedAt?: string | null;
  freshness?: 'live' | 'recent' | 'stale' | 'unknown';
  confidence?: number;
  error?: string;
}

const LIVE_PATTERNS = /\b(latest|today|now|current|currently|real[- ]?time|recent|updated|live|this week|this month)\b/i;
const INTENT_PATTERNS: Array<[RealtimeIntent, RegExp]> = [
  ['weather', /\b(weather|temperature|forecast|rain|humidity|wind)\b/i],
  ['news', /\b(news|headlines|breaking|latest news)\b/i],
  ['sports', /\b(score|scores|fixture|fixtures|standings|schedule|match|game)\b/i],
  ['stocks', /\b(stock|share price|market price|nasdaq|dow jones|sensex|nifty)\b/i],
  ['crypto', /\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency)\b/i],
  ['github', /\b(github|repository|repo|issue|pull request|commit|release)\b/i],
];

export function detectRealtimeIntent(query: string): { intent: RealtimeIntent; required: boolean } {
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(query)) return { intent, required: true };
  }
  return { intent: LIVE_PATTERNS.test(query) ? 'web' : 'general', required: LIVE_PATTERNS.test(query) };
}

export async function getRealtimeData<T = unknown>(request: RealtimeRequest): Promise<RealtimeResult<T>> {
  const detected = detectRealtimeIntent(request.query);
  const payload = {
    ...request,
    intent: request.intent || detected.intent,
    freshnessRequired: request.freshnessRequired ?? detected.required,
  };

  try {
    const response = await fetch('/api/realtime-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as RealtimeResult<T>;
    if (!response.ok || !result.success) {
      return { ...result, success: false, error: result.error || ('Realtime request failed (' + response.status + ')') };
    }
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Live data service unavailable.' };
  }
}
