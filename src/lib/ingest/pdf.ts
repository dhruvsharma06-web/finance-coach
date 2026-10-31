import { extractText, getDocumentProxy } from "unpdf";
import { generateObject } from "ai";
import { z } from "zod";
import { aiAvailable, aiObject, model } from "../ai";
import { toIsoDate, parseAmount } from "./csv";
import { withWarnings } from "./warnings";
import type { RawTxn } from "./index";
const schema = z.object({
  transactions: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
      amount: z.number(),
      direction: z.enum(["debit", "credit"]),
      balanceAfter: z.number().optional(),
    }),
  ),
});
const system =
  "Extract every transaction row. Dates as YYYY-MM-DD (input is day-first). amount is positive. direction is debit for withdrawals. Skip opening/closing balance and summary lines. Never invent rows.";
export async function parsePdf(buffer: Buffer): Promise<RawTxn[]> {
  const warnings: string[] = [],
    rows: RawTxn[] = [];
  let pages: string[] = [];
  try {
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(doc, { mergePages: false });
    pages = result.text;
  } catch {
    warnings.push("Unable to read PDF; try a CSV export.");
  }
  const usable =
    pages.join("").replace(/\s/g, "").length > 40 &&
    pages.some((p) => /\d{2}[\/-]\d{2}|\d{4}-\d{2}/.test(p));
  if (aiAvailable()) {
    try {
      if (usable)
        for (let i = 0; i < pages.length; i += 2) {
          const result = await aiObject({
            schema,
            system,
            prompt: pages.slice(i, i + 2).join("\n"),
          });
          rows.push(...result.transactions);
        }
      else if (
        (process.env.AI_PROVIDER ?? "google").toLowerCase() === "google"
      ) {
        // aiObject's text-only contract cannot carry a file part; use the same shared model.
        const { object } = await generateObject({
          model: model(),
          schema,
          system,
          messages: [
            {
              role: "user",
              content: [
                { type: "file", data: buffer, mediaType: "application/pdf" },
                {
                  type: "text",
                  text: "Extract all posted transactions from this statement.",
                },
              ],
            },
          ],
        });
        rows.push(...object.transactions);
      } else
        warnings.push(
          "Scanned PDFs require the Google provider; upload a CSV instead.",
        );
    } catch {
      warnings.push("AI PDF extraction failed; used text fallback.");
    }
  } else warnings.push("Connect an AI key for better PDF parsing");
  if (!rows.length && usable) {
    for (const page of pages)
      for (const line of page.split(/\n/)) {
        const match = line
          .trim()
          .match(
            /^(\d{2}[\/-]\d{2}[\/-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})(?:\s+(Dr|Cr|debit|credit))?(?:\s+([\d,]+\.\d{2}))?\s*$/i,
          );
        if (!match || /opening balance|closing balance|summary/i.test(match[2]))
          continue;
        rows.push({
          date: toIsoDate(match[1]),
          description: match[2],
          amount: parseAmount(match[3]),
          direction:
            /cr|credit/i.test(match[4] ?? "") ||
            /salary|NEFT CR/i.test(match[2])
              ? "credit"
              : "debit",
          ...(match[5] ? { balanceAfter: parseAmount(match[5]) } : {}),
        });
      }
  }
  const valid = rows
    .filter(
      (r) =>
        toIsoDate(r.date) &&
        r.amount > 0 &&
        Number.isFinite(r.amount) &&
        r.description.trim() &&
        !/^(opening balance|closing balance|total|statement summary)/i.test(
          r.description,
        ),
    )
    .map((r) => ({ ...r, date: toIsoDate(r.date) }));
  if (rows.length > valid.length)
    warnings.push(
      "Dropped " + (rows.length - valid.length) + " invalid PDF rows.",
    );
  return withWarnings(valid, warnings);
}
