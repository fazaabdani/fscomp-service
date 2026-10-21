import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("converts a leading 0 to 62", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });
  it("leaves an already-62 number unchanged", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });
  it("strips separators before normalizing", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
  });
  it("makes 08xx and 62xx forms of the same number compare equal", () => {
    expect(normalizePhone("081234567890")).toBe(normalizePhone("6281234567890"));
  });
});

describe("normalizePhone without a usable number", () => {
  it("returns an empty string for blank or placeholder values", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("-")).toBe("");
    expect(normalizePhone("0")).toBe("");
  });
});
