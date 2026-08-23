import { describe, expect, it } from "vitest";
import { renderWaTemplate, WA_TEMPLATE_DEFAULTS } from "./wa-templates";

describe("renderWaTemplate", () => {
  it("substitutes known placeholders", () => {
    expect(renderWaTemplate("Halo {nama}, servis {nomor_servis}", { nama: "Budi", nomor_servis: "SRV-1" })).toBe(
      "Halo Budi, servis SRV-1",
    );
  });
  it("leaves an unknown {token} as literal text instead of dropping it", () => {
    expect(renderWaTemplate("Halo {nama}, {tidak_dikenal}", { nama: "Budi" })).toBe("Halo Budi, {tidak_dikenal}");
  });
  it("default templates reproduce the original hardcoded wording exactly", () => {
    const vars = {
      nama: "Budi",
      toko: "FS COMP",
      perangkat: "Laptop Asus",
      nomor_servis: "SRV-260823-00001",
      tanggal_terima: "23 Agustus 2026",
      link_tracking: "https://servis.fscomp.id/track?id=SRV-260823-00001",
      tindakan: "ganti keyboard",
      estimasi: "Rp500.000",
    };
    const salutation = renderWaTemplate(WA_TEMPLATE_DEFAULTS.waSalutation, vars);
    const received = renderWaTemplate(WA_TEMPLATE_DEFAULTS.waReceived, vars);
    const message = `${salutation},\n\n${received}\n\n${WA_TEMPLATE_DEFAULTS.waClosing}`;
    expect(message).toBe(
      "Assalamu'alaikum warahmatullahi wabarakatuh, Kak Budi,\n\nTerima kasih sudah mempercayakan servis Laptop Asus kepada *FS COMP*. Semoga Allah membalas kepercayaan Kakak dengan kebaikan. Barang Kakak sudah kami terima dengan nomor servis *SRV-260823-00001* pada 23 Agustus 2026.\n\nPerkembangan servis dapat dicek kapan saja melalui link berikut:\nhttps://servis.fscomp.id/track?id=SRV-260823-00001\n\nJika link belum dapat dibuka, silakan simpan nomor WhatsApp kami terlebih dahulu. Insya Allah kami akan mengabari kembali saat ada perkembangan.\n\nJazakallahu khoiron 🤲😊",
    );
  });
});
