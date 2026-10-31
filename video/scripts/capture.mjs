// Automated capture of the live Kosh app for the showcase video.
// Usage:  node scripts/capture.mjs            (defaults to the deployed site)
//         KOSH_URL=http://localhost:3000 node scripts/capture.mjs
// Writes 1920×1080 PNGs to public/shots/ and a manifest (public/shots/manifest.json).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE = (process.env.KOSH_URL ?? "https://finance-coach-six.vercel.app").replace(/\/$/, "");
const OUT = "public/shots";
mkdirSync(OUT, { recursive: true });
const manifest = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name, note, opts = {}) {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  manifest.push({ name, note, url: page.url() });
  console.log("  ✓", name);
}
const scrollTo = (page, y) => page.evaluate((y) => window.scrollTo(0, y), y);
/** scroll a tall sticky section to a fraction of its scroll range */
const scrollSection = (page, selector, f) =>
  page.evaluate(
    ([sel, f]) => {
      const s = document.querySelector(sel);
      if (!s) return false;
      const total = s.offsetHeight - window.innerHeight;
      window.scrollTo(0, s.offsetTop + total * f);
      return true;
    },
    [selector, f],
  );

const browser = await chromium.launch();

// ── 1. Landing page, with its real 3D motion running ──────────────────────
{
  console.log("Landing");
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await wait(3500);
  await shot(page, "landing-hero", "Landing hero: 3D wallet and coins");
  for (const [i, f] of [0.12, 0.5, 0.9].entries()) {
    if (await scrollSection(page, ".koshLanding_story", f)) {
      await wait(1600);
      await shot(page, `landing-story-${i + 1}`, `Landing scroll story, chapter ${i + 1}`);
    }
  }
  for (let step = 0; step < 5; step++) {
    if (await scrollSection(page, ".kosh3d-mem", (step + 0.55) / 5)) {
      await wait(2200);
      await shot(page, `landing-memory-${step + 1}`, `Memory loop step ${step + 1}`);
    }
  }
  await page.evaluate(() => document.querySelector("#decisions")?.scrollIntoView());
  await wait(1500);
  await shot(page, "landing-decisions", "Landing what-if calculator");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait(1800);
  await shot(page, "landing-close", "Landing close");
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await wait(1500);
  await shot(page, "login", "Login with demo entry");
  await ctx.close();
}

// ── 2. The app: settled screens (reduced motion = everything fully rendered) ─
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("kosh-intro", "1");
    localStorage.setItem("kosh-theme", "light");
  } catch {}
});
const page = await ctx.newPage();
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /explore the demo/i }).click();
await page.waitForURL(/dashboard/, { timeout: 20000 });
const reset = () => page.evaluate(() => fetch("/api/reset", { method: "POST" }));
await reset();

async function visit(path, settle = 2500) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await wait(settle);
}
async function scrollShots(prefix, note, stops) {
  for (const [i, y] of stops.entries()) {
    await scrollTo(page, y);
    await wait(700);
    await shot(page, `${prefix}-${i + 1}`, `${note} (${i + 1})`);
  }
}

console.log("Dashboard");
await visit("/dashboard", 3000);
await shot(page, "dashboard-hero", "Overview headline and Ask bar");
await scrollShots("dashboard", "Overview sections", [560, 1700, 2600, 3500, 4400]);

console.log("Import");
await visit("/import");
await shot(page, "import", "Import page");
await page.getByRole("button", { name: /6-month statement/i }).click();
await wait(6000);
await page.evaluate(() => document.querySelector("main h2")?.scrollIntoView({ block: "center" }));
await wait(800);
await shot(page, "import-result", "Import result with categorised rows");
await reset();

console.log("Transactions + learning loop");
await visit("/transactions");
await shot(page, "transactions", "Transactions ledger");
await page.getByPlaceholder(/search merchant/i).fill("eatclub");
await wait(1200);
await shot(page, "transactions-eatclub", "EatClub rows needing review");
await page.locator("main li button", { hasText: "Other" }).first().click();
await wait(600);
await shot(page, "transactions-picker", "Category picker open");
await page.locator("main ul li button", { hasText: "Dining & Food Delivery" }).first().click();
await wait(1800);
await shot(page, "transactions-learned", "Rule learned toast, similar rows updated");
await reset();

