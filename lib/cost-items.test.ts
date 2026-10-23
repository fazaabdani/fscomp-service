import { describe, expect, it } from "vitest";
import { costItemsWaText, costLines, parseCostItems, serializeCostItems, sumCostItems } from "./cost-items";

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

describe("cost items", () => {
  it("round-trips and cleans input", () => {
    const json = serializeCostItems([
      { name: "  Keyboard ", amount: 300000.4 },
      { name: "", amount: 5 },
      { name: "Jasa pasang", amount: -50 },
    ]);
    expect(parseCostItems(json)).toEqual([
      { name: "Keyboard", amount: 300000 },
      { name: "Jasa pasang", amount: 0 },
    ]);
  });
  it("stores nothing for an empty list and tolerates bad json", () => {
    expect(serializeCostItems([])).toBeNull();
    expect(serializeCostItems("x")).toBeNull();
    expect(parseCostItems("{oops")).toEqual([]);
    expect(parseCostItems(null)).toEqual([]);
  });
  it("shows an adjustment row when the lines do not match the real total", () => {
    const items = [
      { name: "Keyboard", amount: 300000 },
      { name: "Jasa", amount: 150000 },
    ];
    expect(costLines(items, 450000)).toHaveLength(2);
    expect(costLines(items, 400000).at(-1)).toEqual({ name: "Potongan / penyesuaian", amount: -50000 });
    expect(costLines(items, 500000).at(-1)).toEqual({ name: "Penyesuaian", amount: 50000 });
  });
  it("folds long lists into one row", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ name: `Item ${i + 1}`, amount: 10000 }));
    const rows = costLines(items, 90000, 6);
    expect(rows).toHaveLength(6);
    expect(rows.at(-1)).toEqual({ name: "Lainnya (4 item)", amount: 40000 });
    expect(sumCostItems(rows)).toBe(90000);
  });
  it("builds the WhatsApp block", () => {
    const text = costItemsWaText([{ name: "Keyboard", amount: 300000 }, { name: "Jasa", amount: 150000 }], 400000, rp);
    expect(text).toBe("\n\nRincian biaya:\n- Keyboard: Rp 300.000\n- Jasa: Rp 150.000\n- Potongan / penyesuaian: -Rp 50.000");
    expect(costItemsWaText([], 0, rp)).toBe("");
  });
});
