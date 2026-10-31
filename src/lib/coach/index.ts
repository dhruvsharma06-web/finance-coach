import type { CoachMessage } from "../types";
import { checkGuardrails } from "./guardrails";

/**
 * LANE C (friend's Codex). Coach chat.
 * - Pre-check the user message with checkGuardrails(); if triggered, reply with an educational refusal.
 * - Context: profile, last-3-month category averages, recurring, goals, active nudges.
 * - What-if questions ("what if…", "can I afford…") → parseScenario + simulate, attach `simulation`.
 * - Post-check model output (no tickers / fund names / return promises); redact or regenerate.
 * Stub: guardrail check + canned reply.
 */
export async function coachReply(messages: CoachMessage[]): Promise<CoachMessage> {
  const last = messages[messages.length - 1]?.content ?? "";
  const guardrail = checkGuardrails(last);
  if (guardrail.triggered) {
    return {
      role: "assistant",
      content:
        "I can't recommend specific investments, but I can explain how to think about it and model scenarios with your own numbers.",
      guardrail,
    };
  }
  return {
    role: "assistant",
    content: "Coach stub — Lane C connects this to the AI with your money model as context.",
    guardrail,
  };
}
