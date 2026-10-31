"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Repeat,
  Target,
  FlaskConical,
  MessageCircle,
  FileText,
} from "lucide-react";

/** LANE A (Claude). Placeholder shell — will be redesigned. Nav routes are the contract. */
export const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/subscriptions", label: "Recurring", icon: Repeat },
  { href: "/goals", label: "Profile & Goals", icon: Target },
  { href: "/planner", label: "What-if Planner", icon: FlaskConical },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/report", label: "Monthly Review", icon: FileText },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface px-3 py-5 md:block">
        <div className="mb-6 px-3 text-lg font-semibold tracking-tight">
          Kosh<span className="text-accent">.</span>
        </div>
        <nav className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
