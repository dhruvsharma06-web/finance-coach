"use client";

import { useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/format";

export interface FlowSegment {
  label: string;
  value: number;
  /** CSS variable name, e.g. "--positive" */
  colorVar: string;
}

/**
 * The "living money model" made visible: this month's income flowing into where it went.
 * Ribbons are sized by real amounts; particles stream along them continuously.
 * Canvas-drawn, DPR-aware, pauses off-screen, static under reduced motion.
 */
export function MoneyFlow({ income, segments, height = 340 }: { income: number; segments: FlowSegment[]; height?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<{ y: number; h: number }[]>([]);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = Math.max(income, segments.reduce((s, x) => s + x.value, 0), 1);
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    type Band = { y0: number; y1: number; t0: number; t1: number; color: string; colorVar: string };
    let bands: Band[] = [];
    const particles: { band: number; t: number; lane: number; speed: number; size: number }[] = [];

    const css = () => getComputedStyle(document.documentElement);
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = box.clientWidth;
      h = height;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // left: one income column; right: stacked segments with gaps
      const gap = 10;
      const usable = h - gap * (segments.length - 1);
      let ly = 0;
      let ry = 0;
      bands = segments.map((s) => {
        const lh = (s.value / total) * h;
        const rh = Math.max(3, (s.value / total) * usable);
        const b = { y0: ly, y1: lh, t0: ry, t1: rh, color: "", colorVar: s.colorVar };
        ly += lh;
        ry += rh + gap;
        return b;
      });
      // label centres, nudged apart so small segments never overlap
      const MIN = 38;
      const c = bands.map((b) => b.t0 + b.t1 / 2);
      for (let i = 1; i < c.length; i++) c[i] = Math.max(c[i], c[i - 1] + MIN);
      for (let i = c.length - 1; i >= 0; i--) c[i] = Math.min(c[i], i === c.length - 1 ? h - 16 : c[i + 1] - MIN);
      c[0] = Math.max(c[0], 16);
      setLayout(c.map((y) => ({ y, h: 0 })));

      particles.length = 0;
      const count = Math.round(Math.min(220, Math.max(90, w / 5)));
      segments.forEach((s, i) => {
        const n = Math.max(4, Math.round((s.value / total) * count));
        for (let k = 0; k < n; k++)
          particles.push({ band: i, t: Math.random(), lane: Math.random(), speed: 0.06 + Math.random() * 0.08, size: 0.9 + Math.random() * 1.5 });
      });
    };

    const LEFT = 18;
    const rightX = () => w - 18;
    // cubic ribbon point at parameter t for lane in [0,1]
    const point = (b: Band, t: number, lane: number) => {
      const ya = b.y0 + b.y1 * lane;
      const yb = b.t0 + b.t1 * lane;
      const x0 = LEFT;
      const x1 = rightX();
      const cx = (x1 - x0) * 0.5;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * (x0 + cx) + 3 * u * t * t * (x1 - cx) + t * t * t * x1;
      const y = u * u * u * ya + 3 * u * u * t * ya + 3 * u * t * t * yb + t * t * t * yb;
      return [x, y] as const;
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = css();
      for (const b of bands) b.color = s.getPropertyValue(b.colorVar).trim() || "#888";
      const ink = s.getPropertyValue("--ink").trim();
      ctx.clearRect(0, 0, w, h);

      // entrance: ribbons draw from left to right over 1.6s
      const grow = reduce ? 1 : Math.min(1, (now - start) / 1600);
      const ease = 1 - Math.pow(1 - grow, 3);
      const x1 = rightX();

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, LEFT + (x1 - LEFT + 18) * ease, h);
      ctx.clip();
      for (const b of bands) {
        const cx = (x1 - LEFT) * 0.5;
        ctx.beginPath();
        ctx.moveTo(LEFT, b.y0);
        ctx.bezierCurveTo(LEFT + cx, b.y0, x1 - cx, b.t0, x1, b.t0);
        ctx.lineTo(x1, b.t0 + b.t1);
        ctx.bezierCurveTo(x1 - cx, b.t0 + b.t1, LEFT + cx, b.y0 + b.y1, LEFT, b.y0 + b.y1);
        ctx.closePath();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = b.color;
        ctx.fill();
        // right node
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(x1, b.t0, 6, b.t1, 3);
        ctx.fill();
      }
      ctx.restore();

      // income column
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(LEFT - 6, 0, 6, h * ease + 0.01, 3);
      ctx.fill();

      // particles
      if (grow > 0.6) {
        const fade = Math.min(1, (grow - 0.6) / 0.4);
        for (const p of particles) {
          if (!reduce) {
            p.t += p.speed * dt;
            if (p.t > 1) {
              p.t -= 1;
              p.lane = Math.random();
            }
          }
          const b = bands[p.band];
          if (!b) continue;
          const [x, y] = point(b, p.t, 0.1 + p.lane * 0.8);
          const edge = Math.min(p.t, 1 - p.t) * 8;
          ctx.globalAlpha = Math.min(0.95, edge) * fade;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (visible && !(reduce && grow >= 1)) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    // resizing clears the canvas, so always repaint (static mode has no running loop)
    const ro = new ResizeObserver(() => {
      resize();
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(draw);
    });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(box);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [income, segments, height]);

  return (
    <div className="grid grid-cols-[1fr_140px] items-stretch gap-3 sm:grid-cols-[110px_1fr_200px] sm:gap-5">
      <div className="hidden flex-col justify-center text-right sm:flex" style={{ height }}>
        <p className="text-[14.5px] text-muted">Came in</p>
        <p className="num text-[20px] font-medium tracking-tight text-ink">{formatINR(income)}</p>
      </div>
      <div
        ref={wrap}
        className="relative min-w-0"
        style={{ height }}
        role="img"
        aria-label={`Income of ${formatINR(income)} split into ${segments.map((s) => `${s.label} ${formatINR(s.value)}`).join(", ")}`}
      >
        <canvas ref={canvas} className="absolute inset-0" />
      </div>
      <ul className="relative" style={{ height }}>
        {segments.map((s, i) =>
          layout[i] ? (
            <li
              key={s.label}
              className="absolute left-0 -translate-y-1/2 leading-tight transition-[top] duration-500"
              style={{ top: layout[i].y + layout[i].h / 2 }}
            >
              <span className="block text-[14px] text-muted">{s.label}</span>
              <span className="num block text-[16.5px] font-medium tracking-tight text-ink">{formatINR(s.value)}</span>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
