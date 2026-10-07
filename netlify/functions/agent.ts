import type { Handler } from "@netlify/functions";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  if (!API_KEY) return { statusCode: 500, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const message = String(body.message || "").trim();
    if (!message) return { statusCode: 400, body: JSON.stringify({ error: "message is required" }) };
    const system = "You are Omni, a persistent autonomous AI agent. Plan before acting, use available context, be accurate, recover from failures, and clearly separate facts from uncertainty. Preserve conversation continuity. Do not claim an action succeeded unless verified.";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + encodeURIComponent(API_KEY), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: message }] }] })
    });
    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, body: JSON.stringify({ error: data?.error?.message || "Agent model request failed" }) };
    const text = data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("") || "";
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ ok: true, text, model: MODEL }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown agent error" }) };
  }
};
