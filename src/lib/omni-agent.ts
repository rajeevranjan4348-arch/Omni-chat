export type AgentMessage = { role: "user" | "assistant" | "system"; content: string };
export type AgentResult = { ok: boolean; text?: string; error?: string; model?: string };

export async function runOmniAgent(message: string, signal?: AbortSignal): Promise<AgentResult> {
  const response = await fetch("/api/agent", {
    method: "POST", headers: { "Content-Type": "application/json" },
    signal, body: JSON.stringify({ message })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Omni agent request failed");
  return data;
}

export async function runOmniAgentWithRetry(message: string, signal?: AbortSignal, retries = 2): Promise<AgentResult> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await runOmniAgent(message, signal); }
    catch (error) { last = error; if (attempt < retries) await new Promise(r => setTimeout(r, 700 * (attempt + 1))); }
  }
  throw last instanceof Error ? last : new Error("Omni agent failed");
}
