// Excel export in the shape the old app produced: an HTML table saved as .xls,
// with the same text formats ("Rp 70.000", "Tgl. 19 Okt 2026 16:09 WIB",
// "Telp. 0815…", "WA 62815…") and the same file naming.
import { normalizePhone } from "./phone";

const SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const parts = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m, day: String(day).padStart(2, "0") };
};

export const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
export const fmtTgl = (d?: string | null, time?: string | null) => {
  if (!d) return "";
  const { y, m, day } = parts(d);
  return `Tgl. ${day} ${SHORT[m - 1]} ${y}${time ? ` ${time} WIB` : ""}`;
};
export const fmtTglPanjang = (d: string) => {
  const { y, m, day } = parts(d);
  return `Tgl. ${day} ${LONG[m - 1]} ${y}`;
};
export const fmtTglSingkat = (d: string) => {
  const { y, m, day } = parts(d);
  return `Tgl. ${day} ${SHORT[m - 1]} ${y}`;
};
export const monthName = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${LONG[m - 1]} ${y}`;
};
export const fmtTelp = (phone: string) => `Telp. ${phone || ""}`.trimEnd();
export const fmtWa = (phone: string) => {
  const n = normalizePhone(phone || "");
  return n ? `WA ${n}` : "";
};
export const fmtBarang = (n: number) => (n ? `${n} Barang` : "0");
export const fmtKali = (n: number) => (n ? `${n} Kali` : "0");

/** "Data Proses Servis FS COMP - Tgl. Export 21 Okt 2026 10.27 WIB.xls" */
export function xlsFileName(title: string, shopName: string, now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${p(now.getDate())} ${SHORT[now.getMonth()]} ${now.getFullYear()} ${p(now.getHours())}.${p(now.getMinutes())} WIB`;
  const shop = shopName || "FS COMP";
  const named = title.includes("{toko}") ? title.replace("{toko}", shop) : `${title} ${shop}`;
  return `Data ${named} - Tgl. Export ${stamp}.xls`;
}

const esc = (v: string | number) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

export function buildXls(headers: string[], rows: (string | number)[][], footers: (string | number)[][] = []) {
  const head = `<tr>${headers.map((h) => `<th style="background:#e9edf5">${esc(h)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n");
  const foot = footers.map((f) => `<tr>${f.map((c) => `<td><b>${esc(c)}</b></td>`).join("")}</tr>`).join("\n");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1">${head}\n${body}\n${foot}</table></body></html>`;
}
