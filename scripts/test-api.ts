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
    const countBeforePreview = (await request("/api/transactions")).length;
    const importPreview = await request("/api/import/preview", {
      method: "POST",
      body: form(),
    });
    assert.equal(
      importPreview.wouldAdd,
      ["icici-style.csv", "sbi-style.csv"].includes(name) ? 3 : 10,
    );
    assert.equal(
      (await request("/api/transactions")).length,
      countBeforePreview,
    );
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
  const review = await request("/api/transactions?needsReview=true");
  assert(review.length > 0);
  assert(review.every((t: { confidence: number }) => t.confidence < 0.6));
  const invalidRequests: [string, RequestInit, number][] = [
    [
      "/api/transactions",
      json("POST", { description: { bad: true }, amount: 1 }),
      400,
    ],
    [
      "/api/transactions",
      json("POST", { description: "Bad date", amount: 1, date: "2026-02-31" }),
      400,
    ],
    [
      "/api/transactions",
      json("POST", {
        description: "Bad direction",
        amount: 1,
        direction: "incoming",
      }),
      400,
    ],
    [
      "/api/transactions",
      json("POST", { description: "Bad amount", amount: true }),
      400,
    ],
    [
      "/api/transactions",
      json("POST", { text: "I haven't paid 450 at swiggy" }),
      400,
    ],
    ["/api/transactions", json("POST", null), 400],
    [
      "/api/transactions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      },
      400,
    ],
    ["/api/import", json("POST", { sms: [] }), 400],
    ["/api/import", json("POST", null), 400],
    ["/api/import/preview", json("POST", { sms: 100 }), 400],
    ["/api/import", { method: "POST", body: "plain text" }, 415],
    ["/api/transactions/unknown", json("PATCH", { category: "dining" }), 404],
    ["/api/transactions/unknown/similar", {}, 404],
    [
      "/api/transactions/" + eatclub.id,
      json("PATCH", { category: "dining", createRule: "false" }),
      400,
    ],
    ["/api/rules/unknown", json("PATCH", null), 400],
    [
      "/api/recurring/unknown",
      json("PATCH", { userConfirmedInUse: "false" }),
      400,
    ],
    ["/api/transactions?month=2026-99", {}, 400],
  ];
  const beforeInvalid = (await request("/api/transactions")).length;
  for (const [path, init, status] of invalidRequests) {
    const response = await fetch(base + path, init);
    assert.equal(
      response.status,
      status,
      path + ": " + (await response.text()),
    );
  }
  const invalidFile = new FormData();
  invalidFile.set("file", new Blob(["not a statement"]), "image.exe");
  assert.equal(
    (await fetch(base + "/api/import", { method: "POST", body: invalidFile }))
      .status,
    400,
  );
  assert.equal((await request("/api/transactions")).length, beforeInvalid);
  await request("/api/reset", { method: "POST" });
  console.log(
    "API acceptance passed: imports, read-only previews, learning, review filter, voice, and 18 invalid requests without writes.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
