// Itemised price lines ("Keyboard Rp 300.000 + Jasa pasang Rp 150.000") shown on
// the receipt, nota and the cost message, so a customer can see what the total
// is made of. Descriptive only: the money fields (estimate / finalCost) stay the
// source of truth, so any difference is shown as an explicit adjustment line
// instead of letting the nota disagree with what was actually charged.
export type CostItem = { name: string; amount: number };

export const MAX_COST_ITEMS = 20;

export function parseCostItems(raw: unknown): CostItem[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({
        name: String(r?.name ?? "").trim().slice(0, 80),
        amount: Math.max(0, Math.round(Number(r?.amount) || 0)),
      }))
      .filter((r) => r.name)
      .slice(0, MAX_COST_ITEMS);
  } catch {
    return [];
  }
}

/** Normalised JSON for storage, or null when there is nothing to keep. */
export function serializeCostItems(input: unknown): string | null {
  let items = input;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(items)) return null;
  const clean = items
    .map((r) => ({
      name: String(r?.name ?? "").trim().slice(0, 80),
      amount: Math.min(1_000_000_000, Math.max(0, Math.round(Number(r?.amount) || 0))),
    }))
    .filter((r) => r.name)
    .slice(0, MAX_COST_ITEMS);
  return clean.length ? JSON.stringify(clean) : null;
}

export const sumCostItems = (items: CostItem[]) => items.reduce((n, i) => n + i.amount, 0);

/** Lines for a printed document: the items, plus an "adjustment" row when they
 * don't add up to the real total (discount, rounding, an item not listed). */
export function costLines(items: CostItem[], total: number, maxRows = 6): { name: string; amount: number }[] {
  if (!items.length) return [];
  let rows = items;
  if (rows.length > maxRows) {
    const rest = rows.slice(maxRows - 1);
    rows = [...rows.slice(0, maxRows - 1), { name: `Lainnya (${rest.length} item)`, amount: sumCostItems(rest) }];
  }
  const diff = total - sumCostItems(items);
  return diff === 0 ? rows : [...rows, { name: diff < 0 ? "Potongan / penyesuaian" : "Penyesuaian", amount: diff }];
}

/** Plain text for a WhatsApp message (empty string when there are no items). */
export function costItemsWaText(items: CostItem[], total: number, fmt: (n: number) => string): string {
  const lines = costLines(items, total, MAX_COST_ITEMS + 1);
  if (!lines.length) return "";
  return `\n\nRincian biaya:\n${lines.map((l) => `- ${l.name}: ${l.amount < 0 ? "-" : ""}${fmt(Math.abs(l.amount))}`).join("\n")}`;
}
