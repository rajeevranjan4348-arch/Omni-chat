declare const Netlify: { env?: { get: (key: string) => string | undefined } } | undefined;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const now = () => new Date().toISOString();

function freshness(retrievedAt: string, maxAgeMs = 5 * 60 * 1000) {
  const age = Date.now() - new Date(retrievedAt).getTime();
  if (!Number.isFinite(age)) return 'unknown';
  if (age <= maxAgeMs) return 'live';
  if (age <= 60 * 60 * 1000) return 'recent';
  return 'stale';
}

function normalize<T>(data: T, source: string, retrievedAt: string, publishedAt: string | null = null, confidence = 0.9) {
  return { success: true, data, source, retrievedAt, publishedAt, freshness: freshness(retrievedAt), confidence };
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { accept: 'application/json', ...(init?.headers || {}) } });
  if (!response.ok) throw new Error('Upstream returned HTTP ' + response.status);
  return response.json();
}

function getIntent(body: any) {
  if (body?.intent) return String(body.intent);
  const q = String(body?.query || '');
  if (/weather|temperature|forecast|rain|humidity|wind/i.test(q)) return 'weather';
  if (/github|repository|repo|issue|pull request|commit|release/i.test(q)) return 'github';
  if (/news|headlines|breaking/i.test(q)) return 'news';
  if (/score|scores|fixture|standings|schedule|match|game/i.test(q)) return 'sports';
  if (/stock|share price|market price|sensex|nifty|nasdaq/i.test(q)) return 'stocks';
  if (/bitcoin|btc|ethereum|eth|crypto/i.test(q)) return 'crypto';
  return 'web';
}

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ success: false, error: 'POST required.' }, 405);

  let body: any;
  try { body = await request.json(); }
  catch { return json({ success: false, error: 'Invalid JSON request.' }, 400); }

  const intent = getIntent(body);
  const query = String(body.query || '').trim();
  if (!query) return json({ success: false, error: 'Query is required.' }, 400);

  const retrievedAt = now();

  try {
    if (intent === 'github') {
      const match = query.match(/(?:github\.com\/)?([^/\s]+\/[^/\s]+)/i);
      const repo = match?.[1]?.replace(/[),.]+$/, '');
      if (!repo || !repo.includes('/')) {
        return json({ success: false, error: 'A GitHub repository URL or owner/name is required for direct GitHub verification.', source: 'GitHub REST API', retrievedAt, freshness: 'unknown', confidence: 0 }, 400);
      }
      const parts = repo.split('/');
      const data = await fetchJson('https://api.github.com/repos/' + encodeURIComponent(parts[0]) + '/' + encodeURIComponent(parts[1]));
      return json(normalize(data, 'GitHub REST API', retrievedAt, null, 0.99));
    }

    if (intent === 'weather') {
      const location = String(body.location || '').trim();
      if (!location) return json({ success: false, error: 'Location is required for live weather verification.', source: 'Open-Meteo', retrievedAt, freshness: 'unknown', confidence: 0 }, 400);
      const geo = await fetchJson('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(location) + '&count=1&language=en&format=json');
      const place = geo?.results?.[0];
      if (!place) throw new Error('Location could not be resolved.');
      const weather = await fetchJson('https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude + '&longitude=' + place.longitude + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto');
      return json(normalize({
        location: { name: place.name, country: place.country, latitude: place.latitude, longitude: place.longitude },
        current: weather.current,
        timezone: weather.timezone,
      }, 'Open-Meteo', retrievedAt, null, 0.96));
    }

    const endpointMap: Record<string, string | undefined> = {
      news: Netlify.env?.get('REALTIME_NEWS_URL') || undefined,
      stocks: Netlify.env?.get('REALTIME_STOCKS_URL') || undefined,
      crypto: Netlify.env?.get('REALTIME_CRYPTO_URL') || undefined,
      web: Netlify.env?.get('REALTIME_SEARCH_URL') || undefined,
    };
    const endpoint = endpointMap[intent];
    if (!endpoint) {
      return json({ success: false, error: 'No approved live-data provider is configured for ' + intent + '. The assistant will not guess or fabricate live results.', source: 'Omni realtime router', retrievedAt, freshness: 'unknown', confidence: 0 }, 503);
    }
    const separator = endpoint.includes('?') ? '&' : '?';
    const data = await fetchJson(endpoint + separator + 'q=' + encodeURIComponent(query));
    return json(normalize(data, 'configured:' + intent, retrievedAt, null, 0.8));
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Live verification failed.', source: intent, retrievedAt, freshness: 'unknown', confidence: 0 }, 502);
  }
};
