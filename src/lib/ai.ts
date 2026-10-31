import "server-only";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { z } from "zod";

/**
 * Single entry point for all LLM calls. Provider is picked from env:
 *   AI_PROVIDER=google  + GOOGLE_GENERATIVE_AI_API_KEY   (default)
 *   AI_PROVIDER=openai  + OPENAI_API_KEY
 * Optional AI_MODEL overrides the model id.
 *
 * Every caller MUST handle `aiAvailable() === false` with a deterministic fallback
 * so the app still demos without a key.
 */

const PROVIDER = (process.env.AI_PROVIDER ?? "google").toLowerCase();

export function aiAvailable(): boolean {
  return PROVIDER === "openai"
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function model() {
  if (PROVIDER === "openai") return openai(process.env.AI_MODEL ?? "gpt-4.1-mini");
  return google(process.env.AI_MODEL ?? "gemini-2.5-flash");
}

/** Structured output, validated by a zod schema. */
export async function aiObject<T>(opts: {
  schema: z.ZodType<T>;
  system?: string;
  prompt: string;
}): Promise<T> {
  const { object } = await generateObject({
    model: model(),
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
  });
  return object as T;
}

/** Plain text completion. */
export async function aiText(opts: { system?: string; prompt: string }): Promise<string> {
  const { text } = await generateText({ model: model(), system: opts.system, prompt: opts.prompt });
  return text;
}

/** Shared guardrail text — include in every user-facing system prompt. */
export const COACH_GUARDRAILS = `You are an educational personal-finance coach for users in India.
Hard rules:
- Never recommend, rank, or name specific securities, stocks, mutual-fund schemes, ETFs, bonds, crypto tokens, or insurance products to buy or sell.
- Never promise or predict returns. Never give tax-evasion advice.
- You MAY explain general concepts (emergency funds, diversification, index funds as a concept, SIPs as a mechanism, debt payoff methods) and model scenarios with the user's own numbers.
- If asked for a specific product pick, briefly say you can't recommend specific products, explain the relevant concept, and suggest consulting a SEBI-registered investment adviser.
- Use ₹ and Indian number formatting (lakh/crore). Be warm, concise, concrete.`;
