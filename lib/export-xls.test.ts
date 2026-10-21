import { describe, expect, it } from "vitest";
import { buildXls, fmtBarang, fmtRp, fmtTgl, fmtTglPanjang, fmtWa, xlsFileName } from "./export-xls";

describe("export formats match the old app", () => {
  it("formats money, dates and phones the same way", () => {
    expect(fmtRp(70000)).toBe("Rp 70.000");
    expect(fmtRp(-220000)).toBe("Rp -220.000");
    expect(fmtTgl("2026-10-19", "16:09")).toBe("Tgl. 19 Okt 2026 16:09 WIB");
    expect(fmtTglPanjang("2026-08-01")).toBe("Tgl. 01 Agustus 2026");
    expect(fmtWa("085865929743")).toBe("WA 6285865929743");
    expect(fmtWa("")).toBe("");
    expect(fmtBarang(0)).toBe("0");
    expect(fmtBarang(2)).toBe("2 Barang");
  });
  it("names the file like the old exports", () => {
    expect(xlsFileName("Proses Servis", "FS COMP", new Date(2026, 9, 21, 10, 27))).toBe(
      "Data Proses Servis FS COMP - Tgl. Export 21 Okt 2026 10.27 WIB.xls",
    );
  });
  it("puts the shop name where the old report names have it", () => {
    expect(xlsFileName("Laporan Servis {toko} Bulan Oktober 2026", "FS COMP", new Date(2026, 9, 21, 10, 26))).toBe(
      "Data Laporan Servis FS COMP Bulan Oktober 2026 - Tgl. Export 21 Okt 2026 10.26 WIB.xls",
    );
  });
  it("escapes cell text and keeps line breaks", () => {
    const html = buildXls(["A"], [["x < y & z\nnext"]]);
    expect(html).toContain("x &lt; y &amp; z<br>next");
  });
});
