// Minimal reproducible text PDF, with one transaction per line and explicit Dr/Cr.
import { readFile, writeFile } from "node:fs/promises";
import { serverTest } from "./server-test";
serverTest("scripts/generate-sample-pdf.ts", async () => {
  const { parseCsv } = await import("../src/lib/ingest/csv");
  const txns = await parseCsv(
    await readFile("samples/hdfc-november.csv", "utf8"),
  );
  const lines = [
    "Kosh sample bank statement - November 2026",
    ...txns.map(
      (t) =>
        t.date.slice(8) +
        "/" +
        t.date.slice(5, 7) +
        "/" +
        t.date.slice(0, 4) +
        " " +
        t.description +
        " " +
        t.amount.toFixed(2) +
        " " +
        (t.direction === "debit" ? "Dr" : "Cr"),
    ),
  ];
  const escape = (s: string) => s.replace(/([\\()])/g, "\\$1");
  const stream =
    "BT /F1 8 Tf 30 800 Td 16 TL " +
    lines
      .map((s, i) => (i ? "T* " : "") + "(" + escape(s) + ") Tj")
      .join("\n") +
    " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " +
      Buffer.byteLength(stream) +
      " >>\nstream\n" +
      stream +
      "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += i + 1 + " 0 obj\n" + obj + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  await writeFile("samples/statement.pdf", pdf);
  console.log("Generated statement.pdf with " + txns.length + " rows");
});
