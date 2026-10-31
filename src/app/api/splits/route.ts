import { readDb } from "@/lib/db";
import { groupBalances } from "@/lib/splits";
import { seedSplits } from "@/lib/seed-round4";
import { handle, ok } from "@/lib/api";

/** GET /api/splits → { me, groups: SplitBalances[], expenses } */
export const GET = handle(async () => {
  const state = (await readDb()).splits ?? seedSplits();
  return ok({
    me: state.me,
    groups: state.groups.map((g) => groupBalances(state, g.id)),
    expenses: [...state.expenses].sort((a, b) => b.date.localeCompare(a.date)),
  });
});
