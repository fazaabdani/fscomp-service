// QC (cek awal / diagnosa) checklists. Written for interns: every item is a
// concrete step with an obvious expected result, so little judgement is needed.
// A submission stores the labels it used, so editing a template later never
// rewrites a past check.
export type QcResult = "ok" | "bad" | "unsure" | "na";
export type QcTemplateItem = { id: string; group: string; label: string };
export type QcItem = QcTemplateItem & { result: QcResult | ""; note: string };

export const QC_RESULTS: { value: QcResult; label: string }[] = [
  { value: "ok", label: "Baik" },
  { value: "bad", label: "Bermasalah" },
  { value: "unsure", label: "Tidak yakin" },
  { value: "na", label: "Tidak bisa dites" },
];

const physical = (what: string): QcTemplateItem[] => [
  { id: "fis-body", group: "Kondisi fisik", label: `Bodi/casing ${what}: ada retak, penyok, atau lecet berat?` },
  { id: "fis-segel", group: "Kondisi fisik", label: "Baut hilang atau segel bekas dibuka orang lain?" },
  { id: "fis-lengkap", group: "Kondisi fisik", label: "Kelengkapan sesuai yang tertulis di nota?" },
];

const laptop: QcTemplateItem[] = [
  ...physical("laptop"),
  { id: "daya-charger", group: "Daya", label: "Colok charger: lampu indikator/pengisian menyala?" },
  { id: "daya-nyala", group: "Daya", label: "Tekan tombol power: laptop menyala (kipas/lampu hidup)?" },
  { id: "daya-baterai", group: "Daya", label: "Baterai terbaca dan bisa mengisi? (cabut charger, cek tetap hidup)" },
  { id: "tamp-layar", group: "Tampilan", label: "Layar tampil normal, tanpa garis, bintik, atau berkedip?" },
  { id: "tamp-terang", group: "Tampilan", label: "Atur kecerahan: berubah normal?" },
  { id: "tamp-boot", group: "Sistem", label: "Sampai masuk Windows/OS tanpa error atau restart sendiri?" },
  { id: "inp-keyboard", group: "Input", label: "Tes semua tombol keyboard (buka notepad): semuanya berfungsi?" },
  { id: "inp-touchpad", group: "Input", label: "Touchpad: kursor, klik kiri/kanan, dan scroll normal?" },
  { id: "kon-usb", group: "Port & koneksi", label: "Colok flashdisk di tiap port USB: semuanya terbaca?" },
  { id: "kon-wifi", group: "Port & koneksi", label: "WiFi bisa mencari dan tersambung jaringan?" },
  { id: "kon-bt", group: "Port & koneksi", label: "Bluetooth bisa dinyalakan dan mencari perangkat?" },
  { id: "av-speaker", group: "Suara & kamera", label: "Putar suara: speaker terdengar jelas, tidak pecah?" },
  { id: "av-mic", group: "Suara & kamera", label: "Mikrofon dan kamera berfungsi?" },
  { id: "panas-kipas", group: "Suhu", label: "Kipas berputar normal, tidak berisik, dan tidak sangat panas?" },
  { id: "disk-sehat", group: "Penyimpanan", label: "Cek kesehatan SSD/HDD (CrystalDiskInfo): statusnya Baik?" },
  { id: "disk-ram", group: "Penyimpanan", label: "RAM terbaca penuh dan tidak ada error?" },
];

const pc: QcTemplateItem[] = [
  ...physical("PC"),
  { id: "daya-nyala", group: "Daya", label: "Tekan power: PC menyala (kipas dan lampu hidup)?" },
  { id: "daya-psu", group: "Daya", label: "Kabel power dan PSU normal (tidak bau gosong, tidak mati sendiri)?" },
  { id: "post-bunyi", group: "Sistem", label: "Muncul logo/BIOS tanpa bunyi beep error?" },
  { id: "post-boot", group: "Sistem", label: "Sampai masuk Windows/OS tanpa error atau restart sendiri?" },
  { id: "hw-ram", group: "Perangkat keras", label: "RAM terbaca penuh dan tidak ada error?" },
  { id: "hw-disk", group: "Perangkat keras", label: "Cek kesehatan SSD/HDD (CrystalDiskInfo): statusnya Baik?" },
  { id: "hw-vga", group: "Perangkat keras", label: "Output layar (VGA/HDMI) normal, tanpa artefak atau garis?" },
  { id: "panas-kipas", group: "Suhu", label: "Semua kipas berputar, tidak berisik, suhu wajar?" },
  { id: "kon-usb", group: "Port & koneksi", label: "Port USB depan/belakang membaca flashdisk?" },
  { id: "kon-net", group: "Port & koneksi", label: "LAN/WiFi tersambung internet?" },
  { id: "av-suara", group: "Suara", label: "Audio keluar normal?" },
];

const monitor: QcTemplateItem[] = [
  ...physical("monitor"),
  { id: "daya-nyala", group: "Daya", label: "Colok kabel power: lampu indikator menyala?" },
  { id: "tamp-gambar", group: "Tampilan", label: "Tampil gambar normal dari komputer/laptop (tanpa kedip)?" },
  { id: "tamp-warna", group: "Tampilan", label: "Warna wajar, tidak ada garis, bayangan, atau bercak?" },
  { id: "tamp-pixel", group: "Tampilan", label: "Layar putih/hitam penuh: ada dead pixel atau bocor cahaya?" },
  { id: "tamp-backlight", group: "Tampilan", label: "Kecerahan merata dan bisa diatur?" },
  { id: "kon-port", group: "Port & kontrol", label: "Semua port (HDMI/VGA/DP) yang ada berfungsi?" },
  { id: "kon-tombol", group: "Port & kontrol", label: "Tombol menu/power berfungsi?" },
];

