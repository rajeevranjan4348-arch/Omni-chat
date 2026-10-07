/**
 * Hermes-inspired mobile/web agent orchestration for Omni-chat.
 *
 * Adapted from the architecture of ranjeevranjan4348-arch/hermes-agent:
 * - intent/task planning
 * - context + memory references
 * - tool/realtime routing
 * - verification metadata
 * - bounded execution
 *
 * This is intentionally TypeScript/browser-safe. Hermes' Python runtime and
 * terminal/OS integrations are not copied into the web client because they
 * cannot execute safely inside an Android browser/PWA.
 */

export type AgentIntent =
  | 'chat'
  | 'realtime'
  | 'research'
  | 'code'
  | 'planning'
  | 'action';

export interface AgentContext {
  intent: AgentIntent;
  steps: string[];
  realtime?: unknown;
  memory: string[];
  generatedAt: string;
  verification: {
    status: 'not-run' | 'verified' | 'unavailable';
    source?: string;
  };
}

const MEMORY_KEY = 'omnichat_agent_memory_v1';
const MAX_MEMORY = 80;

const readMemory = (): string[] => {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, MAX_MEMORY) : [];
  } catch {
    return [];
  }
};

export const rememberAgentFact = (fact: string) => {
  const clean = fact.trim();
  if (!clean) return;
  const next = [clean, ...readMemory().filter((item) => item !== clean)].slice(0, MAX_MEMORY);
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
};

const classifyIntent = (query: string): AgentIntent => {
  const q = query.toLowerCase();
  if (/latest|today|now|current|live|recent|price|weather|news|forecast|availability/.test(q)) return 'realtime';
  if (/research|compare|investigate|find out|sources|deep dive/.test(q)) return 'research';
  if (/code|bug|error|repository|github|implement|fix|build/.test(q)) return 'code';
  if (/plan|roadmap|schedule|steps|strategy/.test(q)) return 'planning';
  if (/open|launch|send|create|delete|install|run/.test(q)) return 'action';
  return 'chat';
};

const buildSteps = (intent: AgentIntent): string[] => {
  switch (intent) {
    case 'realtime': return ['classify request', 'retrieve fresh data', 'validate freshness', 'reason', 'answer'];
    case 'research': return ['define research goal', 'gather sources', 'cross-check', 'reason', 'answer'];
    case 'code': return ['inspect context', 'plan change', 'validate constraints', 'implement', 'verify'];
    case 'planning': return ['define goal', 'break into steps', 'check constraints', 'produce plan'];
    case 'action': return ['identify requested action', 'check capability and safety', 'execute supported action', 'report result'];
    default: return ['understand request', 'use relevant context', 'reason', 'validate', 'answer'];
  }
};

const getRealtimeData = async (query: string, intent: AgentIntent): Promise<unknown> => {
  if (intent !== 'realtime' && intent !== 'research') return undefined;

  try {
    const response = await fetch('/.netlify/functions/realtime-data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query,
        intent,
        freshnessRequired: 'live',
      }),
    });

    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  }
};

export const prepareAgentContext = async (query: string): Promise<AgentContext> => {
  const intent = classifyIntent(query);
  const steps = buildSteps(intent);
  const realtime = await getRealtimeData(query, intent);

  return {
    intent,
    steps,
    realtime,
    memory: readMemory(),
    generatedAt: new Date().toISOString(),
    verification: realtime
      ? { status: 'verified', source: 'Omni realtime-data orchestrator' }
      : { status: intent === 'realtime' || intent === 'research' ? 'unavailable' : 'not-run' },
  };
};

export const formatAgentContext = (context: AgentContext): string => {
  const realtimeText = context.realtime
    ? JSON.stringify(context.realtime).slice(0, 12000)
    : context.verification.status === 'unavailable'
      ? 'Fresh-data retrieval was unavailable. Do not invent current facts.'
      : 'No realtime source required.';

  const memoryText = context.memory.length
    ? context.memory.slice(0, 20).join('\n- ')
    : 'No stored agent facts.';

  return [
    '[OMNI AGENT CONTEXT]',
    `Intent: ${context.intent}`,
    `Plan: ${context.steps.join(' -> ')}`,
    `Verification: ${context.verification.status}${context.verification.source ? ` (${context.verification.source})` : ''}`,
    `Generated: ${context.generatedAt}`,
    '',
    'Relevant persistent agent memory:',
    `- ${memoryText}`,
    '',
    'Realtime/tool result:',
    realtimeText,
    '',
    'Execute only capabilities actually available to the web/PWA. Never claim an action succeeded unless the tool result confirms it.',
    '[/OMNI AGENT CONTEXT]',
  ].join('\n');
};
