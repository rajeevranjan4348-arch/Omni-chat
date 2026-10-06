/**
 * Omni AI Learning Layer
 *
 * This is personalization, not model-weight training.
 * Explicit user instructions such as "remember that..." become durable
 * preferences and are injected into future Omni conversations.
 */

const EXPLICIT_MEMORY_PATTERNS = [
  /^remember(?: that)?\s*[:,-]?\s*(.+)$/i,
  /^from now on\s*[:,-]?\s*(.+)$/i,
  /^always\s*[:,-]?\s*(.+)$/i,
  /^learn(?: this)?\s*[:,-]?\s*(.+)$/i,
  /^keep in mind\s*[:,-]?\s*(.+)$/i,
];

const MAX_MEMORY_ITEMS = 100;
const MAX_ITEM_LENGTH = 500;

export function extractExplicitLearning(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;

  for (const pattern of EXPLICIT_MEMORY_PATTERNS) {
    const match = normalized.match(pattern);
    const value = match?.[1]?.trim();
    if (value && value.length >= 3) {
      return value.slice(0, MAX_ITEM_LENGTH);
    }
  }

  return null;
}

export function mergeLearnedMemory(
  current: string[],
  learned: string
): string[] {
  const normalized = learned.trim();
  if (!normalized) return current;

  const duplicate = current.some(
    item => item.trim().toLowerCase() === normalized.toLowerCase()
  );

  if (duplicate) return current;

  return [normalized, ...current].slice(0, MAX_MEMORY_ITEMS);
}

export function buildLearningContext(memory: string[]): string {
  const learned = memory
    .filter(Boolean)
    .slice(0, 30)
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');

  if (!learned) return '';

  return [
    'Persistent user preferences learned from explicit instructions:',
    learned,
    'Use these preferences when relevant. Do not mention this internal memory unless the user asks about it.',
  ].join('\n');
}
