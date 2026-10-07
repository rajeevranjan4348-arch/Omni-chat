/**
 * Omni visual parity reference.
 * Kept intentionally UI-only: Floot mirrors these surfaces while GitHub
 * remains the functional source of truth.
 */
export const OMNI_VISUAL_PARITY = {
  brand: "Omni",
  accent: "violet-indigo",
  background: "deep-space",
  surfaces: "dark-glass",
  mobileFirst: true,
  preserveExistingUI: true,
  modes: [
    "dashboard",
    "omni-chat",
    "manus-agent",
    "voice-ai",
    "search-maps",
    "image-generation",
    "ai-coder",
    "workspace-central",
    "transcription",
    "text-to-speech",
    "settings",
  ] as const,
} as const;
