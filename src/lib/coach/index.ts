import "server-only";
import type { CoachMessage, Database } from "../types";
import { readDb } from "../db";
import { aiAvailable, aiText, COACH_GUARDRAILS } from "../ai";
import { getCategory, isSpendCategory } from "../categories";
import { formatINR, monthLabel } from "../format";
import { simulate } from "../simulate";
import { simulateWithSummary } from "../simulate/summary";
import { parseScenario } from "../simulate/parse";
import { buildBaseline, latestDataMonth } from "../simulate/baseline";
import { checkGuardrails, guardrailReply, outputViolates } from "./guardrails";

/**
 * Coach chat: guardrail pre-check → what-if tool use → answer grounded in the money model → output check.
 * Every path has a no-AI answer built from real numbers, so the demo never dead-ends.
 */

const WHAT_IF = /\b(what if|what happens if|can i afford|could i afford|if i (cut|spend|buy|get|lose|stop|move|take|start|add)|suppose|how (long|soon) (until|till|before)|afford)\b/i;

function context(db: Database) {
  const b = buildBaseline(db.profile, db.transactions);
  const month = latestDataMonth(db.transactions);
  const spend = new Map<string, number>();
  const merchants = new Map<string, number>();
  for (const t of db.transactions) {
    if (!t.date.startsWith(month) || t.direction !== "debit" || !isSpendCategory(t.category)) continue;
    spend.set(t.category, (spend.get(t.category) ?? 0) + t.amount);
    if (!["rent", "emi"].includes(t.category)) merchants.set(t.merchant, (merchants.get(t.merchant) ?? 0) + t.amount);
  }
  const sim = simulate(db.profile, db.transactions, { name: "Today's plan", changes: [] });
  return {
    b,
    month,
    sim,
    topCategories: [...spend.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5),
    topMerchants: [...merchants.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5),
  };
}

function templateAnswer(q: string, db: Database): string {
  const { b, month, sim, topCategories, topMerchants } = context(db);
  const s = q.toLowerCase();
  const name = db.profile.name;
  const cat = (id: string) => getCategory(id as never).label;
  const behind = sim.goals.filter((g) => !g.onTrackBaseline);

  if (/where.*(money|spend)|spent most|biggest|top (spend|categor)|what did i spend/.test(s)) {
    const variable = topCategories.filter(([c]) => !["rent", "emi", "utilities"].includes(c));
    return `In ${monthLabel(month)}, after rent and bills, most of your money went to ${variable
      .slice(0, 3)
      .map(([c, v]) => `${cat(c).toLowerCase()} (${formatINR(v)})`)
      .join(", ")}. Your single biggest merchant was ${topMerchants[0]?.[0]} at ${formatINR(topMerchants[0]?.[1] ?? 0)}.\n\nIf you want to move a goal closer, ${cat(variable[0]?.[0] ?? "dining").toLowerCase()} is the lever with the most room. Ask me “what if I cut ${cat(variable[0]?.[0] ?? "dining").split(" ")[0].toLowerCase()} by 25%?”`;
  }
  if (/emergency|safety net|rainy day|buffer/.test(s)) {
    const target = b.monthlyExpenses * db.profile.emergencyFund.targetMonths;
    const gap = Math.max(0, target - db.profile.emergencyFund.current);
    return `Your emergency fund is ${formatINR(db.profile.emergencyFund.current)}, about ${b.emergencyFundMonths.toFixed(1)} months of essential costs (${formatINR(b.monthlyExpenses)}/month). Your ${db.profile.emergencyFund.targetMonths}-month target is ${formatINR(target)}, so the gap is ${formatINR(gap)}.\n\nYou currently free up about ${formatINR(Math.max(0, b.cashSurplus))} a month after everything. Two things speed this up: automate a transfer on salary day (the 1st), and park the money somewhere separate from your spending account so it doesn't leak back.`;
  }
  if (/subscription|recurring|netflix|hotstar|ott/.test(s)) {
    const subs = db.recurring.filter((r) => r.isSubscription && r.status !== "cancelled");
    const total = subs.reduce((t, r) => t + r.lastAmount, 0);
    const flagged = subs.filter((r) => r.status !== "active");
    return `You have ${subs.length} active subscriptions costing about ${formatINR(total)} a month (${formatINR(total * 12)} a year).${flagged.length ? ` Worth a look: ${flagged.map((r) => (r.status === "price_changed" ? `${r.merchant} raised its price` : `${r.merchant} may be unused`)).join("; ")}.` : ""}`;
  }
  if (/save|saving|savings rate|how am i doing|on track|goal/.test(s)) {
    return `You're saving about ${formatINR(b.totalSavings)} a month including your ${formatINR(b.investing)} SIP. That's ${Math.round((b.totalSavings / b.monthlyIncome) * 100)}% of your income.\n\n${
      behind.length
        ? `${behind.map((g) => g.name).join(" and ")} ${behind.length > 1 ? "are" : "is"} behind schedule at that pace. Closing the gap takes about ${formatINR(Math.round(behind.length * 3000))} more a month, and dining and shopping are where you have the most room.`
        : "Every goal is on track at that pace."
    }`;
  }
  if (/what is|what's|explain|how does|how do|difference/.test(s)) {
    if (/index fund/.test(s)) return "An index fund simply buys every company in a market index (like the Nifty 50) in the same proportions, so you own a slice of the whole market instead of betting on a few companies. Costs are usually low because no one is picking stocks. It still goes up and down with the market, so it suits money you won't need for several years.";
    if (/\bsip\b/.test(s)) return "A SIP (Systematic Investment Plan) is just a standing instruction to invest a fixed amount every month, the way you already do with ₹10,000. Investing the same amount regularly means you buy more units when prices are low and fewer when they're high, and it removes the temptation to time the market.";
    if (/diversif/.test(s)) return "Diversification means not keeping all your money in one place: spreading it across different types of assets, sectors and time horizons so one bad outcome can't sink everything. It lowers risk without necessarily lowering long-term returns much.";
  }
  return `Here's where you stand, ${name}: ${formatINR(b.monthlyIncome)} comes in each month, about ${formatINR(b.fixedEssentials)} goes to rent and bills, ${formatINR(b.variableTotal)} to everyday spending, and ${formatINR(b.investing)} into your SIP, leaving ${formatINR(b.cashSurplus)} for your goals.\n\nYou can ask me things like “where did my money go this month?”, “how do I build my emergency fund faster?”, or any what-if, like “can I afford a ₹60,000 phone in December?”`;
}

