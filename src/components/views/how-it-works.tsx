import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

const PIPELINE = [
  {
    title: "Read anything",
    body: "PDF statements, any bank's CSV layout, or a pile of pasted SMS. Rules handle known formats instantly; AI only reads what the rules can't. OTPs and promos are dropped.",
    href: "/import",
  },
  {
    title: "Categorize, then learn",
    body: "Your own rules first, then knowledge of 60+ Indian merchants, then AI for the rest. Fix one transaction and Kosh writes a rule, re-applies it to the past, and uses it on every future import.",
    href: "/transactions",
  },
  {
    title: "Notice what repeats",
    body: "Cadence and amount analysis finds rent, EMIs, SIPs and subscriptions. Price hikes are flagged, and instead of guessing whether you use something, Kosh asks.",
    href: "/subscriptions",
  },
  {
    title: "Keep a living model",
    body: "Income, fixed costs, emergency fund and goals with dates. Say “rent went up to 28k” and the model updates, then every projection and nudge follows.",
    href: "/goals",
  },
  {
    title: "Project the what-ifs",
    body: "A plain-English question becomes structured changes. A deterministic engine projects 36 months and funds your goals by deadline and priority, so every date it shows is computed.",
    href: "/planner",
  },
  {
    title: "Coach, don't sell",
    body: "Nudges when spending drifts, a monthly review, and a coach that answers from your numbers. Guardrails block stock, fund and crypto picks before and after the AI writes.",
    href: "/coach",
  },
];

const AI_DOES = [
  "Reads statements and SMS that rules can't parse",
  "Categorizes merchants it has never seen",
  "Turns “what if rent goes up 3k from January” into structured changes",
  "Writes the monthly review and coaching in plain words",
];
const AI_NEVER = [
  "Calculates a rupee, a balance or a goal date",
  "Names a stock, fund, coin or insurance product",
  "Promises returns",
  "Runs without a fallback: every AI step has a rule-based path, so the app works with no API key",
];

export function HowItWorksView() {
  return (
    <div className="max-w-[1080px]">
      <header className="stagger max-w-[760px]">
        <h1 className="font-display text-[46px] leading-[0.98] tracking-[-0.03em] text-balance sm:text-[72px]">AI reads and explains. Code does the math.</h1>
        <p className="mt-5 text-[18px] leading-relaxed text-muted text-pretty">
          Budgeting apps sort your spending and stop there. Kosh keeps a model of your money that changes when your life does: it
          learns your categories, watches your plan, and shows what a decision does to your goals before you make it.
        </p>
      </header>

      <ol className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PIPELINE.map((p, i) => (
          <li key={p.title} className="reveal group flex flex-col rounded-[var(--radius)] bg-surface p-7">
            <span className="font-display text-[44px] leading-none text-subtle transition-colors group-hover:text-accent">{i + 1}</span>
            <h2 className="mt-6 text-[18px] font-semibold tracking-[-0.01em]">{p.title}</h2>
            <p className="mt-2 flex-1 text-[16px] leading-relaxed text-muted">{p.body}</p>
            <Link href={p.href} className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-ink underline-offset-4 hover:underline">
              See it <ArrowRight size={13} />
            </Link>
          </li>
        ))}
      </ol>

      <section className="reveal mt-20 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-[34px] leading-tight">What the AI does</h2>
          <ul className="mt-5 space-y-3">
            {AI_DOES.map((t) => (
              <li key={t} className="flex gap-3 text-[17px] leading-relaxed">
                <Check size={18} className="mt-1 shrink-0 text-positive" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-[34px] leading-tight">What it never does</h2>
          <ul className="mt-5 space-y-3">
            {AI_NEVER.map((t) => (
              <li key={t} className="flex gap-3 text-[17px] leading-relaxed">
                <X size={18} className="mt-1 shrink-0 text-danger" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="reveal mt-20 rounded-[var(--radius)] bg-ink px-8 py-12 text-bg sm:px-12">
        <h2 className="max-w-[20ch] font-display text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[52px]">Built entirely by voice.</h2>
        <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed opacity-80">
          Two people, three AI coding agents (Claude Code and two Codex instances), one day. Every prompt that built Kosh was spoken
          through Wispr Flow, and the product works the same way: every text box takes voice, so you can say “spent 450 on Swiggy”,
          “what if I get a 15% raise in April?” or “my rent went up to 28k” and Kosh does the rest.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/planner?q=What%20if%20I%20cut%20dining%20out%20by%2030%25%20and%20my%20rent%20goes%20up%20by%203000%20from%20January%3F" className="inline-flex h-11 items-center gap-2 rounded-full bg-fill px-5 text-[16px] font-medium text-fill-ink">
            Try a what-if <ArrowRight size={15} />
          </Link>
          <a href="https://github.com/dhruvsharma06-web/finance-coach" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full px-5 text-[16px] text-bg/80 underline-offset-4 hover:underline">
            Read the code
          </a>
        </div>
      </section>
    </div>
  );
}
