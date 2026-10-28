import { describe, expect, it } from "vitest";
import { up, upAccessories } from "./upper";

describe("upper", () => {
  it("uppercases free text", () => {
    expect(up("laptop lenovo thinkpad t14")).toBe("LAPTOP LENOVO THINKPAD T14");
    expect(up(null)).toBe("");
  });
  it("keeps the Unit only marker canonical", () => {
    expect(upAccessories("unit only")).toBe("Unit only");
    expect(upAccessories("Unit Only")).toBe("Unit only");
    expect(upAccessories("charger, tas")).toBe("CHARGER, TAS");
  });
});
