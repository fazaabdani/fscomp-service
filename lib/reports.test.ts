import { describe, expect, it } from "vitest";
import { handledDate, monthlyDaily, recognized, technicianMonthly, type ReportTicket } from "./reports";

const base = { downPayment: 0, estimate: 0, costConfirmed: true } as const;
const t = (o: Partial<ReportTicket>): ReportTicket => ({ status: "Sudah Diambil", receivedAt: "2026-10-01", ...base, ...o });

describe("recognized money", () => {
  it("counts a fully paid ticket in full", () => {
    expect(recognized(t({ finalCost: 650000, downPayment: 650000, partCost: 390000 }))).toEqual({ revenue: 650000, cost: 390000 });
  });
  it("counts nothing for an unpaid tempo ticket", () => {
    expect(recognized(t({ finalCost: 400000, downPayment: 0, partCost: 400000 }))).toEqual({ revenue: 0, cost: 0 });
  });
  it("is proportional for a part-paid ticket", () => {
    expect(recognized(t({ finalCost: 370000, downPayment: 300000, partCost: 370000 }))).toEqual({ revenue: 300000, cost: 300000 });
  });
  it("keeps the cost of a free job (negative profit)", () => {
    expect(recognized(t({ finalCost: 0, downPayment: 0, partCost: 220000 }))).toEqual({ revenue: 0, cost: 220000 });
  });
});

describe("monthlyDaily", () => {
  const tickets = [
    t({ receivedAt: "2026-09-30", pickedUpAt: "2026-10-02", handledAt: "2026-10-01", finalCost: 100000, downPayment: 100000, partCost: 40000, technician: "Budi" }),
    t({ receivedAt: "2026-10-02", status: "Bisa Diambil", handledAt: "2026-10-03", technician: "Ani" }),
    t({ receivedAt: "2026-10-02", status: "Sedang Dikerjakan" }),
  ];
  const r = monthlyDaily(tickets, "2026-10");
  it("lists every day of the month", () => expect(r.rows).toHaveLength(31));
  it("buckets by the day each event happened", () => {
    const d = (x: string) => r.rows.find((y) => y.date === x)!;
    expect(d("2026-10-01").done).toBe(1);
    expect(d("2026-10-02")).toMatchObject({ in: 2, out: 1, revenue: 100000, cost: 40000, profit: 60000 });
    expect(d("2026-10-03").done).toBe(1);
  });
  it("totals the month", () => expect(r.total).toMatchObject({ in: 2, done: 2, out: 1, revenue: 100000, profit: 60000 }));
  it("handledDate is null while a job is still in progress", () => expect(handledDate(tickets[2])).toBeNull());
});

describe("technicianMonthly", () => {
  it("counts handled jobs per technician per day and sums profit by collection day", () => {
    const x = technicianMonthly(
      [
        t({ handledAt: "2026-10-05", pickedUpAt: "2026-10-06", finalCost: 200000, downPayment: 200000, partCost: 50000, technician: "Budi" }),
        t({ handledAt: "2026-10-05", pickedUpAt: "2026-10-05", finalCost: 100000, downPayment: 100000, technician: "Ani" }),
      ],
      "2026-10",
    );
    expect(x.names).toEqual(["Ani", "Budi"]);
    expect(x.rows.find((r) => r.date === "2026-10-05")!.counts).toEqual({ Budi: 1, Ani: 1 });
    expect(x.profit).toEqual({ Budi: 150000, Ani: 100000 });
    expect(x.revenue).toEqual({ Budi: 200000, Ani: 100000 });
    expect(x.handled).toEqual({ Budi: 1, Ani: 1 });
  });
});
