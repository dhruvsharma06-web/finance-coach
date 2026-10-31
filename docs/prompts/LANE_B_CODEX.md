# Lane B — Data Engine (Codex #1, Dhruv's)

> Paste everything below the line into Codex. Model: strongest Codex model, **high** reasoning.

---

You are Lane B on a 3-agent hackathon team building **Kosh**, an AI personal-finance coach with a "living money model" for Indian users. Deadline is **tonight, 31 Oct 2026, 11:59 PM IST**, so ship working increments every 45–60 minutes and push each one.

## 0. First, read these (do not skip)
1. `AGENTS.md`: lane ownership, hard rules, git workflow. **You only edit files in Lane B.**
2. `src/lib/types.ts`: the shared contract. Your outputs MUST match these types exactly.
3. `src/lib/db.ts`, `src/lib/ai.ts`, `src/lib/format.ts`, `src/lib/categories.ts`: the helpers you'll use.
4. The current stubs you are replacing: `src/lib/ingest/*`, `src/lib/categorize/*`, `src/lib/recurring/index.ts`.
5. `node_modules/next/dist/docs/` before touching route handlers. This is Next.js 16 with `cacheComponents`. Never add `export const dynamic`.

## 1. What you own
```
src/lib/ingest/index.ts      orchestrator: parse → dedupe → categorize → store → recurring → nudges
src/lib/ingest/csv.ts        messy bank CSVs
src/lib/ingest/pdf.ts        PDF statements (text + LLM, vision fallback)
src/lib/ingest/sms.ts        Indian bank / UPI SMS
src/lib/ingest/merchant.ts   (new) merchant normalization
src/lib/categorize/index.ts  categorization pipeline (rules → builtin → AI → other)
src/lib/categorize/learn.ts  the correction loop (learn a rule from a user fix)
src/lib/recurring/index.ts   recurring + subscription detection, price change, unused
src/app/api/{import,transactions,rules,recurring}/**
samples/**                   realistic test inputs
scripts/**                   test scripts (tsx)
```
**Do not edit** UI files, `src/lib/types.ts` (you may only ADD optional fields, and must log them in `docs/CHANGELOG-CONTRACT.md`), or Lane C files (`simulate/`, `insights/`, `coach/`). `ingest/index.ts` calls `generateNudges()` from Lane C. Keep that call as is.

Keep every **exported function signature** unchanged. The UI (Lane A) calls the API routes, and the routes call your functions:
- `importFile(file)`, `importSms(text)`, `ingest(raw, source, fileName?)`, `deriveMerchant(desc)`
- `categorizeBatch(items, rules)`, `categorizeSync(item, rules)`, `matchRule(item, rules)`
- `applyCorrection(transactionId, category, { createRule, applyToSimilar })` → `CorrectionResult`
- `detectRecurring()` → `RecurringPayment[]` (must also persist)

## 2. Why this matters (judging)
Judges score **AI integration 20%**, **prototype quality 20%**, **problem understanding 15%**, **innovation 10%**. Your lane is the foundation. The demo moments that depend on you:
1. **"Drop any statement in."** A real HDFC-style CSV with Withdrawal/Deposit columns and a preamble, a PDF statement, and a pasted pile of SMS (including OTP and promo spam that must be ignored) all import cleanly and get categorized.
2. **"It learns."** The user changes "EatClub Brands" from Other to Dining. A rule is learned, 5 past transactions are fixed, and the next import categorizes EatClub correctly automatically. **This is the signature demo. Make it bulletproof.**
3. **"It notices."** Netflix went ₹499 → ₹649 and gets flagged. Hotstar has been paid for 3 months with no confirmation, so the app asks "still using it?"

## 3. Detailed requirements

### 3.1 Merchant normalization (`ingest/merchant.ts`, used by `deriveMerchant`)
Turn raw narrations into clean, human-readable merchant names:
- `UPI-SWIGGY-swiggy@icici-430698765432` → `Swiggy`
- `UPI/DR/430612345678/ZOMATO LTD/YESB/zomato@kotak` → `Zomato`
- `POS 4821XXXXXX1234 UBER INDIA` → `Uber`
- `ACH D- BSE LTD MF SIP` → `Mutual Fund SIP`
- `NEFT CR-ACME DESIGN LABS PVT LTD-SALARY` → `Acme Design Labs (Salary)`
- `UPI-RAMESH KUMAR-9845XXXX12@okaxis` → `Ramesh Kumar`
- `ATM WDL HDFC KORAMANGALA` → `ATM Withdrawal`

