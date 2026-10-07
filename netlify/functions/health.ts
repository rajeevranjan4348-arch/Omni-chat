type HandlerEvent = { httpMethod?: string };
type HandlerResponse = { statusCode: number; headers: Record<string, string>; body: string };

export async function handler(_event: HandlerEvent): Promise<HandlerResponse> {
  return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ ok: true, service: "omni-agent", timestamp: new Date().toISOString() }) };
}
