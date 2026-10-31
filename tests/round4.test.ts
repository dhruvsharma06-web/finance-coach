/** Round 4 tests — run with: npx tsx tests/round4.test.ts */
import { familySummary } from "../src/lib/family";
import { groupBalances, parseSplitText, resolveShares, settleUp } from "../src/lib/splits";
import { festivalOutlook } from "../src/lib/festivals";
import { buildWrapped } from "../src/lib/wrapped";
import { buildSeed } from "../src/lib/seed";

let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
};
const db = buildSeed();

// Family
const fs = familySummary(db.family!);
check("family income = sum of earners", fs.totalIncome === 95000 + 70000 + 60000);
check("3 earners, 3 dependents", fs.earners === 3 && fs.dependents === 3);
check("support total", fs.monthlySupportTotal === 35000);
check("earner shares add to 100%", Math.abs(fs.shareByEarner.reduce((s, e) => s + e.pct, 0) - 1) < 1e-9);
check("wedding goal has a reach date", fs.goals.some((g) => g.id === "fg-wedding" && g.reachDate));

// Splits
const s = db.splits!;
const goa = groupBalances(s, "sg-goa");
check("group nets sum to zero", Math.abs(goa.balances.reduce((t, b) => t + b.net, 0)) < 0.05);
check("settle-up uses ≤ n−1 payments", goa.settleUp.length <= goa.group.members.length - 1);
const after = new Map(goa.balances.map((b) => [b.memberId, b.net]));
for (const p of goa.settleUp) {
  after.set(p.from, (after.get(p.from) ?? 0) + p.amount);
  after.set(p.to, (after.get(p.to) ?? 0) - p.amount);
}
check("settle-up clears every balance", [...after.values()].every((v) => Math.abs(v) < 0.05));
check("4-person classic case needs 2 payments", settleUp(new Map([["a", 100], ["b", 100], ["c", -100], ["d", -100]])).length === 2);
check("equal split rounds to the total", Math.abs(Object.values(resolveShares(1000, ["a", "b", "c"], "equal")).reduce((t, v) => t + v, 0) - 1000) < 0.001);
let threw = false;
try {
  resolveShares(1000, ["a", "b"], "percent", { a: 60, b: 30 });
} catch {
  threw = true;
}
check("percent split must total 100", threw);
const q = parseSplitText("Rohan paid 2400 for dinner, split equally", goa.group.members);
check("quick-add parses payer, amount, description", q.amount === 2400 && q.paidBy === "sp-rohan" && q.description === "Dinner");

// Festivals
const fo = festivalOutlook(db);
check("Diwali is next and 8 days away", fo[0]?.id === "diwali" && fo[0].daysLeft === 8);
check("pot reduces what's left to save", fo[0].monthlyToSave <= fo[0].estimatedSpend - fo[0].potSaved);

// Wrapped
const w = buildWrapped(db, "2026-10");
check("wrapped has 8+ cards", w.cards.length >= 8);
check("wrapped persona set", w.persona.length > 0);
check("wrapped top merchant counted", w.cards.some((c) => c.id === "merchant" && /\d+ times/.test(c.value ?? "")));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
