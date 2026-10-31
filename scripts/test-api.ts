import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
async function request(path: string, init?: RequestInit) {
  const response = await fetch(base + path, init);
  const body = await response.json();
  assert(response.ok, JSON.stringify(body));
  return body;
}
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
async function main() {
  await request("/api/reset", { method: "POST" });
  const all = await request("/api/transactions");
  const eatclub = all.find(
    (t: { merchant: string }) => t.merchant === "EatClub Brands",
  );
  const preview = await request(
    "/api/transactions/" + eatclub.id + "/similar?category=dining",
  );
  assert.equal(preview.count, 5);
  const correction = await request(
    "/api/transactions/" + eatclub.id,
    json("PATCH", { category: "dining" }),
  );
  assert.equal(correction.appliedCount, 5);
  for (const name of [
    "hdfc-november.csv",
    "icici-style.csv",
    "sbi-style.csv",
    "statement.pdf",
    "sms-dump.txt",
  ]) {
    if (name !== "hdfc-november.csv")
      await request("/api/reset", { method: "POST" });
    const form = () => {
      const f = new FormData();
      f.set("file", new Blob([new Uint8Array(data)]), name);
      return f;
    };
    const data = await readFile("samples/" + name);
    const result = await request("/api/import", {
      method: "POST",
      body: form(),
    });
    assert.equal(
      result.added,
      ["icici-style.csv", "sbi-style.csv"].includes(name) ? 3 : 10,
    );
    assert.equal(
      (await request("/api/import", { method: "POST", body: form() })).added,
      0,
    );
    if (name === "hdfc-november.csv") {
      const t = result.transactions.find(
        (t: { merchant: string }) => t.merchant === "EatClub Brands",
      );
      assert.equal(t.category, "dining");
      assert.equal(t.categorySource, "user_rule");
    }
    if (name === "sms-dump.txt")
      assert(result.warnings.some((w: string) => w.includes("Ignored 3")));
    console.log(name + ": " + result.added + " added, re-import 0");
  }
  const voice = await request(
    "/api/transactions",
    json("POST", { text: "spent 450 on swiggy yesterday", source: "voice" }),
  );
  assert.equal(voice.transactions[0].category, "dining");
  assert.equal(voice.source, "voice");
  const manual = await request(
    "/api/transactions",
    json("POST", {
      date: "2026-10-30",
      description: "Coffee",
      amount: 100,
      direction: "debit",
    }),
  );
  assert.equal(manual.added, 1);
  await request("/api/reset", { method: "POST" });
  console.log("API acceptance passed");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
