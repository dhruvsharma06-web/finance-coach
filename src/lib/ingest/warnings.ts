import type { RawTxn } from "./index";
// Per-result metadata avoids shared mutable warning state across simultaneous imports.
const warnings = new WeakMap<RawTxn[], string[]>();
export function withWarnings(rows: RawTxn[], messages: string[]): RawTxn[] {
  warnings.set(rows, messages);
  return rows;
}
export function parserWarnings(rows: RawTxn[]): string[] {
  return warnings.get(rows) ?? [];
}
