"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Pause, Play, X } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import type { Wrapped, WrappedCard } from "@/lib/types";
import { Words } from "../in-view";
import { Skeleton } from "../ui";

const DURATION = 5000;

/** Fixed card colours so every card stays readable in light and dark mode. */
const TONE: Record<string, string> = {
  "--ink": "#16140f",
  "--positive": "#2c7046",
  "--cat-dining": "#b8681a",
  "--cat-shopping": "#a8506f",
  "--warn": "#b0481a",
  "--cat-transport": "#3b729e",
  "--cat-groceries": "#5b7a2c",
  "--info": "#35577f",
  "--fill": "#f2ac2b",
};

/** Text on the field: light on dark tones, ink on the marigold one. */
const fg = (tone: string) => (tone === "--fill" ? "#1a1203" : "#fbfaf6");

function Card({ c }: { c: WrappedCard }) {
  const max = Math.max(...(c.bars ?? []).map((b) => b.value), 1);
  return (
    <div className="flex h-full flex-col justify-between p-8 sm:p-12" style={{ color: fg(c.tone) }}>
      <p className="rise text-[18px] opacity-80">{c.kicker}</p>
      <div>
        <h2 className="font-display text-[52px] leading-[0.95] tracking-[-0.03em] text-balance sm:text-[76px]">
          <Words text={c.headline} />
        </h2>
        {c.value && <p className="rise num mt-5 text-[28px] font-semibold [animation-delay:450ms] sm:text-[34px]">{c.value}</p>}
        {c.bars && (
          <div className="mt-8 flex h-[140px] items-end gap-3">
            {c.bars.map((b, i) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="wrapped-bar w-full rounded-t-lg"
                  style={{ height: `${Math.max(6, (b.value / max) * 120)}px`, background: "currentColor", opacity: 0.85, animationDelay: `${500 + i * 90}ms` }}
                />
                <span className="text-[13px] opacity-80">{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="rise max-w-[34ch] text-[19px] leading-relaxed opacity-90 [animation-delay:700ms]">{c.caption}</p>
    </div>
  );
}

/** Draws the persona card to a canvas and downloads it as a PNG (no external libraries). */
function sharePng(w: Wrapped) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const x = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  x.fillStyle = css.getPropertyValue("--fill").trim() || "#f2ac2b";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#1a1203";
  x.font = "500 44px Georgia, serif";
  x.fillText("Kosh Wrapped", 90, 140);
  x.font = "40px system-ui, sans-serif";
  x.fillText(new Date(w.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }), 90, 200);
  x.font = "400 120px Georgia, serif";
  const words = w.persona.split(" ");
  let line = "";
  let y = 620;
  for (const word of words) {
    if (x.measureText(line + word).width > 880) {
      x.fillText(line, 90, y);
      line = "";
      y += 130;
    }
    line += word + " ";
  }
  x.fillText(line, 90, y);
  const stats = w.cards.filter((k) => k.value).slice(0, 3);
  x.font = "40px system-ui, sans-serif";
  stats.forEach((k, i) => x.fillText(`${k.kicker}: ${k.value}`, 90, 1050 + i * 64));
  const a = document.createElement("a");
  a.download = `kosh-wrapped-${w.month}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}

export function WrappedView() {
  const router = useRouter();
  const params = useSearchParams();
  const month = params.get("month") ?? undefined;
  const { data } = useApi(() => api.wrapped(month), [month]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [t0, setT0] = useState(0);
  const holding = useRef(false);

  const n = data?.cards.length ?? 0;
  const go = useCallback((d: number) => {
    setI((x) => Math.max(0, Math.min(n - 1, x + d)));
    setT0(Date.now());
  }, [n]);
  const close = useCallback(() => (window.history.length > 1 ? router.back() : router.push("/dashboard")), [router]);

  useEffect(() => {
    if (!data || paused || i >= n - 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [data, i, n, paused, go, t0]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go, close]);

  if (!data) return <Skeleton className="fixed inset-0 z-[70] rounded-none" />;
  const c = data.cards[i];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0c0c0a] p-0 sm:p-6" role="dialog" aria-label="Monthly Wrapped">
      <div
        className="relative h-full w-full overflow-hidden transition-colors duration-700 sm:h-[min(860px,92vh)] sm:w-[min(520px,92vw)] sm:rounded-[28px]"
        style={{ background: TONE[c.tone] ?? "#16140f" }}
        onPointerDown={() => {
          holding.current = true;
          setPaused(true);
        }}
        onPointerUp={(e) => {
          holding.current = false;
          setPaused(false);
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          if ((e.target as HTMLElement).closest("button")) return;
          go(e.clientX - r.left < r.width / 3 ? -1 : 1);
        }}
      >
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1.5 p-4">
          {data.cards.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                key={`${k}-${i}-${t0}`}
                className={k < i ? "h-full w-full bg-white" : k === i ? "wrapped-progress h-full bg-white" : "h-full w-0"}
                style={k === i ? { animationDuration: `${DURATION}ms`, animationPlayState: paused || i === n - 1 ? "paused" : "running" } : undefined}
              />
            </div>
          ))}
        </div>
        <div className="absolute top-8 right-4 z-10 flex gap-1">
          <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"} className="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10">
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button onClick={close} aria-label="Close" className="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div key={i} className="relative h-full pt-10">
          <Card c={c} />
        </div>

        {i === n - 1 && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 p-6">
            <button onClick={() => sharePng(data)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#1a1203] text-[16px] font-medium text-white">
              <Download size={16} /> Save as image
            </button>
            <button onClick={close} className="h-12 rounded-full px-5 text-[16px] font-medium" style={{ color: fg(c.tone) }}>
              Done
            </button>
          </div>
        )}
      </div>

      <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-6 hidden size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid" disabled={i === 0}>
        <ChevronLeft size={22} />
      </button>
      <button onClick={() => go(1)} aria-label="Next" className="absolute right-6 hidden size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid" disabled={i === n - 1}>
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
