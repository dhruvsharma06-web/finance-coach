"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { api } from "@/lib/client";
import { Intro } from "../motion";
import { cn } from "../ui";

/** Order matters: it is the "straight flow" of the product, and drives transition direction. */
export const NAV = [
  { href: "/", label: "Overview" },
  { href: "/import", label: "Import" },
  { href: "/transactions", label: "Transactions" },
  { href: "/subscriptions", label: "Recurring" },
  { href: "/goals", label: "Money model" },
  { href: "/planner", label: "What if" },
  { href: "/coach", label: "Coach" },
  { href: "/report", label: "Monthly review" },
] as const;

const indexOf = (path: string) => {
  const i = NAV.findIndex((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  return i < 0 ? 0 : i;
};

/** Direction for a link relative to the current page. */
export function navType(currentPath: string, href: string): string[] {
  return [indexOf(href) >= indexOf(currentPath) ? "nav-forward" : "nav-back"];
}

function Wordmark() {
  return (
    <Link href="/" transitionTypes={["nav-back"]} className="flex items-baseline gap-0.5 px-3">
      <span className="font-display text-[30px] leading-none tracking-[-0.02em] text-ink">Kosh</span>
      <span className="size-[7px] translate-y-[-2px] rounded-full bg-fill" />
    </Link>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("kosh-theme");
    } catch {}
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    setDark(isDark);
  }, []);
  const flip = () => {
    const next = !dark;
    const apply = () => {
      setDark(next);
      document.documentElement.dataset.theme = next ? "dark" : "light";
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition) doc.startViewTransition(apply);
    else apply();
    try {
      localStorage.setItem("kosh-theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={flip} aria-label="Toggle theme" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function ResetDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.reset();
          toast.success("Demo data restored");
          window.location.reload();
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
    >
      <RotateCcw size={13} className={busy ? "animate-spin" : ""} />
      Reset demo
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = indexOf(path);

  return (
    <>
      <Intro />
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col bg-surface-2/60 px-3 pt-8 pb-5 lg:flex">
          <Wordmark />
          <nav className="mt-12" aria-label="Main">
            <ol className="space-y-px">
              {NAV.map(({ href, label }, i) => (
                <li key={href}>
                  <Link
                    href={href}
                    transitionTypes={navType(path, href)}
                    aria-current={i === active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center rounded-full px-4 py-2.5 text-[14.5px] transition-colors duration-200",
                      i === active ? "text-bg" : "text-muted hover:text-ink",
                    )}
                  >
                    {i === active && (
                      <ViewTransition name="nav-pill" share="nav-pill">
                        <span className="absolute inset-0 rounded-full bg-ink" />
                      </ViewTransition>
                    )}
                    <span className="relative">{label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-auto space-y-4 px-1">
            <p className="px-3 text-[13px] leading-relaxed text-muted">
              Every box takes voice. Hold your Wispr Flow key and say what you mean.
            </p>
            <div className="flex items-center justify-between">
              <ResetDemo />
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 bg-bg lg:hidden">
            <div className="flex items-center justify-between px-3 pt-3">
              <Wordmark />
              <ThemeToggle />
            </div>
            <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 py-3 [scrollbar-width:none]">
              {NAV.map(({ href, label }, i) => (
                <Link
                  key={href}
                  href={href}
                  transitionTypes={navType(path, href)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[13.5px]",
                    i === active ? "bg-ink text-bg" : "text-muted hover:bg-surface-2",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-6 pb-16 sm:px-8 lg:px-14 lg:pt-14">{children}</main>
        </div>
      </div>
    </>
  );
}
