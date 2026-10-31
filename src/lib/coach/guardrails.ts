import type { GuardrailInfo } from "../types";

/**
 * Input + output guardrails. Kosh educates and models scenarios; it never picks products.
 * Allowed: concepts ("what is an index fund?", "how does a SIP work?"). Blocked: specific picks, tips, guarantees.
 */

const NAMED =
  /\b(reliance|tata|infosys|tcs|hdfc|icici|sbi|adani|wipro|itc|zomato|paytm|nykaa|lic|bajaj|maruti|asian paints|hul|airtel|nifty ?bees|parag parikh|axis bluechip|mirae|quant|nippon|bitcoin|btc|ethereum|eth|dogecoin|solana|shiba)\b/i;
const PICK = /\b(which|what|best|top|good|recommend|suggest|tip|should i|worth|safe to)\b/i;
const PRODUCT = /\b(stocks?|shares?|equity|mutual funds?|mf|(?<!emergency |sinking |rainy day )funds?|etfs?|crypto|coins?|tokens?|ipos?|bonds?|f&o|options|futures|smallcap|small cap|midcap|insurance (?:plan|policy)|term plan|ulip|nft)\b/i;
const TRADE = /\b(buy|sell|invest in|put my money in|trade|short|go long)\b/i;

const RULES: [RegExp | ((s: string) => boolean), string][] = [
  [/\bguarantee(d)?\b.*\b(return|profit)|\bdouble my money\b|\bsure[- ]?shot\b|\bmultibagger\b|\b(\d+)x returns?\b/i, "guaranteed_returns"],
  [/\b(evade|avoid paying|hide|dodge|not declare|black money)\b.*\btax|\btax\b.*\b(evade|hide|dodge)/i, "tax_evasion"],
  [/\b(intraday|f&o|options|futures) (tips?|calls?|trades?)\b|\btrading tips?\b/i, "specific_security"],
  [(s) => NAMED.test(s) && (TRADE.test(s) || PICK.test(s) || /\b(stock|share|price|target)\b/i.test(s)), "specific_security"],
  [(s) => PICK.test(s) && PRODUCT.test(s) && !/\bwhat (is|are) (a|an)?\b|\bhow (do|does)\b|\bexplain\b|\bdifference between\b/i.test(s), "specific_security"],
  [(s) => TRADE.test(s) && PRODUCT.test(s) && /\b(should|which|now|today)\b/i.test(s), "specific_security"],
  [/\bwhere should i invest\b|\bwhere (do|can) i invest\b/i, "specific_security"],
  [/\b(loan app|instant loan)\b.*\b(best|which|recommend)/i, "product_pick"],
];

export function checkGuardrails(text: string): GuardrailInfo {
  for (const [rule, reason] of RULES) {
    if (typeof rule === "function" ? rule(text) : rule.test(text)) return { triggered: true, reason };
  }
  return { triggered: false };
}

/** Scan model output for product names / tickers / return promises. */
export function outputViolates(text: string): boolean {
  return (
    NAMED.test(text) ||
    /\b[A-Z]{3,}(?:BEES|ETF)\b|\bDirect[- ]Growth\b|\bregular plan\b/.test(text) ||
    /\b(guaranteed|assured) (returns?|profits?)\b|\breturns? of \d+%/i.test(text)
  );
}

export function guardrailReply(reason: string): string {
  switch (reason) {
    case "guaranteed_returns":
      return "Nothing honest can promise guaranteed or multiplied returns. Higher potential returns always come with higher risk, and anyone promising otherwise is a red flag.\n\nWhat I can do is show you exactly how much you'd have if you saved a fixed amount every month. Ask me something like “what if I save ₹5,000 more a month?”.";
    case "tax_evasion":
      return "I can't help with avoiding taxes you owe. I'm happy to explain how legitimate deductions work in general (like Section 80C contributions or health insurance premiums under 80D), and a chartered accountant can tell you what applies to you.";
    default:
      return "I don't recommend specific stocks, funds, coins or insurance products. That needs a SEBI-registered investment adviser who knows your full situation.\n\nHere's how to think about it instead. Build your emergency fund first, so a surprise expense never forces you to sell at a bad time. Then match investments to when you need the money: money needed within 3 years usually stays in low-risk places, and long-term money can take more risk. Diversified, low-cost index funds are a common starting point people research.\n\nI can model it with your numbers. Try “what if I invest ₹5,000 more every month?”";
  }
}