export async function coachReply(messages: CoachMessage[]): Promise<CoachMessage> {
  const last = messages[messages.length - 1]?.content ?? "";
  const db = await readDb();

  const guard = checkGuardrails(last);
  if (guard.triggered) {
    let content = guardrailReply(guard.reason!);
    if (aiAvailable()) {
      try {
        const t = await aiText({
          system: `${COACH_GUARDRAILS}\nThe user asked for a specific product or a guarantee. Decline in one sentence, then teach the underlying concept in 2–3 sentences using their situation (emergency fund ${formatINR(db.profile.emergencyFund.current)}), and offer a what-if they can run. NEVER name any product, fund, stock, coin or ticker.`,
          prompt: last,
        });
        if (t && !outputViolates(t)) content = t.trim();
      } catch {}
    }
    return { role: "assistant", content, guardrail: guard };
  }

  // What-if → run the engine and explain the numbers
  if (WHAT_IF.test(last)) {
    const scenario = await parseScenario(last);
    if (scenario.changes.length) {
      const sim = await simulateWithSummary(db.profile, db.transactions, scenario);
      const afford = /afford/i.test(last);
      const oneOff = scenario.changes.find((c) => c.kind === "one_time" && c.value > 0);
      const behindNow = sim.goals.filter((g) => !g.onTrackScenario && g.onTrackBaseline);
      let lead = "";
      if (afford && oneOff) {
        const b = buildBaseline(db.profile, db.transactions);
        const months = b.cashSurplus > 0 ? Math.ceil(oneOff.value / b.cashSurplus) : null;
        lead = behindNow.length
          ? `You can pay for it, but it knocks ${behindNow.map((g) => g.name).join(" and ")} off track. `
          : `Yes, it fits without putting a goal off track. `;
        if (months) lead += `It's about ${months} month${months > 1 ? "s" : ""} of what you normally have left over. `;
      }
      return { role: "assistant", content: `${lead}${sim.summary}`.trim(), simulation: sim, guardrail: { triggered: false } };
    }
  }

  let content = templateAnswer(last, db);
  if (aiAvailable()) {
    try {
      const { b, month, sim, topCategories, topMerchants } = context(db);
      const ctx = {
        name: db.profile.name,
        month,
        income: b.monthlyIncome,
        fixedCosts: db.profile.fixedCosts,
        everydaySpendByCategory: b.variableByCategory,
        cashLeftForGoals: b.cashSurplus,
        emergencyFund: { ...db.profile.emergencyFund, monthsCovered: Number(b.emergencyFundMonths.toFixed(1)) },
        goals: sim.goals,
        thisMonthTopCategories: topCategories,
        thisMonthTopMerchants: topMerchants,
        recurring: db.recurring.map((r) => ({ merchant: r.merchant, amount: r.lastAmount, cadence: r.cadence, status: r.status })),
        openNudges: db.nudges.filter((n) => !n.dismissed).map((n) => n.title),
      };
      const history = messages.slice(-8).map((m) => `${m.role === "user" ? "User" : "Kosh"}: ${m.content}`).join("\n");
      let t = await aiText({
        system: `${COACH_GUARDRAILS}\nYou are Kosh, ${db.profile.name}'s money coach. Ground every answer in this money model (JSON). Use only these numbers; never invent figures. 2–5 short sentences or a short list. Suggest a what-if they can try when useful.\n${JSON.stringify(ctx)}`,
        prompt: history,
      });
      if (outputViolates(t)) {
        t = await aiText({ system: `${COACH_GUARDRAILS}\nRewrite the answer removing every product, fund, stock, coin name and any promised return.`, prompt: t });
      }
      if (t && !outputViolates(t)) content = t.trim();
    } catch {}
  }
  return { role: "assistant", content, guardrail: { triggered: false } };
}
