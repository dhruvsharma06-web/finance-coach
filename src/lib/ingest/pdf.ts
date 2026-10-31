import type { RawTxn } from "./index";

/**
 * LANE B (Codex). PDF bank statements.
 * Plan: extract text with `unpdf` (extractText, mergePages: false) → chunk ~2 pages →
 * aiObject() with a zod array schema → RawTxn[]. If text is empty (scanned PDF), send the
 * PDF bytes to Gemini as a file part. Validate every row (valid date, amount > 0), drop
 * opening/closing balance lines. Without an AI key, try a regex line parser.
 * Stub: returns [] so the UI flow works.
 */
export async function parsePdf(buffer: Buffer): Promise<RawTxn[]> {
  void buffer;
  return [];
}
