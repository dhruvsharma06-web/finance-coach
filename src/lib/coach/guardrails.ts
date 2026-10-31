import type { GuardrailInfo } from "../types";

/**
 * LANE C (friend's Codex). Input + output guardrails.
 * Expand patterns, add an output scanner, and an LLM classifier for ambiguous cases.
 */
const SPECIFIC_SECURITY =
  /\b(which|what|best|top|should i)\b.*\b(stock|share|fund|etf|crypto|coin|bitcoin|ipo)s?\b|\b(buy|sell)\b.*\b(stock|share|bitcoin|crypto|nifty|sensex)\b/i;
const GUARANTEED = /\bguarantee(d)?\b.*\breturn/i;
const TAX_EVASION = /\b(evade|avoid paying|hide)\b.*\btax/i;

export function checkGuardrails(text: string): GuardrailInfo {
  if (SPECIFIC_SECURITY.test(text)) return { triggered: true, reason: "specific_security" };
  if (GUARANTEED.test(text)) return { triggered: true, reason: "guaranteed_returns" };
  if (TAX_EVASION.test(text)) return { triggered: true, reason: "tax_evasion" };
  return { triggered: false };
}
