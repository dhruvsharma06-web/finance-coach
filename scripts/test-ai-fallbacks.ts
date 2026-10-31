import assert from "node:assert/strict";
import { serverTest } from "./server-test";
function pdfFixture(pages: string[]): Buffer {
  const fontId = 3 + pages.length * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count " +
      pages.length +
      " /Kids [" +
      pages.map((_, i) => 3 + i * 2 + " 0 R").join(" ") +
      "] >>",
  ];
  pages.forEach((text, i) => {
    const stream = "BT /F1 10 Tf 20 700 Td (" + text + ") Tj ET";
    objects.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 800] /Resources << /Font << /F1 " +
        fontId +
        " 0 R >> >> /Contents " +
        (4 + i * 2) +
        " 0 R >>",
      "<< /Length " +
        Buffer.byteLength(stream) +
        " >>\nstream\n" +
        stream +
        "\nendstream",
    );
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += i + 1 + " 0 obj\n" + obj + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 " +
    (objects.length + 1) +
    "\n0000000000 65535 f \n" +
    offsets.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size " +
    (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return Buffer.from(pdf);
}
serverTest("scripts/test-ai-fallbacks.ts", async () => {
  // A local fetch fixture exercises the real SDK schema path without a live provider or real key.
  process.env.AI_PROVIDER = "google";
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "local-test-fixture";
  const originalFetch = globalThis.fetch;
  let onAi: (() => Promise<void>) | undefined;
  let calls = 0,
    mode: "classify" | "fail" | "pdf-partial" = "classify";
  globalThis.fetch = async (_input, init) => {
    calls++;
    if (onAi) {
      const fn = onAi;
      onAi = undefined;
      await fn();
    }
    if (mode === "pdf-partial")
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  {
                    text:
                      calls === 1
                        ? JSON.stringify({
                            transactions: [
                              {
                                date: "2026-10-01",
                                description: "First Merchant",
                                amount: 100,
                                direction: "debit",
                              },
                              {
                                date: "2026-10-02",
                                description: "Second Merchant",
                                amount: 200,
                                direction: "debit",
                              },
                            ],
                          })
                        : "not json",
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    if (mode === "fail")
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "not structured json" }],
                role: "model",
              },
              finishReason: "STOP",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const body = JSON.parse(String(init?.body)) as {
      contents: { parts: { text?: string }[] }[];
    };
    const prompt = body.contents
      .flatMap((c) => c.parts)
      .map((p) => p.text ?? "")
      .find((t) => t.startsWith("["));
    assert(prompt, "classification prompt");
    const items = JSON.parse(prompt) as { index: number }[];
    assert(items.length <= 60);
    const results = items.map((it) => ({
      index: it.index,
      category: calls === 2 ? "invalid-category" : "dining",
      confidence: 0.8,
    }));
    results.push({ index: 9999, category: "dining", confidence: 0.8 });
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ results }) }],
              role: "model",
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 1,
          candidatesTokenCount: 1,
          totalTokenCount: 2,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const { categorizeBatch } = await import("../src/lib/categorize");
    const items = Array.from({ length: 125 }, (_, i) => ({
      merchant: "Unmapped " + i,
      description: "Unknown payment " + i,
      amount: 100,
      direction: "debit" as const,
    }));
    const results = await categorizeBatch(items, []);
    assert.equal(calls, 3);
    assert.equal(results.length, 125);
    assert.equal(results[0].categorySource, "ai");
    assert.equal(results[60].categorySource, "default");
    assert.equal(results[124].categorySource, "ai");
    const { resetDb, readDb } = await import("../src/lib/db");
    const { applyCorrection } = await import("../src/lib/categorize/learn");
    const { ingest } = await import("../src/lib/ingest");
    await resetDb();
    const eatclub = (await readDb()).transactions.find(
      (t) => t.merchant === "EatClub Brands",
    )!;
    onAi = async () => {
      await applyCorrection(eatclub.id, "dining");
    };
    calls = 0;
    const imported = await ingest(
      [
        {
          date: "2026-10-31",
          merchant: "EatClub Brands",
          description: "EatClub race test",
          amount: 100,
          direction: "debit",
        },
      ],
      "csv",
    );
    assert.equal(imported.transactions[0].categorySource, "user_rule");
    assert.equal((await readDb()).rules[0].hits, 1);
    await resetDb();
    mode = "fail";
    const { parseQuickAdd } = await import("../src/lib/ingest/quick-add");
    assert.equal(
      (await parseQuickAdd("spent 450 on swiggy yesterday"))?.merchant,
      "Swiggy",
    );
    assert.equal(await parseQuickAdd("a vague unparseable payment"), null);
    const { parseSms } = await import("../src/lib/ingest/sms");
    const { parserWarnings } = await import("../src/lib/ingest/warnings");
    const sms = await parseSms(
      "Rs 450 debited on 30-10-26 unexplained financial event",
    );
    assert.equal(sms.length, 0);
    assert(parserWarnings(sms).some((w) => w.includes("could not be parsed")));
    const { parsePdf } = await import("../src/lib/ingest/pdf");
    const { readFile } = await import("node:fs/promises");
    const pdf = await parsePdf(await readFile("samples/statement.pdf"));
    assert.equal(pdf.length, 10);
    assert(parserWarnings(pdf).some((w) => w.includes("used text fallback")));
    mode = "pdf-partial";
    calls = 0;
    const partial = await parsePdf(
      pdfFixture([
        "01/10/2026 First Merchant 100.00 Dr",
        "02/10/2026 Second Merchant 200.00 Dr",
        "03/10/2026 Third Merchant 300.00 Dr",
      ]),
    );
    assert.equal(calls, 2);
    assert.equal(partial.length, 3);
    assert.equal(partial[2].amount, 300);
    assert(parserWarnings(partial).some((w) => w.includes("pages 3-3")));
    console.log(
      "AI fixture passed: 125 unknowns in 3 batches, invalid schema falls back, out-of-range indices ignored, malformed AI cannot break voice/SMS/PDF.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
