"use client";

import type {
  CategoryId,
  CategoryRule,
  CoachMessage,
  CorrectionResult,
  DashboardSummary,
  FinancialProfile,
  ImportResult,
  MonthlyReport,
  Nudge,
  RecurringPayment,
  Scenario,
  Family,
  FamilySummary,
  SplitBalances,
  SplitExpense,
  FestivalOutlook,
  Wrapped,
  ScenarioChange,
  SimulationResult,
  Transaction,
} from "./types";

/** Typed client for every API route. UI code calls these — never fetch() directly. */
async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

const qs = (p: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return s ? `?${s}` : "";
};

export const api = {
  dashboard: (month?: string) => req<DashboardSummary>(`/api/dashboard${qs({ month })}`),
  transactions: (f: { month?: string; category?: string; q?: string } = {}) =>
    req<Transaction[]>(`/api/transactions${qs(f)}`),
  addTransaction: (t: { description: string; amount: number; direction?: "debit" | "credit"; merchant?: string; date?: string; source?: "voice" | "manual" }) =>
    req<ImportResult>("/api/transactions", { method: "POST", body: JSON.stringify(t) }),
  correct: (id: string, category: CategoryId, opts: { createRule?: boolean; applyToSimilar?: boolean } = {}) =>
    req<CorrectionResult>(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify({ category, ...opts }) }),
  importFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<ImportResult>("/api/import", { method: "POST", body: fd });
  },
  importSms: (sms: string) => req<ImportResult>("/api/import", { method: "POST", body: JSON.stringify({ sms }) }),
  rules: () => req<CategoryRule[]>("/api/rules"),
  deleteRule: (id: string) => req<{ ok: true }>(`/api/rules/${id}`, { method: "DELETE" }),
  recurring: () => req<RecurringPayment[]>("/api/recurring"),
  updateRecurring: (id: string, patch: { userConfirmedInUse?: boolean; status?: "cancelled" | "active" }) =>
    req<RecurringPayment>(`/api/recurring/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  profile: () => req<FinancialProfile>("/api/profile"),
  updateProfile: (patch: Partial<FinancialProfile>) =>
    req<FinancialProfile>("/api/profile", { method: "PUT", body: JSON.stringify(patch) }),
  /** Lane C: "my rent went up to 28k" → profile mutations. */
  lifeEvent: (description: string) =>
    req<{ profile: FinancialProfile; changes: string[] }>("/api/profile/life-event", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
  simulate: (input: { prompt?: string; scenario?: Scenario; horizonMonths?: number }) =>
    req<SimulationResult>("/api/simulate", { method: "POST", body: JSON.stringify(input) }),
  nudges: () => req<Nudge[]>("/api/nudges"),
  dismissNudge: (id: string) => req<{ ok: true }>(`/api/nudges/${id}`, { method: "PATCH", body: JSON.stringify({ dismissed: true }) }),
  report: (month?: string) => req<MonthlyReport>(`/api/report${qs({ month })}`),
  reportMonths: () => req<string[]>("/api/report/months"),
  coach: (messages: CoachMessage[]) => req<CoachMessage>("/api/coach", { method: "POST", body: JSON.stringify({ messages }) }),
  family: () => req<{ family: Family; summary: FamilySummary }>("/api/family"),
  saveFamily: (family: Family) => req<{ family: Family; summary: FamilySummary }>("/api/family", { method: "PUT", body: JSON.stringify(family) }),
  splits: () => req<{ me: string; groups: SplitBalances[]; expenses: SplitExpense[] }>("/api/splits"),
  addSplitExpense: (e: { groupId: string; description: string; amount: number; paidBy: string; mode: "equal" | "exact" | "percent"; memberIds: string[]; values?: Record<string, number> }) =>
    req<SplitExpense>("/api/splits/expenses", { method: "POST", body: JSON.stringify(e) }),
  deleteSplitExpense: (id: string) => req<{ ok: true }>(`/api/splits/expenses/${id}`, { method: "DELETE" }),
  settle: (s: { groupId: string; from: string; to: string; amount: number }) => req<unknown>("/api/splits/settle", { method: "POST", body: JSON.stringify(s) }),
  festivals: () => req<FestivalOutlook[]>("/api/festivals"),
  addToPot: (id: string, add: number) => req<FestivalOutlook[]>("/api/festivals", { method: "POST", body: JSON.stringify({ id, add }) }),
  wrapped: (month?: string) => req<Wrapped>(`/api/wrapped${qs({ month })}`),
  reset: () => req<{ ok: true }>("/api/reset", { method: "POST" }),
  /** Smallest realistic cuts that put goals back on track (deterministic solver). */
  fixPlan: (goalId?: string) =>
    req<{ changes: ScenarioChange[]; result: SimulationResult; explanation: string; feasible: boolean }>("/api/plan/fix", {
      method: "POST",
      body: JSON.stringify(goalId ? { goalId } : {}),
    }),
  session: () => req<{ authenticated: boolean; required: boolean }>("/api/auth/session"),
  logout: () => req<{ authenticated: false }>("/api/auth/logout", { method: "POST" }),
  deleteAllData: () => req<{ ok: true }>("/api/data", { method: "DELETE" }),
};
