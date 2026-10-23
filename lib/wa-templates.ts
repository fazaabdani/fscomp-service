// Editable WhatsApp message templates. Defaults here must match
// prisma/schema.prisma's ShopSettings.waXxx @default values — those are
// what a fresh row gets; these are what the settings form falls back to
// displaying if a field somehow comes back empty.
export type WaTemplateKey =
  | "waSalutation"
  | "waClosing"
  | "waReceived"
  | "waCost"
  | "waCostOptions"
  | "waReady"
  | "waPickedUp";

export const WA_TEMPLATE_DEFAULTS: Record<WaTemplateKey, string> = {
  waSalutation: "Assalamu'alaikum warahmatullahi wabarakatuh, Kak {nama}",
  waClosing: "Jazakallahu khoiron 🤲😊",
  waReceived:
    "Terima kasih sudah mempercayakan servis {perangkat} kepada *{toko}*. Semoga Allah membalas kepercayaan Kakak dengan kebaikan. Barang Kakak sudah kami terima dengan nomor servis *{nomor_servis}* pada {tanggal_terima}.\n\nPerkembangan servis dapat dicek kapan saja melalui link berikut:\n{link_tracking}\n\nJika link belum dapat dibuka, silakan simpan nomor WhatsApp kami terlebih dahulu. Insya Allah kami akan mengabari kembali saat ada perkembangan.",
  waCost:
    "Kami sudah melakukan pengecekan {perangkat}. Untuk penanganan *{tindakan}*, estimasi biaya servisnya adalah *{estimasi}*.\n\nApakah servisnya boleh kami lanjutkan? Mohon balas *LANJUT* atau *TIDAK*. Jika ada yang ingin ditanyakan, silakan sampaikan ya, insya Allah kami bantu.",
  waCostOptions:
    "Alhamdulillah, hasil pengecekan {perangkat} sudah selesai. Kami menawarkan pilihan penanganan berikut:\n\n1. Perbaikan utama — *{estimasi}*\n2. Perbaikan tanpa penggantian komponen — silakan konfirmasi\n3. Tidak dilanjutkan\n\nMohon balas nomor pilihan yang diinginkan. Kami belum mengerjakan sebelum mendapat persetujuan dari Kakak.",
  waReady:
    "Alhamdulillah, servis {perangkat} Kakak dengan nomor *{nomor_servis}* sudah selesai dan siap diambil.\n\n{pembayaran}\n\nSilakan datang ke *{toko}* dengan membawa tanda terima atau menunjukkan nomor servis. Terima kasih atas kepercayaannya.",
  waPickedUp:
    "Terima kasih sudah mempercayakan servis {perangkat} kepada *{toko}*. Unit dengan nomor servis *{nomor_servis}* sudah diambil.{garansi}\n\nJika ada kendala, pertanyaan, atau hal yang kurang berkenan, mohon kabari kami lebih dulu lewat chat WhatsApp ini. Insya Allah segera kami bantu dan carikan solusinya. Masukan Kakak sangat berarti untuk perbaikan layanan kami.",
};

export const WA_TEMPLATE_LABELS: Record<WaTemplateKey, string> = {
  waSalutation: "Salam Pembuka",
  waClosing: "Penutup",
  waReceived: "Konfirmasi Servis Diterima",
  waCost: "Konfirmasi Biaya — Satu Nominal",
  waCostOptions: "Konfirmasi Biaya — Beberapa Pilihan",
  waReady: "Servis Selesai — Siap Diambil",
  waPickedUp: "Servis Diambil — Terima Kasih & Jalur Komplain",
};

export const WA_PLACEHOLDERS: Record<WaTemplateKey, { token: string; label: string }[]> = {
  waSalutation: [{ token: "{nama}", label: "Nama pelanggan" }],
  waClosing: [],
  waReceived: [
    { token: "{toko}", label: "Nama toko" },
    { token: "{perangkat}", label: "Perangkat" },
    { token: "{nomor_servis}", label: "Nomor servis" },
    { token: "{tanggal_terima}", label: "Tanggal terima" },
    { token: "{link_tracking}", label: "Link tracking" },
  ],
  waCost: [
    { token: "{perangkat}", label: "Perangkat" },
    { token: "{keluhan}", label: "Keluhan pelanggan" },
    { token: "{tindakan}", label: "Tindakan teknisi" },
    { token: "{temuan}", label: "Temuan QC (item bermasalah)" },
    { token: "{estimasi}", label: "Estimasi biaya" },
  ],
  waCostOptions: [
    { token: "{perangkat}", label: "Perangkat" },
    { token: "{temuan}", label: "Temuan QC (item bermasalah)" },
    { token: "{estimasi}", label: "Estimasi biaya" },
  ],
  waReady: [
    { token: "{toko}", label: "Nama toko" },
    { token: "{perangkat}", label: "Perangkat" },
    { token: "{nomor_servis}", label: "Nomor servis" },
    { token: "{pembayaran}", label: "Info biaya / sisa / lunas" },
    { token: "{sisa}", label: "Sisa pembayaran" },
    { token: "{link_tracking}", label: "Link tracking" },
  ],
  waPickedUp: [
    { token: "{toko}", label: "Nama toko" },
    { token: "{perangkat}", label: "Perangkat" },
    { token: "{nomor_servis}", label: "Nomor servis" },
    { token: "{garansi}", label: "Info garansi (kosong jika tanpa garansi)" },
    { token: "{link_tracking}", label: "Link tracking" },
  ],
};

// Unknown {token}s (typos, or a token not relevant to this message) are
// left as literal text rather than silently dropped — visible in a WA
// preview immediately, easy to notice and fix, instead of quietly losing
// a chunk of the message.
export function renderWaTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match));
}
