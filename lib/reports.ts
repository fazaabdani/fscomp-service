// Pure report maths (no React/DOM) so it can be unit-tested and reused by the
// on-screen reports and the Excel exports. The rules reproduce the old app's
// monthly reports exactly (checked against its Jul-Oct 2026 exports):
//  - "Masuk"       by the day the unit was received,
//  - "Ditangani"   by the day the job was finished (handled),
//  - "Keluar"      by the day the unit was collected,
//  - pemasukan / modal / profit by the collection day, counting only what was
//    actually paid (an unpaid tempo job contributes nothing until it is paid).
import { finalPrice } from "./ticket-money";

export type ReportTicket = {
  status: string;
  receivedAt: string;
  pickedUpAt?: string | null;
  handledAt?: string | null;
  statusChangedAt?: string | null;
  downPayment: number;
  estimate: number;
  finalCost?: number | null;
  costConfirmed?: boolean;
  partCost?: number | null;
  technician?: string | null;
};

export const isPickedUp = (t: ReportTicket) => t.status === "Sudah Diambil";

/** Day the job was finished, or null while it is still in progress. */
export function handledDate(t: ReportTicket): string | null {
  if (t.status === "Sudah Diambil") return t.handledAt || t.pickedUpAt || t.receivedAt;
  if (t.status === "Bisa Diambil") return t.handledAt || t.statusChangedAt || t.receivedAt;
  return null;
}

/** Money the shop has actually earned from this ticket so far. */
export function recognized(t: ReportTicket): { revenue: number; cost: number } {
  const total = finalPrice(t);
  const paid = Math.min(Math.max(t.downPayment, 0), Math.max(total, 0));
  const ratio = total > 0 ? paid / total : 1;
  return { revenue: total > 0 ? paid : 0, cost: Math.round((t.partCost || 0) * ratio) };
}

export type DayRow = { date: string; in: number; done: number; out: number; revenue: number; cost: number; profit: number };

export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export function monthlyDaily(tickets: ReportTicket[], month: string): { rows: DayRow[]; total: DayRow } {
  const rows = new Map<string, DayRow>(
    daysOfMonth(month).map((d) => [d, { date: d, in: 0, done: 0, out: 0, revenue: 0, cost: 0, profit: 0 }]),
  );
  for (const t of tickets) {
    const inRow = rows.get(t.receivedAt);
    if (inRow) inRow.in++;
    const h = handledDate(t);
    const doneRow = h ? rows.get(h) : undefined;
    if (doneRow) doneRow.done++;
    if (isPickedUp(t)) {
      const r = rows.get(t.pickedUpAt || t.receivedAt);
      if (r) {
        const { revenue, cost } = recognized(t);
        r.out++;
        r.revenue += revenue;
        r.cost += cost;
      }
    }
  }
  const list = Array.from(rows.values());
  for (const r of list) r.profit = r.revenue - r.cost;
  const total = list.reduce(
    (a, r) => ({
      ...a,
      in: a.in + r.in,
      done: a.done + r.done,
      out: a.out + r.out,
      revenue: a.revenue + r.revenue,
      cost: a.cost + r.cost,
      profit: a.profit + r.profit,
    }),
    { date: month, in: 0, done: 0, out: 0, revenue: 0, cost: 0, profit: 0 },
  );
  return { rows: list, total };
}

export type TechReport = {
  names: string[];
  rows: { date: string; counts: Record<string, number> }[];
  profit: Record<string, number>;
  revenue: Record<string, number>;
  handled: Record<string, number>;
};

export function technicianMonthly(tickets: ReportTicket[], month: string): TechReport {
  const days = daysOfMonth(month);
  const set = new Set(days);
  const rows = new Map(days.map((d) => [d, {} as Record<string, number>]));
  const profit: Record<string, number> = {};
  const revenueBy: Record<string, number> = {};
  const handled: Record<string, number> = {};
  const names = new Set<string>();
  const who = (t: ReportTicket) => (t.technician || "").trim() || "(belum ditentukan)";
  for (const t of tickets) {
    const h = handledDate(t);
    if (h && set.has(h)) {
      const n = who(t);
      names.add(n);
      const row = rows.get(h)!;
      row[n] = (row[n] || 0) + 1;
      handled[n] = (handled[n] || 0) + 1;
    }
    const pickDay = t.pickedUpAt || t.receivedAt;
    if (isPickedUp(t) && set.has(pickDay)) {
      const n = who(t);
      names.add(n);
      const { revenue, cost } = recognized(t);
      profit[n] = (profit[n] || 0) + revenue - cost;
      revenueBy[n] = (revenueBy[n] || 0) + revenue;
    }
  }
  const sorted = Array.from(names).sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }));
  return { names: sorted, rows: days.map((d) => ({ date: d, counts: rows.get(d)! })), profit, revenue: revenueBy, handled };
}

export function monthsPresent(tickets: ReportTicket[], today: string): string[] {
  const ms = new Set<string>([today.slice(0, 7)]);
  for (const t of tickets) {
    ms.add(t.receivedAt.slice(0, 7));
    if (t.pickedUpAt) ms.add(t.pickedUpAt.slice(0, 7));
  }
  return Array.from(ms)
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
    .sort()
    .reverse();
}
