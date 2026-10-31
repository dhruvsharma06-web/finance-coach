import type { Family, SplitsState } from "./types";

/** Demo data for Family and Splits (Aarav's household and friends). Pure, deterministic. */

export function seedFamily(): Family {
  return {
    name: "The Mehtas",
    members: [
      { id: "fm-aarav", name: "Aarav", relation: "You", role: "earner", monthlyIncome: 95000, city: "Bengaluru", shareDetails: true },
      { id: "fm-papa", name: "Rajesh", relation: "Papa", role: "earner", monthlyIncome: 70000, city: "Jaipur", shareDetails: true },
      { id: "fm-didi", name: "Ananya", relation: "Didi", role: "earner", monthlyIncome: 60000, city: "Pune", shareDetails: false },
      { id: "fm-maa", name: "Sunita", relation: "Maa", role: "dependent", monthlyIncome: 0, city: "Jaipur", shareDetails: true },
      { id: "fm-chhotu", name: "Kabir", relation: "Chhotu", role: "student", monthlyIncome: 0, city: "Pune", shareDetails: true },
      { id: "fm-dadi", name: "Kamla", relation: "Dadi", role: "retired", monthlyIncome: 0, city: "Jaipur", shareDetails: true },
    ],
    support: [
      { fromMemberId: "fm-aarav", toMemberId: "fm-chhotu", amount: 12000, day: 5, label: "Hostel + mess" },
      { fromMemberId: "fm-papa", toMemberId: "fm-chhotu", amount: 8000, day: 1, label: "College fees (monthly)" },
      { fromMemberId: "fm-papa", toMemberId: "fm-dadi", amount: 10000, day: 3, label: "Medicines + household" },
      { fromMemberId: "fm-aarav", toMemberId: "fm-maa", amount: 5000, day: 10, label: "Home expenses" },
    ],
    goals: [
      {
        id: "fg-wedding",
        name: "Didi's wedding",
        targetAmount: 800000,
        targetDate: "2027-02-28",
        saved: { "fm-aarav": 90000, "fm-papa": 260000, "fm-didi": 150000 },
        monthly: { "fm-aarav": 15000, "fm-papa": 25000, "fm-didi": 20000 },
      },
      {
        id: "fg-medical",
        name: "Parents' medical fund",
        targetAmount: 300000,
        targetDate: "2027-12-31",
        saved: { "fm-aarav": 40000, "fm-papa": 60000, "fm-didi": 20000 },
        monthly: { "fm-aarav": 3000, "fm-papa": 4000, "fm-didi": 2000 },
      },
    ],
  };
}

export function seedSplits(): SplitsState {
  const goa = ["sp-aarav", "sp-rohan", "sp-priya", "sp-kabir"];
  const eq = (ids: string[], amount: number) => {
    const each = Math.round((amount / ids.length) * 100) / 100;
    const shares: Record<string, number> = {};
    ids.forEach((id, i) => (shares[id] = i === ids.length - 1 ? Math.round((amount - each * (ids.length - 1)) * 100) / 100 : each));
    return shares;
  };
  const flat = ["sp-aarav", "sp-neel", "sp-isha"];
  return {
    me: "sp-aarav",
    groups: [
      {
        id: "sg-goa",
        name: "Goa trip",
        members: [
          { id: "sp-aarav", name: "Aarav" },
          { id: "sp-rohan", name: "Rohan" },
          { id: "sp-priya", name: "Priya" },
          { id: "sp-kabir", name: "Kabir" },
        ],
      },
      {
        id: "sg-flat",
        name: "Flat 4B",
        members: [
          { id: "sp-aarav", name: "Aarav" },
          { id: "sp-neel", name: "Neel" },
          { id: "sp-isha", name: "Isha" },
        ],
      },
    ],
    expenses: [
      { id: "se-1", groupId: "sg-goa", description: "Villa booking", amount: 24000, paidBy: "sp-aarav", date: "2026-10-03", mode: "equal", shares: eq(goa, 24000) },
      { id: "se-2", groupId: "sg-goa", description: "Scooter rentals", amount: 3200, paidBy: "sp-rohan", date: "2026-10-04", mode: "equal", shares: eq(goa, 3200) },
      { id: "se-3", groupId: "sg-goa", description: "Dinner at Thalassa", amount: 6400, paidBy: "sp-priya", date: "2026-10-04", mode: "equal", shares: eq(goa, 6400) },
      { id: "se-4", groupId: "sg-goa", description: "Beach shack lunch", amount: 2400, paidBy: "sp-kabir", date: "2026-10-05", mode: "equal", shares: eq(goa, 2400) },
      {
        id: "se-5",
        groupId: "sg-goa",
        description: "Parasailing",
        amount: 4500,
        paidBy: "sp-rohan",
        date: "2026-10-05",
        mode: "exact",
        shares: { "sp-aarav": 1500, "sp-rohan": 1500, "sp-priya": 1500, "sp-kabir": 0 },
      },
      { id: "se-6", groupId: "sg-goa", description: "Cab to airport", amount: 1800, paidBy: "sp-aarav", date: "2026-10-06", mode: "equal", shares: eq(goa, 1800) },
      { id: "se-7", groupId: "sg-flat", description: "October rent", amount: 54000, paidBy: "sp-neel", date: "2026-10-01", mode: "equal", shares: eq(flat, 54000) },
      { id: "se-8", groupId: "sg-flat", description: "Wi-Fi", amount: 1059, paidBy: "sp-aarav", date: "2026-10-10", mode: "equal", shares: eq(flat, 1059) },
      { id: "se-9", groupId: "sg-flat", description: "Groceries (Blinkit)", amount: 2850, paidBy: "sp-isha", date: "2026-10-18", mode: "equal", shares: eq(flat, 2850) },
    ],
    settlements: [],
  };
}
