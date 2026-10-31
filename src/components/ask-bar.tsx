"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { cn } from "./ui";

const WHAT_IF = /^(what if|what happens if|if i |can i afford|how long|suppose)/i;

/** Single entry point: what-ifs go to the planner, everything else to the coach. Wispr-friendly. */
export function AskBar({ className, placeholder }: { className?: string; placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const go = (text: string) => {
    const t = text.trim();
    if (!t) return;
    router.push(WHAT_IF.test(t) ? `/planner?q=${encodeURIComponent(t)}` : `/coach?q=${encodeURIComponent(t)}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className={cn(
        "group flex items-center gap-3 rounded-full border border-transparent bg-surface py-2.5 pr-2.5 pl-6 transition-colors focus-within:border-ink",
        className,
      )}
    >
      <Mic size={17} className="shrink-0 text-accent" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? "Ask anything, or try a what-if"}
        className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-subtle"
      />
      <button
        type="submit"
        aria-label="Ask"
        disabled={!q.trim()}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-fill-ink transition-opacity disabled:opacity-25"
      >
        <ArrowUp size={16} />
      </button>
    </form>
  );
}
