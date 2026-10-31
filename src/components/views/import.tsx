"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, FileSpreadsheet, FileText, MessageSquareText, UploadCloud } from "lucide-react";
import { api } from "@/lib/client";
import { getCategory } from "@/lib/categories";
import { formatINR } from "@/lib/format";
import type { ImportResult } from "@/lib/types";
import { CategoryIcon } from "../category";
import { NudgeList } from "../nudges";
import { ParseDemo } from "../parse-demo";
import { Badge, Button, PageHeader, Panel, cn } from "../ui";

const SAMPLES = [
  { file: "hdfc-november.csv", label: "HDFC statement", kind: "CSV", icon: FileSpreadsheet },
  { file: "statement.pdf", label: "Bank statement", kind: "PDF", icon: FileText },
  { file: "sms-dump.txt", label: "Bank SMS dump", kind: "SMS", icon: MessageSquareText },
];

function Result({ r }: { r: ImportResult }) {
  const stats = [
    { label: "Found", value: r.parsed },
    { label: "Added", value: r.added },
    { label: "Duplicates skipped", value: r.duplicates },
    { label: "Need review", value: r.transactions.filter((t) => t.confidence < 0.6).length },
  ];
  return (
    <div className="rise space-y-6">
      <Panel
        title={r.added ? `Imported ${r.added} transaction${r.added === 1 ? "" : "s"}` : "Nothing new to import"}
        description={r.fileName ? `From ${r.fileName}` : `From pasted ${r.source.toUpperCase()}`}
        action={
          <Link href="/transactions">
            <Button size="sm" variant="primary">
              Review <ArrowRight size={14} />
            </Button>
          </Link>
        }
      >
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-2 px-4 py-3">
              <dt className="text-[14px] text-muted">{s.label}</dt>
              <dd className="num mt-0.5 text-[22px] font-medium tracking-tight text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
        {r.warnings.length > 0 && (
          <ul className="mt-4 space-y-1 text-[14.5px] text-warn">
            {r.warnings.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        )}
      </Panel>

      {r.transactions.length > 0 && (
        <Panel title="How Kosh categorized them" bleed>
          <ul className="divide-y divide-line">
            {r.transactions.slice(0, 12).map((t, i) => (
              <li key={t.id} className="rise flex items-center gap-3 px-5 py-2.5" style={{ animationDelay: `${i * 40}ms` }}>
                <CategoryIcon id={t.category} size={14} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] text-ink">{t.merchant}</p>
                  <p className="text-[13.5px] text-muted">{getCategory(t.category).label}</p>
                </div>
                {t.categorySource === "user_rule" && <Badge tone="accent">Your rule</Badge>}
                {t.categorySource === "ai" && <Badge tone="info">AI</Badge>}
                {t.confidence < 0.6 && <Badge tone="warn">Review</Badge>}
                <span className={cn("num text-[15.5px]", t.direction === "credit" ? "text-positive" : "text-ink")}>
                  {t.direction === "credit" ? "+" : "−"}
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
          {r.transactions.length > 12 && (
            <p className="border-t border-line px-5 py-3 text-[14.5px] text-muted">and {r.transactions.length - 12} more</p>
          )}
        </Panel>
      )}

      {r.newNudges.length > 0 && (
        <Panel title="Kosh noticed" description="New from this import">
          <NudgeList nudges={r.newNudges} onDismiss={() => {}} />
        </Panel>
      )}
    </div>
  );
}

export function ImportView() {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sms, setSms] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const run = async (label: string, fn: () => Promise<ImportResult>) => {
    setBusy(label);
    try {
      const r = await fn();
      setResult(r);
      if (r.added) toast.success(`Imported ${r.added} transactions`);
      else toast.message("No new transactions found", { description: r.warnings[0] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  };

  const uploadFile = (f: File) => run(f.name, () => api.importFile(f));

  const trySample = async (file: string) => {
    const res = await fetch(`/samples/${file}`);
    if (!res.ok) return toast.error("Sample not available yet");
    if (file.endsWith(".txt")) {
      const text = await res.text();
      setSms(text);
      return run(file, () => api.importSms(text));
    }
    const blob = await res.blob();
    return uploadFile(new File([blob], file, { type: blob.type }));
  };

  return (
    <div>
      <PageHeader
        title="Bring in your money"
        description="Drop a statement from any Indian bank, or paste your transaction SMS. Kosh reads the mess, skips duplicates and OTP spam, and categorizes everything."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) uploadFile(f);
          }}
          onClick={() => input.current?.click()}
          className={cn(
            "flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed px-8 transition-[background,border-color,transform] duration-300 text-center transition-colors",
            drag ? "scale-[1.01] border-fill bg-accent-soft" : "border-line bg-surface hover:border-subtle",
          )}
        >
          <input
            ref={input}
            type="file"
            accept=".csv,.pdf,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
          <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-ink">
            <UploadCloud size={24} className={busy && !busy.endsWith(".txt") && busy !== "sms" ? "animate-bounce" : ""} />
          </span>
          <p className="mt-4 text-[17px] font-medium text-ink">
            {busy && busy !== "sms" ? `Reading ${busy}…` : "Drop a PDF or CSV statement"}
          </p>
          <p className="mt-1 text-[15px] text-muted">HDFC, ICICI, SBI, Axis, Kotak and more · or click to browse</p>
        </div>

        <Panel title="Paste bank SMS" description="Copy a batch from your messages app. Promos and OTPs are ignored.">
          <textarea
            value={sms}
            onChange={(e) => setSms(e.target.value)}
            rows={8}
            placeholder={"Rs.450.00 debited from A/c XX4821 on 10-11-26 to VPA swiggy@icici…"}
            className="w-full resize-none rounded-xl border border-line bg-bg px-4 py-3 font-mono text-[14px] leading-relaxed outline-none placeholder:text-subtle focus:border-subtle"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="primary" loading={busy === "sms"} disabled={!sms.trim()} onClick={() => run("sms", () => api.importSms(sms))}>
              Import SMS
            </Button>
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[14.5px] text-muted">No statement handy? Try a sample:</span>
        {SAMPLES.map((s) => (
          <Button key={s.file} size="sm" loading={busy === s.file} onClick={() => trySample(s.file)}>
            <s.icon size={14} /> {s.label}
            <span className="text-subtle">{s.kind}</span>
          </Button>
        ))}
      </div>

      {!result && (
        <section className="reveal mt-20">
          <h2 className="font-display text-[40px] leading-none tracking-[-0.02em] sm:text-[56px]">Messy in. Clean out.</h2>
          <p className="mt-3 mb-8 max-w-[56ch] text-[17px] text-muted">
            Every line your bank sends goes through the same path: read it, find the merchant, pick the category, skip the noise.
          </p>
          <ParseDemo />
        </section>
      )}

      {result && (
        <div className="mt-10">
          <Result r={result} />
        </div>
      )}
    </div>
  );
}