console.log("Recurring, money model");
await visit("/subscriptions");
await shot(page, "recurring", "Recurring payments");
await scrollShots("recurring", "Recurring details", [800, 1500]);
await visit("/goals");
await shot(page, "goals", "Money model");
await scrollShots("goals", "Money model details", [900, 1800]);

console.log("What-if + Fix my plan");
await visit("/planner?q=" + encodeURIComponent("What if I cut dining out by 30% and my rent goes up by 3,000 from January?"), 4000);
await shot(page, "planner-whatif", "What-if with goal dates");
await page.getByRole("button", { name: /fix my plan/i }).click();
await wait(3500);
await scrollTo(page, 0);
await wait(600);
await shot(page, "planner-fixplan", "Fix my plan result");

console.log("Family, Splits, Festivals");
await visit("/family", 3000);
await shot(page, "family", "Family headline");
await scrollShots("family", "Family sections", [800, 1600, 2500]);
await page.getByRole("button", { name: /papa retires/i }).click().catch(() => {});
await wait(1000);
await page.evaluate(() => [...document.querySelectorAll("h2")].find((h) => /what-if/i.test(h.textContent))?.scrollIntoView({ block: "center" }));
await wait(700);
await shot(page, "family-whatif", "Family what-if: Papa retires");
await visit("/splits", 3000);
await shot(page, "splits", "Splits: Goa trip settle-up");
await scrollShots("splits", "Splits details", [700]);
await visit("/festivals", 3000);
await shot(page, "festivals", "Festivals: Diwali countdown");
await scrollShots("festivals", "Festival timeline and pots", [800, 1500]);

console.log("Coach, Ask Kosh, review");
await visit("/coach");
const askCoach = async (q, name, note) => {
  await page.getByPlaceholder(/ask kosh/i).fill(q);
  await page.keyboard.press("Enter");
  await wait(5000);
  await shot(page, name, note);
};
await askCoach("Which stock should I buy?", "coach-guardrail", "Coach guardrail: educates, never picks products");
await askCoach("Can I afford a ₹60,000 phone in December?", "coach-afford", "Coach: affordability with a simulation");
await visit("/dashboard", 2500);
const launcher = page.getByRole("button", { name: /ask kosh/i }).first();
if (await launcher.isVisible().catch(() => false)) {
  await launcher.click();
  await wait(1200);
  await page.getByLabel("Ask Kosh a question").fill("khana bahar 30% kam karu toh?");
  await page.getByRole("button", { name: "Send question" }).click();
  await wait(5000);
  await shot(page, "ask-kosh", "Ask Kosh avatar assistant, Hinglish");
}
await visit("/report", 3000);
await shot(page, "report", "Monthly review");
await scrollShots("report", "Monthly review details", [900, 1800]);
await visit("/how-it-works");
await shot(page, "how-it-works", "How it works");

console.log("Wrapped");
await visit("/wrapped?month=2026-10", 2000);
for (let i = 0; i < 10; i++) {
  await wait(1100);
  await shot(page, `wrapped-${i + 1}`, `Monthly Wrapped card ${i + 1}`);
  await page.keyboard.press("ArrowRight");
}

// ── 3. Phone screens for the device-frame scene ─────────────────────────────
console.log("Mobile");
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce", storageState: await ctx.storageState() });
await m.addInitScript(() => {
  try {
    sessionStorage.setItem("kosh-intro", "1");
    localStorage.setItem("kosh-theme", "light");
  } catch {}
});
const mp = await m.newPage();
for (const [path, name] of [
  ["/dashboard", "mobile-dashboard"],
  ["/family", "mobile-family"],
  ["/festivals", "mobile-festivals"],
]) {
  await mp.goto(BASE + path, { waitUntil: "networkidle" });
  await wait(2500);
  await mp.screenshot({ path: `${OUT}/${name}.png` });
  manifest.push({ name, note: `Phone: ${path}`, url: BASE + path });
  console.log("  ✓", name);
}

await page.evaluate(() => fetch("/api/reset", { method: "POST" }));
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), shots: manifest }, null, 2));
await browser.close();
console.log(`\nCaptured ${manifest.length} screens from ${BASE}`);
