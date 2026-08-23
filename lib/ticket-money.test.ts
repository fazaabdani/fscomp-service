import { describe, expect, it } from "vitest";
import { finalPrice, isFullyPaid } from "./ticket-money";

describe("finalPrice", () => {
  it("uses estimate when cost isn't confirmed yet", () => {
    expect(finalPrice({ costConfirmed: false, finalCost: null, downPayment: 0, estimate: 350000 })).toBe(350000);
  });
  it("uses finalCost once confirmed, even if 0 — not a fallback to estimate", () => {
    expect(finalPrice({ costConfirmed: true, finalCost: 0, downPayment: 0, estimate: 350000 })).toBe(0);
  });
  it("uses finalCost once confirmed, non-zero", () => {
    expect(finalPrice({ costConfirmed: true, finalCost: 275000, downPayment: 0, estimate: 350000 })).toBe(275000);
  });
});

describe("isFullyPaid", () => {
  it("regression: a confirmed Rp0 job with DP already collected is NOT fully paid", () => {
    // The exact real-world case this caught: SRV-260702-016 had finalCost=0,
    // downPayment=100000, costConfirmed=true. The old Math.max(0, ...) clamp
    // treated the resulting -100000 balance as "nothing owed" and let a
    // paid-in-full nota print for a ticket that was actually overpaid.
    expect(
      isFullyPaid({ costConfirmed: true, finalCost: 0, downPayment: 100000, estimate: 350000 }),
    ).toBe(false);
  });
  it("is true for a genuinely free, settled job", () => {
    expect(isFullyPaid({ costConfirmed: true, finalCost: 0, downPayment: 0, estimate: 0 })).toBe(true);
  });
  it("is true when DP exactly matches the confirmed final cost", () => {
    expect(isFullyPaid({ costConfirmed: true, finalCost: 150000, downPayment: 150000, estimate: 200000 })).toBe(true);
  });
  it("is false when there's still a balance owing", () => {
    expect(isFullyPaid({ costConfirmed: true, finalCost: 150000, downPayment: 50000, estimate: 200000 })).toBe(false);
  });
  it("is false when cost isn't confirmed yet, even if DP matches the estimate", () => {
    expect(isFullyPaid({ costConfirmed: false, finalCost: null, downPayment: 200000, estimate: 200000 })).toBe(false);
  });
});