const printer: QcTemplateItem[] = [
  ...physical("printer"),
  { id: "daya-nyala", group: "Daya", label: "Colok kabel power dan nyalakan: lampu/layar hidup?" },
  { id: "daya-error", group: "Daya", label: "Ada lampu error berkedip atau kode error di layar?" },
  { id: "tinta-ada", group: "Tinta", label: "Tinta/cartridge terdeteksi dan masih ada isinya?" },
  { id: "cetak-test", group: "Cetak", label: "Cetak halaman uji (Test Print): hasilnya jelas?" },
  { id: "cetak-nozzle", group: "Cetak", label: "Nozzle check: semua warna keluar penuh, tanpa garis putus?" },
  { id: "kertas-tarik", group: "Kertas", label: "Menarik kertas normal, tidak macet atau miring?" },
  { id: "scan-fungsi", group: "Scan/Copy", label: "Scan/copy berfungsi? (lewati jika bukan multifungsi)" },
  { id: "kon-usb", group: "Koneksi", label: "Terbaca di komputer lewat USB/WiFi?" },
];

const umum: QcTemplateItem[] = [
  ...physical("perangkat"),
  { id: "daya-nyala", group: "Daya", label: "Dihubungkan ke listrik, perangkat menyala?" },
  { id: "fungsi-utama", group: "Fungsi", label: "Fungsi utama perangkat berjalan normal?" },
  { id: "keluhan-ulang", group: "Fungsi", label: "Keluhan pelanggan bisa diulang/dilihat langsung?" },
  { id: "panas-bunyi", group: "Fungsi", label: "Ada bau gosong, bunyi aneh, atau panas berlebih?" },
];

export const QC_TEMPLATES: Record<string, QcTemplateItem[]> = {
  Laptop: laptop,
  "Komputer / PC": pc,
  Monitor: monitor,
  Printer: printer,
  Umum: umum,
};

/** Which checklist fits a job: its Jenis barang, else a guess from the name
 * (jobs imported from the old app have no type), else the general one. */
export function qcTemplateFor(deviceType?: string | null, deviceName?: string | null): string {
  if (deviceType && QC_TEMPLATES[deviceType]) return deviceType;
  // A kind the shop added itself (e.g. Proyektor) has no checklist of its own;
  // guessing from the name would mislabel it (an Epson projector is not a printer).
  if (deviceType) return "Umum";
  const text = (deviceName || "").toLowerCase();
  if (/printer|epson|canon|brother/.test(text)) return "Printer";
  if (/monitor|lcd|led/.test(text) && !/laptop/.test(text)) return "Monitor";
  if (/laptop|notebook|thinkpad|macbook|ideapad|aspire|vivobook|zenbook|\basus\b|\bacer\b|\bhp \d/.test(text))
    return "Laptop";
  if (/\bpc\b|komputer|cpu|rakitan|desktop/.test(text)) return "Komputer / PC";
  return "Umum";
}

export const blankItems = (template: string): QcItem[] =>
  (QC_TEMPLATES[template] ?? QC_TEMPLATES.Umum).map((i) => ({ ...i, result: "", note: "" }));

// Short names used when findings are turned into text (the checklist labels are
// whole instructions, too long for a sentence).
const FINDING_NAMES: Record<string, string> = {
  "fis-body": "Bodi/casing",
  "fis-segel": "Baut/segel",
  "fis-lengkap": "Kelengkapan",
  "daya-charger": "Pengisian charger",
  "daya-nyala": "Menyalakan unit",
  "daya-baterai": "Baterai",
  "daya-psu": "PSU/kabel power",
  "daya-error": "Indikator error",
  "tamp-layar": "Layar",
  "tamp-terang": "Kecerahan",
  "tamp-boot": "Masuk sistem/OS",
  "tamp-gambar": "Gambar",
  "tamp-warna": "Warna layar",
  "tamp-pixel": "Dead pixel/bocor cahaya",
  "tamp-backlight": "Backlight",
  "inp-keyboard": "Keyboard",
  "inp-touchpad": "Touchpad",
  "kon-usb": "Port USB",
  "kon-wifi": "WiFi",
  "kon-bt": "Bluetooth",
  "kon-net": "LAN/WiFi",
  "kon-port": "Port video",
  "kon-tombol": "Tombol",
  "av-speaker": "Speaker",
  "av-mic": "Mikrofon/kamera",
  "av-suara": "Audio",
  "panas-kipas": "Kipas/suhu",
  "panas-bunyi": "Bau/bunyi/panas",
  "disk-sehat": "SSD/HDD",
  "disk-ram": "RAM",
  "post-bunyi": "POST/BIOS",
  "post-boot": "Masuk sistem/OS",
  "hw-ram": "RAM",
  "hw-disk": "SSD/HDD",
  "hw-vga": "Output layar",
  "tinta-ada": "Tinta/cartridge",
  "cetak-test": "Hasil cetak",
  "cetak-nozzle": "Nozzle",
  "kertas-tarik": "Penarik kertas",
  "scan-fungsi": "Scan/copy",
  "fungsi-utama": "Fungsi utama",
  "keluhan-ulang": "Keluhan pelanggan",
};

/** Findings as plain text, e.g. for the technician's action box or a WhatsApp. */
export function qcFindingsText(items: { id?: string; label: string; result: string; note: string }[]): string {
  return items
    .filter((i) => i.result === "bad" || i.result === "unsure")
    .map((i) => {
      const name = (i.id && FINDING_NAMES[i.id]) || i.label.replace(/[:?].*$/, "").trim();
      return `${name}${i.result === "unsure" ? " (belum pasti)" : ""}${i.note ? `: ${i.note}` : ""}`;
    })
    .join("; ");
}
