import { describe, expect, it } from "vitest";
import { partCostRequired } from "./part-cost-gate";

describe("partCostRequired", () => {
  it("asks when a job first becomes ready and the parts cost was never answered", () => {
    expect(partCostRequired("Sedang Dikerjakan", "Bisa Diambil", null)).toBe(true);
    expect(partCostRequired("Sedang Dikerjakan", "Bisa Diambil", undefined)).toBe(true);
  });
  it("accepts Rp0 and real amounts as an answer", () => {
    expect(partCostRequired("Sedang Dikerjakan", "Bisa Diambil", 0)).toBe(false);
    expect(partCostRequired("Sedang Dikerjakan", "Bisa Diambil", 125000)).toBe(false);
  });
  it("also asks when a job jumps straight to picked up", () => {
    expect(partCostRequired("Sedang Cek", "Sudah Diambil", null)).toBe(true);
  });
  it("does not ask again once the job is already ready or picked up", () => {
    expect(partCostRequired("Bisa Diambil", "Sudah Diambil", null)).toBe(false);
    expect(partCostRequired("Sudah Diambil", "Bisa Diambil", null)).toBe(false);
  });
  it("ignores other statuses", () => {
    expect(partCostRequired("Belum Cek", "Sedang Cek", null)).toBe(false);
    expect(partCostRequired("Sedang Dikerjakan", "Dibatalkan", null)).toBe(false);
    expect(partCostRequired("Sedang Dikerjakan", undefined, null)).toBe(false);
  });
});
