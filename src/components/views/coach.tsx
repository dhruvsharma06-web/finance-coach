"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { formatINR, formatINRCompact } from "@/lib/format";
import type { CoachMessage } from "@/lib/types";
import { ProjectionChart } from "../charts";
import { Badge, PageHeader, cn } from "../ui";

const STARTERS = [
  "Where did most of my money go this month?",
  "Can I afford a ₹60,000 phone in December?",
  "How do I build my emergency fund faster?",
  "Which stock should I buy with my savings?",
];

function Bubble({ m }: { m: CoachMessage }) {
  if (m.role === "user") {
    return (
      <div className="rise flex justify-end">
        <p className="max-w-[78%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] leading-relaxed text-bg">{m.content}</p>
      </div>
    );
  }
  const sim = m.simulation;
  const diff = sim ? (sim.projected.at(-1)?.cumulativeSavings ?? 0) - (sim.baseline.at(-1)?.cumulativeSavings ?? 0) : 0;
  return (
    <div className="rise flex gap-3">
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-[15px] text-accent">K</span>
      <div className="min-w-0 max-w-[85%] space-y-2">
        {m.guardrail?.triggered && (
          <Badge tone="info">
            <ShieldCheck size={11} /> Guardrail: Kosh teaches, it doesn&rsquo;t pick investments
          </Badge>
        )}
        <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">{m.content}</p>
        {sim && (
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-medium text-ink">{sim.scenario.name}</p>
              <span className={cn("num text-[13px]", diff >= 0 ? "text-positive" : "text-danger")}>
                {diff >= 0 ? "+" : "−"}
                {formatINR(Math.abs(diff))} over a year
              </span>
            </div>
            <ProjectionChart baseline={sim.baseline} projected={sim.projected} height={170} />
            <p className="num mt-2 text-[12px] text-muted">Ends at {formatINRCompact(sim.projected.at(-1)?.cumulativeSavings ?? 0)} saved</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CoachView() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const send = async (t: string) => {
    const content = t.trim();
    if (!content || busy) return;
    const next: CoachMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setText("");
    setBusy(true);
    try {
      const reply = await api.coach(next);
      setMessages([...next, reply]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: e instanceof Error ? `Sorry, ${e.message}` : "Sorry, something went wrong." }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const q = params.get("q");
    if (q && !started.current) {
      started.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, busy]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <PageHeader
        title="Coach"
        description="Ask about your money in plain words. Kosh answers from your real numbers and can run what-ifs. It explains concepts but never recommends specific investments."
      />

      <div className="flex-1 space-y-5 pb-6">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-[14px] text-ink transition-colors hover:border-subtle"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy && (
          <div className="flex gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-accent-soft font-display text-[15px] text-accent">K</span>
            <span className="flex items-center gap-1 pt-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-pulse rounded-full bg-subtle" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-4 flex items-center gap-3 rounded-full border border-line bg-surface py-2 pr-2 pl-5 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.25)] focus-within:border-subtle"
      >
        <Mic size={17} className="shrink-0 text-accent" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Kosh, or hold your Wispr key and talk"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim() || busy}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-bg disabled:opacity-25"
        >
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}
