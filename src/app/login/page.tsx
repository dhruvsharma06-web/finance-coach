"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EyeOff, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Words } from "@/components/in-view";

const PROMISES = [
  { icon: Lock, title: "Signed, private session", body: "Your session lives in a signed, http-only cookie that scripts can't read. It locks after 5 wrong tries." },
  { icon: EyeOff, title: "Account numbers masked", body: "Only the last 4 digits of any account or card number are ever stored. Statement files are read in memory, never saved." },
  { icon: ShieldCheck, title: "No product selling", body: "Kosh never recommends stocks, funds or loans. It only works with your own numbers." },
  { icon: Trash2, title: "Yours to take or erase", body: "Export everything as JSON or delete it all, any time, from your money model page." },
];

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [required, setRequired] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/session").then(response => {
      if (!response.ok) throw new Error("Session unavailable");
      return response.json();
    }).then(body => setRequired(body.required)).catch(() => {
      setRequired(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(response.status === 429 ? "Too many attempts. Wait 10 minutes and try again." : (body.error ?? "That passcode didn't work. Try again."));
        return;
      }
      // only ever redirect within this site
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      const target = new URL(next, window.location.origin);
      window.location.assign(target.origin === window.location.origin && target.pathname !== "/" && !target.pathname.startsWith("/login") ? target.pathname + target.search : "/dashboard");
    } catch {
      setError("Couldn't connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="fixed inset-0 z-50 grid overflow-y-auto bg-bg text-ink lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-ink p-14 text-bg lg:flex">
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-[34px] leading-none">Kosh</span>
          <span className="size-2 rounded-full bg-fill" />
        </div>
        <div>
          <h2 className="max-w-[14ch] font-display text-[64px] leading-[0.98] tracking-[-0.03em]">
            <Words text="Your money, understood. And kept private." />
          </h2>
          <ul className="mt-12 grid gap-7 xl:grid-cols-2">
            {PROMISES.map((p, i) => (
              <li key={p.title} className="rise" style={{ animationDelay: `${600 + i * 120}ms` }}>
                <p.icon size={22} className="text-fill" />
                <p className="mt-3 text-[18px] font-semibold">{p.title}</p>
                <p className="mt-1 text-[15.5px] leading-relaxed opacity-70">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[14px] opacity-50">Educational guidance only. Not investment advice.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-6 py-14 sm:px-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-block text-[15px] text-muted hover:text-ink">← Back to Kosh</Link>
          <div className="mb-14 flex items-baseline gap-0.5 lg:hidden">
            <span className="font-display text-[32px] leading-none">Kosh</span>
            <span className="size-2 rounded-full bg-fill" />
          </div>
          <h1 className="font-display text-[46px] leading-[1.02] tracking-[-0.025em] sm:text-[56px]">
            <Words text="Welcome back." />
          </h1>
          <p className="rise mt-4 text-[18px] leading-relaxed text-muted [animation-delay:300ms]">{required === false ? "Explore Kosh with the sample money model. This demo is shared; it isn't a personal account." : "Enter your passcode to open your money model."}</p>

          <form className="rise mt-10 space-y-5 [animation-delay:450ms]" onSubmit={submit}>
            {required !== false && <div>
              <label htmlFor="passcode" className="mb-2 block text-[16px] font-medium">
                Passcode
              </label>
              <input
                id="passcode"
                name="passcode"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="h-14 w-full rounded-2xl border border-line bg-surface px-5 text-[19px] tracking-widest text-ink outline-none transition-colors focus:border-ink"
              />
            </div>}
            {error && (
              <p id="login-error" role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[16px] text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" className="h-14 w-full text-[17px]" loading={busy} disabled={required === null || (required && !passcode.trim())}>
              {required === null ? "Checking session…" : required ? "Open Kosh" : "Explore the demo"}
            </Button>
          </form>

          <ul className="mt-12 space-y-4 lg:hidden">
            {PROMISES.slice(0, 2).map((p) => (
              <li key={p.title} className="flex gap-3">
                <p.icon size={18} className="mt-0.5 shrink-0 text-accent" />
                <span className="text-[15.5px] leading-relaxed text-muted">{p.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
