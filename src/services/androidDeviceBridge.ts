/**
 * Android device bridge for Omni.
 *
 * Protocol target: Claw Use Android-style local bridge.
 * The Android companion must expose the documented /screen and /act endpoints.
 *
 * IMPORTANT:
 * - A Netlify-hosted HTTPS page cannot directly control arbitrary Android apps.
 * - This client is intended for a native Android shell/companion, or a bridge
 *   explicitly made reachable from the current browser origin.
 * - Never treat a successful network request as proof that a user-visible action
 *   happened; the bridge response must report success.
 */

export type AndroidBridgeConfig = {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
};

export type AndroidUiElement = {
  ref?: number;
  text?: string;
  contentDescription?: string;
  role?: string;
  className?: string;
  clickable?: boolean;
  enabled?: boolean;
  [key: string]: unknown;
};

export type AndroidScreen = {
  package?: string;
  activity?: string;
  elements?: AndroidUiElement[];
  [key: string]: unknown;
};

export type AndroidAction =
  | { click: number | string }
  | { tap: { x: number; y: number } }
  | { type: string }
  | { swipe: 'up' | 'down' | 'left' | 'right' }
  | { scroll: 'up' | 'down' | 'left' | 'right' }
  | { back: true }
  | { home: true }
  | { recents: true }
  | { launch: string }
  | { longpress: number | string };

export type AndroidBridgeResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

const DEFAULT_TIMEOUT = 12_000;

function getConfig(): AndroidBridgeConfig {
  const baseUrl = (localStorage.getItem('omni_android_bridge_url') || 'http://127.0.0.1:7333').replace(/\/$/, '');
  const token = localStorage.getItem('omni_android_bridge_token') || undefined;
  return { baseUrl, token, timeoutMs: DEFAULT_TIMEOUT };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT);

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (config.token) headers.set('X-Bridge-Token', config.token);

  try {
    const response = await fetch(config.baseUrl + path, { ...init, headers, signal: controller.signal });
    const text = await response.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    if (!response.ok) {
      throw new Error(body?.error || body?.message || `Android bridge HTTP ${response.status}`);
    }
    return body as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const androidDeviceBridge = {
  isConfigured(): boolean {
    return !!localStorage.getItem('omni_android_bridge_url');
  },

  setConfig(baseUrl: string, token?: string) {
    localStorage.setItem('omni_android_bridge_url', baseUrl.replace(/\/$/, ''));
    if (token) localStorage.setItem('omni_android_bridge_token', token);
    else localStorage.removeItem('omni_android_bridge_token');
  },

  clearConfig() {
    localStorage.removeItem('omni_android_bridge_url');
    localStorage.removeItem('omni_android_bridge_token');
  },

  async getScreen(): Promise<AndroidScreen> {
    return request<AndroidScreen>('/screen?compact=true');
  },

  async act(action: AndroidAction): Promise<AndroidBridgeResult> {
    return request<AndroidBridgeResult>('/act', {
      method: 'POST',
      body: JSON.stringify(action),
    });
  },

  async launch(packageName: string): Promise<AndroidBridgeResult> {
    return this.act({ launch: packageName });
  },

  async status(): Promise<unknown> {
    return request<unknown>('/status');
  },
};

export const ANDROID_DEVICE_TOOL_DECLARATIONS = [
  {
    name: 'android_get_screen',
    description: 'Read the current Android screen as a semantic UI tree. Use this before interacting with another app and again after important actions.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'android_act',
    description: 'Perform one verified action on the connected Android phone. Prefer clicking a semantic ref or visible text. Use typing only after the correct input is focused.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: {
          type: 'OBJECT',
          description: 'Exactly one action object.',
          properties: {
            click: { description: 'UI ref number or visible text to click.' },
            tap: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER' },
                y: { type: 'NUMBER' },
              },
            },
            type: { type: 'STRING' },
            swipe: { type: 'STRING', enum: ['up', 'down', 'left', 'right'] },
            scroll: { type: 'STRING', enum: ['up', 'down', 'left', 'right'] },
            back: { type: 'BOOLEAN' },
            home: { type: 'BOOLEAN' },
            recents: { type: 'BOOLEAN' },
            launch: { type: 'STRING', description: 'Android package name.' },
            longpress: { description: 'UI ref number or visible text to long-press.' },
          },
        },
      },
      required: ['action'],
    },
  },
];

export async function executeAndroidTool(name: string, args: any): Promise<unknown> {
  if (name === 'android_get_screen') {
    return await androidDeviceBridge.getScreen();
  }
  if (name === 'android_act') {
    if (!args?.action || typeof args.action !== 'object') {
      return { ok: false, error: 'Missing action object.' };
    }
    return await androidDeviceBridge.act(args.action as AndroidAction);
  }
  return { ok: false, error: `Unknown Android tool: ${name}` };
}
