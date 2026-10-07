type HandlerEvent = { httpMethod?: string; body?: string | null };
type HandlerResponse = { statusCode: number; headers?: Record<string, string>; body: string };

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function handler(event: HandlerEvent): Promise<HandlerResponse> {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  if (!API_KEY) return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  try {
    const body = JSON.parse(event.body || "{}") as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "message is required" }) };
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent?key=" + encodeURIComponent(API_KEY), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are Omni, an autonomous AI agent. Plan before acting, use available context, recover from failures, and never claim an action succeeded unless verified." }] }, contents: [{ role: "user", parts: [{ text: message }] }] })
    });
    const data = await response.json() as { error?: { message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    if (!response.ok) return { statusCode: response.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: data.error?.message || "Agent model request failed" }) };
    const text = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("");
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ ok: true, text, model: MODEL }) };
  } catch (error) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown agent error" }) };
  }
}
