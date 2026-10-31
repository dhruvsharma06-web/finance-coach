import type { CategoryId, Scenario } from "../types";

/**
 * LANE C (friend's Codex). Natural language → Scenario.
 * Use aiObject() with a zod schema mirroring ScenarioChange; regex fallback when
 * aiAvailable() is false. Map everyday words to CategoryId ("eating out" → dining,
 * "Ubers" → transport, "rent goes up" → fixed_cost_abs with label "Rent").
 * Stub: handles "cut/reduce/increase <category> by N%".
 */
const WORDS: Record<string, CategoryId> = {
  dining: "dining",
  "dining out": "dining",
  "eating out": "dining",
  food: "dining",
  groceries: "groceries",
  shopping: "shopping",
  transport: "transport",
};

export async function parseScenario(prompt: string): Promise<Scenario> {
  const m = prompt.toLowerCase().match(/(cut|reduce|increase)\s+(?:my\s+)?([a-z ]+?)\s+by\s+(\d+)\s*%/);
  const category = m ? WORDS[m[2].trim()] : undefined;
  if (m && category) {
    const sign = m[1] === "increase" ? 1 : -1;
    return { name: prompt, prompt, changes: [{ kind: "category_pct", category, value: sign * Number(m[3]) }] };
  }
  return { name: prompt, prompt, changes: [] };
}