Approach: strip rail prefixes (UPI/POS/NEFT/IMPS/ACH/NACH/ATM/BIL/INF), strip DR/CR, ref numbers (≥6 digits), masked numbers (XXXX), VPA handles (`@okaxis`), bank codes (YESB/HDFC/ICIC/UTIB…), "PVT LTD", "LIMITED", "INDIA", "TECHNOLOGIES". Then title-case. Keep a `KNOWN_MERCHANTS` alias map of 60+ Indian merchants: Swiggy/Bundl, Zomato, Blinkit, Zepto, BigBasket, Instamart, Amazon, Flipkart, Myntra, Ajio, Nykaa, Uber, Ola, Rapido, IRCTC, MakeMyTrip, Netflix, Spotify, Hotstar, Prime, YouTube, Apple, Google, Airtel, Jio, Vi, BESCOM, Tata Power, ACT, Cult.fit, Apollo, PharmEasy, 1mg, BookMyShow, PVR, Dominos, Starbucks, Third Wave, Chaayos, DMart, Reliance, Croma, Zerodha/Groww (as "investments" only, never recommended), LIC, HDFC Life, CRED, Paytm, PhonePe, and so on.

### 3.2 CSV (`ingest/csv.ts`)
- Find the real header row. Bank exports have 5–20 preamble lines (account name, address, period). Score each of the first 30 rows by how many cells match header keywords (date, narration/description/particulars/remarks, withdrawal/debit/dr, deposit/credit/cr, amount, balance) and pick the best one.
- Support **both** shapes: separate `Withdrawal Amt.` / `Deposit Amt.` (or `Debit`/`Credit`, `Dr`/`Cr`) columns, **and** a single signed `Amount` column, **and** `Amount` + `Dr/Cr` indicator column.
- Dates: `DD/MM/YY`, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD-MMM-YY` (`04-Nov-26`), `DD MMM YYYY`, `YYYY-MM-DD`. Indian banks are day-first, so never parse as US month-first.
- Amounts: strip `₹`, `INR`, `Rs.`, commas (including lakh grouping `1,42,310.00`), and trailing `Dr`/`Cr`.
- Skip footer/summary rows (Opening Balance, Closing Balance, Total, "Statement Summary").
- Capture `balanceAfter` from the Closing Balance column when present.
- Fallback: if headers can't be resolved and `aiAvailable()`, send the first 40 rows to `aiObject` to get a column mapping (`{dateCol, descCol, debitCol?, creditCol?, amountCol?, drCrCol?}`), then parse deterministically. **The LLM maps columns. It never outputs the amounts itself.**
- Must pass on `samples/hdfc-november.csv`. Add `samples/icici-style.csv` (signed amount, DD-MMM-YY) and `samples/sbi-style.csv` (Debit/Credit columns plus a preamble) and make both pass.

### 3.3 PDF (`ingest/pdf.ts`)
- `import { extractText, getDocumentProxy } from "unpdf"` → per-page text.
- If text exists: chunk ~2 pages at a time → `aiObject` with a zod schema `z.object({ transactions: z.array(z.object({ date, description, amount, direction, balanceAfter: z.number().optional() })) })`. System prompt: "Extract every transaction row. Dates as YYYY-MM-DD (input is day-first). amount is positive. direction is debit for withdrawals. Skip opening/closing balance and summary lines. Never invent rows."
- If the text is empty or garbage (scanned PDF) and the provider is Google: send the PDF bytes as a file part (`{ type: "file", data: buffer, mediaType: "application/pdf" }`) with the same schema.
- No AI key: run a regex line parser over the text (`^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})?`) and add the warning "Connect an AI key for better PDF parsing".
- Validate every row: valid date, amount > 0, description non-empty. Drop the rest with a warning count.
- Create `samples/statement.pdf`. You can generate one with a small script using `pdf-lib` (dev dependency) from the CSV sample, so the PDF demo is guaranteed to work.

### 3.4 SMS (`ingest/sms.ts`)
- Split the input into messages (blank lines, or a new message starting with a known pattern).
- **Ignore** OTPs, promos, balance-only alerts, "payment due" reminders, and failed/declined transactions. Log the skipped count as a warning, e.g. "Ignored 2 non-transaction messages (OTP/promotional)".
- Regex library for at least: HDFC, ICICI, SBI, Axis, Kotak debit/credit/card/UPI formats. Examples to support:
  - `Rs.450.00 debited from A/c XX4821 on 10-11-26 to VPA swiggy@icici. UPI Ref 430712345678`
  - `INR 2,349.00 spent on HDFC Bank Card XX1234 at MYNTRA DESIGNS on 2026-11-10:19:42:11`
  - `Rs 1500.00 sent to RAMESH KUMAR (9845XXXX12@okaxis) from A/c XX4821 on 11-11-26`
  - `Your a/c no. XXXXXXXX4821 is credited by Rs.2,000.00 on 11-11-26 by UPI from PRIYA S`
  - `Dear Customer, Rs.1,059.00 has been debited from your A/c XX4821 towards ACT FIBERNET on 10-Nov-26`
  - `ICICI Bank Acct XX821 debited for Rs 649.00 on 12-Nov-26; NETFLIX credited. UPI:4307...`
  - `Your SBI A/c XX4821 is debited by Rs.299 on 15Nov26 transfer to DISNEY HOTSTAR Ref No 4307...`
- Extract the date from the SMS (`10-11-26`, `2026-11-10`, `15Nov26`, `12-Nov-26`) and fall back to today only if there's none. Extract the merchant (VPA prefix, the "at X", "to X", or "towards X" span, or the "X credited" pattern). Extract mode (UPI/card/netbanking) and account mask.
- Leftover lines that look financial (contain an amount and a debit/credit verb) but match no regex: send them in ONE batched `aiObject` call when `aiAvailable()`.
- Update `samples/sms-dump.txt` to 12+ messages covering every format above plus 3 spam messages. Expected result: every real transaction parsed, every spam message ignored.

### 3.5 Categorization (`categorize/index.ts`)
Pipeline per transaction, first match wins:
1. **User rules** (`db.rules`) → `categorySource: "user_rule"`, confidence 1.
2. **Built-in merchant map**: extend the keyword table using your `KNOWN_MERCHANTS` (merchant → category). Credits that contain salary/payroll → income. Person-to-person UPI to a human name with no merchant match → `transfers` with confidence 0.5. → `"builtin"`, confidence 0.85–0.95.
3. **AI**: everything still unknown goes into ONE batched `aiObject` call (max ~60 per call). Schema: `{ results: [{ index, category: z.enum(CATEGORY_IDS), confidence: z.number() }] }`. Give the model the category list with labels and 1-line descriptions, and the Indian context. → `"ai"`.
4. Otherwise `"other"` / `"default"`, confidence 0.2.

Mark anything with confidence < 0.6 so the UI can show a "Needs review" chip (the UI reads `confidence`). Make `categorizeBatch` resilient: if the AI call throws, fall back to step 4 for those items, never fail the import.

### 3.6 Correction loop (`categorize/learn.ts`): the signature feature
When the user fixes a category:
1. Update the transaction (`categorySource: "user"`, confidence 1).
2. **Generalize** a rule from it. Use the normalized merchant (`normalizeMerchant(txn.merchant)`). For chains/brands use `contains` on the brand token (e.g. "swiggy" so "swiggy instamart" also matches; only do this if the token is ≥4 chars and is in KNOWN_MERCHANTS). For people use `merchant_exact`. If the user's correction applies only to one direction (e.g. a refund), set `direction`.
3. **Conflicts:** if a rule with the same pattern exists, update its category and do not duplicate. If a broader rule exists, the newer, more specific rule must win. Sort rules by specificity: exact > contains > regex, then newest first.
4. Find similar past transactions (`matchRule`) that were NOT manually set by the user (`categorySource !== "user"`). Apply when `applyToSimilar` is true. Return `similarIds` and `appliedCount`.
5. Increment `rule.hits` whenever `categorizeSync` matches it on future imports (persist in the ingest orchestrator).
6. Add `GET /api/transactions/:id/similar?category=x` that returns the preview count WITHOUT applying, so the UI can say "Apply to 5 similar transactions?" before the user confirms. Add `similarPreview(transactionId)` in `learn.ts`.
7. **Acceptance test:** reset → PATCH EatClub to dining → `appliedCount` is 5 → import `samples/hdfc-november.csv` → the new EatClub row comes in as dining with `categorySource: "user_rule"`. Write this as `scripts/test-learning.ts` (run with `npx tsx`).

### 3.7 Recurring detection (`recurring/index.ts`)
- Group debits by `normalizeMerchant(merchant)`. For groups with ≥2 transactions (≥3 for weekly), compute day gaps and the median gap → cadence: weekly (7±2), monthly (30±4), quarterly (91±7), yearly (365±10). Amount stability: ±15% of the median, **except** a single step change, which is a price change and not irregularity.
- `priceChange`: last amount vs previous amount differs by >5% → `{ from, to, pct, date }`, `status: "price_changed"`.
- `isSubscription`: category is subscriptions/entertainment/health (gym), or the merchant is in a known SaaS/OTT list. Rent/EMI/SIP/utilities → false.
- `possibly_unused`: subscription, ≥2 cycles, `userConfirmedInUse === null`, and no complementary signal. Keep it simple: flag OTT/entertainment subscriptions the user hasn't confirmed. **Preserve** `userConfirmedInUse`, `cancelled`, and ids from the previous `db.recurring` when merchants match, so user answers survive re-detection.
- `nextExpectedDate` = lastDate + cadence. `confidence` from the regularity of gaps and amounts.
- Write `recurringId` back to the transactions. Persist the list with `updateDb`. Must reproduce the seeded list for the seed data (Netflix price_changed, Hotstar possibly_unused, rent/SIP/EMI non-subscriptions).
- Add a `new_subscription` signal: a recurring merchant first seen in the last 45 days. Expose `detectRecurring()` results only. Lane C's nudges read `db.recurring`.

### 3.8 Voice / quick add: natural-language transaction
Extend `POST /api/transactions` so it also accepts `{ text: "spent 450 on swiggy yesterday", source: "voice" }`. Parse it with `aiObject` (amount, merchant, direction, date relative to today, optional category hint), with a regex fallback (`(spent|paid) (\d+) (on|at|for) (.+)`). This powers the Wispr Flow voice-entry demo. Keep the existing structured body working.

### 3.9 Rules API
`GET /api/rules` (done), `DELETE /api/rules/:id` (done). Add `PATCH /api/rules/:id { category }` to edit a rule's category.

## 4. Quality bar
- TypeScript strict, no `any` in exported APIs. Small pure functions, so parsers are easy to test.
- `scripts/test-parsers.ts`: runs every file in `samples/` through the parsers and prints counts and the first 3 rows. Run it with `npx tsx scripts/test-parsers.ts` and include the output in your commit message.
- Never throw out of `ingest()` for bad rows. Collect `warnings` instead. Thrown errors are only for "unsupported file".
- Import of 500 rows must finish in under 10 s with AI (batch!) and under 1 s without.
- `npm run build` passes before every push.

## 5. Order of work (push after each)
1. Merchant normalization, CSV parser (all 3 samples), `test-parsers.ts`. **Push. (~45 min)**
2. Categorization pipeline with batched AI and fallback. **Push.**
3. Correction loop: generalization, conflicts, similar preview, `test-learning.ts`. **Push.** ← most important
4. SMS parser (all formats plus spam filtering). **Push.**
5. Recurring detection matching the seed story. **Push.**
6. PDF parser plus the sample PDF. **Push.**
7. Natural-language quick add for voice. **Push.**

After each push, write 2–3 lines in `docs/STATUS.md` under "Lane B": what works, what endpoint shape changed (if any), and any known gaps. Lane A reads this to wire up the UI.

## 6. Done means
- `npx tsx scripts/test-parsers.ts` and `npx tsx scripts/test-learning.ts` both pass.
- From a fresh reset, all three sample formats import through `POST /api/import` with correct categories, no duplicates on re-import, and OTP/promo SMS ignored.
- The EatClub learning demo works end to end.
- `npm run build` is green and everything is pushed to `main`.
