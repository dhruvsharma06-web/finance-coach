"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, FlaskConical, MessageCircle, RotateCcw, Search } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "../ui";

type Item = { id: string; label: string; hint?: string; icon: typeof Search; run: () => void };

const PAGES = [
  ["/", "Overview"],
  ["/import", "Import a statement"],
  ["/transactions", "Transactions"],
  ["/subscriptions", "Recurring payments"],
  ["/goals", "Money model & goals"],
  ["/planner", "What-if planner"],
  ["/coach", "Coach"],
  ["/report", "Monthly review"],
  ["/how-it-works", "How Kosh works"],
] as const;

/** ⌘K / Ctrl+K: jump anywhere, or type a question and send it to the coach or planner. Voice-friendly. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setSel(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => {
      setOpen(true);
      setQ("");
      setSel(0);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("kosh:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("kosh:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 10);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const t = q.trim();
    const list: Item[] = [];
    if (t) {
      list.push({ id: "whatif", label: `Model: “${t}”`, hint: "What-if planner", icon: FlaskConical, run: go(`/planner?q=${encodeURIComponent(t)}`) });
      list.push({ id: "ask", label: `Ask Kosh: “${t}”`, hint: "Coach", icon: MessageCircle, run: go(`/coach?q=${encodeURIComponent(t)}`) });
    }
    for (const [href, label] of PAGES) {
      if (!t || label.toLowerCase().includes(t.toLowerCase())) list.push({ id: href, label, icon: ArrowRight, run: go(href) });
    }
    if (!t || "reset demo".includes(t.toLowerCase()))
      list.push({
        id: "reset",
        label: "Reset demo data",
        icon: RotateCcw,
        run: async () => {
          setOpen(false);
          await api.reset();
          window.location.reload();
        },
      });
    if (t && /^(what if|can i|if i|suppose)/i.test(t)) list.splice(1, 1);
    else if (t && list.length > 2) [list[0], list[1]] = [list[1], list[0]];
    return list;
  }, [q, router]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/30 px-4 pt-[14vh]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        className="rise w-full max-w-[580px] overflow-hidden rounded-2xl bg-surface shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search size={17} className="text-subtle" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(items.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[sel]?.run();
              }
            }}
            placeholder="Go anywhere, or ask a question…"
            className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-subtle"
          />
          <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={it.run}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px]", i === sel ? "bg-surface-2 text-ink" : "text-muted")}
              >
                <it.icon size={15} className={i === sel ? "text-accent" : "text-subtle"} />
                <span className="flex-1 truncate">{it.label}</span>
                {it.hint && <span className="text-[12px] text-subtle">{it.hint}</span>}
                {i === sel && <CornerDownLeft size={13} className="text-subtle" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
