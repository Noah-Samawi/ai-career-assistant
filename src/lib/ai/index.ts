import { z } from "zod";
import { env } from "@/lib/env";

export type AiProvider = "openai" | "anthropic";

export class AiUnavailableError extends Error {
  constructor() {
    super("No AI provider configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }
}

export function activeProvider(): AiProvider | null {
  const e = env();
  if (e.AI_PROVIDER === "none") return null;
  if (e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY) return "anthropic";
  if (e.AI_PROVIDER === "openai" && e.OPENAI_API_KEY) return "openai";
  if (e.OPENAI_API_KEY) return "openai";
  if (e.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

type CompleteOpts = { system: string; user: string; json?: boolean; maxTokens?: number; temperature?: number };

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof AiHttpError && (err.status === 429 || err.status >= 500);
      if (!retryable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw lastErr;
}

export class AiHttpError extends Error {
  constructor(public status: number, body: string) {
    super(`AI provider error ${status}: ${body.slice(0, 300)}`);
  }
}

async function openai(o: CompleteOpts): Promise<string> {
  const e = env();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${e.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: e.OPENAI_MODEL,
      temperature: o.temperature ?? 0.2,
      max_completion_tokens: o.maxTokens ?? 2000,
      response_format: o.json ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: o.system },
        { role: "user", content: o.user },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new AiHttpError(res.status, await res.text());
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const out = data.choices?.[0]?.message?.content;
  if (!out) throw new Error("Empty AI response");
  return out;
}

async function anthropic(o: CompleteOpts): Promise<string> {
  const e = env();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": e.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: e.ANTHROPIC_MODEL,
      max_tokens: o.maxTokens ?? 2000,
      temperature: o.temperature ?? 0.2,
      system: o.json ? `${o.system}\n\nRespond with a single valid JSON object and nothing else.` : o.system,
      messages: [{ role: "user", content: o.user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new AiHttpError(res.status, await res.text());
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const out = data.content?.filter((c) => c.type === "text").map((c) => c.text).join("");
  if (!out) throw new Error("Empty AI response");
  return out;
}

export async function complete(o: CompleteOpts): Promise<{ text: string; provider: AiProvider }> {
  const provider = activeProvider();
  if (!provider) throw new AiUnavailableError();
  const text = await withRetry(() => (provider === "openai" ? openai(o) : anthropic(o)));
  return { text, provider };
}

/** Requests JSON and validates it against a zod schema. */
export async function completeJson<T>(o: Omit<CompleteOpts, "json">, schema: z.ZodType<T>): Promise<{ data: T; provider: AiProvider }> {
  const { text, provider } = await complete({ ...o, json: true });
  const raw = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const parsed = schema.safeParse(JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw));
  if (!parsed.success) throw new Error(`AI returned invalid structure: ${parsed.error.issues[0]?.message}`);
  return { data: parsed.data, provider };
}
