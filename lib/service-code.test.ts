import { describe, expect, it } from "vitest";
import { extractServiceCode, oldStyleNumber } from "./service-code";

describe("extractServiceCode", () => {
  it("reads the current format, also inside a tracking URL", () => {
    expect(extractServiceCode("srv-260820-104141")).toBe("SRV-260820-104141");
    expect(extractServiceCode("https://servis.fscomp.id/track?id=SRV-261021-52562")).toBe("SRV-261021-52562");
  });
  it("reads the old app format with or without #", () => {
    expect(extractServiceCode("#260820104141")).toBe("SRV-260820-104141");
    expect(extractServiceCode("260820104141")).toBe("SRV-260820-104141");
  });
  it("does not mistake ordinary phone numbers for service numbers", () => {
    expect(extractServiceCode("081234567890")).toBeNull();
    expect(extractServiceCode("6281234567890")).toBeNull();
    expect(extractServiceCode("Budi")).toBeNull();
  });
});

describe("oldStyleNumber", () => {
  it("renders the old # form for 6+6 digit ids and leaves others alone", () => {
    expect(oldStyleNumber("SRV-260820-104141")).toBe("#260820104141");
    expect(oldStyleNumber("SRV-261021-52562")).toBe("SRV-261021-52562");
  });
});
