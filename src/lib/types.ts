/**
 * SHARED CONTRACT — every lane builds against these types.
 * Owner: Lane A (Claude). Other lanes: do not change existing fields;
 * if you need a new optional field, add it and note it in docs/CHANGELOG-CONTRACT.md.
 *
 * Conventions:
 * - Money is a plain number in INR (rupees, not paise). Always positive; use `direction`.
 * - Dates are ISO strings: "YYYY-MM-DD" for days, "YYYY-MM" for months.
 * - IDs are strings (crypto.randomUUID() or a readable slug for seeds).
 */

export type CategoryId =
  | "income"
  | "rent"
  | "groceries"
  | "dining"
  | "transport"
  | "fuel"
  | "shopping"
  | "utilities"
  | "subscriptions"
  | "entertainment"
  | "health"
  | "education"
  | "travel"
  | "emi"
  | "insurance"
  | "investments"
  | "transfers"
  | "cash"
  | "fees"
  | "other";

export type CategoryGroup = "income" | "needs" | "wants" | "savings" | "other";

export interface Category {
  id: CategoryId;
  label: string;
  group: CategoryGroup;
  /** CSS color token, e.g. "var(--cat-dining)" or hex */
  color: string;
  /** lucide-react icon name */
  icon: string;
}

export type TxnSource = "csv" | "pdf" | "sms" | "manual" | "voice" | "seed";
export type TxnDirection = "debit" | "credit";
export type PaymentMode = "upi" | "card" | "netbanking" | "atm" | "neft" | "imps" | "autopay" | "other";

/** How the current category was decided — shown in the UI as a badge. */
export type CategorySource = "user_rule" | "builtin" | "ai" | "user" | "default";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  /** Raw description exactly as it appeared in the statement/SMS */
  description: string;
  /** Normalized, human-readable merchant, e.g. "Swiggy", "Netflix", "Ramesh Kumar" */
  merchant: string;
  amount: number; // positive INR
  direction: TxnDirection;
  category: CategoryId;
  categorySource: CategorySource;
  /** 0..1 */
  confidence: number;
  source: TxnSource;
  mode?: PaymentMode;
  account?: string; // e.g. "HDFC ••4821"
  balanceAfter?: number;
  recurringId?: string;
  ruleId?: string;
  importId?: string;
  notes?: string;
}

export type RuleMatchType = "merchant_exact" | "contains" | "regex";

export interface CategoryRule {
  id: string;
  /** Matched against the normalized merchant (lowercase) unless matchType is regex on description */
  pattern: string;
  matchType: RuleMatchType;
  category: CategoryId;
  /** Optional: only apply to this direction */
  direction?: TxnDirection;
  createdFrom: "correction" | "manual";
  /** The transaction the user corrected to create this rule */
  exampleTransactionId?: string;
  createdAt: string; // ISO datetime
  hits: number;
}

export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringStatus = "active" | "price_changed" | "possibly_unused" | "cancelled";

export interface RecurringPayment {
  id: string;
  merchant: string;
  category: CategoryId;
  cadence: Cadence;
  averageAmount: number;
  lastAmount: number;
  lastDate: string;
  nextExpectedDate: string;
  transactionIds: string[];
  status: RecurringStatus;
  /** true for SaaS/OTT/memberships; false for rent/EMI/SIP-like obligations */
  isSubscription: boolean;
  /** null = never asked, true/false = user's answer to "still using this?" */
  userConfirmedInUse: boolean | null;
  priceChange?: { from: number; to: number; pct: number; date: string };
  /** 0..1 confidence that this is truly recurring */
  confidence: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  priority: "high" | "medium" | "low";
  /** lucide icon name */
  icon?: string;
}

export interface FixedCost {
  id: string;
  label: string;
  amount: number; // monthly
  category: CategoryId;
}

export interface LifeEvent {
  id: string;
  date: string;
  description: string; // "Rent increased to ₹28,000", "Got a raise"
}

export interface FinancialProfile {
  name: string;
  currency: "INR";
  monthlyIncome: number;
  /** Day of month salary usually lands */
  incomeDay?: number;
  fixedCosts: FixedCost[];
  emergencyFund: { current: number; targetMonths: number };
  /** Monthly budget per category (variable spend) */
  categoryBudgets: Partial<Record<CategoryId, number>>;
  goals: Goal[];
  lifeEvents: LifeEvent[];
  updatedAt: string;
}

export type NudgeType =
  | "overspend_pace"
  | "price_change"
  | "unused_subscription"
  | "new_subscription"
  | "goal_at_risk"
  | "low_buffer"
  | "positive";

