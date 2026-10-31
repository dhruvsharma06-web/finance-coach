"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CategoryId } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { CategoryIcon } from "./category";
import { cn } from "./ui";

/**
 * Looping motion graphic for the Import page: a raw bank message types in,
 * then resolves into the clean, categorized transaction Kosh stores.
 */
const SAMPLES: { raw: string; source: string; merchant: string; amount: string; category: CategoryId; note: string }[] = [
  {
    source: "SMS",
    raw: "Rs.450.00 debited from A/c XX4821 on 10-11-26 to VPA swiggy@icici. UPI Ref 430712345678",
    merchant: "Swiggy",
    amount: "−₹450",
    category: "dining",
    note: "10 Nov · UPI",
  },
  {
    source: "CSV",
    raw: "02/11/26,UPI-SUNITA RAO-sunita.rao@okhdfc-RENT NOV,430612345678,,25000.00,,187340.50",
    merchant: "Sunita Rao (Rent)",
    amount: "−₹25,000",
    category: "rent",
    note: "2 Nov · recurring",
  },
  {
    source: "PDF",
    raw: "08/11/26  NETFLIX.COM SI  SI00881  649.00  172767.50",
    merchant: "Netflix",
    amount: "−₹649",
    category: "subscriptions",
    note: "8 Nov · price went up 30%",
  },
  {
    source: "SMS",
    raw: "Your OTP for transaction is 482913. Do not share it with anyone.",
    merchant: "Ignored",
    amount: "",
    category: "other",
    note: "OTP, not a transaction",
  },
];

export function ParseDemo() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [stage, setStage] = useState<"typing" | "parsed">("typing");
  const s = SAMPLES[i];

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(s.raw.length);
      setStage("parsed");
      const t = setTimeout(() => setI((x) => (x + 1) % SAMPLES.length), 4000);
      return () => clearTimeout(t);
    }
    if (stage === "typing") {
      const t = setTimeout(() => (n < s.raw.length ? setN(n + 2) : setStage("parsed")), n < s.raw.length ? 22 : 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setI((x) => (x + 1) % SAMPLES.length);
      setN(0);
      setStage("typing");
    }, 2600);
    return () => clearTimeout(t);
  }, [n, stage, s.raw.length]);

  const ignored = !s.amount;
  return (
    <div className="grid items-center gap-5 rounded-[var(--radius)] bg-ink p-6 text-bg sm:p-10 lg:grid-cols-[1fr_auto_1fr]">
      <div className="min-h-[150px]">
        <span className="rounded-full bg-bg/10 px-3 py-1 text-[13.5px]">{s.source}, as your bank sends it</span>
        <p className="mt-4 font-mono text-[15px] leading-relaxed break-words opacity-85">
          {s.raw.slice(0, n)}
          {stage === "typing" && <span className="caret ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-fill" />}
        </p>
      </div>
      <ArrowRight size={28} className={cn("mx-auto rotate-90 text-fill transition-opacity duration-500 lg:rotate-0", stage === "parsed" ? "opacity-100" : "opacity-25")} />
      <div className="min-h-[150px]">
        <span className="rounded-full bg-fill/20 px-3 py-1 text-[13.5px] text-fill">What Kosh keeps</span>
        <div
          className={cn(
            "mt-4 flex items-center gap-4 rounded-2xl bg-bg p-4 text-ink transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            stage === "parsed" ? "translate-y-0 opacity-100 blur-0" : "translate-y-3 opacity-0 blur-sm",
            ignored && "opacity-60",
          )}
        >
          <CategoryIcon id={s.category} size={18} />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[18px] font-semibold", ignored && "line-through")}>{s.merchant}</p>
            <p className="text-[14px] text-muted">
              {ignored ? s.note : `${getCategory(s.category).label} · ${s.note}`}
            </p>
          </div>
          {s.amount && <span className="num text-[19px] font-medium">{s.amount}</span>}
        </div>
      </div>
    </div>
  );
}
