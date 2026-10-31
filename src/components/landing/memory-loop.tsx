"use client";

import { useEffect, useRef, useState } from "react";
import "./memory-loop.css";

/**
 * "A money model. With a memory." — a scroll-driven, five-step 3D explanation built from CSS 3D objects.
 * Steps: inputs → understanding → memory (correction becomes a rule) → living model → outcomes.
 * Every figure is the demo persona's real computed value (Oct 2026 sample data); labelled illustrative.
 */

const STEPS = [
  { title: "Inputs arrive", body: "A bank statement, UPI messages and recurring payments land as they are: messy, from different places." },
  { title: "Kosh understands", body: "Each line finds its merchant and category. Repeating payments are recognised as commitments." },
  { title: "One fix becomes memory", body: "Correct EatClub to Dining once. Kosh writes a rule, and the next EatClub payment follows it on its own." },
  { title: "A living model", body: "Income, costs, family support and savings connect to your goals, so every number knows where it leads." },
  { title: "One change, everywhere", body: "Trim dining by 30% and the same model updates your savings, your goal dates, festivals and the coach." },
];

export function MemoryLoop() {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [p, setP] = useState(0); // progress within the current step, 0..1

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const t = Math.min(0.9999, Math.max(0, -r.top / Math.max(total, 1)));
        const s = Math.floor(t * STEPS.length);
        setStep(s);
        setP(t * STEPS.length - s);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.offsetTop + (total * (i + 0.35)) / STEPS.length, behavior: reduce ? "auto" : "smooth" });
  };

  const on = (i: number) => (step >= i ? " is-on" : "");

  return (
    <section ref={root} className="kosh3d-mem" aria-label="How Kosh remembers and connects your money" data-step={step}>
      <div className="kosh3d-mem-stage">
        <div className="kosh3d-mem-copy">
          <h2>
            A money model.
            <br />
            With a memory.
          </h2>
          <div className="kosh3d-mem-steps" role="tablist" aria-label="Steps">
            {STEPS.map((s, i) => (
              <button key={s.title} role="tab" aria-selected={step === i} className={step === i ? "is-active" : ""} onClick={() => jump(i)}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{s.title}</strong>
                  {step === i && <em>{s.body}</em>}
                </span>
              </button>
            ))}
          </div>
          <p className="kosh3d-mem-note">Illustrative figures from Kosh&rsquo;s demo month. Your own model uses your data.</p>
        </div>

        <div className="kosh3d-mem-viewport" aria-hidden>
          <div className="kosh3d-mem-world" style={{ ["--p" as string]: p.toFixed(3) }}>
            {/* 1 · Inputs */}
            <div className={"m-obj m-statement" + on(0)}>
              <b>HDFC · Statement</b>
              <i>02/10 UPI-SUNITA RAO-RENT</i>
              <i>06/10 UPI-EATCLUB BRANDS</i>
              <i>12/10 NETFLIX.COM SI</i>
              <i>17/10 UPI-SWIGGY</i>
            </div>
            <div className={"m-obj m-sms" + on(0)}>Rs.450 debited to VPA swiggy@icici</div>
            <div className={"m-obj m-sms m-sms2" + on(0)}>INR 2,349 spent at MYNTRA</div>
            <div className={"m-obj m-recur" + on(0)}>
              <span>↻</span> Netflix · monthly
            </div>

            {/* 2 · Understanding: category bins */}
            {(
              [
                ["Dining", "₹14,251", "m-bin-dining"],
                ["Rent & bills", "₹31,404", "m-bin-rent"],
                ["Subscriptions", "₹1,142", "m-bin-subs"],
              ] as const
            ).map(([n, v, c]) => (
              <div key={n} className={`m-obj m-bin ${c}` + on(1)}>
                <strong>{n}</strong>
                <span>{v}</span>
              </div>
            ))}

            {/* 3 · Memory: the correction loop */}
            <div className={"m-obj m-correction" + on(2)}>
              <span className="m-strike">EatClub · Other</span>
              <span className="m-arrow">→</span>
              <strong>Dining</strong>
            </div>
            <div className={"m-obj m-rule" + on(2)}>
              <small>Rule learned</small>
              <strong>EatClub Brands → Dining</strong>
              <span>applied to 5 past payments</span>
            </div>
            <svg className={"m-loop" + on(2)} viewBox="0 0 200 200">
              <path d="M100 20 A80 80 0 1 1 30 140" pathLength={1} />
              <path d="M22 128 L30 142 L44 134" pathLength={1} />
            </svg>
            <div className={"m-obj m-next" + on(2)}>
              <span>New import · EatClub ₹342</span>
              <strong>Dining · by your rule</strong>
            </div>

            {/* 4 · Living model */}
            <div className={"m-obj m-node m-income" + on(3)}>
              <small>Income</small>
              <strong>₹95,000</strong>
            </div>
            <div className={"m-obj m-node m-spend" + on(3)}>
              <small>Spending</small>
              <strong>₹72,317</strong>
            </div>
            <div className={"m-obj m-node m-save" + on(3)}>
              <small>Left for goals</small>
              <strong>₹22,683</strong>
            </div>
            <svg className={"m-links" + on(3)} viewBox="0 0 400 300" preserveAspectRatio="none">
              <path d="M70 70 C 160 70, 160 150, 200 150" pathLength={1} />
              <path d="M200 150 C 240 150, 250 230, 330 230" pathLength={1} />
              <path d="M200 150 C 250 150, 250 70, 330 70" pathLength={1} />
            </svg>

            {/* 5 · Outcomes */}
            <div className={"m-obj m-change" + on(4)}>
              <small>What if</small>
              <strong>Dining −30%</strong>
              <span>+₹2,573 a month</span>
            </div>
            {(
              [
                ["Emergency fund", "2 months sooner", "m-out-goal"],
                ["Festival pot", "more room for Diwali", "m-out-fest"],
                ["Coach", "explains the trade-off", "m-out-coach"],
              ] as const
            ).map(([n, v, c]) => (
              <div key={n} className={`m-obj m-out ${c}` + on(4)}>
                <strong>{n}</strong>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <div className="kosh3d-mem-progress">
            <div style={{ transform: `scaleX(${(step + p) / STEPS.length})` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