export interface Nudge {
  id: string;
  type: NudgeType;
  severity: "info" | "warning" | "critical" | "positive";
  title: string;
  body: string;
  createdAt: string;
  relatedCategory?: CategoryId;
  relatedRecurringId?: string;
  relatedGoalId?: string;
  dismissed: boolean;
  action?: { label: string; href: string };
}

/* ---------------- What-if simulation ---------------- */

export type ScenarioChangeKind =
  | "category_pct" // value = -30 means cut 30%
  | "category_abs" // value = +2000 means +₹2000/month
  | "income_pct"
  | "income_abs"
  | "fixed_cost_abs" // label identifies fixed cost (e.g. "Rent"), value = new delta per month
  | "one_time" // value = one-off expense (positive) or windfall (negative) in startMonth
  | "new_recurring"; // value = new monthly cost

export interface ScenarioChange {
  kind: ScenarioChangeKind;
  category?: CategoryId;
  label?: string;
  value: number;
  /** Months from now when the change begins (0 = this month) */
  startMonth?: number;
}

export interface Scenario {
  name: string;
  /** Original natural-language prompt, if any */
  prompt?: string;
  changes: ScenarioChange[];
}

export interface ProjectionPoint {
  month: string; // YYYY-MM
  income: number;
  spending: number;
  savings: number;
  cumulativeSavings: number;
}

export interface GoalOutcome {
  goalId: string;
  name: string;
  targetDate: string;
  baselineReachDate: string | null; // null = not within horizon
  scenarioReachDate: string | null;
  onTrackBaseline: boolean;
  onTrackScenario: boolean;
  /** negative = reached sooner under the scenario */
  monthsDelta: number | null;
}

export interface SimulationResult {
  scenario: Scenario;
  horizonMonths: number;
  baseline: ProjectionPoint[];
  projected: ProjectionPoint[];
  goals: GoalOutcome[];
  monthlySavingsDelta: number;
  /** LLM- or template-written plain-English summary. Never contains security recommendations. */
  summary: string;
  assumptions: string[];
}

/* ---------------- Reports, dashboard, coach ---------------- */

export interface CategorySpend {
  category: CategoryId;
  amount: number;
  budget?: number;
  /** vs previous month, percent; null if no prior data */
  changePct: number | null;
  txnCount: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  totals: { income: number; spending: number; savings: number; savingsRate: number };
  byCategory: CategorySpend[];
  topMerchants: { merchant: string; amount: number; count: number }[];
  recurringTotal: number;
  goalsProgress: { goalId: string; name: string; pct: number; onTrack: boolean }[];
  wins: string[];
  watchouts: string[];
  /** 2–4 paragraph narrative in a warm coaching tone */
  narrative: string;
  generatedAt: string;
}

export interface BudgetPace {
  category: CategoryId;
  spent: number;
  budget: number;
  /** spent / (budget * fraction of month elapsed). >1 = over pace */
  paceRatio: number;
}

export interface DashboardSummary {
  month: string;
  income: number;
  spending: number;
  savings: number;
  savingsRate: number;
  emergencyFundMonths: number;
  byCategory: CategorySpend[];
  budgetPace: BudgetPace[];
  dailySpend: { date: string; amount: number }[];
  recentTransactions: Transaction[];
  upcomingRecurring: RecurringPayment[];
  nudges: Nudge[];
  goals: Goal[];
}

export interface ImportResult {
  importId: string;
  source: TxnSource;
  fileName?: string;
  parsed: number;
  added: number;
  duplicates: number;
  transactions: Transaction[];
  warnings: string[];
  newNudges: Nudge[];
}

export interface CorrectionResult {
  transaction: Transaction;
  /** Rule created or updated from this correction (null if user opted out) */
  rule: CategoryRule | null;
  /** Other existing transactions the rule would match */
  similarIds: string[];
  /** How many of those were actually re-categorized (if applyToSimilar) */
  appliedCount: number;
}

export interface GuardrailInfo {
  triggered: boolean;
  /** e.g. "specific_security", "guaranteed_returns", "tax_evasion" */
  reason?: string;
}

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
  guardrail?: GuardrailInfo;
  /** If the coach ran a what-if, attach the result so the UI can render a chart */
  simulation?: SimulationResult;
}

/* ---------------- Persistence shape ---------------- */

export interface Database {
  version: number;
  transactions: Transaction[];
  rules: CategoryRule[];
  recurring: RecurringPayment[];
  profile: FinancialProfile;
  nudges: Nudge[];
  reports: MonthlyReport[];
}
