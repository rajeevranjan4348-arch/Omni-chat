/**
 * JARVIS CORE — system/logic layer only.
 * Keeps the existing Omni UI untouched.
 *
 * This layer provides:
 * - intent classification
 * - command planning
 * - proactive context
 * - device capability awareness
 * - voice/personality rules
 * - safe action verification
 *
 * It does not pretend a web browser can control Android apps.
 * Real device actions require the native Android bridge + user-granted permissions.
 */

export type JarvisIntent =
  | 'chat'
  | 'web_search'
  | 'open_app'
  | 'open_url'
  | 'maps'
  | 'weather'
  | 'device_status'
  | 'screen_control'
  | 'send_message'
  | 'call'
  | 'reminder'
  | 'automation'
  | 'media'
  | 'system_settings'
  | 'code'
  | 'unknown';

export interface JarvisCommand {
  intent: JarvisIntent;
  query: string;
  target?: string;
  entities: Record<string, string>;
  requiresNativeBridge: boolean;
  requiresConfirmation: boolean;
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function classifyJarvisCommand(input: string): JarvisCommand {
  const q = normalize(input);

  const result = (
    intent: JarvisIntent,
    entities: Record<string, string> = {},
    requiresNativeBridge = false,
    requiresConfirmation = false,
  ): JarvisCommand => ({
    intent,
    query: input.trim(),
    entities,
    requiresNativeBridge,
    requiresConfirmation,
  });

  if (/^(open|launch|start|run)\s+/.test(q)) {
    const target = q.replace(/^(open|launch|start|run)\s+/, '').replace(/\s+(please|now)$/, '');
    const webTargets = ['youtube', 'google', 'gmail', 'maps', 'spotify', 'github', 'instagram', 'facebook', 'x', 'twitter', 'discord', 'netflix', 'amazon'];
    return webTargets.includes(target)
      ? result('open_app', { target }, false)
      : result('open_app', { target }, true);
  }

  if (/\b(send|message|text)\b/.test(q) && /\b(whatsapp|telegram|sms|message)\b/.test(q)) {
    return result('send_message', {}, true, true);
  }

  if (/\b(call|phone|dial)\b/.test(q)) return result('call', {}, true, true);
  if (/\b(remind|reminder|remember to)\b/.test(q)) return result('reminder');
  if (/\b(weather|temperature|forecast)\b/.test(q)) return result('weather');
  if (/\b(map|maps|navigate|directions|route)\b/.test(q)) return result('maps');
  if (/\b(cpu|ram|memory|battery|network|device status|system status)\b/.test(q)) return result('device_status', {}, true);
  if (/\b(screen|tap|click|swipe|scroll|type into|read the screen)\b/.test(q)) return result('screen_control', {}, true);
  if (/\b(play|pause|resume|next song|previous song|volume|music)\b/.test(q)) return result('media', {}, true);
  if (/\b(settings|bluetooth|wifi|brightness|airplane mode|do not disturb)\b/.test(q)) return result('system_settings', {}, true, true);
  if (/\b(code|coding|program|debug|github|repository|repo)\b/.test(q)) return result('code');
  if (/\b(latest|today|current|live|news|search|look up)\b/.test(q)) return result('web_search');

  return result('chat');
}

export function buildJarvisSystemInstruction(base = ''): string {
  return `${base}

JARVIS OPERATING LAYER:
You are Omni operating in a JARVIS-style assistant mode. Be fast, calm, capable and proactive without being reckless.

CORE BEHAVIOUR
- Understand natural-language commands instead of requiring exact phrases.
- Handle English, Hindi and Hinglish naturally.
- Prefer a short acknowledgement before a multi-step action.
- For simple questions, answer directly.
- For current/latest/live information, use the available web-search/grounding capability.
- Maintain useful conversation context and the user's explicit saved preferences.
- When the user asks you to perform an action, plan the action first and verify its result.
- Never claim an action succeeded unless an available tool/native bridge actually reports success.

JARVIS CAPABILITIES
1. Conversation and reasoning.
2. Real-time web search and current information.
3. Weather and maps/directions through available web capabilities.
4. Voice input, transcription and spoken responses.
5. Persistent chat/voice history and explicit memory.
6. File/image/video/PDF understanding and OCR when tools are available.
7. Coding, debugging and repository assistance.
8. Workspace/agent-style multi-step task planning.
9. Device/system-status awareness when available.
10. Android app launching and UI interaction only when the native bridge is connected and the user has enabled the required Android capability.
11. Screen perception -> semantic action -> re-check -> verify loop for native Android actions.
12. Media/system controls only through an actual supported native capability.
13. Reminders/automation only through an actual automation tool or native scheduler; do not fabricate scheduling.

ANDROID RULES
- A Netlify/browser PWA cannot directly control arbitrary Android apps.
- If no native bridge exists, explain the limitation and provide the best available web/deep-link alternative.
- If the native bridge exists, prefer semantic UI refs/text over blind coordinates.
- After every meaningful UI action, inspect the new screen and verify the expected state.
- Ask for confirmation before consequential actions such as sending messages, placing calls, changing sensitive system settings, purchases, or deleting data.
- Never bypass Android permissions, lock screens, authentication, or security controls.

PROACTIVE ASSISTANCE
- Surface useful context only when it directly helps the current task.
- Do not invent notifications, sensor readings, contacts, app state, location, or completed actions.

VOICE STYLE
- Default acknowledgement: "Yes sir, kya hua?"
- Keep spoken replies concise and natural.
- Do not read markdown syntax aloud.
- If an operation takes multiple steps, narrate progress briefly.

ACTION SAFETY
- Distinguish planning from execution.
- Use available tools for execution.
- Verify tool results.
- If a capability is unavailable, say so clearly instead of simulating it.
`;
}

export function getJarvisCapabilitySummary(hasNativeBridge = false): string {
  return [
    'conversation',
    'real-time web',
    'voice + TTS',
    'memory + history',
    'files/images/OCR',
    'coding + agents',
    'weather + maps',
    'device status',
    'automation planning',
    hasNativeBridge ? 'Android native control' : 'Android native control unavailable in browser',
  ].join(', ');
}
