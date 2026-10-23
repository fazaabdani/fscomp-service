import { describe, expect, it } from "vitest";
import { QC_TEMPLATES, blankItems, qcFindingsText, qcTemplateFor } from "./qc-templates";

describe("qcTemplateFor", () => {
  it("uses the Jenis barang when it has a checklist", () => {
    expect(qcTemplateFor("Monitor", "apapun")).toBe("Monitor");
    expect(qcTemplateFor("Komputer / PC", "")).toBe("Komputer / PC");
  });
  it("guesses from the name for jobs without a type (old app data)", () => {
    expect(qcTemplateFor(null, "Printer epson L3210")).toBe("Printer");
    expect(qcTemplateFor(null, "ASUS X441B")).toBe("Laptop");
    expect(qcTemplateFor(null, "PC Rakitan i5")).toBe("Komputer / PC");
    expect(qcTemplateFor(null, "LG 24MK monitor")).toBe("Monitor");
  });
  it("falls back to the general checklist for a user-added type", () => {
    expect(qcTemplateFor("Proyektor", "Epson EB-X06")).toBe("Umum");
  });
});

describe("checklists", () => {
  it("every template has unique item ids and starts blank", () => {
    for (const [name, items] of Object.entries(QC_TEMPLATES)) {
      expect(new Set(items.map((i) => i.id)).size, name).toBe(items.length);
      expect(blankItems(name).every((i) => i.result === "" && i.note === "")).toBe(true);
    }
  });
});

describe("qcFindingsText", () => {
  it("lists only problems, with notes, using short names", () => {
    const text = qcFindingsText([
      { id: "inp-keyboard", label: "Tes semua tombol keyboard: berfungsi?", result: "bad", note: "tombol A mati" },
      { id: "daya-baterai", label: "Baterai terbaca?", result: "unsure", note: "persen tidak turun" },
      { id: "kon-wifi", label: "WiFi bisa tersambung?", result: "ok", note: "" },
    ]);
    expect(text).toBe("Keyboard: tombol A mati; Baterai (belum pasti): persen tidak turun");
  });
  it("is empty when nothing is wrong", () => {
    expect(qcFindingsText([{ id: "kon-wifi", label: "WiFi?", result: "ok", note: "" }])).toBe("");
  });
});
