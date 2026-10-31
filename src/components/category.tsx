"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  Banknote,
  Car,
  Check,
  ChevronDown,
  CircleDashed,
  Clapperboard,
  Fuel,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, getCategory } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { cn } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  ArrowDownLeft,
  Home,
  ShoppingBasket,
  UtensilsCrossed,
  Car,
  Fuel,
  ShoppingBag,
  Zap,
  Repeat,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Plane,
  Landmark,
  ShieldCheck,
  PiggyBank,
  ArrowLeftRight,
  Banknote,
  Receipt,
  CircleDashed,
};

export function CategoryIcon({ id, size = 16, className }: { id: CategoryId; size?: number; className?: string }) {
  const c = getCategory(id);
  const Icon = ICONS[c.icon] ?? CircleDashed;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{
        width: size + 14,
        height: size + 14,
        color: c.color,
        background: `color-mix(in oklab, ${c.color} 13%, transparent)`,
      }}
    >
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}

export function CategoryDot({ id }: { id: CategoryId }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: getCategory(id).color }} />;
}

/** Category chip that opens an inline picker. Used for the correction loop. */
export function CategoryPicker({
  value,
  onChange,
  needsReview,
  disabled,
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
  needsReview?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const c = getCategory(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const list = CATEGORIES.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        className={cn(
          "group inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium transition-colors",
          needsReview
            ? "border-dashed border-warn/60 bg-warn-soft text-warn hover:border-warn"
            : "border-line bg-surface text-ink hover:border-subtle",
        )}
      >
        <span className="size-2 rounded-full" style={{ background: c.color }} />
        {c.label}
        <ChevronDown size={13} className="text-subtle transition-transform group-hover:translate-y-px" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_32px_-8px_rgb(0_0_0/0.18)]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Move to…"
            className="w-full border-b border-line bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-subtle"
            onKeyDown={(e) => {
              if (e.key === "Enter" && list[0]) {
                onChange(list[0].id);
                setOpen(false);
              }
            }}
          />
          <ul className="max-h-72 overflow-y-auto py-1">
            {list.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (x.id !== value) onChange(x.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                >
                  <span className="size-2 rounded-full" style={{ background: x.color }} />
                  <span className="flex-1">{x.label}</span>
                  {x.id === value && <Check size={14} className="text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
