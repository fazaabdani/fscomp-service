"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { normalizePhone } from "@/lib/phone";
import { PasswordModal } from "./password-modal";
import { QcForm, type QcCheckData } from "./qc-desk";
import { qcFindingsText } from "@/lib/qc-templates";
import { canMessage, WA_GATE_LABEL } from "@/lib/wa-gate";
import { costItemsWaText, costLines, parseCostItems, sumCostItems, type CostItem } from "@/lib/cost-items";
import { extractServiceCode, oldStyleNumber } from "@/lib/service-code";
import { monthlyDaily, technicianMonthly, monthsPresent, handledDate } from "@/lib/reports";
import {
  buildXls,
  fmtBarang,
  fmtKali,
  fmtRp,
  fmtTelp,
  fmtTgl,
  fmtTglPanjang,
  fmtTglSingkat,
  fmtWa,
  monthName,
  xlsFileName,
} from "@/lib/export-xls";
import { finalPrice, isFullyPaid } from "@/lib/ticket-money";
import {
  WA_TEMPLATE_DEFAULTS,
  WA_TEMPLATE_LABELS,
  WA_PLACEHOLDERS,
  renderWaTemplate,
  type WaTemplateKey,
} from "@/lib/wa-templates";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PackageCheck,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  Wrench,
  X,
  Star,
  Printer,
  Copy,
  Check,
  CalendarDays,
  Store,
  UserCog,
  ClipboardList,
  RotateCcw,
  Shield,
  Banknote,
  User,
  Phone,
  MapPin,
  Globe,
  Instagram,
  Trash2,
  ClipboardCheck,
  HeartHandshake,
  Landmark,
  LogOut,
  KeyRound,
} from "lucide-react";

type Status =
  | "Belum Cek"
  | "Sedang Tes"
  | "Sedang Cek"
  | "Menunggu Konfirmasi"
  | "Sedang Dikerjakan"
  | "Menunggu Sparepart"
  | "Ditangani Mitra"
  | "Bisa Diambil"
  | "Sudah Diambil"
  | "Dibatalkan"
  | "Baru"
  | "Diagnosa"
  | "Dikerjakan"
  | "Siap Diambil"
  | "Selesai";
type Ticket = {
  id: string;
  customer: string;
  phone: string;
  device: string;
  deviceType?: string | null;
  // JSON text [{name, amount}] — itemised price lines for printed documents.
  costItems?: string | null;
  // Date the customer was asked how the unit is doing after pickup.
  followedUpAt?: string | null;
  brand: string;
  serial: string;
  issue: string;
  accessories: string;
  technician: string;
  status: Status;
  estimate: number;
  downPayment: number;
  finalCost?: number;
  receivedAt: string;
  updatedAt: string;
  // Date of the last real status transition, used for productivity reports —
  // kept separate from updatedAt so a trivial edit (a note, a typo fix) to an
  // old closed ticket doesn't move its "work done" date to today.
  statusChangedAt?: string;
  // Full timestamp of the last edit, used only to break ties in same-day
  // conflict merges (updatedAt is day-granularity, too coarse for that).
  _touchedAt?: string;
  rating?: number;
  customerConfirmed?: boolean;
  costConfirmed?: boolean;
  category?: "Toko" | "User";
  address?: string;
  condition?: "Sudah Jadi" | "Tidak Bisa" | "Dibatalkan";
  serviceAction?: string;
  paymentMethod?: string;
  paymentTermDays?: number;
  warrantyDays?: number;
  pickedUpAt?: string;
  receivedTime?: string;
  handledAt?: string;
  handledTime?: string;
  pickedUpTime?: string;
  notes?: string;
  partCost?: number;
  warrantyOf?: string | null;
  receivedBy?: string | null;
  pickupBy?: string;
  handedBy?: string;
  version?: number;
};
type ServiceItem = {
  id: string;
  name: string;
  partCost: number;
  shopPrice: number;
  userPrice: number;
  warrantyDays: number;
  version?: number;
};
type Staff = {
  id: string;
  name: string;
  username: string;
  role: "Admin" | "Teknisi/Pegawai";
  rating: number;
};
type UserAccount = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "TECHNICIAN" | "INTERN";
  active: boolean;
};
type Customer = {
  id: string;
  name: string;
  category: "Toko" | "User";
  phone: string;
  address: string;
  rating: number;
  createdAt: string;
  _touchedAt?: string;
  version?: number;
};
type ShopSettings = {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  description: string;
  terms: string;
  bank: string;
  instagram: string;
  tiktok: string;
  qcEnabled?: boolean;
  reviewUrl?: string;
  // One kind of item per line; changed only via /api/shop/device-types.
  deviceTypes: string;
  lockEnabled: boolean;
} & Record<WaTemplateKey, string>;
const defaultSettings: ShopSettings = {
  name: "FS COMP",
  phone: "0816660056",
  whatsapp: "0816660056",
  address: "Jalan Raya Wiradesa No. 1, Pekalongan",
  description: "Service, upgrade, jual beli laptop dan komputer",
  terms:
    "Barang yang tidak diambil lebih dari 30 hari setelah konfirmasi bukan tanggung jawab toko.",
  bank: "BCA 251-029-8724 a/n Faza Abdani Auni Robbi",
  instagram: "fscomp_id",
  tiktok: "fscomp_id",
  qcEnabled: true,
  reviewUrl: "",
  deviceTypes: "Laptop\nKomputer / PC\nMonitor\nPrinter\nLainnya",
  lockEnabled: false,
  ...WA_TEMPLATE_DEFAULTS,
};

const processStatuses: Status[] = [
  "Belum Cek",
  "Sedang Tes",
  "Sedang Cek",
  "Menunggu Konfirmasi",
  "Sedang Dikerjakan",
  "Menunggu Sparepart",
  "Ditangani Mitra",
];
const statuses: Status[] = [
  ...processStatuses,
  "Bisa Diambil",
  "Sudah Diambil",
];
// Terminal side-exit for jobs that will never be finished or collected. It is
// deliberately NOT in `statuses` (the linear progress timeline) nor in
// `processStatuses`, so it drops out of the active/ready/receivable views.
const CANCELLED: Status = "Dibatalkan";
const selectableStatuses: Status[] = [...statuses, CANCELLED];
const defaultServices: ServiceItem[] = [
  {
    id: "JS-01",
    name: "Bongkar dan Cleaning",
    partCost: 0,
    shopPrice: 100000,
    userPrice: 150000,
    warrantyDays: 7,
  },
  {
    id: "JS-02",
    name: "Ganti Keyboard + Pasang",
    partCost: 200000,
    shopPrice: 280000,
    userPrice: 330000,
    warrantyDays: 30,
  },
  {
    id: "JS-03",
    name: "Install Ulang Windows + Driver",
    partCost: 0,
    shopPrice: 100000,
    userPrice: 150000,
    warrantyDays: 7,
  },
  {
    id: "JS-04",
    name: "Ganti SSD + Instalasi",
    partCost: 350000,
    shopPrice: 475000,
    userPrice: 525000,
    warrantyDays: 30,
  },
];
const seed: Ticket[] = [
  {
    id: "SRV-260702-016",
    customer: "Bagus Setiawan",
    phone: "081234567890",
    device: "Samsung Notebook 300",
    brand: "Samsung",
    serial: "SN-A93K2",
    issue: "Keyboard beberapa tombol tidak berfungsi",
    accessories: "Laptop + charger",
    technician: "Rosyadi",
    status: "Sedang Dikerjakan",
    estimate: 350000,
    downPayment: 100000,
    category: "User",
    address: "Wiradesa",
    serviceAction: "Ganti keyboard dan cleaning",
    warrantyDays: 30,
    receivedAt: "2026-07-02",
    updatedAt: "2026-07-02",
  },
  {
    id: "SRV-260702-015",
    customer: "Laziznu",
    phone: "085712345678",
    device: "HP 202 G2",
    brand: "HP",
    serial: "HP-202-88",
    issue: "Install aplikasi office dan optimasi",
    accessories: "PC only",
    technician: "Ludfy",
    status: "Bisa Diambil",
    estimate: 150000,
    downPayment: 0,
    condition: "Sudah Jadi",
    serviceAction: "Install Office dan optimasi",
    warrantyDays: 7,
    category: "User",
    address: "Pekalongan",
    receivedAt: "2026-07-02",
    updatedAt: "2026-07-02",
  },
  {
    id: "SRV-260701-014",
    customer: "Muria Computer",
    phone: "082112223333",
    device: "Lenovo ThinkPad T14",
    brand: "Lenovo",
    serial: "PF-29T14",
    issue: "Lisensi Office dan Windows",
    accessories: "Laptop + charger + tas",
    technician: "Admin",
    status: "Sudah Diambil",
    estimate: 275000,
    downPayment: 100000,
    finalCost: 275000,
    condition: "Sudah Jadi",
    serviceAction: "Aktivasi lisensi",
    paymentMethod: "Tunai",
    warrantyDays: 7,
    pickedUpAt: "2026-07-02",
    category: "Toko",
    address: "Wiradesa",
    receivedAt: "2026-07-01",
    updatedAt: "2026-07-02",
  },
  {
    id: "SRV-260630-013",
    customer: "Bela Fitri",
    phone: "089988776655",
    device: "ThinkPad X270",
    brand: "Lenovo",
    serial: "X270-991",
    issue: "Dudukan baterai longgar",
    accessories: "Laptop only",
    technician: "Rosyadi",
    status: "Menunggu Sparepart",
    estimate: 425000,
    downPayment: 200000,
    receivedAt: "2026-06-30",
    updatedAt: "2026-07-01",
  },
  {
    id: "SRV-260624-012",
    customer: "Fajrul",
    phone: "081777223344",
    device: "ASUS VivoBook Go 14",
    brand: "ASUS",
    serial: "AS-VG14",
    issue: "Tidak bisa menyala",
    accessories: "Laptop + charger",
    technician: "Ludfy",
    status: "Sedang Cek",
    estimate: 0,
    downPayment: 0,
    category: "User",
    address: "Bojong",
    receivedAt: "2026-06-24",
    updatedAt: "2026-07-02",
  },
];
const seedCustomers: Customer[] = Array.from(
  seed
    .reduce((m, t) => {
      if (!m.has(t.phone))
        m.set(t.phone, {
          id: `C-${t.phone}`,
          name: t.customer,
          category: t.category || "User",
          phone: t.phone,
          address: t.address || "-",
          rating: t.rating || 0,
          createdAt: t.receivedAt,
        });
      return m;
    }, new Map<string, Customer>())
    .values(),
);

const nav = [
  [Store, "Profil Toko"],
  [UserCog, "Akun"],
  [Users, "Pelanggan"],
  [ClipboardList, "Jasa Servis"],
  [MessageCircle, "Pesan WhatsApp"],
  [Plus, "Terima Servis"],
  [Wrench, "Proses Servis"],
  [PackageCheck, "Bisa Diambil"],
  [CheckCircle2, "Sudah Diambil"],
  [HeartHandshake, "Tindak Lanjut"],
  [Shield, "Status Garansi"],
  [Banknote, "Status Pembayaran"],
  [BarChart3, "Laporan Servis"],
  [Users, "Laporan Teknisi"],
] as const;

const NOTIF_META: Record<string, { icon: typeof Clock3; label: string; tone: string }> = {
  QC_REVIEW: { icon: ClipboardCheck, label: "QC Perlu Ditinjau", tone: "info" },
  FOLLOW_UP: { icon: HeartHandshake, label: "Tindak Lanjut", tone: "info" },
  WA_MISSING: { icon: MessageCircle, label: "Belum Dikabari", tone: "danger" },
  SERVICE_OLD: { icon: Clock3, label: "Servis Lama", tone: "warn" },
  READY_NOT_PICKED_UP: { icon: PackageCheck, label: "Belum Diambil", tone: "info" },
  WAITING_CONFIRMATION_STUCK: { icon: MessageCircle, label: "Menunggu Konfirmasi", tone: "info" },
  PAYMENT_DUE: { icon: Banknote, label: "Pembayaran Jatuh Tempo", tone: "danger" },
  WARRANTY_END: { icon: ShieldCheck, label: "Garansi Akan Habis", tone: "warn" },
};

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const tone = (s: Status) =>
  s === "Dibatalkan"
    ? "danger"
    : s === "Bisa Diambil" || s === "Sudah Diambil"
    ? "success"
    : s === "Menunggu Sparepart" || s === "Menunggu Konfirmasi"
      ? "warning"
      : s === "Sedang Dikerjakan"
        ? "primary"
        : "neutral";
const ageDays = (date: string) =>
  Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86400000,
    ),
  );
const ageTone = (days: number) =>
  days <= 3 ? "ageFresh" : days <= 7 ? "ageWatch" : "ageLate";
// Local calendar date (YYYY-MM-DD) instead of toISOString(), which returns
// the UTC date and drifts a day off in Asia/Jakarta between 00:00-06:59 WIB.
const localDateStr = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Payment methods and warranty periods exactly as the old app offered them,
// so history imported from it and new entries read the same.
const paymentMethods = [
  "Tunai - Cash",
  "Transfer QRIS",
  "Transfer BCA",
  "Transfer BRI",
  "Transfer Bank Mandiri",
  "Transfer DANA",
  "Transfer BSI",
];
const tempoMethods = [
  "Tempo 1 Hari",
  "Tempo 2 Hari",
  "Tempo 3 Hari",
  "Tempo 1 Minggu",
  "Tempo 2 Minggu",
  "Tempo 1 Bulan",
  "Tempo 3 Bulan",
];
const isTempoMethod = (m?: string | null) => /^Tempo\b/i.test(m || "");
/** Payment term in days encoded in a "Tempo 1 Minggu" style label (0 when not a tempo). */
const tempoDays = (m?: string | null) => {
  const x = (m || "").match(/^Tempo\s+(\d+)\s+(Hari|Minggu|Bulan)/i);
  if (!x) return 0;
  return Number(x[1]) * ({ hari: 1, minggu: 7, bulan: 30 } as Record<string, number>)[x[2].toLowerCase()];
};
const warrantyOptions: [number, string][] = [
  [0, "Tidak ada"],
  [1, "1 Hari"],
  [3, "3 Hari"],
  [7, "1 Minggu"],
  [14, "2 Minggu"],
  [21, "3 Minggu"],
  [30, "1 Bulan"],
  [60, "2 Bulan"],
  [90, "3 Bulan"],
  [150, "5 Bulan"],
  [180, "6 Bulan"],
  [365, "1 Tahun"],
  [1825, "5 Tahun"],
];
// Calendar months/years in the old app resulted in 28-31 / 181-184 day spans; map
// any stored day count back to the option it came from.
const warrantyCanon = (days: number) => {
  const ranges: [number, number, number][] = [
    [28, 31, 30],
    [59, 62, 60],
    [88, 92, 90],
    [148, 156, 150],
    [178, 186, 180],
    [364, 366, 365],
    [1824, 1827, 1825],
  ];
  const hit = ranges.find(([lo, hi]) => days >= lo && days <= hi);
  return hit ? hit[2] : days;
};
const warrantyLabel = (days?: number | null) => {
  const d = warrantyCanon(days || 0);
  return warrantyOptions.find(([v]) => v === d)?.[1] ?? `${d} Hari`;
};
const warrantyDaysLeft = (t: { warrantyDays?: number; pickedUpAt?: string; updatedAt: string }) =>
  (t.warrantyDays || 0) -
  Math.floor((Date.now() - new Date(`${t.pickedUpAt || t.updatedAt}T00:00:00`).getTime()) / 86400000);
/** ISO date a warranty ends (pickup date + warranty days). */
const warrantyEndDate = (t: { warrantyDays?: number; pickedUpAt?: string; updatedAt: string }) => {
  const d = new Date(`${t.pickedUpAt || t.updatedAt}T00:00:00`);
  d.setDate(d.getDate() + (t.warrantyDays || 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// Options for a person select: everyone on the staff list plus the value
// already stored (imported history names people who may have no account).
const nameOptions = (staffNames: string[], current?: string | null) =>
  Array.from(new Set([...staffNames, ...(current ? [current] : [])]));
// NOT wa.me: its redirect replaces every emoji in the prefilled text with "�".
// api.whatsapp.com/send hands the text over intact (checked 26 Okt 2026).
const waLink = (phone: string) => `https://api.whatsapp.com/send?phone=${normalizePhone(phone)}`;
function downloadXls(title: string, shopName: string, headers: string[], rows: (string | number)[][], footers?: (string | number)[][]) {
  const blob = new Blob(["\ufeff", buildXls(headers, rows, footers)], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = xlsFileName(title, shopName);
  a.click();
  URL.revokeObjectURL(a.href);
}
const itemName = (t: { device: string; brand?: string }) =>
  t.brand && !t.device.toLowerCase().includes(t.brand.toLowerCase()) ? `${t.device} ${t.brand}` : t.device;
const PAGE_SIZE = 50;
// The old database has ~1,300 finished jobs; rendering them all at once makes
// every screen sluggish, so long lists are paged.
function Pager({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="pager">
      <span>
        Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(total, page * PAGE_SIZE)} dari {total}
      </span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Sebelumnya
        </button>
        <b>
          Hal. {page} / {pages}
        </b>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}
function accessoryItems(value: string) {
  return value
    .split(/[,+;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !/^(-|tidak ada|unit only)$/i.test(x));
}
// Shared building blocks for the printed documents ("Tanda Terima Servis" and
// "Nota Lunas"). Both use the `.trx*` styles in globals.css so they read as one
// consistent document family; each card stays within ~130mm so it fits the top
// half of an A4 portrait sheet (or one A5-landscape page for the 2-copy nota).
const printDateLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

// The three WhatsApp messages every job needs, with what has been logged so far.
function ChatChecklist({
  ticket,
  kinds,
  urlFor,
}: {
  ticket: Ticket;
  kinds: string[];
  urlFor: (k: "received" | "ready" | "picked") => string;
}) {
  if (!canMessage(ticket.phone)) return null;
  const done = (k: string) => kinds.includes(k) || kinds.includes(`SKIP_${k}`);
  const rows: { k: "RECEIVED" | "READY" | "PICKED"; label: string; kind: "received" | "ready" | "picked"; applies: boolean }[] = [
    { k: "RECEIVED", label: "Servis diterima", kind: "received", applies: true },
    { k: "READY", label: "Siap diambil", kind: "ready", applies: ["Bisa Diambil", "Sudah Diambil"].includes(ticket.status) },
    { k: "PICKED", label: "Sudah diambil", kind: "picked", applies: ticket.status === "Sudah Diambil" },
  ];
  return (
    <div className="chatChecklist">
      <b>Kabar ke pelanggan</b>
      <div>
        {rows.map((r) => {
          const ok = done(r.k);
          return ok ? (
            <span key={r.k} className="ok">
              <Check size={13} /> {r.label}
            </span>
          ) : (
            <a
              key={r.k}
              className={r.applies ? "need" : "later"}
              target="_blank"
              rel="noreferrer"
              data-ticket={ticket.id}
              data-wa-kind={r.k}
              href={urlFor(r.kind)}
              title={r.applies ? "Belum dikirim — klik untuk mengirim" : "Belum waktunya; bisa dikirim lebih awal"}
            >
              <MessageCircle size={13} /> {r.label}
              {r.applies ? " · belum" : ""}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function FollowUpPanel({
  tickets,
  waUrl,
  onMark,
  onOpen,
}: {
  tickets: Ticket[];
  waUrl: (t: Ticket) => string;
  onMark: (t: Ticket) => void;
  onOpen: (t: Ticket) => void;
}) {
  const rows = tickets
    .filter((t) => t.status === "Sudah Diambil" && t.pickedUpAt && !t.followedUpAt && ageDays(t.pickedUpAt) <= 14)
    .sort((a, b) => (a.pickedUpAt || "").localeCompare(b.pickedUpAt || ""));
  const due = rows.filter((t) => ageDays(t.pickedUpAt as string) >= 2).length;
  return (
    <div className="modulePage">
      <section className="moduleHero warrantyHero">
        <div>
          <span className="miniTag">
            <HeartHandshake size={14} /> PURNA JUAL
          </span>
          <h2>Tindak Lanjut Pelanggan</h2>
          <p>
            Tanyakan kabar unit 2 hari setelah diambil, selagi masalah kecil masih mudah dibereskan. Kirim ke semua
            pelanggan dengan pesan yang sama.
          </p>
        </div>
        <strong>
          {due}
          <small>Perlu ditanya</small>
        </strong>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Daftar Tindak Lanjut</h3>
            <p>Diambil dalam 14 hari terakhir dan belum ditanya · {rows.length} data</p>
          </div>
        </div>
        <div className="simpleDataHead followCols">
          <span>No. Servis</span>
          <span>Pelanggan</span>
          <span>Barang</span>
          <span>Diambil</span>
          <span>Teknisi</span>
          <span>Aksi</span>
        </div>
        {rows.length === 0 && <p className="qcxEmpty">Semua pelanggan terbaru sudah ditanya kabarnya.</p>}
        {rows.map((t) => {
          const d = ageDays(t.pickedUpAt as string);
          return (
            <div className="simpleDataRow followCols" key={t.id}>
              <span>
                <button onClick={() => onOpen(t)}>{t.id}</button>
              </span>
              <span>{t.customer}</span>
              <span>{t.device}</span>
              <span>
                {t.pickedUpAt}
                <i className={`statusBadge ${d >= 2 ? "warning" : "neutral"}`}>{d >= 2 ? `H+${d}` : "Belum waktunya"}</i>
              </span>
              <span>{t.technician || "-"}</span>
              <span className="followActions">
                <a className="ghost" target="_blank" rel="noreferrer" data-ticket={t.id} data-wa-kind="FOLLOWUP" href={waUrl(t)} onClick={() => onMark(t)}>
                  <MessageCircle size={15} /> Tanya kabar
                </a>
                <button className="ghost" onClick={() => onMark(t)}>
                  Sudah / lewati
                </button>
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function CostItemsPanel({
  ticket,
  services,
  onSave,
  onApply,
}: {
  ticket: Ticket;
  services: ServiceItem[];
  onSave: (items: CostItem[]) => void;
  onApply: (field: "estimate" | "finalCost", total: number) => void;
}) {
  const [items, setItems] = useState<CostItem[]>(() => parseCostItems(ticket.costItems));
  const [open, setOpen] = useState(() => parseCostItems(ticket.costItems).length > 0);
  const saved = JSON.stringify(parseCostItems(ticket.costItems));
  // Pick up changes saved elsewhere (another tab); applying a total to the
  // estimate must not wipe rows that are still being typed.
  useEffect(() => {
    setItems(parseCostItems(ticket.costItems));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  const dirty = JSON.stringify(items.filter((i) => i.name.trim())) !== saved;
  const total = sumCostItems(items.filter((i) => i.name.trim()));
  const price = ticket.finalCost || ticket.estimate || 0;
  const priceOf = (sv: ServiceItem) => (ticket.category === "Toko" ? sv.shopPrice : sv.userPrice);
  const setRow = (i: number, patch: Partial<CostItem>) => setItems((old) => old.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  if (!open)
    return (
      <div className="costItemsPanel closed">
        <div>
          <b>Rincian biaya</b>
          <span>Pecah biaya jadi beberapa item agar pelanggan paham apa yang dibayar (tampil di nota dan pesan WA).</span>
        </div>
        <button type="button" className="ghost" onClick={() => setOpen(true)}>
          + Isi rincian
        </button>
      </div>
    );
  return (
    <div className="costItemsPanel">
      <div className="costItemsHead">
        <b>Rincian biaya</b>
        <span>Tampil di tanda terima, nota lunas, dan pesan WA biaya.</span>
      </div>
      {items.map((r, i) => (
        <div className="costItemRow" key={i}>
          <input
            value={r.name}
            maxLength={80}
            data-upper
            placeholder="Nama item, mis. Keyboard Acer Aspire 5"
            onChange={(e) => setRow(i, { name: e.target.value })}
          />
          <input
            type="number"
            min="0"
            value={r.amount || ""}
            placeholder="0"
            onChange={(e) => setRow(i, { amount: Number(e.target.value) || 0 })}
          />
          <button type="button" aria-label="Hapus baris" onClick={() => setItems((old) => old.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <div className="costItemsTools">
        <button type="button" className="ghost" onClick={() => setItems((old) => [...old, { name: "", amount: 0 }])}>
          + Tambah baris
        </button>
        {services.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const sv = services.find((x) => x.id === e.target.value);
              if (sv) setItems((old) => [...old, { name: sv.name, amount: priceOf(sv) }]);
            }}
          >
            <option value="">+ Dari Jasa Servis…</option>
            {services.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.name} — {money(priceOf(sv))}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="costItemsTotal">
        <span>
          Total rincian <b>{money(total)}</b>
          {price > 0 && total !== price && <em> · biaya sekarang {money(price)} (selisih tampil sebagai &quot;penyesuaian&quot; di nota)</em>}
        </span>
        <div>
          <button type="button" className="ghost" disabled={total <= 0} onClick={() => onApply("estimate", total)}>
            Pakai sebagai Estimasi
          </button>
          <button type="button" className="ghost" disabled={total <= 0} onClick={() => onApply("finalCost", total)}>
            Pakai sebagai Biaya final
          </button>
          <button type="button" className="newButton" disabled={!dirty} onClick={() => onSave(items.filter((i) => i.name.trim()))}>
            Simpan rincian
          </button>
        </div>
      </div>
    </div>
  );
}

function QcPanel({
  check,
  closed,
  canReview,
  onFill,
  onReview,
  onUseFindings,
}: {
  check: QcCheckData | null;
  // A picked-up or cancelled job keeps its QC for reference but can't be redone.
  closed: boolean;
  canReview: boolean;
  onFill: () => void;
  onReview: (c: QcCheckData) => void;
  onUseFindings: (c: QcCheckData) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!check)
    return (
      <div className="qcPanel empty">
        <div>
          <b>Cek awal / QC</b>
          <span>Belum ada hasil pengecekan untuk servis ini.</span>
        </div>
        <button type="button" className="ghost" onClick={onFill}>
          <ClipboardCheck size={16} /> Mulai QC
        </button>
      </div>
    );
  const problems = check.items.filter((i) => i.result === "bad" || i.result === "unsure");
  return (
    <div className={`qcPanel ${check.reviewedAt ? "reviewed" : "pending"}`}>
      <div className="qcPanelHead">
        <div>
          <b>Hasil QC · {check.template}</b>
          <span>
            Dicek {check.checkedBy} · {new Date(check.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            {check.reviewedAt ? ` · ditinjau ${check.reviewedBy}` : ""}
          </span>
        </div>
        <div className="qcCounts">
          <i className="bad">{check.badCount} bermasalah</i>
          {check.unsureCount > 0 && <i className="unsure">{check.unsureCount} tidak yakin</i>}
          <i className="ok">{check.items.filter((i) => i.result === "ok").length} baik</i>
        </div>
      </div>
      {problems.length > 0 ? (
        <ul className="qcProblems">
          {problems.map((i) => (
            <li key={i.id} className={i.result}>
              <b>{i.label.replace(/[:?].*$/, "")}</b>
              <span>{i.note}</span>
              <em>{i.result === "bad" ? "Bermasalah" : "Tidak yakin"}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="qcAllOk">Tidak ada item bermasalah.</p>
      )}
      {check.summary && <p className="qcSummary">Catatan: {check.summary}</p>}
      {showAll && (
        <ul className="qcAll">
          {check.items.map((i) => (
            <li key={i.id} className={i.result}>
              <span>{i.label}</span>
              <em>{i.result === "ok" ? "Baik" : i.result === "bad" ? "Bermasalah" : i.result === "unsure" ? "Tidak yakin" : "Tidak dites"}</em>
            </li>
          ))}
        </ul>
      )}
      <div className="qcActions">
        <button type="button" className="ghost" onClick={() => setShowAll((x) => !x)}>
          {showAll ? "Sembunyikan daftar lengkap" : "Lihat daftar lengkap"}
        </button>
        {!closed && (
          <button type="button" className="ghost" onClick={() => onUseFindings(check)}>
            Salin temuan ke Tindakan
          </button>
        )}
        {!closed && (
          <button type="button" className="ghost" onClick={onFill}>
            Isi ulang QC
          </button>
        )}
        {canReview && !closed && !check.reviewedAt && (
          <button type="button" className="newButton" onClick={() => onReview(check)}>
            <CheckCircle2 size={16} /> Tandai sudah ditinjau
          </button>
        )}
      </div>
    </div>
  );
}

const deviceTypeList = (shop: { deviceTypes?: string }) =>
  (shop.deviceTypes ?? defaultSettings.deviceTypes)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
// Kind-of-item picker with an inline "add a new kind" box, shared by the intake
// form and the edit form. New kinds are saved to the shop list straight away
// (any signed-in user may add one) and selected.
function DeviceTypeField({
  types,
  defaultValue,
  onAdd,
  optional = false,
}: {
  types: string[];
  defaultValue?: string | null;
  onAdd: (name: string) => Promise<string | null>;
  // Editing an old job (imported from the old app, no kind recorded) must not
  // be blocked just because the kind was never filled in.
  optional?: boolean;
}) {
  const [value, setValue] = useState(defaultValue || "");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // A job saved with a kind that was later removed from the list still shows it.
  const options = value && !types.includes(value) ? [...types, value] : types;
  async function add() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const saved = await onAdd(draft);
    setBusy(false);
    if (saved) {
      setValue(saved);
      setDraft("");
      setAdding(false);
    }
  }
  return (
    <label>
      Jenis barang
      <span className="deviceTypeRow">
        <select name="deviceType" required={!optional} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="" disabled={!optional}>
            {optional ? "— belum diisi —" : "Pilih jenis barang"}
          </option>
          {options.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button type="button" className="deviceTypeAdd" onClick={() => setAdding((x) => !x)}>
          {adding ? "Batal" : "+ Tambah"}
        </button>
      </span>
      {adding && (
        <span className="deviceTypeRow">
          <input
            value={draft}
            maxLength={40}
            autoFocus
            placeholder="Jenis baru, mis. Proyektor"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="deviceTypeAdd" disabled={busy || !draft.trim()} onClick={add}>
            Simpan
          </button>
        </span>
      )}
    </label>
  );
}

// Common things a customer leaves with the unit, as one-tap chips. Anything else
// can be typed and becomes its own chip; each item gets its own QR label.
const ACCESSORY_CHOICES = ["TAS", "CHARGER", "ADAPTOR", "MOUSE", "KABEL POWER", "KABEL DATA", "KARDUS", "BATERAI", "FLASHDISK", "HARDISK EKSTERNAL"];

function AccessoryPicker({ defaultValue }: { defaultValue?: string | null }) {
  const [items, setItems] = useState<string[]>(() =>
    Array.from(new Set(accessoryItems(defaultValue || "").map((x) => x.toLocaleUpperCase("id-ID")))),
  );
  const [draft, setDraft] = useState("");
  const toggle = (name: string) => setItems((old) => (old.includes(name) ? old.filter((x) => x !== name) : [...old, name]));
  const addDraft = () => {
    const name = draft.trim().toLocaleUpperCase("id-ID");
    if (name && !items.includes(name)) setItems((old) => [...old, name]);
    setDraft("");
  };
  const custom = items.filter((x) => !ACCESSORY_CHOICES.includes(x));
  return (
    <div className="accessoryPicker">
      <input type="hidden" name="accessories" value={items.join(", ")} />
      <div className="accessoryChips">
        {ACCESSORY_CHOICES.map((c) => (
          <button key={c} type="button" className={items.includes(c) ? "on" : ""} aria-pressed={items.includes(c)} onClick={() => toggle(c)}>
            {c}
          </button>
        ))}
        {custom.map((c) => (
          <button key={c} type="button" className="on custom" title="Klik untuk menghapus" onClick={() => toggle(c)}>
            {c} ×
          </button>
        ))}
      </div>
      <div className="accessoryAdd">
        <input
          data-upper
          value={draft}
          maxLength={40}
          placeholder="Lainnya, ketik lalu Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
        />
        <button type="button" className="deviceTypeAdd" disabled={!draft.trim()} onClick={addDraft}>
          + Tambah
        </button>
      </div>
      {items.length === 0 && <small className="fieldHint">Belum ada yang dipilih = tanpa kelengkapan (unit saja).</small>}
    </div>
  );
}

const handle = (v: string) => v.trim().replace(/^@+/, "");

function TikTokIcon({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 2h-3.2v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.1 6.1 0 1 0 5.2 6.1V8.6a7.9 7.9 0 0 0 4.6 1.5V6.9a4.7 4.7 0 0 1-4.6-4.9z" />
    </svg>
  );
}

function DocHeader({
  ticket,
  shop,
  kicker,
  meta,
  chip,
}: {
  ticket: Ticket;
  shop: ShopSettings;
  kicker: string;
  meta: string;
  chip?: string;
}) {
  const shopName = shop.name || "FS Comp";
  const [brandFirst, ...brandRest] = shopName.split(/\s+/);
  return (
    <>
      <div className="trxTop">
        <div className="trxBrand">
          <span className="trxMark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </span>
          <div>
            <b>
              <i>{brandFirst}</i>
              {brandRest.length ? ` ${brandRest.join(" ")}` : ""}
            </b>
            <small>Solusi teknologi, untuk masa depan</small>
            {shop.address && (
              <span className="trxAddr">
                <MapPin size={8} /> {shop.address}
              </span>
            )}
          </div>
        </div>
        <div className="trxDoc">
          <span className="trxKicker">{kicker}</span>
          <b className="trxDocNo">{ticket.id}</b>
          <small>{meta}</small>
          {chip && <em className="trxChip">{chip}</em>}
        </div>
        <div className="trxQr">
          <QRCodeSVG
            value={`${location.origin}/track?id=${encodeURIComponent(ticket.id)}`}
            size={86}
            level="H"
          />
          <small>Scan untuk lacak status</small>
        </div>
      </div>
      <div className="trxRule" />
    </>
  );
}

function DocFooter({ shop }: { shop: ShopSettings }) {
  const shopName = shop.name || "FS Comp";
  return (
    <div className="trxFooter">
      <div className="trxFooterContact">
        {shop.phone && (
          <span>
            <Phone size={9} /> {shop.phone}
          </span>
        )}
        {/* Same number for call and chat: print it once. */}
        {shop.whatsapp && normalizePhone(shop.whatsapp) !== normalizePhone(shop.phone) && (
          <span>
            <MessageCircle size={9} /> {shop.whatsapp}
          </span>
        )}
        {handle(shop.instagram || "") && (
          <span>
            <Instagram size={9} /> @{handle(shop.instagram)}
          </span>
        )}
        {handle(shop.tiktok || "") && (
          <span>
            <TikTokIcon /> @{handle(shop.tiktok)}
          </span>
        )}
        <span>
          <Globe size={9} /> {shopName.toLowerCase().replace(/\s+/g, "") || "fscomp"}.id
        </span>
      </div>
      <div className="trxFooterBrand">
        <b>{shopName.toUpperCase()}</b>
        <small>Service &amp; Technology Center</small>
      </div>
    </div>
  );
}

function DocSign({
  left,
  right,
}: {
  left: { label: string; name: string };
  right: { label: string; name: string };
}) {
  return (
    <div className="trxSign">
      {[left, right].map((p) => (
        <div key={p.label}>
          <em>{p.label}</em>
          <i />
          <b>{p.name}</b>
        </div>
      ))}
    </div>
  );
}

function ServiceReceiptBody({
  ticket,
  shop,
  copyLabel,
}: {
  ticket: Ticket;
  shop: ShopSettings;
  copyLabel?: string;
}) {
  const shopName = shop.name || "FS Comp";
  const total = finalPrice(ticket);
  const hasPrice = total > 0;
  const remaining = Math.max(0, total - ticket.downPayment);
  const accessories = accessoryItems(ticket.accessories).join(", ") || "Unit only";
  const bankLines = (shop.bank || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const staffName = ticket.technician || ticket.handedBy || "Admin";
  return (
    <div className="trx">
      <DocHeader
        ticket={ticket}
        shop={shop}
        kicker="Tanda Terima Servis"
        meta={`Diterima ${printDateLabel(ticket.receivedAt)}${ticket.receivedTime ? ` · ${ticket.receivedTime} WIB` : ""}`}
        chip={copyLabel}
      />

      <div className="trxBody">
        <div className="trxCol">
          <section>
            <h4 className="trxSecHead">Data Pelanggan &amp; Perangkat</h4>
            <dl className="trxDl">
              <div>
                <dt>Pelanggan</dt>
                <dd>
                  <b>{ticket.customer}</b>
                  <span>{ticket.phone}</span>
                </dd>
              </div>
              <div>
                <dt>Perangkat</dt>
                <dd>
                  <b>{ticket.device}</b>
                  {(ticket.deviceType || ticket.brand) && (
                    <span>{[ticket.deviceType, ticket.brand].filter(Boolean).join(" · ")}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Serial Number</dt>
                <dd className="trxMono">{ticket.serial || "-"}</dd>
              </div>
              <div>
                <dt>Kelengkapan</dt>
                <dd className="trxClamp">{accessories}</dd>
              </div>
              <div>
                <dt>Teknisi</dt>
                <dd>{ticket.technician || "-"}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h4 className="trxSecHead">Keluhan / Kondisi Awal</h4>
            <div className="trxIssue">
              <p>{ticket.issue}</p>
              {ticket.warrantyOf && <small>Klaim garansi dari servis {ticket.warrantyOf}</small>}
              {ticket.notes && <small>Catatan: {ticket.notes}</small>}
            </div>
          </section>
        </div>

        <div className="trxCol">
          <section>
            <h4 className="trxSecHead">Rincian Biaya</h4>
            <div className="trxMoney">
              {costLines(parseCostItems(ticket.costItems), ticket.estimate, 5).map((l, i) => (
                <div className="trxItemRow" key={i}>
                  <span>{l.name}</span>
                  <b>{l.amount < 0 ? "-" : ""}{money(Math.abs(l.amount))}</b>
                </div>
              ))}
              <div>
                <span>Estimasi biaya</span>
                <b>{ticket.estimate ? money(ticket.estimate) : "Belum diestimasi"}</b>
              </div>
              <div>
                <span>DP / uang muka</span>
                <b>{money(ticket.downPayment)}</b>
              </div>
              <div className="trxMoneyDue">
                <span>Sisa pembayaran</span>
                <b>{hasPrice ? money(remaining) : "Menunggu estimasi"}</b>
              </div>
            </div>
            <p className="trxFine">
              Biaya akhir dikonfirmasi setelah pengecekan dan persetujuan pelanggan.
              {bankLines.length > 0 && " Cantumkan nomor servis pada berita transfer."}
            </p>
          </section>
          {bankLines.length > 0 && (
            <section>
              <h4 className="trxSecHead">Rekening Transaksi</h4>
              <ul className="trxBank">
                {bankLines.map((line) => (
                  <li key={line}>
                    <Landmark size={10} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className="trxTerms">
        <div className="trxTermsText">
          <h4 className="trxSecHead">Ketentuan Servis</h4>
          <p>
            {shop.terms ||
              "Simpan tanda terima ini. Pengambilan perangkat wajib menunjukkan nomor servis atau QR Code."}
          </p>
        </div>
        <DocSign
          left={{ label: "Pelanggan", name: ticket.customer }}
          right={{ label: `Petugas ${shopName}`, name: staffName }}
        />
      </div>

      <DocFooter shop={shop} />
    </div>
  );
}

function PaidNotaBody({
  ticket,
  shop,
  issuer,
}: {
  ticket: Ticket;
  shop: ShopSettings;
  issuer: string;
}) {
  const total = finalPrice(ticket);
  // A warranty claim handled free of charge has nothing to "receive".
  const freeClaim = !!ticket.warrantyOf && total === 0;
  const pickedAt = ticket.pickedUpAt || localDateStr();
  const warrantyUntil = ticket.warrantyDays
    ? printDateLabel(
        localDateStr(
          new Date(
            new Date(`${pickedAt}T00:00:00`).getTime() + ticket.warrantyDays * 86400000,
          ),
        ),
      )
    : "";
  return (
    <div className="trx">
      <DocHeader
        ticket={ticket}
        shop={shop}
        kicker="Nota Lunas Pembayaran"
        meta={`Dicetak ${printDateLabel(localDateStr())}`}
      />

      <div className="trxBody">
        <div className="trxCol">
          <section>
            <h4 className="trxSecHead">Data Pelanggan &amp; Perangkat</h4>
            <dl className="trxDl">
              <div>
                <dt>Pelanggan</dt>
                <dd>
                  <b>{ticket.customer}</b>
                  <span>{ticket.phone}</span>
                </dd>
              </div>
              <div>
                <dt>Perangkat</dt>
                <dd>
                  <b>{ticket.device}</b>
                  {(ticket.deviceType || ticket.brand) && (
                    <span>{[ticket.deviceType, ticket.brand].filter(Boolean).join(" · ")}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Serial Number</dt>
                <dd className="trxMono">{ticket.serial || "-"}</dd>
              </div>
              <div>
                <dt>Teknisi</dt>
                <dd>{ticket.technician || "-"}</dd>
              </div>
              <div>
                <dt>Tanggal Ambil</dt>
                <dd>
                  {printDateLabel(pickedAt)}
                  {ticket.pickedUpTime ? ` · ${ticket.pickedUpTime} WIB` : ""}
                </dd>
              </div>
              <div>
                <dt>Diambil oleh</dt>
                <dd>{ticket.pickupBy || ticket.customer}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h4 className="trxSecHead">Keluhan Awal</h4>
            <div className="trxIssue trxIssueSoft">
              <p>{ticket.issue}</p>
            </div>
          </section>
          <section>
            <h4 className="trxSecHead">Tindakan Servis</h4>
            <div className="trxIssue">
              <p>{ticket.serviceAction?.trim() || "—"}</p>
            </div>
          </section>
        </div>

        <div className="trxCol">
          <section>
            <h4 className="trxSecHead">Ringkasan Pembayaran</h4>
            <div className="trxMoney">
              {costLines(parseCostItems(ticket.costItems), total, 5).map((l, i) => (
                <div className="trxItemRow" key={i}>
                  <span>{l.name}</span>
                  <b>{l.amount < 0 ? "-" : ""}{money(Math.abs(l.amount))}</b>
                </div>
              ))}
              <div>
                <span>Biaya servis (final)</span>
                <b>{money(total)}</b>
              </div>
              <div>
                <span>Metode pembayaran</span>
                <b>{ticket.paymentMethod || "Tunai"}</b>
              </div>
              <div>
                <span>Total diterima</span>
                <b>{money(ticket.downPayment)}</b>
              </div>
              <div className="trxMoneyDue trxPaidBar">
                <span>Status pembayaran</span>
                <b>{freeClaim ? "TANPA BIAYA" : "LUNAS"}</b>
              </div>
            </div>
            <p className="trxFine">
              {freeClaim
                ? "Servis ini klaim garansi dari servis sebelumnya, tanpa biaya."
                : `Pembayaran sebesar ${money(total)} telah diterima secara penuh.`}
            </p>
          </section>
          <section>
            <h4 className="trxSecHead">Garansi Servis</h4>
            <ul className="trxBank">
              {ticket.warrantyDays ? (
                <>
                  <li>
                    <ShieldCheck size={10} />
                    <span>{warrantyLabel(ticket.warrantyDays)} sejak tanggal pengambilan</span>
                  </li>
                  <li>
                    <ShieldCheck size={10} />
                    <span>Berlaku sampai {warrantyUntil}</span>
                  </li>
                </>
              ) : (
                <li>
                  <ShieldCheck size={10} />
                  <span>Tidak ada garansi untuk servis ini</span>
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>

      <div className="trxTerms">
        <div className="trxTermsText">
          <h4 className="trxSecHead">Ketentuan Garansi</h4>
          <p>
            {ticket.warrantyDays
              ? "Garansi hanya untuk keluhan yang sama, tidak mencakup kerusakan baru akibat kelalaian pemakaian. Simpan nota ini sebagai bukti pembayaran dan klaim garansi."
              : "Servis ini tanpa garansi. Simpan nota ini sebagai bukti pembayaran."}
          </p>
          <div className="trxKendala">
            <p>
              <b>Ada kendala?</b> Kami siap membantu lewat WhatsApp{shop.whatsapp || shop.phone ? ` ${shop.whatsapp || shop.phone}` : ""}.
              {shop.reviewUrl ? " Puas atau kurang puas, ulasan jujur Anda di Google Maps (pindai QR) sangat berarti bagi kami." : ""}
            </p>
            {shop.reviewUrl && <QRCodeSVG value={shop.reviewUrl} size={48} level="M" />}
          </div>
        </div>
        <DocSign
          left={{ label: "Diserahkan oleh", name: issuer }}
          right={{ label: "Diterima oleh", name: ticket.pickupBy || ticket.customer }}
        />
      </div>

      <DocFooter shop={shop} />
    </div>
  );
}
export default function ServiceDesk() {
  const [tickets, setTickets] = useState<Ticket[]>(seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "Semua">("Semua");
  const [active, setActive] = useState("Proses Servis");
  const [modal, setModal] = useState<"new" | "detail" | "edit" | "chat" | "handoff" | "scan" | "delete" | null>(null);
  // Cost (modal) and profit are hidden by default: the screen is often turned
  // toward the customer while the receipt is made. Revealed on request, and
  // hidden again on any modal change or after a minute.
  const [showCost, setShowCost] = useState(false);
  // Which required WhatsApp messages were logged per job (RECEIVED / READY / PICKED ...).
  const [chatKinds, setChatKinds] = useState<Record<string, string[]>>({});
  // Message links opened this session ("ticket:KIND"), to enable "continue" in the gate.
  const [waGateOpened, setWaGateOpened] = useState<Record<string, boolean>>({});
  const [waGate, setWaGate] = useState<{ id: string; kind: "READY" | "PICKED"; status: Status } | null>(null);
  const [qcChecks, setQcChecks] = useState<QcCheckData[]>([]);
  const [qcTicket, setQcTicket] = useState<Ticket | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const [versionDismissed, setVersionDismissed] = useState(false);
  const [listPage, setListPage] = useState(1);
  // The original ticket when the intake form is opened as a warranty claim.
  const [warrantyClaim, setWarrantyClaim] = useState<Ticket | null>(null);
  const [notifications, setNotifications] = useState<
    { type: string; title: string; ticketId: string; customer: string; device: string }[]
  >([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [printMode, setPrintMode] = useState<
    "receipt" | "receipt2" | "qr" | "accessories" | "paid" | null
  >(null);
  const [handoffDone, setHandoffDone] = useState({ receipt: false, whatsapp: false, qr: false, accessories: false });
  const [shop, setShop] = useState<ShopSettings>(defaultSettings);
  const [services, setServices] = useState<ServiceItem[]>(defaultServices);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const staff = useMemo<Staff[]>(
    () =>
      users
        // Interns only do QC; they are never a technician or receiver.
        .filter((u) => u.active && u.role !== "INTERN")
        .map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role === "ADMIN" ? "Admin" : "Teknisi/Pegawai",
          rating: 5,
        })),
    [users],
  );
  const refreshUsers = () =>
    fetch("/api/users", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUsers(data.users));
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [technicianFilter, setTechnicianFilter] = useState("Semua Teknisi");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanStopRef = useRef<(() => void) | null>(null);
  const serviceFormRef = useRef<HTMLFormElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  // Guards for the background refresh below: pendingWrites > 0 means a save
  // is in flight; writeEpoch changes on every write start so a refresh that
  // began before one can tell its (now stale) response shouldn't be applied.
  const pendingWrites = useRef(0);
  const writeEpoch = useRef(0);
  // True when reloading would not interrupt anything (no open modal/form, no
  // save in flight). Kept in a ref so the version-check listeners can read it.
  const idleRef = useRef(true);
  // True once anything was typed into a field (other than the search boxes) on
  // the current screen: a quiet auto-reload would throw that input away.
  const typedRef = useRef(false);
  idleRef.current = modal === null && !pwOpen && !qcTicket && !waGate && pendingWrites.current === 0;
  const [serverReady, setServerReady] = useState(false);
  // Distinct from serverReady (which only reflects the initial load): this
  // tracks live reachability so a banner can warn the operator the moment a
  // save fails from a network error, not just on first page load.
  const [serverOnline, setServerOnline] = useState(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (modal === "new") {
      setCustomerQuery(warrantyClaim?.customer ?? "");
      setCustomerPickerOpen(false);
    } else {
      setWarrantyClaim(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  useEffect(() => {
    // Local cache only, for instant paint + a display fallback if the
    // network fetch below fails — tickets/customers/services/shop are no
    // longer autosaved back through this cache; the real tables are the
    // single source of truth.
    const saved = localStorage.getItem("fs-service-tickets-v1");
    if (saved)
      try {
        const legacy: Record<string, Status> = {
          Baru: "Belum Cek",
          Diagnosa: "Sedang Cek",
          Dikerjakan: "Sedang Dikerjakan",
          "Siap Diambil": "Bisa Diambil",
          Selesai: "Sudah Diambil",
        };
        setTickets(
          (JSON.parse(saved) as Ticket[]).map((t) => ({
            ...t,
            status: legacy[t.status] || t.status,
          })),
        );
      } catch {
        /* keep seed */
      }
    const savedShop = localStorage.getItem("fs-service-settings-v1");
    if (savedShop)
      try {
        setShop(JSON.parse(savedShop));
      } catch {
        /* keep default */
      }
    const savedServices = localStorage.getItem("fs-service-catalog-v1");
    if (savedServices)
      try {
        setServices(JSON.parse(savedServices));
      } catch {}
    const savedCustomers = localStorage.getItem("fs-service-customers-v1");
    if (savedCustomers)
      try {
        setCustomers(JSON.parse(savedCustomers));
      } catch {}
    refreshUsers();
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => {
        // The session cookie can outlive an account being deactivated (the
        // server re-checks on every request, but a page already open in the
        // browser only notices when its next fetch comes back 401) — force
        // it back to /login immediately instead of sitting on stale cached
        // data with a dead session.
        if (r.status === 401) { forceLogout(); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data) => data && setCurrentUser(data.user));
    Promise.all([
      fetch("/api/tickets", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
      fetch("/api/services", { cache: "no-store" }),
      fetch("/api/shop", { cache: "no-store" }),
    ])
      .then(async (responses) => {
        if (responses.some((r) => r.status === 401)) { forceLogout(); return; }
        const [ticketsRes, customersRes, servicesRes, shopRes] = await Promise.all(
          responses.map((r) => (r.ok ? r.json() : null)),
        );
        if (ticketsRes) setTickets(ticketsRes.tickets);
        if (customersRes) setCustomers(customersRes.customers);
        if (servicesRes) setServices(servicesRes.services);
        if (shopRes?.shop) setShop(shopRes.shop);
        setServerReady(true);
        setServerOnline(true);
      })
      .catch(() => {
        setServerReady(false);
        setServerOnline(false);
      });
  }, []);
  // An open tab keeps running the JS it loaded; after a deploy staff would
  // keep seeing the old screens (and missing new fields) until a manual
  // reload. Compare our build id with the server's and offer a reload.
  // Fields flagged data-upper are forced to capitals as they are typed (caret kept).
  // The value goes through the native setter and a second input event so React's
  // own state for controlled fields follows along.
  useEffect(() => {
    const force = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el || !el.matches?.("[data-upper]")) return;
      const upper = el.value.toLocaleUpperCase("id-ID");
      if (upper === el.value) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, upper);
      try {
        if (start !== null && end !== null) el.setSelectionRange(start, end);
      } catch {
        /* some input types have no selection */
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    document.addEventListener("input", force, true);
    return () => document.removeEventListener("input", force, true);
  }, []);
  useEffect(() => {
    const mark = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.matches?.("input,textarea,select") && !t.closest(".searchBox")) typedRef.current = true;
    };
    document.addEventListener("input", mark, true);
    return () => document.removeEventListener("input", mark, true);
  }, []);
  // A new screen or a closed form starts clean: whatever was typed there is gone or saved.
  useEffect(() => {
    typedRef.current = false;
  }, [active, modal]);
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!mine) return;
    const check = async (comingBack = false) => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const j = await r.json();
        if (j?.build && j.build !== mine) {
          // Coming back to the tab while nothing is being edited: just load
          // the new version quietly instead of nagging.
          if (comingBack && idleRef.current && !typedRef.current) window.location.reload();
          else setNewVersion(true);
        }
      } catch {
        /* offline: the connection banner already covers it */
      }
    };
    const id = setInterval(() => check(false), 5 * 60_000);
    const onVisible = () => {
      if (!document.hidden) check(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  useEffect(() => {
    setShowCost(false);
  }, [modal, selected?.id]);
  useEffect(() => {
    if (!showCost) return;
    const id = setTimeout(() => setShowCost(false), 60_000);
    return () => clearTimeout(id);
  }, [showCost]);
  // QC can be switched off in Profil Toko; saved checks are kept but not shown.
  const qcOn = shop.qcEnabled !== false;
  // Picked up 2-14 days ago and nobody has asked how the unit is doing yet.
  const followDue = useMemo(
    () =>
      tickets.filter((t) => {
        if (t.status !== "Sudah Diambil" || !t.pickedUpAt || t.followedUpAt) return false;
        const d = ageDays(t.pickedUpAt);
        return d >= 2 && d <= 14;
      }).length,
    [tickets],
  );
  useEffect(() => {
    const id = selected?.id;
    if (!id) return;
    let cancelled = false;
    fetch(`/api/chat?ticketId=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || cancelled) return;
        const kinds = Array.from(new Set((d.chats as { template: string }[]).map((c) => c.template)));
        setChatKinds((old) => ({ ...old, [id]: Array.from(new Set([...(old[id] || []), ...kinds])) }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);
  const qcByTicket = useMemo(
    () => new Map(qcOn ? qcChecks.map((c) => [c.ticketId as string, c]) : []),
    [qcChecks, qcOn],
  );
  const loadQc = () =>
    fetch("/api/qc", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setQcChecks(data.checks))
      .catch(() => {});
  useEffect(() => {
    loadQc();
    const id = setInterval(() => {
      if (!document.hidden) loadQc();
    }, 30_000);
    window.addEventListener("focus", loadQc);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", loadQc);
    };
  }, []);
  useEffect(() => {
    const load = () =>
      fetch("/api/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setNotifications(data.alerts))
        .catch(() => {});
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  // Tickets/customers used to load once at page open, so a ticket created at
  // the front desk never showed up on the technician's screen until they
  // reloaded. Refresh every 30s and whenever the tab regains focus — but not
  // while a modal is open (would wipe a half-typed form) or a save is in
  // flight (would overwrite its optimistic state with older server data).
  useEffect(() => {
    if (modal !== null) return;
    let cancelled = false;
    const refresh = async () => {
      if (document.hidden || pendingWrites.current > 0) return;
      const epoch = writeEpoch.current;
      try {
        const [tr, cr] = await Promise.all([
          fetch("/api/tickets", { cache: "no-store" }),
          fetch("/api/customers", { cache: "no-store" }),
        ]);
        if (tr.status === 401 || cr.status === 401) { forceLogout(); return; }
        if (!tr.ok || !cr.ok) return;
        const [t, c] = await Promise.all([tr.json(), cr.json()]);
        if (cancelled || pendingWrites.current > 0 || writeEpoch.current !== epoch) return;
        setTickets(t.tickets);
        setCustomers(c.customers);
        setServerOnline(true);
      } catch {
        setServerOnline(false);
      }
    };
    const id = setInterval(refresh, 30_000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [modal]);
  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);
  useEffect(() => {
    localStorage.setItem("fs-service-tickets-v1", JSON.stringify(tickets));
  }, [tickets]);
  useEffect(() => {
    localStorage.setItem("fs-service-settings-v1", JSON.stringify(shop));
  }, [shop]);
  useEffect(() => {
    localStorage.setItem("fs-service-catalog-v1", JSON.stringify(services));
  }, [services]);
  useEffect(() => {
    localStorage.setItem("fs-service-customers-v1", JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const log = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest(
        "a[href*='wa.me'],a[href*='whatsapp.com']",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      // Links carry their ticket and message kind (data-ticket / data-wa-kind);
      // guessing the ticket from the phone number mixed up a customer's several jobs.
      const ticket =
        tickets.find((t) => t.id === anchor.dataset.ticket) ||
        tickets.find((t) => t.phone && anchor.href.includes(t.phone.replace(/^0/, ""))) ||
        selected;
      const kind = anchor.dataset.waKind || "STATUS";
      if (ticket) {
        setChatKinds((old) => ({ ...old, [ticket.id]: Array.from(new Set([...(old[ticket.id] || []), kind])) }));
        setWaGateOpened((old) => ({ ...old, [`${ticket.id}:${kind}`]: true }));
        fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ticketId: ticket.id,
            phone: ticket.phone,
            message: decodeURIComponent(
              anchor.href.split("text=")[1] || "Chat pelanggan",
            ),
            template: kind,
          }),
        });
      }
    };
    document.addEventListener("click", log);
    return () => document.removeEventListener("click", log);
  }, [selected, tickets]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        if (modal !== null) return;
        e.preventDefault();
        setModal("new");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.querySelector(
          ".searchBox input",
        ) as HTMLInputElement | null;
        input?.focus();
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [modal]);

  const visible = useMemo(
    () => {
      // A scanned/pasted tracking link or an old-style "#260820104141" resolves
      // to the ticket's id — but only when such a ticket exists, so a phone
      // number that happens to look like a code still searches as a phone.
      const code = extractServiceCode(query);
      const needle = (code && tickets.some((t) => t.id === code) ? code : query).toLowerCase();
      return tickets.filter((t) => {
        const matches = `${t.id} ${oldStyleNumber(t.id)} ${t.customer} ${t.phone} ${t.device} ${t.brand || ""} ${t.serial} ${t.issue} ${t.serviceAction || ""}`
          .toLowerCase()
          .includes(needle);
        const statusMatch = filter === "Semua" || t.status === filter;
        const sectionMatch =
          active === "Bisa Diambil"
            ? t.status === "Bisa Diambil"
            : active === "Sudah Diambil"
              ? t.status === "Sudah Diambil"
              : active === "Proses Servis"
                ? // Picking a specific status in the filter (e.g. Dibatalkan)
                  // must be able to reveal tickets outside the active set.
                  processStatuses.includes(t.status) || filter === t.status
                : true;
        const technicianMatch = technicianFilter === "Semua Teknisi" || t.technician === technicianFilter;
        return matches && statusMatch && sectionMatch && technicianMatch;
      }).sort((a, b) => {
        // Newest first by the date that matters for the section: when a unit was
        // collected / finished, otherwise when it came in.
        const key = (t: Ticket) =>
          active === "Sudah Diambil"
            ? `${t.pickedUpAt || t.receivedAt} ${t.pickedUpTime || "00:00"}`
            : active === "Bisa Diambil"
              ? `${t.handledAt || t.receivedAt} ${t.handledTime || "00:00"}`
              : `${t.receivedAt} ${t.receivedTime || "00:00"}`;
        return key(b).localeCompare(key(a)) || b.id.localeCompare(a.id);
      });
    },
    [tickets, query, filter, active, technicianFilter],
  );

  // Back to the first page whenever the list is narrowed or switched.
  useEffect(() => {
    setListPage(1);
  }, [query, filter, active, technicianFilter]);

  const stats = {
    process: tickets.filter((t) => processStatuses.includes(t.status)).length,
    ready: tickets.filter((t) => t.status === "Bisa Diambil").length,
  };

  async function addDeviceType(name: string): Promise<string | null> {
    try {
      const res = await fetch("/api/shop/device-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.deviceTypes) {
        notify(data?.error || "Gagal menambah jenis barang");
        return null;
      }
      setShop((old) => ({ ...old, deviceTypes: (data.deviceTypes as string[]).join("\n") }));
      return data.name as string;
    } catch {
      notify("Tidak terhubung ke server — jenis barang belum tersimpan");
      return null;
    }
  }
  async function removeDeviceType(name: string) {
    const res = await fetch("/api/shop/device-types", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.deviceTypes) {
      setShop((old) => ({ ...old, deviceTypes: (data.deviceTypes as string[]).join("\n") }));
      notify(`Jenis barang "${name}" dihapus dari pilihan`);
    } else notify(data?.error || "Gagal menghapus jenis barang");
  }
  function notify(message: string) {
    setToast(message);
  }
  function forceLogout() {
    localStorage.removeItem("fs-service-tickets-v1");
    localStorage.removeItem("fs-service-settings-v1");
    localStorage.removeItem("fs-service-catalog-v1");
    localStorage.removeItem("fs-service-customers-v1");
    window.location.href = "/login";
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    forceLogout();
  }
  function toggleJob(id: string) {
    setSelectedJobs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function copyServiceList() {
    const chosen = visible.filter((ticket) => selectedJobs.has(ticket.id));
    const list = chosen.length ? chosen : visible;
    if (!list.length) return notify("Tidak ada servis untuk disalin");
    const technician = technicianFilter === "Semua Teknisi" ? "TIM TEKNISI" : technicianFilter.toUpperCase();
    const text = [
      `📋 DAFTAR SERVIS ${technician}`,
      `📅 ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Total: ${list.length} pekerjaan`,
      "",
      ...list.flatMap((ticket, index) => [
        `${index + 1}. ${ticket.id} — ${ticket.customer}`,
        `   🛠 ${ticket.device}`,
        `   ⚠️ ${ticket.issue}`,
        `   📦 ${ticket.accessories}`,
        `   📍 ${ticket.status} · ${ageDays(ticket.receivedAt)} hari`,
        `   👨‍🔧 ${ticket.technician}`,
        "",
      ]),
      "Mohon update progres di sistem setelah dikerjakan. Terima kasih.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    notify(`${list.length} servis berhasil disalin untuk WhatsApp`);
  }
  function openDetail(ticket: Ticket) {
    setSelected(ticket);
    setModal("detail");
  }
  function updateStatus(id: string, status: Status) {
    const before = tickets.find((t) => t.id === id);
    if (status === CANCELLED && before) {
      if (before.status === "Sudah Diambil") {
        notify("Servis yang sudah diambil tidak bisa dibatalkan");
        return;
      }
      const dp = before.downPayment > 0 ? `

DP ${money(before.downPayment)} sudah tercatat — kembalikan ke pelanggan secara manual jika perlu.` : "";
      if (!window.confirm(`Batalkan servis ${before.id} (${before.customer})? Servis tidak lagi dihitung sebagai pekerjaan aktif maupun piutang.${dp}`)) return;
    }
    if (status === "Sudah Diambil" && before) {
      const remaining = Math.max(0, finalPrice(before) - before.downPayment);
      if (
        remaining > 0 &&
        !window.confirm(
          `Masih ada sisa pembayaran ${money(remaining)}. Tetap serahkan perangkat ke pelanggan?\n\nSisa ini akan tercatat sebagai piutang.`,
        )
      )
        return;
    }
    const nowHm = new Date().toTimeString().slice(0, 5);
    const patch: Partial<Ticket> = {
      status,
      statusChangedAt: localDateStr(),
      // Finishing the job stamps when it was handled and by whom (the old
      // app's "Tgl. Selesai Ditangani" / "Teknisi") unless already set.
      ...((status === "Bisa Diambil" || status === "Sudah Diambil") && before && !before.handledAt
        ? { handledAt: localDateStr(), handledTime: nowHm }
        : {}),
      ...((status === "Bisa Diambil" || status === "Sudah Diambil") && before && !before.technician && currentUser?.name
        ? { technician: currentUser.name }
        : {}),
      // Stamp the pickup date the first time a ticket reaches "Sudah
      // Diambil" via this quick dropdown, since that's the everyday
      // path (not the rarely-used edit form) and warranty countdown
      // depends on it staying fixed instead of drifting with updatedAt.
      ...(status === "Sudah Diambil" && before && !before.pickedUpAt
        ? {
            pickedUpAt: localDateStr(),
            pickedUpTime: new Date().toTimeString().slice(0, 5),
            // Record who actually handed the unit over, so the printed
            // nota doesn't fall back to a hardcoded "Admin".
            ...(before.handedBy || !currentUser?.name ? {} : { handedBy: currentUser.name }),
          }
        : {}),
    };
    patchTicket(id, patch, `Status diperbarui: ${status}`);
  }
  async function deleteTicket() {
    if (!selected || deleting) return;
    const target = selected;
    setDeleting(true);
    setDeleteError("");
    writeEpoch.current++;
    try {
      const res = await fetch(`/api/tickets/${target.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDeleteError(data?.error || "Gagal menghapus servis");
        return;
      }
      setTickets((old) => old.filter((t) => t.id !== target.id));
      setSelected(null);
      setModal(null);
      notify(`Servis ${target.id} dihapus`);
    } catch {
      setDeleteError("Tidak terhubung ke server — servis TIDAK dihapus");
    } finally {
      setDeleting(false);
    }
  }
  async function patchTicket(id: string, patch: Partial<Ticket>, message: string) {
    writeEpoch.current++;
    pendingWrites.current++;
    try {
      await patchTicketInner(id, patch, message);
    } finally {
      pendingWrites.current--;
    }
  }
  async function patchTicketInner(id: string, patch: Partial<Ticket>, message: string) {
    const before = tickets.find((t) => t.id === id);
    if (!before) return;
    const updatedAt = localDateStr();
    const fullPatch = { ...patch, updatedAt };
    setTickets((old) => old.map((t) => (t.id === id ? { ...t, ...fullPatch } : t)));
    setSelected((old) => (old?.id === id ? { ...old, ...fullPatch } : old));
    notify(message);
    // If downPayment changes, the server creates the matching ledger entry
    // in the same transaction as the ticket update (see PATCH /api/tickets/[id])
    // — the client no longer calls /api/payments separately, so the two can
    // never fall out of sync from a lost or failed second request.
    let res: Response;
    try {
      res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...fullPatch,
          expectedVersion: before.version,
          paymentNote: patch.downPayment !== undefined && patch.downPayment !== before.downPayment
            ? (patch.downPayment > before.downPayment ? message : `Koreksi turun DP — ${message}`)
            : undefined,
        }),
      });
    } catch {
      // Network failure: the optimistic update above never made it to the
      // server, so it must not keep showing as if it did — that's exactly
      // what let an operator believe a change was saved when it wasn't.
      setTickets((old) => old.map((t) => (t.id === id ? before : t)));
      setSelected((old) => (old?.id === id ? before : old));
      setServerOnline(false);
      notify("Tidak terhubung ke server — perubahan TIDAK tersimpan, coba lagi");
      return;
    }
    setServerOnline(true);
    const data = await res.json().catch(() => null);
    if (res.status === 409 && data?.ticket) {
      setTickets((old) => old.map((t) => (t.id === id ? data.ticket : t)));
      setSelected((old) => (old?.id === id ? data.ticket : old));
      notify("Tiket ini baru saja diubah pengguna lain — ulangi perubahan Anda");
      return;
    }
    if (res.ok && data?.ticket) {
      setTickets((old) => old.map((t) => (t.id === id ? data.ticket : t)));
      setSelected((old) => (old?.id === id ? data.ticket : old));
    } else if (!res.ok) {
      setTickets((old) => old.map((t) => (t.id === id ? before : t)));
      setSelected((old) => (old?.id === id ? before : old));
      if (data?.code === "WA_REQUIRED" && patch.status) {
        // Not an error: the customer has to be messaged first.
        setWaGate({ id, kind: data.kind, status: patch.status as Status });
        return;
      }
      notify(data?.error ? `Gagal menyimpan: ${data.error}` : "Gagal menyimpan perubahan ke server");
    }
  }
  // A job with an unusable WhatsApp number can't be messaged, so nothing is required.
  const waWaived = !!selected && !canMessage(selected.phone);
  async function skipReceivedChat() {
    if (!selected) return;
    const reason = window.prompt("Alasan tidak mengirim chat konfirmasi (dicatat):", "");
    if (!reason || !reason.trim()) return;
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ticketId: selected.id,
        phone: selected.phone || "-",
        message: `Dilewati Admin: ${reason.trim()}`,
        template: "SKIP_RECEIVED",
      }),
    });
    if (r.ok) setHandoffDone((x) => ({ ...x, whatsapp: true }));
    else notify("Gagal mencatat alasan");
  }
  function saveTicketEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    const conditionVal = String(form.get("condition") || "");
    const patch: Partial<Ticket> = {
      receivedAt: String(form.get("receivedAt")),
      receivedTime: String(form.get("receivedTime")),
      customer: String(form.get("customer")),
      phone: String(form.get("phone")).replace(/\D/g, ""),
      device: String(form.get("device")),
      deviceType: String(form.get("deviceType") || "") || null,
      serial: String(form.get("serial") || "-"),
      accessories: String(form.get("accessories") || "Unit only"),
      issue: String(form.get("issue")),
      condition: conditionVal ? (conditionVal as Ticket["condition"]) : undefined,
      serviceAction: String(form.get("serviceAction") || ""),
      technician: String(form.get("technician")),
      // Staff don't get the Modal field, so an absent input must leave the
      // stored cost alone rather than zeroing it.
      ...(form.has("partCost") ? { partCost: Number(form.get("partCost") || 0) } : {}),
      estimate: Number(form.get("estimate") || 0),
      downPayment: Number(form.get("downPayment") || 0),
      finalCost: Number(form.get("finalCost") || 0),
      handledAt: String(form.get("handledAt") || ""),
      handledTime: String(form.get("handledTime") || ""),
      notes: String(form.get("notes") || ""),
      pickedUpAt: String(form.get("pickedUpAt") || ""),
      pickedUpTime: String(form.get("pickedUpTime") || ""),
      paymentMethod: String(form.get("paymentMethod") || "Tunai - Cash"),
      warrantyDays: Number(form.get("warrantyDays") || 0),
      pickupBy: String(form.get("pickupBy") || ""),
      handedBy: String(form.get("handedBy") || currentUser?.name || "Admin"),
    };
    patchTicket(selected.id, patch, `Data servis ${selected.id} berhasil diubah`);
    setModal("detail");
  }
  // The greeting already says "Kak", so a typed honorific ("Bapak Joko") would
  // come out as "Kak Bapak Joko".
  const salutation = (name: string) =>
    renderWaTemplate(shop.waSalutation, {
      nama: name.replace(/^\s*(bapak|pak|ibu|bu|mas|mbak|mba|kak|bang|abang|om|tante|haji|hj\.?|h\.)\s+/i, "").trim() || name,
    });
  function whatsappUrl(ticket: Ticket, kind: "empty" | "received" | "cost" | "cost-options" | "ready" | "picked" | "followup") {
    const base = waLink(ticket.phone);
    if (kind === "empty") return base;
    const tracking = `${location.origin}/track?id=${encodeURIComponent(ticket.id)}`;
    const vars = {
      toko: shop.name,
      perangkat: ticket.device,
      nomor_servis: ticket.id,
      tanggal_terima: new Date(`${ticket.receivedAt}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      link_tracking: tracking,
      // Complaint and technician action are different things: never present the
      // customer's complaint as "what we will do".
      keluhan: ticket.issue,
      tindakan: ticket.serviceAction?.trim() || "perbaikan sesuai hasil pengecekan",
      estimasi: money(ticket.estimate),
      rincian: costItemsWaText(parseCostItems(ticket.costItems), ticket.estimate, money),
      rincian_akhir: costItemsWaText(parseCostItems(ticket.costItems), finalPrice(ticket), money),
      // "Detail pengerjaan" block of the ready message; left out entirely when the technician wrote nothing.
      detail: (() => {
        const act = ticket.serviceAction?.trim();
        const items = costItemsWaText(parseCostItems(ticket.costItems), finalPrice(ticket), money);
        if (!act && !items) return "";
        return `Detail pengerjaan:\n${act || "-"}${items}\n\n`;
      })(),
      garansi:
        ticket.warrantyDays && ticket.warrantyDays > 0
          ? `\n\nGaransi servis: ${warrantyLabel(ticket.warrantyDays)}, berlaku sampai ${printDateLabel(warrantyEndDate(ticket))}.`
          : "",
      temuan: (() => {
        const q = qcByTicket.get(ticket.id);
        return q ? qcFindingsText(q.items) || "tidak ditemukan masalah lain" : "";
      })(),
      sisa: money(Math.max(0, finalPrice(ticket) - ticket.downPayment)),
      pembayaran:
        ticket.warrantyOf && finalPrice(ticket) === 0 && ticket.downPayment === 0
          ? "Servis ini klaim garansi, *tanpa biaya*."
          : finalPrice(ticket) - ticket.downPayment <= 0
          ? "Pembayaran sudah *lunas*."
          : ticket.downPayment > 0
            ? `Sisa pembayaran: *${money(finalPrice(ticket) - ticket.downPayment)}*`
            : `Biaya servis sejumlah *${money(finalPrice(ticket))}*`,
    };
    const body =
      kind === "received"
        ? shop.waReceived
        : kind === "cost"
          ? shop.waCost
          : kind === "ready"
            ? shop.waReady
            : kind === "picked"
              ? shop.waPickedUp || WA_TEMPLATE_DEFAULTS.waPickedUp
              : kind === "followup"
                ? shop.waFollowUp || WA_TEMPLATE_DEFAULTS.waFollowUp
                : shop.waCostOptions;
    const message = `${salutation(ticket.customer)},\n\n${renderWaTemplate(body, vars)}\n\n${shop.waClosing}`;
    return `${base}&text=${encodeURIComponent(message)}`;
  }
  function startWarrantyClaim(original: Ticket) {
    setWarrantyClaim(original);
    setModal("new");
  }
  function printTicket(mode: "receipt" | "receipt2" | "qr" | "accessories" | "paid") {
    if (mode === "paid" && selected && !isFullyPaid(selected)) {
      notify("Belum bisa cetak nota lunas — biaya final belum dikonfirmasi atau saldo belum Rp0");
      return;
    }
    // The browser proposes the page title as the "Save as PDF" file name.
    const t = selected;
    const kind =
      mode === "paid" ? "Nota Lunas" : mode === "qr" ? "Label QR" : mode === "accessories" ? "Label QR Perlengkapan" : "Tanda Terima";
    const date = mode === "paid" ? t?.pickedUpAt || localDateStr() : t?.receivedAt || localDateStr();
    const unit = t
      ? t.brand && !t.device.toLowerCase().includes(t.brand.toLowerCase())
        ? `${t.device} ${t.brand}`
        : t.device
      : "";
    const pdfName = t
      ? `${t.customer} - ${date} - ${unit} - ${kind}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim()
      : "";
    const originalTitle = document.title;
    setPrintMode(mode);
    setTimeout(() => {
      if (pdfName) document.title = pdfName;
      try {
        window.print();
      } finally {
        document.title = originalTitle;
        setPrintMode(null);
      }
    }, 120);
  }
  function chooseCustomer(customer: Customer) {
    setCustomerQuery(customer.name);
    setCustomerPickerOpen(false);
    const form = serviceFormRef.current;
    if (!form) return;
    const fill = (name: string, value: string) => {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (field) field.value = value;
    };
    fill("phone", customer.phone);
    fill("category", customer.category);
    fill("address", customer.address);
  }
  async function copyTracking(ticket: Ticket) {
    const url = `${location.origin}/track?id=${encodeURIComponent(ticket.id)}`;
    await navigator.clipboard.writeText(url);
    notify("Link tracking berhasil disalin");
  }
  async function submitTicket(e: React.FormEvent<HTMLFormElement>) {
    writeEpoch.current++;
    pendingWrites.current++;
    try {
      await submitTicketInner(e);
    } finally {
      pendingWrites.current--;
    }
  }
  async function submitTicketInner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") || "").replace(/\D/g, "");
    const serial = String(form.get("serial") || "-").trim();
    if (phone.length < 9 || phone.length > 15) {
      submittingRef.current = false;
      notify("Nomor WhatsApp harus 9-15 digit");
      return;
    }
    if (
      serial !== "-" &&
      tickets.some(
        (t) =>
          t.serial.toLowerCase() === serial.toLowerCase() &&
          t.status !== "Sudah Diambil" &&
          t.status !== CANCELLED,
      )
    ) {
      submittingRef.current = false;
      notify("Serial number sedang terdaftar pada servis aktif");
      return;
    }
    if (
      Number(form.get("downPayment") || 0) >
        Number(form.get("estimate") || 0) &&
      Number(form.get("estimate") || 0) > 0
    ) {
      submittingRef.current = false;
      notify("DP tidak boleh melebihi estimasi biaya");
      return;
    }
    let res: Response;
    try {
      res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: String(form.get("customer")),
          phone,
          device: String(form.get("device")),
          deviceType: String(form.get("deviceType") || ""),
          serial,
          issue: String(form.get("issue")),
          accessories: String(form.get("accessories") || "Unit only"),
          receivedBy: String(form.get("receivedBy") || ""),
          estimate: Number(form.get("estimate") || 0),
          downPayment: Number(form.get("downPayment") || 0),
          category: String(form.get("category")),
          address: String(form.get("address") || "-"),
          paymentTermDays: Number(form.get("paymentTermDays") || 0),
          paymentMethod: String(form.get("paymentMethod") || "Tunai - Cash"),
      ...(isTempoMethod(String(form.get("paymentMethod"))) ? { paymentTermDays: tempoDays(String(form.get("paymentMethod"))) } : {}),
          ...(warrantyClaim ? { warrantyOf: warrantyClaim.id } : {}),
        }),
      });
    } catch {
      submittingRef.current = false;
      setServerOnline(false);
      notify("Tidak terhubung ke server — servis TIDAK dibuat, coba lagi");
      return;
    }
    submittingRef.current = false;
    setServerOnline(true);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ticket) {
      notify(data?.error || "Gagal membuat servis, coba lagi");
      return;
    }
    const next: Ticket = data.ticket;
    setTickets((old) => [next, ...old]);
    setSelected(next);
    setHandoffDone({ receipt: false, whatsapp: false, qr: false, accessories: accessoryItems(next.accessories).length === 0 });
    setModal("handoff");
    notify(`Servis ${next.id} berhasil dibuat`);
    // The opening DP payment is created server-side in the same transaction
    // as the ticket (see POST /api/tickets) — nothing to record here.
    if (!customers.some((c) => normalizePhone(c.phone) === normalizePhone(phone))) {
      const cRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: next.customer,
          category: next.category || "User",
          phone,
          address: next.address || "-",
          createdAt: next.receivedAt,
        }),
      });
      const cData = await cRes.json().catch(() => null);
      if (cRes.ok && cData?.customer) setCustomers((old) => [cData.customer, ...old]);
    }
  }
  function exportXls() {
    const admin = currentUser?.role === "ADMIN";
    const section = active === "Bisa Diambil" ? "Bisa Diambil" : active === "Sudah Diambil" ? "Sudah Diambil" : "Proses Servis";
    const base = (t: Ticket) => [
      oldStyleNumber(t.id),
      fmtTgl(t.receivedAt, t.receivedTime),
    ];
    const who = (t: Ticket) => [t.customer, fmtTelp(t.phone), fmtWa(t.phone), itemName(t), t.serial && t.serial !== "-" ? t.serial : ""];
    const dp = (t: Ticket) => (t.downPayment > 0 ? fmtRp(t.downPayment) : "");
    let headers: string[];
    let rows: (string | number)[][];
    if (section === "Proses Servis") {
      headers = ["No", "No. Servis", "Tgl. Terima", "Penerima", "Pemilik", "Telepon", "WhatsApp", "Nama Barang", "Nomor Serial", "Kelengkapan", "Kerusakan", "DP", "Status", "Lama"];
      rows = visible.map((t, i) => {
        const [id, rec] = base(t);
        const [name, tel, wa, item, serial] = who(t);
        return [i + 1, id, rec, t.receivedBy || "", name, tel, wa, item, serial, t.accessories === "Unit only" ? "" : t.accessories, t.issue, dp(t), t.status, `${ageDays(t.receivedAt)} Hari`];
      });
    } else if (section === "Bisa Diambil") {
      headers = ["No", "No. Servis", "Tgl. Terima", "Pemilik", "Telepon", "WhatsApp", "Nama Barang", "Nomor Serial", "Kerusakan", "Kondisi", "Ket./Tindakan", "Teknisi", "DP", "Biaya", "Tgl. Selesai Ditangani", "Status"];
      rows = visible.map((t, i) => {
        const [id, rec] = base(t);
        const [name, tel, wa, item, serial] = who(t);
        return [i + 1, id, rec, name, tel, wa, item, serial, t.issue, t.condition || "", t.serviceAction || "", t.technician || "", dp(t), fmtRp(finalPrice(t)), fmtTgl(t.handledAt, t.handledTime), t.status];
      });
    } else {
      headers = ["No", "No. Servis", "Tgl. Terima", "Pemilik", "Telepon", "WhatsApp", "Nama Barang", "Nomor Serial", "Kerusakan", "Kondisi", "Ket./Tindakan", "Teknisi", "Biaya", ...(admin ? ["Modal", "Profit"] : []), "Status", "Tgl. Ambil", "Garansi"];
      rows = visible.map((t, i) => {
        const [id, rec] = base(t);
        const [name, tel, wa, item, serial] = who(t);
        const rev = finalPrice(t);
        return [
          i + 1, id, rec, name, tel, wa, item, serial, t.issue, t.condition || "", t.serviceAction || "", t.technician || "", fmtRp(rev),
          ...(admin ? [fmtRp(t.partCost || 0), fmtRp(rev - (t.partCost || 0))] : []),
          t.status, fmtTgl(t.pickedUpAt, t.pickedUpTime), t.warrantyDays ? warrantyLabel(t.warrantyDays) : "Tidak Ada",
        ];
      });
    }
    downloadXls(section, shop.name, headers, rows);
    notify(`${rows.length} servis diunduh sesuai filter yang aktif saat ini`);
  }
  async function startScanner() {
    setModal("scan");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      let active = true;
      scanStopRef.current = () => {
        active = false;
        stream.getTracks().forEach((x) => x.stop());
      };
      setTimeout(async () => {
        if (!videoRef.current || !active) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (o: { formats: string[] }) => {
              detect(v: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;
        if (!Detector)
          return notify(
            "Kamera aktif. Browser ini belum mendukung deteksi QR otomatis.",
          );
        const detector = new Detector({ formats: ["qr_code"] });
        const scan = async () => {
          if (!active || !videoRef.current) return;
          const found = await detector.detect(videoRef.current);
          if (found[0]) {
            const ticket = tickets.find((t) =>
              found[0].rawValue.includes(t.id),
            );
            if (ticket) {
              active = false;
              stream.getTracks().forEach((x) => x.stop());
              scanStopRef.current = null;
              openDetail(ticket);
              notify(`QR ditemukan: ${ticket.id}`);
              return;
            }
          }
          requestAnimationFrame(scan);
        };
        scan();
      }, 100);
    } catch {
      notify("Izin kamera tidak tersedia. Gunakan pencarian nomor servis.");
    }
  }
  function stopScanner() {
    scanStopRef.current?.();
    scanStopRef.current = null;
    setModal(null);
  }

  const customerMatches = customers
    .filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.address}`
        .toLowerCase()
        .includes(customerQuery.toLowerCase()),
    )
    .slice(0, 8);

  return (
    <div className="serviceApp">
      {newVersion && !versionDismissed && (
        <div className="versionPill" role="status">
          <span>Versi baru tersedia</span>
          <button type="button" onClick={() => window.location.reload()}>
            Muat ulang
          </button>
          <button type="button" className="versionClose" aria-label="Nanti saja" onClick={() => setVersionDismissed(true)}>
            ×
          </button>
        </div>
      )}
      {!serverOnline && (
        <div className="offlineBanner" role="alert">
          <ShieldCheck size={16} />
          Tidak terhubung ke server — perubahan terbaru mungkin belum tersimpan. Periksa koneksi internet.
        </div>
      )}
      <aside className={`serviceSidebar ${menuOpen ? "open" : ""}`}>
        <div className="serviceBrand">
          <span className="serviceLogo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt={shop.name || "FS Comp"} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </span>
          <div>
            <strong>{shop.name || "FS Comp"}</strong>
            <small>{shop.description || "Repair Management"}</small>
          </div>
          <button className="mobileClose" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav
            .filter(
              ([, label]) =>
                currentUser?.role === "ADMIN" ||
                !["Profil Toko", "Akun", "Jasa Servis", "Pesan WhatsApp", "Status Pembayaran", "Laporan Servis", "Laporan Teknisi"].includes(label),
            )
            .map(([Icon, label]) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => {
                if (label === "Terima Servis") setModal("new");
                else setActive(label);
                setMenuOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Proses Servis" && <b>{stats.process}</b>}
              {label === "Bisa Diambil" && <b>{stats.ready}</b>}
              {label === "Tindak Lanjut" && followDue > 0 && <b>{followDue}</b>}
              {label === "Status Pembayaran" && (
                <b>
                  {
                    tickets.filter(
                      (t) =>
                        (t.status === "Bisa Diambil" || t.status === "Sudah Diambil") &&
                        finalPrice(t) > t.downPayment,
                    ).length
                  }
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebarUser">
          <span>
            {(currentUser?.name || "?")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <strong>{currentUser?.name || "Memuat..."}</strong>
            <small>{currentUser?.role === "ADMIN" ? "Administrator" : "Teknisi/Pegawai"}</small>
          </div>
          <button className="iconCircle" onClick={() => setPwOpen(true)} aria-label="Ganti password" title="Ganti password">
            <KeyRound size={16} />
          </button>
          <button className="iconCircle" onClick={logout} aria-label="Keluar" title="Keluar">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className="serviceMain">
        <header className="serviceHeader">
          <button className="menuButton" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <div>
            <h1>{active}</h1>
            <p>Kelola operasional servis dalam satu tempat.</p>
          </div>
          <div className="headerActions">
            <div className="notifWrap" ref={notifRef}>
              <button
                className="iconCircle"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifikasi"
              >
                <Bell size={19} />
                {notifications.length > 0 && <i>{notifications.length}</i>}
              </button>
              {notifOpen && (
                <div className="notifDropdown">
                  <div className="notifDropdownHead">
                    <b>Notifikasi</b>
                    <small>{notifications.length} perlu perhatian</small>
                  </div>
                  <div className="notifList">
                    {notifications.length === 0 && (
                      <div className="notifEmpty">
                        <CheckCircle2 size={22} />
                        <span>Semua aman, tidak ada yang perlu ditindaklanjuti.</span>
                      </div>
                    )}
                    {notifications.map((n, i) => {
                      const meta = NOTIF_META[n.type] || NOTIF_META.SERVICE_OLD;
                      const Icon = meta.icon;
                      return (
                        <button
                          key={`${n.ticketId}-${n.type}-${i}`}
                          className="notifItem"
                          onClick={() => {
                            const t = tickets.find((x) => x.id === n.ticketId);
                            if (t) openDetail(t);
                            setNotifOpen(false);
                          }}
                        >
                          <span className={`notifIcon ${meta.tone}`}>
                            <Icon size={15} />
                          </span>
                          <span className="notifItemBody">
                            <b>{meta.label}</b>
                            <small>
                              {n.customer} · {n.device}
                            </small>
                            <em>{n.title}</em>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button className="scanButton" onClick={startScanner}>
              <QrCode size={18} /> Scan QR
            </button>
            <button className="newButton" onClick={() => setModal("new")}>
              <Plus size={18} /> Terima Servis
            </button>
          </div>
        </header>

        <main className="serviceContent">
          {active === "Pelanggan" ? (
            <CustomersPanel
              shopName={shop.name}
              tickets={tickets}
              customers={customers}
              isAdmin={currentUser?.role === "ADMIN"}
              onCreate={async (input) => {
                const res = await fetch("/api/customers", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(input),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.customer) {
                  notify(data?.error || "Gagal membuat pelanggan");
                  return null;
                }
                setCustomers((old) => [data.customer, ...old]);
                notify("Data pelanggan ditambahkan");
                return data.customer;
              }}
              onUpdate={async (id, patch) => {
                const res = await fetch(`/api/customers/${id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(patch),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.customer) {
                  notify(data?.error || "Gagal mengubah pelanggan");
                  return null;
                }
                setCustomers((old) => old.map((c) => (c.id === id ? data.customer : c)));
                notify("Data pelanggan diperbarui");
                return data.customer;
              }}
              onDelete={async (customer) => {
                const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  notify(data?.error || "Gagal menghapus pelanggan");
                  return false;
                }
                setCustomers((old) => old.filter((c) => c.id !== customer.id));
                notify("Pelanggan dihapus");
                return true;
              }}
              onPhoneChanged={(oldPhone, newPhone) => {
                const affected = tickets.filter(
                  (t) => normalizePhone(t.phone) === normalizePhone(oldPhone),
                );
                affected.forEach((t) =>
                  patchTicket(t.id, { phone: newPhone }, `Nomor WA ${t.id} disesuaikan`),
                );
                if (affected.length)
                  notify(
                    `Nomor WA diperbarui — ${affected.length} riwayat servis lama ikut disesuaikan ke ${newPhone}`,
                  );
              }}
              onOpen={openDetail}
            />
          ) : active === "Status Pembayaran" ? (
            <PaymentsPanel
              shopName={shop.name}
              tickets={tickets}
              onSettle={(t, method) =>
                patchTicket(
                  t.id,
                  {
                    downPayment: finalPrice(t),
                    paymentMethod: method,
                  },
                  `Pembayaran ${t.id} telah lunas`,
                )
              }
              onOpen={openDetail}
            />
          ) : active === "Profil Toko" ? (
            <SettingsPanel
              shop={shop}
              onAddType={addDeviceType}
              onRemoveType={removeDeviceType}
              onSave={async (value) => {
                setShop(value);
                const res = await fetch("/api/shop", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(value),
                });
                const data = await res.json().catch(() => null);
                if (res.ok && data?.shop) {
                  setShop(data.shop);
                  notify("Profil toko berhasil disimpan");
                } else {
                  notify(data?.error || "Gagal menyimpan profil toko");
                }
              }}
            />
          ) : active === "Akun" ? (
            <AccountsPanel
              users={users}
              tickets={tickets}
              onChanged={refreshUsers}
              notify={notify}
            />
          ) : active === "Jasa Servis" ? (
            <ServicesPanel
              services={services}
              onCreate={async (input) => {
                const res = await fetch("/api/services", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(input),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.service) {
                  notify(data?.error || "Gagal membuat jasa servis");
                  return null;
                }
                setServices((old) => [...old, data.service]);
                notify("Data jasa servis ditambahkan");
                return data.service;
              }}
              onDelete={async (item) => {
                const res = await fetch(`/api/services/${item.id}`, { method: "DELETE" });
                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  notify(data?.error || "Gagal menghapus jasa servis");
                  return false;
                }
                setServices((old) => old.filter((s) => s.id !== item.id));
                notify("Jasa servis dihapus");
                return true;
              }}
            />
          ) : active === "Pesan WhatsApp" ? (
            <WaTemplatesPanel
              shop={shop}
              onSave={async (value) => {
                setShop(value);
                const res = await fetch("/api/shop", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(value),
                });
                const data = await res.json().catch(() => null);
                if (res.ok && data?.shop) {
                  setShop(data.shop);
                  notify("Template pesan berhasil disimpan");
                } else {
                  notify(data?.error || "Gagal menyimpan template pesan");
                }
              }}
            />
          ) : active === "Tindak Lanjut" ? (
            <FollowUpPanel
              tickets={tickets}
              waUrl={(t) => whatsappUrl(t, "followup")}
              onMark={(t) => patchTicket(t.id, { followedUpAt: localDateStr() }, "Ditandai sudah ditanya")}
              onOpen={openDetail}
            />
          ) : active === "Status Garansi" ? (
            <WarrantyPanel tickets={tickets} onOpen={openDetail} onClaim={startWarrantyClaim} shopName={shop.name} />
          ) : active === "Laporan Servis" ? (
            <ServiceReport tickets={tickets} shopName={shop.name} />
          ) : active === "Laporan Teknisi" ? (
            <TechnicianReport tickets={tickets} shopName={shop.name} />
          ) : (
            <>
              <section className="ticketPanel">
                <div className="panelTop">
                  <div>
                    <h3>Daftar Servis</h3>
                    <p>{visible.length} pekerjaan ditampilkan</p>
                  </div>
                  <div className="panelTools">
                    <label className="searchBox">
                      <Search size={17} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari nomor, pelanggan, perangkat..."
                      />
                    </label>
                    <select
                      value={filter}
                      onChange={(e) =>
                        setFilter(e.target.value as Status | "Semua")
                      }
                    >
                      <option>Semua</option>
                      {selectableStatuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter teknisi"
                      value={technicianFilter}
                      onChange={(e) => {
                        setTechnicianFilter(e.target.value);
                        setSelectedJobs(new Set());
                      }}
                    >
                      <option>Semua Teknisi</option>
                      {nameOptions([...staff.map((p) => p.name), ...Array.from(new Set(tickets.map((t) => t.technician).filter(Boolean)))]).map((n) => <option key={n}>{n}</option>)}
                    </select>
                    <button className="copyWorkList" onClick={copyServiceList}>
                      <Copy size={17} />
                      <span>Copy WA {selectedJobs.size ? `(${selectedJobs.size})` : ""}</span>
                    </button>
                    <button onClick={exportXls}>
                      <Download size={17} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>
                <div className="ticketTable">
                  <div className="ticketHead">
                    <span className="jobCheck">
                      <input
                        aria-label="Pilih semua servis tampil"
                        type="checkbox"
                        checked={visible.length > 0 && visible.every((ticket) => selectedJobs.has(ticket.id))}
                        onChange={(e) => setSelectedJobs((current) => {
                          const next = new Set(current);
                          visible.forEach((ticket) => e.target.checked ? next.add(ticket.id) : next.delete(ticket.id));
                          return next;
                        })}
                      />
                    </span>
                    <span>Tanggal</span>
                    <span>No. Servis</span>
                    <span>Pelanggan</span>
                    <span>Perangkat</span>
                    <span>Keluhan</span>
                    <span>Tindakan</span>
                    <span>Teknisi</span>
                    <span>Status</span>
                    <span>Lama</span>
                    <span>Biaya</span>
                    <span />
                  </div>
                  {visible.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE).map((t) => {
                    const days = ageDays(t.receivedAt);
                    return (
                      <div
                        className="ticketRow"
                        key={t.id}
                        onClick={() => openDetail(t)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") openDetail(t); }}
                      >
                        <span className="jobCheck tChk" onClick={(e) => e.stopPropagation()}>
                          <input
                            aria-label={`Pilih servis ${t.id}`}
                            type="checkbox"
                            checked={selectedJobs.has(t.id)}
                            onChange={() => toggleJob(t.id)}
                          />
                        </span>
                        <span className="tDate" title={t.receivedAt}>
                          <b>{fmtTglSingkat(t.receivedAt).replace("Tgl. ", "")}</b>
                        </span>
                        <span className="tNo" title={t.id}>{t.id}</span>
                        <span className="tCust" title={t.customer}>
                          {t.warrantyOf && (
                            <i className="claimTag" title={`Klaim garansi dari ${t.warrantyOf}`}>
                              <Shield size={11} /> KLAIM
                            </i>
                          )}
                          <b>{t.customer}</b>
                        </span>
                        <span className="tDev" title={t.device}>{t.device}</span>
                        <span className="tIssue" title={t.issue}>{t.issue}</span>
                        <span
                          className={`tAct ${!t.serviceAction?.trim() && qcByTicket.get(t.id) && !qcByTicket.get(t.id)!.reviewedAt ? "qcLine" : ""}`}
                          title={t.serviceAction?.trim() || ""}
                        >
                          {t.serviceAction?.trim()
                            ? t.serviceAction
                            : qcByTicket.get(t.id) && !qcByTicket.get(t.id)!.reviewedAt
                              ? `QC selesai oleh ${qcByTicket.get(t.id)!.checkedBy} · ${qcByTicket.get(t.id)!.badCount} bermasalah — tinjau`
                              : "—"}
                        </span>
                        <span className="tTech">
                          <span className="avatarMini">
                            {(t.technician || "?").slice(0, 2).toUpperCase()}
                          </span>
                          <em>{t.technician || "—"}</em>
                        </span>
                        <span className="tStatus">
                          <i className={`statusBadge ${tone(t.status)}`}>
                            {t.status}
                          </i>
                        </span>
                        <span className="tAge">
                          <small className={`ageBadge ${ageTone(days)}`}>
                            <CalendarDays size={11} />
                            {days === 0 ? "Hari ini" : `${days} hari`}
                          </small>
                        </span>
                        <span className="tCost">
                          <b>{money(finalPrice(t))}</b>
                          <small>DP {money(t.downPayment)}</small>
                        </span>
                        <span className="tGo">
                          <ChevronRight />
                        </span>
                      </div>
                    );
                  })}
                  {visible.length === 0 && (
                    <div className="noData">
                      <Search />
                      <strong>Data tidak ditemukan</strong>
                      <p>Coba ubah kata pencarian atau filter status.</p>
                    </div>
                  )}
                </div>
                <Pager total={visible.length} page={listPage} onPage={setListPage} />
              </section>
            </>
          )}
        </main>
      </section>

      {modal && (
        <div
          className="modalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && modal !== "handoff") setModal(null);
          }}
        >
          {modal === "new" && (
            <form ref={serviceFormRef} className="serviceModal wideModal" onSubmit={submitTicket}>
              <div className="modalHead">
                <div>
                  <span>TERIMA SERVIS</span>
                  <h2>Form penerimaan perangkat</h2>
                </div>
                <button type="button" onClick={() => setModal(null)}>
                  <X />
                </button>
              </div>
              {warrantyClaim && (
                <div className="claimBanner">
                  <Shield size={16} />
                  <div>
                    <b>Klaim garansi dari {warrantyClaim.id}</b>
                    <span>
                      {warrantyClaim.device} · diambil {warrantyClaim.pickedUpAt || warrantyClaim.updatedAt} · garansi{" "}
                      {warrantyDaysLeft(warrantyClaim) >= 0
                        ? `masih ${warrantyDaysLeft(warrantyClaim)} hari`
                        : "SUDAH HABIS"}
                    </span>
                  </div>
                </div>
              )}
              <div className="formGridService">
                <label className="customerLookup">
                  Nama pemilik barang
                  <input
                    name="customer"
                    data-upper
                    required
                    autoFocus
                    autoComplete="off"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setCustomerPickerOpen(true);
                    }}
                    onFocus={() => setCustomerPickerOpen(true)}
                    onBlur={() => setTimeout(() => setCustomerPickerOpen(false), 120)}
                    placeholder="Ketik nama pelanggan"
                  />
                  {customerPickerOpen && (
                    <div className="customerSuggestions">
                      <div className="suggestionTitle">Pilih dari database pelanggan</div>
                      {customerMatches.map((customer) => (
                        <button
                          type="button"
                          key={customer.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => chooseCustomer(customer)}
                        >
                          <span>{customer.name.slice(0, 2).toUpperCase()}</span>
                          <b>{customer.name}<small>{customer.phone} · {customer.address}</small></b>
                          <i>{customer.category}</i>
                        </button>
                      ))}
                      {customerMatches.length === 0 && (
                        <p>Belum terdaftar. Data ini otomatis menjadi pelanggan baru saat servis disimpan.</p>
                      )}
                    </div>
                  )}
                </label>
                <label>
                  No. WhatsApp
                  <input
                    name="phone"
                    required
                    inputMode="tel"
                    defaultValue={warrantyClaim?.phone ?? ""}
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
                <label>
                  Kategori pelanggan
                  <select name="category" defaultValue={warrantyClaim?.category || "User"}>
                    <option>User</option>
                    <option>Toko</option>
                  </select>
                </label>
                <label>
                  Alamat pelanggan
                  <input name="address" data-upper defaultValue={warrantyClaim?.address && warrantyClaim.address !== "-" ? warrantyClaim.address : ""} placeholder="Desa / kecamatan / kota" />
                </label>
                <DeviceTypeField
                  types={deviceTypeList(shop)}
                  defaultValue={warrantyClaim?.deviceType}
                  onAdd={addDeviceType}
                />
                <label>
                  Nama barang
                  <input
                    name="device"
                    data-upper
                    required
                    defaultValue={warrantyClaim ? `${warrantyClaim.device}${warrantyClaim.brand ? ` ${warrantyClaim.brand}` : ""}` : ""}
                    placeholder="Contoh: Laptop Lenovo ThinkPad T14"
                  />
                </label>
                <label>
                  Serial number
                  <input name="serial" data-upper defaultValue={warrantyClaim && warrantyClaim.serial !== "-" ? warrantyClaim.serial : ""} placeholder="Opsional" />
                </label>
                <div className="accessoryField">
                  <span>Kelengkapan untuk label QR</span>
                  <AccessoryPicker defaultValue={warrantyClaim && warrantyClaim.accessories !== "Unit only" ? warrantyClaim.accessories : ""} />
                  <small className="fieldHint">Pilih yang dibawa pelanggan. Setiap barang mendapat QR sendiri.</small>
                </div>
                <label className="full">
                  Keluhan pelanggan (saat unit masuk)
                  <textarea
                    name="issue"
                    data-upper
                    required
                    placeholder="Tuliskan gejala atau keluhan sesuai yang disampaikan pelanggan"
                  />
                  <small className="fieldHint">
                    Tindakan oleh teknisi dicatat terpisah nanti di detail servis.
                  </small>
                </label>
                <label>
                  Penerima
                  <select name="receivedBy" defaultValue={currentUser?.name}>
                    {nameOptions(staff.map((x) => x.name), currentUser?.name).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Estimasi biaya servis
                  <input
                    name="estimate"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </label>
                <label>
                  DP / uang muka
                  <input
                    name="downPayment"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </label>
                <label>
                  Cara bayar DP
                  <select name="paymentMethod" defaultValue="Tunai - Cash">
                    {paymentMethods.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tempo pembayaran
                  <select name="paymentTermDays">
                    <option value="0">Tidak ada</option>
                    <option value="3">3 Hari</option>
                    <option value="7">1 Minggu</option>
                    <option value="14">2 Minggu</option>
                    <option value="30">1 Bulan</option>
                  </select>
                </label>
              </div>
              <div className="modalFoot">
                <label className="acceptFoot">
                  <input type="checkbox" required /> Penerima setuju menerima
                  barang servis dan data sudah benar.
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setModal(null)}
                >
                  Batal
                </button>
                <button className="newButton">
                  <CheckCircle2 size={18} /> Terima Servis & Buat QR
                </button>
              </div>
            </form>
          )}
          {modal === "detail" && selected && (
            <div className="serviceModal detailModal">
              <div className="modalHead">
                <div>
                  <span>DETAIL WORK ORDER</span>
                  <h2>{selected.id}</h2>
                </div>
                <button onClick={() => setModal(null)}>
                  <X />
                </button>
              </div>
              <div className="detailHero">
                <div className="qrCard">
                  <QRCodeSVG
                    value={`${location.origin}/track?id=${encodeURIComponent(selected.id)}`}
                    size={104}
                    level="H"
                  />
                  <small>Scan untuk tracking status</small>
                </div>
                <div>
                  <i className={`statusBadge ${tone(selected.status)}`}>
                    {selected.status}
                  </i>
                  <h3>{selected.device}</h3>
                  <p>
                    {selected.customer} · {selected.phone}
                  </p>
                  {(selected.warrantyOf || tickets.some((x) => x.warrantyOf === selected.id)) && (
                    <div className="claimLinks">
                      <Shield size={14} />
                      {selected.warrantyOf && (
                        <span>
                          Klaim garansi dari{" "}
                          <button
                            type="button"
                            onClick={() => {
                              const o = tickets.find((x) => x.id === selected.warrantyOf);
                              if (o) openDetail(o);
                            }}
                          >
                            {selected.warrantyOf}
                          </button>
                        </span>
                      )}
                      {tickets.filter((x) => x.warrantyOf === selected.id).length > 0 && (
                        <span>
                          Klaim:{" "}
                          {tickets
                            .filter((x) => x.warrantyOf === selected.id)
                            .map((x) => (
                              <button type="button" key={x.id} onClick={() => openDetail(x)}>
                                {x.id}
                              </button>
                            ))}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="serviceAge">
                    <Clock3 size={15} />
                    <strong>
                      {ageDays(selected.receivedAt) === 0
                        ? "Diterima hari ini"
                        : `${ageDays(selected.receivedAt)} hari dalam servis`}
                    </strong>
                    <span className="receivedAt">
                      Masuk {fmtTglSingkat(selected.receivedAt).replace("Tgl. ", "")}
                      {selected.receivedTime ? ` · ${selected.receivedTime} WIB` : ""}
                    </span>
                  </div>
                  <div className="detailMoney">
                    <span>
                      Estimasi<strong>{money(selected.estimate)}</strong>
                    </span>
                    <span>
                      DP<strong>{money(selected.downPayment)}</strong>
                    </span>
                    <span>
                      Biaya final
                      <strong>{money(selected.finalCost || 0)}</strong>
                    </span>
                    <span>
                      Sisa
                      <strong>
                        {money(
                          Math.max(0, finalPrice(selected) - selected.downPayment),
                        )}
                      </strong>
                    </span>
                    {currentUser?.role === "ADMIN" && (
                      <>
                        <span>
                          <span className="costLabel">
                            Modal
                            <button
                              type="button"
                              className="costEye"
                              title={showCost ? "Sembunyikan modal & profit" : "Tampilkan modal & profit"}
                              aria-label={showCost ? "Sembunyikan modal dan profit" : "Tampilkan modal dan profit"}
                              onClick={() => setShowCost((v) => !v)}
                            >
                              {showCost ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </span>
                          <strong>{showCost ? money(selected.partCost || 0) : "••••••"}</strong>
                        </span>
                        <span>
                          Profit
                          <strong>
                            {showCost ? money(finalPrice(selected) - (selected.partCost || 0)) : "••••••"}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {selected.status === CANCELLED ? (
                <div className="cancelledNote">
                  Servis ini dibatalkan{selected.statusChangedAt ? ` pada ${selected.statusChangedAt}` : ""}. Ubah status di bawah bila ingin dibuka kembali.
                </div>
              ) : (
              <div className="trackingTimeline">
                {statuses.map((s, i) => (
                  <div
                    key={s}
                    className={
                      i <= statuses.indexOf(selected.status) ? "done" : ""
                    }
                  >
                    <span>
                      {i < statuses.indexOf(selected.status) ? (
                        <Check size={12} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <small>{s}</small>
                  </div>
                ))}
              </div>
              )}
              <div className="detailCols">
              <div className="detailCol">
              <div className="issueNote">
                <small>Keluhan pelanggan (saat unit masuk)</small>
                <strong>{selected.issue}</strong>
              </div>
              <ChatChecklist
                ticket={selected}
                kinds={chatKinds[selected.id] || []}
                urlFor={(k) => whatsappUrl(selected, k)}
              />
              {qcOn && !((selected.status === "Sudah Diambil" || selected.status === CANCELLED) && !qcByTicket.get(selected.id)) && (
              <QcPanel
                check={qcByTicket.get(selected.id) || null}
                closed={selected.status === "Sudah Diambil" || selected.status === CANCELLED}
                canReview
                onFill={() => setQcTicket(selected)}
                onReview={async (c) => {
                  const res = await fetch(`/api/qc/${c.id}`, { method: "PATCH" });
                  const data = await res.json().catch(() => null);
                  if (res.ok && data?.check) {
                    setQcChecks((old) => old.map((x) => (x.ticketId === selected.id ? { ...data.check, ticketId: selected.id } : x)));
                    notify("QC ditandai sudah ditinjau");
                  } else notify(data?.error || "Gagal menandai QC");
                }}
                onUseFindings={(c) => {
                  const text = qcFindingsText(c.items);
                  if (!text) return notify("Tidak ada temuan bermasalah di QC ini");
                  const cur = (selected.serviceAction || "").trim();
                  patchTicket(
                    selected.id,
                    { serviceAction: cur ? `${cur}\nTemuan QC: ${text}` : `Temuan QC: ${text}` },
                    "Temuan QC disalin ke tindakan teknisi",
                  );
                }}
              />
              )}
              <div className="actionNote">
                <label>
                  <b>Tindakan teknisi</b>
                  <span>Apa yang dikerjakan / diganti. Tampil juga di halaman cek status pelanggan.</span>
                  <textarea
                    key={`action-${selected.id}-${selected.version}`}
                    data-upper
                    defaultValue={selected.serviceAction || ""}
                    placeholder="Contoh: Ganti panel LCD 14 inch, kalibrasi baterai, install ulang Windows"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (selected.serviceAction || "").trim())
                        patchTicket(selected.id, { serviceAction: v }, "Tindakan teknisi disimpan");
                    }}
                  />
                </label>
              </div>
              <CostItemsPanel
                key={`items-${selected.id}`}
                ticket={selected}
                services={services}
                onSave={(items) =>
                  patchTicket(selected.id, { costItems: JSON.stringify(items) }, "Rincian biaya disimpan")
                }
                onApply={(field, total) =>
                  patchTicket(
                    selected.id,
                    { [field]: total } as Partial<Ticket>,
                    field === "estimate" ? "Estimasi diisi dari rincian" : "Biaya final diisi dari rincian",
                  )
                }
              />
              <div className="detailGrid">
                <div>
                  <small>Kelengkapan</small>
                  <strong>{selected.accessories}</strong>
                </div>
                <div>
                  <small>Serial number</small>
                  <strong>{selected.serial}</strong>
                </div>
                <div>
                  <small>Teknisi</small>
                  <strong>{selected.technician}</strong>
                </div>
              </div>
              <div className="confirmationGrid">
                <button
                  className={selected.customerConfirmed ? "confirmed" : ""}
                  onClick={() =>
                    patchTicket(
                      selected.id,
                      { customerConfirmed: !selected.customerConfirmed },
                      selected.customerConfirmed
                        ? "Konfirmasi pelanggan dibatalkan"
                        : "Pelanggan telah dikonfirmasi",
                    )
                  }
                >
                  <CheckCircle2 />
                  <span>
                    <strong>Konfirmasi Pelanggan</strong>
                    <small>
                      {selected.customerConfirmed
                        ? "Sudah menyetujui pengerjaan"
                        : "Belum memberikan persetujuan"}
                    </small>
                  </span>
                </button>
                <button
                  className={selected.costConfirmed ? "confirmed" : ""}
                  onClick={() =>
                    patchTicket(
                      selected.id,
                      {
                        costConfirmed: !selected.costConfirmed,
                        // Approving the estimate means that's the price unless a
                        // different final cost was typed; leaving it at 0 made the
                        // ticket look free and blocked payment.
                        ...(!selected.costConfirmed && !selected.finalCost && selected.estimate
                          ? { finalCost: selected.estimate }
                          : {}),
                      },
                      selected.costConfirmed
                        ? "Konfirmasi biaya dibatalkan"
                        : "Biaya telah dikonfirmasi",
                    )
                  }
                >
                  <CircleDollarSign />
                  <span>
                    <strong>Konfirmasi Biaya</strong>
                    <small>
                      {selected.costConfirmed
                        ? "Estimasi disetujui pelanggan"
                        : "Menunggu persetujuan biaya"}
                    </small>
                  </span>
                </button>
              </div>
              <div className="ratingBox">
                <span>Rating pelayanan pelanggan</span>
                <div>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        patchTicket(
                          selected.id,
                          { rating: n },
                          `Rating ${n} bintang disimpan`,
                        )
                      }
                      aria-label={`${n} bintang`}
                    >
                      <Star
                        fill={
                          (selected.rating || 0) >= n ? "currentColor" : "none"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
              {currentUser?.role === "ADMIN" && (
                <PaymentHistory ticketId={selected.id} version={selected.version ?? 0} />
              )}
              </div>
              <div className="detailCol">
              <div className="serviceControls">
                <label>
                  Ubah status
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      updateStatus(selected.id, e.target.value as Status)
                    }
                  >
                    {selectableStatuses.map((s) => (
                      <option key={s} disabled={s === CANCELLED && selected.status === "Sudah Diambil"}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Estimasi biaya
                  <input
                    type="number"
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    key={`estimate-${selected.id}-${selected.version}`}
                    defaultValue={selected.estimate}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== selected.estimate)
                        patchTicket(selected.id, { estimate: v }, "Estimasi diperbarui");
                    }}
                  />
                </label>
                <label>
                  DP / uang muka
                  <input
                    type="number"
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    key={`downPayment-${selected.id}-${selected.version}`}
                    defaultValue={selected.downPayment}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== selected.downPayment)
                        patchTicket(selected.id, { downPayment: v }, "DP diperbarui");
                    }}
                  />
                </label>
                <label>
                  Biaya final
                  <input
                    type="number"
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    key={`finalCost-${selected.id}-${selected.version}`}
                    defaultValue={selected.finalCost || 0}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== (selected.finalCost || 0))
                        patchTicket(selected.id, { finalCost: v }, "Biaya final diperbarui");
                    }}
                  />
                </label>
                <label>
                  Cara pembayaran
                  <span className="fieldHintInline">dipakai untuk pembayaran berikutnya</span>
                  <select
                    value={selected.paymentMethod || "Tunai"}
                    onChange={(e) =>
                      patchTicket(
                        selected.id,
                        {
                          paymentMethod: e.target.value,
                          // "Tempo 1 Minggu" carries its own due term
                          ...(isTempoMethod(e.target.value) ? { paymentTermDays: tempoDays(e.target.value) } : {}),
                        },
                        "Cara pembayaran diperbarui",
                      )
                    }
                  >
                    {[...paymentMethods, ...tempoMethods, ...(selected.paymentMethod && ![...paymentMethods, ...tempoMethods].includes(selected.paymentMethod) ? [selected.paymentMethod] : [])].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Garansi servis
                  <select
                    value={warrantyCanon(selected.warrantyDays || 0)}
                    onChange={(e) =>
                      patchTicket(selected.id, { warrantyDays: Number(e.target.value) }, "Garansi diperbarui")
                    }
                  >
                    {[...warrantyOptions, ...(warrantyOptions.some(([d]) => d === warrantyCanon(selected.warrantyDays || 0)) ? [] : ([[warrantyCanon(selected.warrantyDays || 0), warrantyLabel(selected.warrantyDays)]] as [number, string][]))].map(([d, label]) => (
                      <option key={d} value={d}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Teknisi
                  <select
                    value={selected.technician || ""}
                    onChange={(e) => patchTicket(selected.id, { technician: e.target.value }, "Teknisi diperbarui")}
                  >
                    <option value="">— belum ditentukan —</option>
                    {nameOptions(staff.map((x) => x.name), selected.technician).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Kondisi servis
                  <select
                    value={selected.condition || ""}
                    onChange={(e) =>
                      patchTicket(selected.id, { condition: (e.target.value || undefined) as Ticket["condition"] }, "Kondisi servis diperbarui")
                    }
                  >
                    <option value="">Belum ditentukan</option>
                    <option>Sudah Jadi</option>
                    <option>Tidak Bisa</option>
                    <option>Dibatalkan</option>
                  </select>
                </label>
              </div>
              <div className="actionGrid">
                <button
                  className="ghost"
                  onClick={() => printTicket("receipt")}
                >
                  <Printer size={17} /> Print tanda terima
                </button>
                {!isFullyPaid(selected) && selected.costConfirmed && (
                  isTempoMethod(selected.paymentMethod) ? (
                    <span className="ghost hint" title="Pilih cara pembayaran yang dipakai untuk melunasi (bukan Tempo) di kolom Cara pembayaran">
                      <CircleDollarSign size={17} /> Pilih cara bayar (bukan Tempo)
                    </span>
                  ) : finalPrice(selected) >= selected.downPayment ? (
                    <button
                      className="ghost"
                      onClick={() =>
                        patchTicket(
                          selected.id,
                          {
                            downPayment: finalPrice(selected),
                            paymentMethod: selected.paymentMethod || "Tunai - Cash",
                          },
                          `Pembayaran ${selected.id} telah lunas`,
                        )
                      }
                    >
                      <CircleDollarSign size={17} /> Tandai Lunas
                    </button>
                  ) : (
                    <span className="ghost hint" title="DP tercatat melebihi biaya final — koreksi manual dulu di field DP sebelum bisa ditandai lunas">
                      <CircleDollarSign size={17} /> DP melebihi biaya final
                    </span>
                  )
                )}
                {!isFullyPaid(selected) && !selected.costConfirmed && (
                  <span className="ghost hint" title="Konfirmasi biaya final (tombol Konfirmasi Biaya di atas) sebelum bisa ditandai lunas">
                    <CircleDollarSign size={17} /> Konfirmasi biaya dulu
                  </span>
                )}
                <button
                  className="ghost"
                  disabled={!isFullyPaid(selected)}
                  title={isFullyPaid(selected) ? undefined : selected.costConfirmed ? "Tandai lunas dulu — saldo masih tersisa" : "Konfirmasi biaya dulu"}
                  onClick={() => printTicket("paid")}
                >
                  <Banknote size={17} /> Print nota lunas
                </button>
                <button className="ghost" onClick={() => printTicket("qr")}>
                  <QrCode size={17} /> Print QR
                </button>
                <button
                  className="ghost accessoryAction"
                  disabled={accessoryItems(selected.accessories).length === 0}
                  onClick={() => printTicket("accessories")}
                >
                  <QrCode size={17} /> Cetak QR Perlengkapan ({accessoryItems(selected.accessories).length})
                </button>
                <button
                  className="ghost"
                  onClick={() => copyTracking(selected)}
                >
                  <Copy size={17} /> Salin tracking
                </button>
                {selected.status === "Sudah Diambil" && (selected.warrantyDays || 0) > 0 && (
                  <button className="ghost" onClick={() => startWarrantyClaim(selected)}>
                    <Shield size={17} /> Klaim garansi
                  </button>
                )}
                <button className="ghost" onClick={() => setModal("edit")}>
                  <FileText size={17} /> Ubah Data Lainnya
                </button>
                {currentUser?.role === "ADMIN" && selected.status !== "Sudah Diambil" && (
                  <button
                    className="ghost dangerAction"
                    onClick={() => {
                      setDeleteText("");
                      setDeleteError("");
                      setModal("delete");
                    }}
                  >
                    <Trash2 size={17} /> Hapus servis
                  </button>
                )}
                <button className="waButton" onClick={() => setModal("chat")}>
                  <MessageCircle size={17} /> Chat pelanggan
                </button>
              </div>
              </div>
              </div>
            </div>
          )}
          {modal === "handoff" && selected && (
            <div className="serviceModal handoffModal">
              <div className="handoffHero"><span><ClipboardList /></span><div><small>SOP PENERIMAAN WAJIB</small><h2>Servis berhasil diterima</h2><p>{selected.id} · {selected.customer} · {selected.device}</p></div></div>
              <div className="handoffProgress"><span>{Object.values(handoffDone).filter(Boolean).length}/4 selesai</span><i><b style={{width:`${Object.values(handoffDone).filter(Boolean).length*25}%`}} /></i></div>
              <div className="handoffSteps">
                <button className={handoffDone.receipt ? "done" : ""} onClick={() => { setHandoffDone((x) => ({...x,receipt:true})); printTicket("receipt2"); }}><span>{handoffDone.receipt ? <Check /> : "1"}</span><div><b>Cetak nota 2 rangkap</b><small>1 lembar untuk pelanggan dan 1 lembar untuk arsip toko.</small></div><Printer /></button>
                <a className={handoffDone.whatsapp ? "done" : ""} target="_blank" data-ticket={selected.id} data-wa-kind="RECEIVED" href={whatsappUrl(selected,"received")} onClick={() => setHandoffDone((x) => ({...x,whatsapp:true}))}><span>{handoffDone.whatsapp ? <Check /> : "2"}</span><div><b>Kirim konfirmasi WhatsApp</b><small>Pesan ramah berisi nomor servis dan link tracking.</small></div><MessageCircle /></a>
                <button className={handoffDone.qr ? "done" : ""} onClick={() => { setHandoffDone((x) => ({...x,qr:true})); printTicket("qr"); }}><span>{handoffDone.qr ? <Check /> : "3"}</span><div><b>Cetak QR barang utama</b><small>Tempelkan label pada perangkat servis.</small></div><QrCode /></button>
                <button disabled={accessoryItems(selected.accessories).length===0} className={handoffDone.accessories ? "done" : ""} onClick={() => { setHandoffDone((x) => ({...x,accessories:true})); printTicket("accessories"); }}><span>{handoffDone.accessories ? <Check /> : "4"}</span><div><b>Cetak QR perlengkapan</b><small>{accessoryItems(selected.accessories).length ? `${accessoryItems(selected.accessories).length} label: ${accessoryItems(selected.accessories).join(", ")}` : "Tidak ada perlengkapan tambahan."}</small></div><PackageCheck /></button>
              </div>
              <div className="handoffFoot">{waWaived || handoffDone.whatsapp ? <button className="skipSop" onClick={() => setModal("detail")}>Lewati sisa SOP kali ini</button> : currentUser?.role === "ADMIN" ? <button className="skipSop" onClick={skipReceivedChat}>Lewati chat (Admin, wajib alasan)</button> : <span className="skipSop waNeed">Kirim konfirmasi WhatsApp dulu — wajib</span>}<button className="finishSop" disabled={!Object.values(handoffDone).every(Boolean)} onClick={() => setModal("detail")}><CheckCircle2 /> Selesai & buka detail servis</button></div>
            </div>
          )}
          {modal === "edit" && selected && (
            <form className="serviceModal wideModal editServiceModal" onSubmit={saveTicketEdit}>
              <div className="modalHead"><div><span>UBAH DATA SERVIS</span><h2>{selected.id}</h2><p>Teliti kembali data sebelum menyimpan.</p></div><button type="button" onClick={() => setModal("detail")}><X /></button></div>
              <div className="formGridService editServiceGrid">
                <label>Tanggal terima<input name="receivedAt" type="date" required defaultValue={selected.receivedAt}/></label>
                <label>Jam terima<input name="receivedTime" type="time" defaultValue={selected.receivedTime || ""}/></label>
                <label>Nama pemilik<input name="customer" data-upper required defaultValue={selected.customer}/></label>
                <label>Nomor WhatsApp<input name="phone" required defaultValue={selected.phone}/></label>
                <DeviceTypeField types={deviceTypeList(shop)} defaultValue={selected.deviceType} onAdd={addDeviceType} optional />
                <label>Nama barang<input name="device" data-upper required defaultValue={selected.device}/></label>
                                <label>Serial number<input name="serial" data-upper defaultValue={selected.serial}/></label>
                <div className="accessoryField"><span>Kelengkapan</span><AccessoryPicker defaultValue={selected.accessories} /></div>
                <label className="full">Keluhan pelanggan (saat unit masuk)<textarea name="issue" data-upper required defaultValue={selected.issue}/></label>
                <label>Kondisi servis<select name="condition" defaultValue={selected.condition || ""}><option value="">Belum ditentukan</option><option>Sudah Jadi</option><option>Tidak Bisa</option><option>Dibatalkan</option></select></label>
                <label>Teknisi<select name="technician" defaultValue={selected.technician || ""}><option value="">— belum ditentukan —</option>{nameOptions(staff.map((p) => p.name), selected.technician).map((n) => <option key={n}>{n}</option>)}</select></label>
                <label className="full">Tindakan teknisi<textarea name="serviceAction" data-upper defaultValue={selected.serviceAction}/></label>
                <label>DP / uang muka<input name="downPayment" type="number" min="0" defaultValue={selected.downPayment}/></label>
                {currentUser?.role === "ADMIN" && (
                  <label>
                    <span className="costLabel">
                      Modal sparepart
                      <button
                        type="button"
                        className="costEye"
                        title={showCost ? "Sembunyikan angka" : "Tampilkan angka"}
                        aria-label={showCost ? "Sembunyikan angka modal" : "Tampilkan angka modal"}
                        onClick={() => setShowCost((v) => !v)}
                      >
                        {showCost ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </span>
                    <input
                      name="partCost"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      className={showCost ? "" : "costMasked"}
                      defaultValue={selected.partCost || 0}
                    />
                  </label>
                )}
                <label>Estimasi biaya<input name="estimate" type="number" min="0" defaultValue={selected.estimate}/></label>
                <label>Biaya servis final<input name="finalCost" type="number" min="0" defaultValue={selected.finalCost || 0}/></label>
                <label>Tanggal ditangani<input name="handledAt" type="date" defaultValue={selected.handledAt || ""}/></label>
                <label>Jam ditangani<input name="handledTime" type="time" defaultValue={selected.handledTime || ""}/></label>
                <label className="full">Catatan<textarea name="notes" data-upper defaultValue={selected.notes}/></label>
                <label>Tanggal ambil<input name="pickedUpAt" type="date" defaultValue={selected.pickedUpAt || ""}/></label>
                <label>Jam ambil<input name="pickedUpTime" type="time" defaultValue={selected.pickedUpTime || ""}/></label>
                <label>Cara pembayaran<select name="paymentMethod" defaultValue={selected.paymentMethod || "Tunai - Cash"}>{[...paymentMethods, ...tempoMethods, ...(selected.paymentMethod && ![...paymentMethods, ...tempoMethods].includes(selected.paymentMethod) ? [selected.paymentMethod] : [])].map((m) => <option key={m}>{m}</option>)}</select></label>
                <label>Garansi servis<select name="warrantyDays" defaultValue={warrantyCanon(selected.warrantyDays || 0)}>{warrantyOptions.map(([d, label]) => <option key={d} value={d}>{label}</option>)}{!warrantyOptions.some(([d]) => d === warrantyCanon(selected.warrantyDays || 0)) && <option value={selected.warrantyDays}>{warrantyLabel(selected.warrantyDays)}</option>}</select></label>
                <label>Pengambil<input name="pickupBy" data-upper defaultValue={selected.pickupBy || selected.customer}/></label>
                <label>Penyerah<input name="handedBy" defaultValue={selected.handedBy || currentUser?.name || "Admin"}/></label>
              </div>
              <div className="modalFoot"><button type="button" className="ghost" onClick={() => setModal("detail")}>Batal</button><button className="newButton"><CheckCircle2 size={17}/> Simpan Perubahan</button></div>
            </form>
          )}
          {modal === "delete" && selected && (
            <div className="serviceModal deleteModal">
              <div className="modalHead">
                <div>
                  <span>HAPUS SERVIS</span>
                  <h2>{selected.id}</h2>
                </div>
                <button type="button" onClick={() => setModal("detail")}>
                  <X />
                </button>
              </div>
              <div className="formGridService single">
              <p className="deleteLead">
                Servis <b>{selected.customer}</b> · {selected.device} akan dihapus <b>permanen</b>
                {selected.downPayment > 0 && ` beserta catatan DP ${money(selected.downPayment)}`}. Ini cocok untuk
                servis yang salah input. Jika servisnya batal tetapi perlu tetap tercatat, ubah statusnya menjadi
                Dibatalkan.
              </p>
              <label>
                Ketik nomor servis untuk melanjutkan
                <input
                  value={deleteText}
                  autoFocus
                  placeholder={selected.id}
                  onChange={(e) => setDeleteText(e.target.value)}
                />
              </label>
              {deleteError && <div className="authError">{deleteError}</div>}
              </div>
              <div className="modalFoot">
                <button type="button" className="ghost" onClick={() => setModal("detail")}>
                  Batal
                </button>
                <button
                  type="button"
                  className="dangerSolid"
                  disabled={deleting || deleteText.trim().toUpperCase() !== selected.id.toUpperCase()}
                  onClick={deleteTicket}
                >
                  <Trash2 size={16} /> {deleting ? "Menghapus..." : "Hapus permanen"}
                </button>
              </div>
            </div>
          )}
          {modal === "chat" && selected && (
            <div className="serviceModal chatChoiceModal">
              <div className="modalHead"><div><span>CHAT WHATSAPP</span><h2>Pilih pesan untuk {selected.customer}</h2><p>Nomor tujuan: {selected.phone}</p></div><button onClick={() => setModal("detail")}><X /></button></div>
              <div className="chatChoices">
                <a target="_blank" href={whatsappUrl(selected, "empty")}><MessageCircle/><span><b>Chat WhatsApp Kosong</b><small>Hanya membuka percakapan pelanggan tanpa isi pesan.</small></span></a>
                <a target="_blank" data-ticket={selected.id} data-wa-kind="RECEIVED" href={whatsappUrl(selected, "received")}><PackageCheck/><span><b>Konfirmasi Servis Diterima</b><small>Salam, data barang, nomor servis, dan link tracking.</small></span></a>
                <a target="_blank" data-ticket={selected.id} data-wa-kind="READY" href={whatsappUrl(selected, "ready")}><CheckCircle2/><span><b>Servis Selesai — Siap Diambil</b><small>Kabari pelanggan beserta sisa pembayaran.</small></span></a>
                <a target="_blank" data-ticket={selected.id} data-wa-kind="PICKED" href={whatsappUrl(selected, "picked")}><ShieldCheck/><span><b>Servis Diambil — Terima Kasih</b><small>Ucapan terima kasih, info garansi, dan ajakan chat WA dulu jika ada kendala.</small></span></a>
                <div className="chatCostGroup"><CircleDollarSign/><span><b>Konfirmasi Biaya Servis</b><small>Pilih format pesan sesuai hasil pengecekan.{!selected.serviceAction?.trim() && " Tindakan teknisi belum diisi — isi dulu di detail servis agar pesan lebih jelas."}</small><span className="costChatVariants"><a target="_blank" data-ticket={selected.id} data-wa-kind="COST" href={whatsappUrl(selected, "cost")}>Satu nominal</a><a target="_blank" data-ticket={selected.id} data-wa-kind="COST" href={whatsappUrl(selected, "cost-options")}>Beberapa pilihan</a></span></span></div>
              </div>
            </div>
          )}
          {modal === "scan" && (
            <div className="serviceModal scanModal">
              <div className="modalHead">
                <div>
                  <span>QR SCANNER</span>
                  <h2>Arahkan ke label servis</h2>
                </div>
                <button onClick={stopScanner}>
                  <X />
                </button>
              </div>
              <div className="cameraFrame">
                <video ref={videoRef} muted playsInline />
                <span />
                <p>Posisikan QR di dalam bingkai</p>
              </div>
              <form
                className="scanManual"
                onSubmit={(e) => {
                  e.preventDefault();
                  const raw = String(new FormData(e.currentTarget).get("code") || "").trim();
                  const code = extractServiceCode(raw) || raw.toUpperCase();
                  const found = tickets.find((t) => t.id.toUpperCase() === code);
                  if (!found) return notify("Nomor servis tidak ditemukan");
                  scanStopRef.current?.();
                  scanStopRef.current = null;
                  openDetail(found);
                }}
              >
                <input
                  name="code"
                  autoFocus
                  autoComplete="off"
                  placeholder="Ketik atau scan nomor servis (SRV-...)"
                />
                <button className="newButton">Buka</button>
              </form>
              <small className="scanHint">
                Kamera tidak wajib: alat scan QR USB atau ketik nomor servis
                langsung di kolom di atas. Gambar tidak diunggah ke mana pun.
              </small>
            </div>
          )}
        </div>
      )}
      {waGate && (() => {
        const t = tickets.find((x) => x.id === waGate.id);
        if (!t) return null;
        const kindOf = waGate.kind === "READY" ? "ready" : "picked";
        const opened = !!waGateOpened[`${t.id}:${waGate.kind}`] || (chatKinds[t.id] || []).includes(waGate.kind);
        return (
          <div className="modalBackdrop">
            <div className="serviceModal waGateModal">
              <div className="modalHead">
                <div>
                  <span>WAJIB KABARI PELANGGAN</span>
                  <h2>{t.customer}</h2>
                  <p>
                    {t.id} · {WA_GATE_LABEL[waGate.kind]}
                  </p>
                </div>
                <button type="button" onClick={() => setWaGate(null)} aria-label="Tutup">
                  <X />
                </button>
              </div>
              <div className="formGridService single">
                <p className="deleteLead">
                  Status tidak bisa diubah ke <b>{waGate.status}</b> sebelum pelanggan dikabari lewat WhatsApp. Klik
                  tombol di bawah, <b>kirim pesannya</b>, lalu kembali ke sini dan lanjutkan.
                </p>
                <a
                  className="newButton waGateLink"
                  target="_blank"
                  rel="noreferrer"
                  data-ticket={t.id}
                  data-wa-kind={waGate.kind}
                  href={whatsappUrl(t, kindOf)}
                >
                  <MessageCircle size={17} /> Buka WhatsApp & kirim pesan
                </a>
              </div>
              <div className="modalFoot">
                {currentUser?.role === "ADMIN" && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={async () => {
                      const reason = window.prompt("Alasan tidak mengirim chat (dicatat):", "");
                      if (!reason || !reason.trim()) return;
                      const r = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          ticketId: t.id,
                          phone: t.phone,
                          message: `Dilewati Admin: ${reason.trim()}`,
                          template: `SKIP_${waGate.kind}`,
                        }),
                      });
                      if (r.ok) {
                        const g = waGate;
                        setWaGate(null);
                        updateStatus(g.id, g.status);
                      } else notify("Gagal mencatat alasan");
                    }}
                  >
                    Lewati (Admin)
                  </button>
                )}
                <button type="button" className="ghost" onClick={() => setWaGate(null)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="newButton"
                  disabled={!opened}
                  onClick={async () => {
                    const g = waGate;
                    await new Promise((r) => setTimeout(r, 500));
                    setWaGate(null);
                    updateStatus(g.id, g.status);
                  }}
                >
                  <CheckCircle2 size={17} /> Sudah terkirim, lanjutkan
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {qcTicket && (
        <QcForm
          key={qcTicket.id}
          ticket={qcTicket}
          existing={qcByTicket.get(qcTicket.id) || null}
          defaultChecker={currentUser?.name}
          onClose={() => setQcTicket(null)}
          onSaved={(check) => {
            const id = qcTicket.id;
            setQcChecks((old) => [{ ...check, ticketId: id }, ...old.filter((c) => c.ticketId !== id)]);
            // The first check moves a "Belum Cek" job to "Sedang Cek" server-side.
            setTickets((old) => old.map((t) => (t.id === id && t.status === "Belum Cek" ? { ...t, status: "Sedang Cek" } : t)));
            setSelected((old) => (old?.id === id && old.status === "Belum Cek" ? { ...old, status: "Sedang Cek" } : old));
            setQcTicket(null);
            notify("QC tersimpan");
          }}
        />
      )}
      {printMode === "receipt" && selected && (
        <div className="servicePrint receipt">
          <div className="receiptCopyPage compact">
            <ServiceReceiptBody ticket={selected} shop={shop} />
          </div>
        </div>
      )}
      {printMode === "qr" && selected && (
        <div className="servicePrint qr">
          <div className="printHeader">
            <div className="printQr">
              <QRCodeSVG
                value={`${location.origin}/track?id=${encodeURIComponent(selected.id)}`}
                size={260}
                level="H"
              />
              <small>
                <Smartphone size={10} /> Scan untuk tracking servis
              </small>
            </div>
          </div>
        </div>
      )}
      {printMode === "paid" && selected && (
        <div className="servicePrint paid">
          <div className="receiptCopyPage compact">
            <PaidNotaBody
              ticket={selected}
              shop={shop}
              issuer={selected.handedBy || currentUser?.name || "Admin"}
            />
          </div>
        </div>
      )}
      {printMode === "receipt2" && selected && (
        <div className="servicePrint receipt2">
          {["Untuk Pelanggan", "Arsip Toko"].map((copy) => (
            <div className="receiptCopyPage compact" key={copy}>
              <ServiceReceiptBody ticket={selected} shop={shop} copyLabel={copy} />
            </div>
          ))}
        </div>
      )}
      {printMode === "accessories" && selected && (
        <div className="servicePrint accessories accessoryLabels">
          <div className="accessorySheetHead">
            <strong>LABEL QR PERLENGKAPAN SERVIS</strong>
            <span>{selected.id} · {selected.customer}</span>
          </div>
          <div className="accessoryLabelGrid">
            {accessoryItems(selected.accessories).map((item, index, items) => (
              <article className="accessoryLabel" key={`${item}-${index}`}>
                <QRCodeSVG
                  value={`${location.origin}/track?id=${encodeURIComponent(selected.id)}&accessory=${encodeURIComponent(item)}&item=${index + 1}`}
                  size={105}
                  level="H"
                />
                <div>
                  <small>PERLENGKAPAN {index + 1}/{items.length}</small>
                  <h2>{item}</h2>
                  <b>Atas nama: {selected.customer}</b>
                  <span>{selected.device}</span>
                  <strong>{selected.id}</strong>
                  <em>Scan untuk identifikasi servis</em>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {pwOpen && (
        <PasswordModal
          onClose={() => setPwOpen(false)}
          onDone={() => {
            setPwOpen(false);
            notify("Password berhasil diganti");
          }}
        />
      )}
      {toast && (
        <div className="serviceToast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
    </div>
  );
}

// Admin-only view of the payment ledger for one ticket (the API refuses
// technicians): when, how much, and by which method each payment came in.
function PaymentHistory({ ticketId, version }: { ticketId: string; version: number }) {
  const [rows, setRows] = useState<
    { id: string; amount: number; method: string; note: string | null; createdAt: string }[] | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/payments?ticketId=${encodeURIComponent(ticketId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setRows(d?.payments ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId, version]);
  if (!rows || rows.length === 0) return null;
  const total = rows.reduce((a, p) => a + p.amount, 0);
  return (
    <div className="payHistory">
      <h4>Riwayat pembayaran</h4>
      <ul>
        {[...rows].reverse().map((p) => (
          <li key={p.id}>
            <span>
              {new Date(p.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <b className={p.amount < 0 ? "neg" : ""}>{money(p.amount)}</b>
            <em>{p.method}</em>
          </li>
        ))}
      </ul>
      <div>
        <span>Total diterima</span>
        <b>{money(total)}</b>
      </div>
    </div>
  );
}

function CustomersPanel({
  tickets,
  customers: data,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
  onPhoneChanged,
  onOpen,
  shopName,
}: {
  tickets: Ticket[];
  customers: Customer[];
  isAdmin: boolean;
  shopName: string;
  onCreate: (input: {
    name: string;
    category: Customer["category"];
    phone: string;
    address: string;
    rating: number;
  }) => Promise<Customer | null>;
  onUpdate: (id: string, patch: Partial<Customer>) => Promise<Customer | null>;
  onDelete: (customer: Customer) => Promise<boolean>;
  onPhoneChanged: (oldPhone: string, newPhone: string) => void;
  onOpen: (ticket: Ticket) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pageSize = 15;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (editing && !isAdmin) return setError("Hanya Admin yang dapat mengubah data pelanggan");
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") || "").replace(/\D/g, "");
    if (phone.length < 9 || phone.length > 15)
      return setError("Nomor telepon harus 9-15 digit");
    if (data.some((c) => normalizePhone(c.phone) === normalizePhone(phone) && c.id !== editing?.id))
      return setError("Nomor telepon sudah terdaftar");
    setBusy(true);
    const input = {
      name: String(f.get("name")).trim(),
      category: String(f.get("category")) as Customer["category"],
      phone,
      address: String(f.get("address") || "-").trim(),
      rating: Number(f.get("rating") || 0),
    };
    const result = editing ? await onUpdate(editing.id, input) : await onCreate(input);
    setBusy(false);
    if (!result) return setError("Gagal menyimpan pelanggan, coba lagi");
    if (editing && editing.phone !== phone) onPhoneChanged(editing.phone, phone);
    setFormOpen(false);
    setEditing(null);
  }
  async function remove(customer: Customer) {
    if (!isAdmin) return;
    if (tickets.some((t) => normalizePhone(t.phone) === normalizePhone(customer.phone))) return;
    await onDelete(customer);
  }
  function exportCustomers() {
    const count = (c: Customer) => {
      const n = normalizePhone(c.phone);
      return tickets.filter((t) => (n ? normalizePhone(t.phone) === n : t.phone === c.phone && t.customer === c.name)).length;
    };
    downloadXls(
      "Pelanggan",
      shopName,
      ["No", "Nama Pelanggan", "Kategori", "Telepon", "WhatsApp", "Alamat Pelanggan", "Total Servis"],
      [...data]
        .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }))
        .map((c, i) => [i + 1, c.name, c.category, fmtTelp(c.phone), fmtWa(c.phone), c.address === "-" ? "" : c.address, count(c) ? fmtKali(count(c)) : "Belum Ada"]),
    );
  }
  const filtered = data.filter((c) =>
    `${c.name} ${c.phone} ${c.address} ${c.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="customerPageFull">
      <section className="customerToolbar">
        <div>
          <h2>Daftar Pelanggan</h2>
          <p>{data.length} pelanggan tersimpan</p>
        </div>
        <button
          className="newButton"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Buat Data Pelanggan Baru
        </button>
        <label className="searchBox">
          <Search />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari pelanggan, telepon, alamat..."
          />
        </label>
        <div className="customerPager">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </button>
          <strong>
            Hal. {page} dari {totalPages}
          </strong>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
        <button className="exportCustomer" onClick={exportCustomers}>
          <Download /> Export
        </button>
      </section>
      <section className="customerFullTable">
        <div className="customerFullHead">
          <span>#</span>
          <span>Nama Pelanggan</span>
          <span>Kategori</span>
          <span>Telepon</span>
          <span>WhatsApp</span>
          <span>Alamat Pelanggan</span>
          <span>Proses</span>
          <span>Bisa Diambil</span>
          <span>Sudah Diambil</span>
          <span>Total Servis</span>
          <span>Detail</span>
          <span>Rating</span>
          <span>Pilihan</span>
        </div>
        {rows.map((c, index) => {
          // Exact string match missed a ticket recorded as "0812..." when
          // the customer's own phone was stored "62812..." (or vice versa)
          // — same class of bug already fixed for the delete guard and
          // duplicate check, just missed here.
          const cNorm = normalizePhone(c.phone);
          const history = tickets.filter((t) =>
            cNorm ? normalizePhone(t.phone) === cNorm : t.phone === c.phone && t.customer === c.name,
          );
          const latest = history[0];
          const process = history.filter((t) =>
            processStatuses.includes(t.status),
          ).length;
          const ready = history.filter(
            (t) => t.status === "Bisa Diambil",
          ).length;
          const done = history.filter(
            (t) => t.status === "Sudah Diambil",
          ).length;
          return (
            <div className="customerFullRow" key={c.id}>
              <span>{(page - 1) * pageSize + index + 1}</span>
              <span>
                <b>{c.name}</b>
              </span>
              <span>
                <i className={`customerCategory ${c.category.toLowerCase()}`}>
                  {c.category}
                </i>
              </span>
              <span>{c.phone}</span>
              <span>
                <a target="_blank" href={waLink(c.phone)}>
                  <MessageCircle /> {normalizePhone(c.phone)}
                </a>
              </span>
              <span title={c.address}>{c.address}</span>
              <span>{process}</span>
              <span>{ready}</span>
              <span className={done ? "doneCount" : ""}>
                {done ? `${done} Barang` : "0"}
              </span>
              <span>
                {history.length ? `${history.length} Kali` : "Belum Ada"}
              </span>
              <span>
                <button
                  disabled={!latest}
                  onClick={() => latest && onOpen(latest)}
                >
                  <Eye />
                </button>
              </span>
              <span className="customerStars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    disabled={!isAdmin}
                    onClick={() => isAdmin && onUpdate(c.id, { rating: n })}
                    aria-label={`${n} bintang`}
                  >
                    <Star fill={c.rating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </span>
              <span className="customerChoices">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      Ubah
                    </button>
                    <button
                      className="deleteCustomer"
                      disabled={history.length > 0}
                      onClick={() => remove(c)}
                    >
                      {history.length ? "Tidak Dapat Dihapus" : "Hapus"}
                    </button>
                  </>
                ) : (
                  <small>Hanya Admin</small>
                )}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="noData">
            <Users />
            <strong>Belum ada pelanggan</strong>
            <p>Tambahkan pelanggan baru atau ubah pencarian.</p>
          </div>
        )}
      </section>
      {formOpen && (
        <div
          className="modalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFormOpen(false);
          }}
        >
          <form className="serviceModal customerFormModal" onSubmit={save}>
            <div className="modalHead">
              <div>
                <span>DATA PELANGGAN</span>
                <h2>{editing ? "Ubah Pelanggan" : "Buat Pelanggan Baru"}</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)}>
                <X />
              </button>
            </div>
            <div className="formGridService">
              <label>
                Nama pelanggan
                <input
                  name="name"
                  data-upper
                  required
                  autoFocus
                  defaultValue={editing?.name}
                />
              </label>
              <label>
                Kategori
                <select
                  name="category"
                  defaultValue={editing?.category || "User"}
                >
                  <option>User</option>
                  <option>Toko</option>
                </select>
              </label>
              <label>
                Telepon / WhatsApp
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  defaultValue={editing?.phone}
                />
              </label>
              <label>
                Rating
                <select name="rating" defaultValue={editing?.rating || 0}>
                  <option value="0">Belum ada</option>
                  <option value="1">1 Bintang</option>
                  <option value="2">2 Bintang</option>
                  <option value="3">3 Bintang</option>
                  <option value="4">4 Bintang</option>
                  <option value="5">5 Bintang</option>
                </select>
              </label>
              <label className="full">
                Alamat pelanggan
                <textarea
                  name="address"
                  data-upper
                  required
                  defaultValue={editing?.address}
                />
              </label>
              {error && <div className="authError full">{error}</div>}
            </div>
            <div className="modalFoot">
              <button
                type="button"
                className="ghost"
                onClick={() => setFormOpen(false)}
              >
                Batal
              </button>
              <button className="newButton" disabled={busy}>
                <CheckCircle2 /> {busy ? "Menyimpan..." : "Simpan Pelanggan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function LegacyCustomersPanel({
  tickets,
  onOpen,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
}) {
  const [search, setSearch] = useState("");
  const customers = useMemo(
    () =>
      Array.from(
        tickets
          .reduce((map, t) => {
            const old = map.get(t.phone) || {
              name: t.customer,
              phone: t.phone,
              tickets: [] as Ticket[],
            };
            old.tickets.push(t);
            map.set(t.phone, old);
            return map;
          }, new Map<string, { name: string; phone: string; tickets: Ticket[] }>())
          .values(),
      ).filter((c) =>
        `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [tickets, search],
  );
  return (
    <div className="modulePage">
      <section className="moduleHero">
        <div>
          <span className="miniTag">
            <Users size={14} /> DATABASE PELANGGAN
          </span>
          <h2>Daftar Pelanggan</h2>
          <p>
            Riwayat pelanggan dan seluruh perangkat servis terhubung otomatis.
          </p>
        </div>
        <strong>
          {customers.length}
          <small>Pelanggan aktif</small>
        </strong>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Data Pelanggan</h3>
            <p>Nomor WhatsApp, total servis, proses, dan rating</p>
          </div>
          <label className="searchBox">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau telepon..."
            />
          </label>
        </div>
        <div className="customerTable">
          <div className="customerHead">
            <span>Pelanggan</span>
            <span>Telepon / WhatsApp</span>
            <span>Proses</span>
            <span>Siap Diambil</span>
            <span>Total Servis</span>
            <span>Rating</span>
            <span>Aksi</span>
          </div>
          {customers.map((c) => {
            const latest = c.tickets[0];
            const rating = Math.round(
              c.tickets.reduce((a, t) => a + (t.rating || 0), 0) /
                Math.max(1, c.tickets.filter((t) => t.rating).length),
            );
            return (
              <div className="customerRow" key={c.phone}>
                <span>
                  <i>{c.name.slice(0, 2).toUpperCase()}</i>
                  <b>{c.name}</b>
                </span>
                <span>
                  <b>{c.phone}</b>
                  <a target="_blank" href={waLink(c.phone)}>
                    <MessageCircle size={12} /> Chat WhatsApp
                  </a>
                </span>
                <span>
                  {
                    c.tickets.filter(
                      (t) => !["Siap Diambil", "Selesai"].includes(t.status),
                    ).length
                  }
                </span>
                <span>
                  {c.tickets.filter((t) => t.status === "Siap Diambil").length}
                </span>
                <span>
                  <b>{c.tickets.length} kali</b>
                </span>
                <span className="customerStars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={13}
                      fill={rating >= n ? "currentColor" : "none"}
                    />
                  ))}
                </span>
                <span>
                  <button onClick={() => onOpen(latest)}>
                    <Eye size={14} /> Detail
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PaymentsPanel({
  tickets,
  onSettle,
  onOpen,
  shopName,
}: {
  tickets: Ticket[];
  onSettle: (ticket: Ticket, method: string) => void;
  onOpen: (ticket: Ticket) => void;
  shopName: string;
}) {
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"Semua" | "Belum Lunas" | "Lunas" | "Dalam Proses">("Semua");
  // Money is only *owed* once the work is done. An open job's estimate is
  // a forecast, not a receivable — mixing them inflated "Sisa Piutang" with
  // devices that hadn't even been diagnosed yet.
  const isDone = (t: Ticket) => t.status === "Bisa Diambil" || t.status === "Sudah Diambil";
  // A cancelled job is neither billable nor owed; its DP (if any) still
  // counts as cash received below.
  const billable = tickets.filter((t) => t.status !== CANCELLED);
  const modeRows = billable.filter((t) => {
    // Same canonical check the paid-nota print gate uses — this panel was
    // using its own looser `downPayment >= total` (also true on an
    // overpayment, and didn't require costConfirmed when total>0), so a
    // ticket could show "Lunas" here while Print Nota Lunas stayed
    // disabled for the exact same ticket.
    const paid = isFullyPaid(t);
    if (mode === "Lunas") return paid;
    if (mode === "Belum Lunas") return !paid && isDone(t);
    if (mode === "Dalam Proses") return !paid && !isDone(t);
    return true;
  });
  const q = search.trim().toLowerCase();
  const rows = q
    ? modeRows.filter((t) => `${t.id} ${oldStyleNumber(t.id)} ${t.customer} ${t.phone} ${t.device}`.toLowerCase().includes(q))
    : modeRows;
  const owed = (t: Ticket) => Math.max(0, finalPrice(t) - t.downPayment);
  const receivable = billable.filter(isDone).reduce((a, t) => a + owed(t), 0);
  const inProgress = billable.filter((t) => !isDone(t)).reduce((a, t) => a + owed(t), 0);
  return (
    <div className="modulePage">
      <section className="paymentStats">
        <article>
          <small>Total Tagihan</small>
          <strong>
            {money(billable.filter(isDone).reduce((a, t) => a + finalPrice(t), 0))}
          </strong>
          <span>Servis yang sudah selesai</span>
        </article>
        <article>
          <small>DP Diterima</small>
          <strong>
            {money(tickets.reduce((a, t) => a + t.downPayment, 0))}
          </strong>
          <span>Pembayaran masuk</span>
        </article>
        <article className="dangerCard">
          <small>Sisa Piutang</small>
          <strong>{money(receivable)}</strong>
          <span>Servis selesai, belum lunas — perlu ditagih</span>
        </article>
        <article>
          <small>Estimasi Berjalan</small>
          <strong>{money(inProgress)}</strong>
          <span>Servis yang masih dikerjakan</span>
        </article>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Status Pembayaran</h3>
            <p>Konfirmasi DP, pelunasan, tagihan, dan tempo pelanggan</p>
          </div>
          <label className="searchBox">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nomor, pelanggan, perangkat..."
            />
          </label>
          <button
            className="paymentExport"
            onClick={() => {
              const termOf = (t: Ticket) => t.paymentTermDays || 7;
              downloadXls(
                "Status Pembayaran",
                shopName,
                ["No", "No. Servis", "Tgl. Terima", "Pemilik", "Telepon", "WhatsApp", "Nama Barang", "Nomor Serial", "Kerusakan", "Kondisi", "Ket./Tindakan", "Status", "Tgl. Ambil", "Biaya", "Cara Pembayaran", "Tagihan", "Jatuh Tempo"],
                rows.map((t, i) => {
                  const due = Math.max(0, finalPrice(t) - t.downPayment);
                  const unpaid = !isFullyPaid(t) && isDone(t) && due > 0;
                  const overdue = unpaid && ageDays(t.receivedAt) > termOf(t);
                  const dueDate = new Date(`${t.receivedAt}T00:00:00`);
                  dueDate.setDate(dueDate.getDate() + termOf(t));
                  return [
                    i + 1,
                    oldStyleNumber(t.id),
                    fmtTgl(t.receivedAt, t.receivedTime),
                    t.customer,
                    fmtTelp(t.phone),
                    fmtWa(t.phone),
                    itemName(t),
                    t.serial && t.serial !== "-" ? t.serial : "",
                    t.issue,
                    t.condition || "",
                    t.serviceAction || "",
                    t.status,
                    fmtTgl(t.pickedUpAt, t.pickedUpTime),
                    fmtRp(finalPrice(t)),
                    t.paymentMethod || "",
                    unpaid ? fmtRp(due) : "Tidak Ada",
                    !unpaid ? "Tidak Ada" : overdue ? "Sudah Jatuh Tempo" : fmtTglSingkat(localDateStr(dueDate)),
                  ];
                }),
              );
            }}
          >
            <Download size={16} /> Export
          </button>
          <div className="paymentTabs">
            {(["Semua", "Belum Lunas", "Lunas", "Dalam Proses"] as const).map((x) => (
              <button
                className={mode === x ? "active" : ""}
                onClick={() => {
                  setMode(x);
                  setPage(1);
                }}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <div className="paymentTable">
          <div className="paymentHead">
            <span>No. Servis</span>
            <span>Pelanggan</span>
            <span>Perangkat</span>
            <span>Biaya</span>
            <span>DP</span>
            <span>Tagihan</span>
            <span>Cara Bayar</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => {
            const total = finalPrice(t);
            const due = Math.max(0, total - t.downPayment);
            const paid = isFullyPaid(t);
            // Same rule as the notification bell: the term chosen at intake,
            // else 7 days — it used to be honoured only when the payment
            // method happened to be "Tempo".
            const termDays = t.paymentTermDays || 7;
            const done = isDone(t);
            const isOverdue = !paid && done && ageDays(t.receivedAt) > termDays;
            return (
              <div
                className={`paymentServiceRow ${isOverdue ? "overdue" : ""}`}
                key={t.id}
              >
                <span>
                  <button onClick={() => onOpen(t)}>{t.id}</button>
                  <small>{t.receivedAt}</small>
                </span>
                <span>
                  <b>{t.customer}</b>
                  <small>{t.phone}</small>
                </span>
                <span>{t.device}</span>
                <span>{money(total)}</span>
                <span>{money(t.downPayment)}</span>
                <span>
                  <b>{money(due)}</b>
                </span>
                <span>{t.paymentMethod || "—"}</span>
                <span>
                  <i className={`statusBadge ${paid ? "success" : done ? "warning" : "neutral"}`}>
                    {paid ? "Lunas" : !done ? "Dalam Proses" : isOverdue ? "Jatuh Tempo" : "Belum Lunas"}
                  </i>
                </span>
                <span>
                  {paid ? (
                    <CheckCircle2 size={18} />
                  ) : !t.costConfirmed ? (
                    <small className="settleHint" title="Konfirmasi biaya final dulu di detail tiket sebelum bisa dilunasi">
                      Konfirmasi biaya dulu
                    </small>
                  ) : total < t.downPayment ? (
                    <small className="settleHint" title="DP tercatat melebihi biaya final — koreksi manual dulu di detail tiket">
                      DP melebihi biaya
                    </small>
                  ) : (
                    <span className="settleBox">
                      <select
                        aria-label="Cara pembayaran"
                        value={methods[t.id] ?? (t.paymentMethod && !isTempoMethod(t.paymentMethod) ? t.paymentMethod : "Tunai - Cash")}
                        onChange={(e) => setMethods((old) => ({ ...old, [t.id]: e.target.value }))}
                      >
                        {paymentMethods.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        className="settleButton"
                        onClick={() =>
                          onSettle(
                            t,
                            methods[t.id] ?? (t.paymentMethod && !isTempoMethod(t.paymentMethod) ? t.paymentMethod : "Tunai - Cash"),
                          )
                        }
                      >
                        Pelunasan
                      </button>
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <Pager total={rows.length} page={page} onPage={setPage} />
      </section>
    </div>
  );
}

function AccountsPanel({
  users,
  tickets,
  onChanged,
  notify,
}: {
  users: UserAccount[];
  tickets: Ticket[];
  onChanged: () => void;
  notify: (message: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [credential, setCredential] = useState<{ username: string; password: string } | null>(null);

  const ratingFor = (name: string) => {
    const rated = tickets.filter((t) => t.technician === name && t.rating);
    if (!rated.length) return 0;
    return rated.reduce((a, t) => a + (t.rating || 0), 0) / rated.length;
  };

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy("create");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(f.get("name")),
        username: String(f.get("username")),
        role: String(f.get("role")) === "Admin" ? "ADMIN" : String(f.get("role")).startsWith("Magang") ? "INTERN" : "TECHNICIAN",
      }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      notify(data?.error || "Gagal membuat akun");
      return;
    }
    setCredential({ username: data.user.username, password: data.tempPassword });
    setShow(false);
    onChanged();
  }

  async function toggleActive(u: UserAccount) {
    setBusy(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      notify(data?.error || "Gagal mengubah status akun");
      return;
    }
    notify(u.active ? `Akun ${u.name} dinonaktifkan` : `Akun ${u.name} diaktifkan kembali`);
    onChanged();
  }

  async function resetPassword(u: UserAccount) {
    setBusy(u.id + "-reset");
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      notify(data?.error || "Gagal reset password");
      return;
    }
    setCredential({ username: u.username, password: data.tempPassword });
  }

  return (
    <div className="modulePage">
      <section className="moduleHero">
        <div>
          <span className="miniTag">
            <UserCog size={14} /> HAK AKSES
          </span>
          <h2>Daftar Akun</h2>
          <p>Kelola admin dan teknisi/pegawai. Ini akun login sungguhan.</p>
        </div>
        <button className="heroWhiteButton" onClick={() => setShow(!show)}>
          <Plus /> Buat Data Akun Baru
        </button>
      </section>
      {credential && (
        <div className="permissionBox">
          <h3>Akun siap dipakai</h3>
          <p>
            Username <b>{credential.username}</b> — password sementara{" "}
            <b>{credential.password}</b>. Catat dan sampaikan ke pegawai
            sekarang; password ini tidak ditampilkan lagi setelah ini.
          </p>
          <button type="button" onClick={() => setCredential(null)}>
            Sudah dicatat
          </button>
        </div>
      )}
      {show && (
        <form className="quickCreate" onSubmit={add}>
          <input name="name" required placeholder="Nama pegawai" />
          <input
            name="username"
            required
            pattern="[a-z0-9._-]{3,32}"
            title="huruf kecil/angka, 3-32 karakter"
            placeholder="Username"
          />
          <select name="role">
            <option>Teknisi/Pegawai</option>
            <option>Magang (hanya QC)</option>
            <option>Admin</option>
          </select>
          <button className="newButton" disabled={busy === "create"}>
            {busy === "create" ? "Membuat..." : "Buat Akun"}
          </button>
        </form>
      )}
      <section className="ticketPanel modulePanel">
        <div className="simpleDataHead accountCols">
          <span>Nama</span>
          <span>Username</span>
          <span>Hak Akses</span>
          <span>Rating</span>
          <span>Status</span>
          <span>Pilihan</span>
        </div>
        {users.map((u) => {
          const rating = ratingFor(u.name);
          return (
            <div className="simpleDataRow accountCols" key={u.id}>
              <span>
                <b>{u.name}</b>
              </span>
              <span>{u.username}</span>
              <span>
                <i
                  className={`statusBadge ${u.role === "ADMIN" ? "primary" : "neutral"}`}
                >
                  {u.role === "ADMIN" ? "Admin" : u.role === "INTERN" ? "Magang (QC)" : "Teknisi/Pegawai"}
                </i>
              </span>
              <span className="customerStars">
                {rating
                  ? [1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} fill={rating >= n ? "currentColor" : "none"} />
                    ))
                  : "-"}
              </span>
              <span>
                <i className={`statusBadge ${u.active ? "success" : "neutral"}`}>
                  {u.active ? "Aktif" : "Nonaktif"}
                </i>
              </span>
              <span className="accountActions">
                <button
                  onClick={() => toggleActive(u)}
                  disabled={busy === u.id}
                >
                  {u.active ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  onClick={() => resetPassword(u)}
                  disabled={busy === u.id + "-reset"}
                >
                  Reset Password
                </button>
              </span>
            </div>
          );
        })}
        <div className="permissionBox">
          <h3>Hak Akses dan Kewenangan</h3>
          <p>
            Admin dapat mengubah profil toko, akun, jasa servis, mengedit atau
            menghapus data pelanggan, mencatat pembayaran langsung di luar
            tiket, dan melihat laporan. Teknisi/Pegawai dapat menerima servis
            (termasuk mencatat DP dan pelanggan baru), memperbarui proses,
            serta menghubungi pelanggan.
          </p>
        </div>
      </section>
    </div>
  );
}

function ServicesPanel({
  services,
  onCreate,
  onDelete,
}: {
  services: ServiceItem[];
  onCreate: (input: {
    name: string;
    partCost: number;
    shopPrice: number;
    userPrice: number;
    warrantyDays: number;
  }) => Promise<ServiceItem | null>;
  onDelete: (item: ServiceItem) => Promise<boolean>;
}) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const result = await onCreate({
      name: String(f.get("name")),
      partCost: Number(f.get("partCost")),
      shopPrice: Number(f.get("shopPrice")),
      userPrice: Number(f.get("userPrice")),
      warrantyDays: Number(f.get("warrantyDays")),
    });
    setBusy(false);
    if (result) setShow(false);
  }
  return (
    <div className="modulePage">
      <section className="moduleHero serviceCatalogHero">
        <div>
          <span className="miniTag">
            <ClipboardList size={14} /> MASTER TINDAKAN
          </span>
          <h2>Jasa Servis</h2>
          <p>Modal sparepart, tarif pelanggan Toko/User, dan garansi servis.</p>
        </div>
        <button className="heroWhiteButton" onClick={() => setShow(!show)}>
          <Plus /> Buat Data Jasa Servis
        </button>
      </section>
      {show && (
        <form className="quickCreate serviceCreate" onSubmit={add}>
          <input name="name" required placeholder="Nama tindakan servis" />
          <input
            name="partCost"
            type="number"
            min="0"
            placeholder="Modal sparepart"
          />
          <input
            name="shopPrice"
            type="number"
            min="0"
            placeholder="Tarif Toko"
          />
          <input
            name="userPrice"
            type="number"
            min="0"
            placeholder="Tarif User"
          />
          <select name="warrantyDays">
            {warrantyOptions.map(([d, label]) => (
              <option key={d} value={d}>{d === 0 ? "Tanpa garansi" : label}</option>
            ))}
          </select>
          <button className="newButton" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</button>
        </form>
      )}
      <section className="ticketPanel modulePanel">
        <div className="simpleDataHead serviceCols">
          <span>Nama Jasa Servis</span>
          <span>Modal Sparepart</span>
          <span>Biaya Toko</span>
          <span>Biaya User</span>
          <span>Garansi</span>
          <span>Pilihan</span>
        </div>
        {services.map((s) => (
          <div className="simpleDataRow serviceCols" key={s.id}>
            <span>
              <b>{s.name}</b>
            </span>
            <span>{money(s.partCost)}</span>
            <span>{money(s.shopPrice)}</span>
            <span>{money(s.userPrice)}</span>
            <span>
              {s.warrantyDays ? warrantyLabel(s.warrantyDays) : "Tidak Ada"}
            </span>
            <span>
              <button onClick={() => onDelete(s)}>
                Hapus
              </button>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function WarrantyPanel({
  tickets,
  onOpen,
  onClaim,
  shopName,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  onClaim: (ticket: Ticket) => void;
  shopName: string;
}) {
  const daysLeft = (t: Ticket) =>
    (t.warrantyDays || 0) -
    Math.floor((Date.now() - new Date(`${t.pickedUpAt || t.updatedAt}T00:00:00`).getTime()) / 86400000);
  // Only tickets that actually carry a warranty; active ones first (soonest
  // to expire at the top), expired ones after.
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = search.trim().toLowerCase();
  const rows = tickets
    .filter((t) => t.status === "Sudah Diambil" && (showAll || (t.warrantyDays || 0) > 0))
    .filter((t) => !q || `${t.id} ${oldStyleNumber(t.id)} ${t.customer} ${t.phone} ${t.device}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const wa = (a.warrantyDays || 0) > 0;
      const wb = (b.warrantyDays || 0) > 0;
      if (wa !== wb) return wa ? -1 : 1;
      if (!wa) return (b.pickedUpAt || "").localeCompare(a.pickedUpAt || "");
      const ra = daysLeft(a);
      const rb = daysLeft(b);
      if (ra >= 0 !== rb >= 0) return ra >= 0 ? -1 : 1;
      return ra >= 0 ? ra - rb : rb - ra;
    });
  return (
    <div className="modulePage">
      <section className="moduleHero warrantyHero">
        <div>
          <span className="miniTag">
            <Shield size={14} /> GARANSI SERVIS
          </span>
          <h2>Status Garansi</h2>
          <p>Pantau garansi aktif, hampir habis, dan hangus.</p>
        </div>
        <strong>
          {tickets.filter((t) => t.status === "Sudah Diambil" && (t.warrantyDays || 0) > 0 && daysLeft(t) >= 0).length}
          <small>Garansi aktif</small>
        </strong>
        <button
          className="heroExport"
          onClick={() =>
            downloadXls(
              "Status Garansi",
              shopName,
              ["No", "No. Servis", "Tgl. Terima", "Pemilik", "Telepon", "WhatsApp", "Nama Barang", "Nomor Serial", "Kerusakan", "Kondisi", "Ket./Tindakan", "Status", "Tgl. Ambil", "Garansi", "Tgl. Garansi Berakhir", "Status Garansi"],
              rows.map((t, i) => [
                i + 1,
                oldStyleNumber(t.id),
                fmtTgl(t.receivedAt, t.receivedTime),
                t.customer,
                fmtTelp(t.phone),
                fmtWa(t.phone),
                itemName(t),
                t.serial && t.serial !== "-" ? t.serial : "",
                t.issue,
                t.condition || "",
                t.serviceAction || "",
                t.status,
                fmtTgl(t.pickedUpAt, t.pickedUpTime),
                t.warrantyDays ? warrantyLabel(t.warrantyDays) : "Tidak Ada",
                t.warrantyDays ? fmtTglSingkat(warrantyEndDate(t)) : "Tidak Ada",
                !t.warrantyDays ? "Tidak Ada" : daysLeft(t) >= 0 ? `${daysLeft(t)} Hari Lagi` : "Sudah Hangus",
              ]),
            )
          }
        >
          <Download size={16} /> Export
        </button>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Daftar Garansi</h3>
            <p>{showAll ? "Semua servis yang sudah diambil" : "Hanya servis yang punya garansi"} · {rows.length} data</p>
          </div>
          <div className="panelTools">
            <label className="searchBox">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nomor, pelanggan, perangkat..."
              />
            </label>
            <label className="checkInline">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => {
                  setShowAll(e.target.checked);
                  setPage(1);
                }}
              />
              Tampilkan yang tanpa garansi
            </label>
          </div>
        </div>
        <div className="simpleDataHead warrantyCols">
          <span>No. Servis</span>
          <span>Pemilik</span>
          <span>Barang</span>
          <span>Tgl. Ambil</span>
          <span>Garansi</span>
          <span>Status Garansi</span>
          <span>Pilihan</span>
        </div>
        {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => {
          const start = new Date(`${t.pickedUpAt || t.updatedAt}T00:00:00`);
          const elapsed = Math.floor((Date.now() - start.getTime()) / 86400000);
          const remaining = (t.warrantyDays || 0) - elapsed;
          return (
            <div className="simpleDataRow warrantyCols" key={t.id}>
              <span>
                <button onClick={() => onOpen(t)}>{t.id}</button>
              </span>
              <span>{t.customer}</span>
              <span>{t.device}</span>
              <span>{t.pickedUpAt || t.updatedAt}</span>
              <span>
                {t.warrantyDays ? warrantyLabel(t.warrantyDays) : "Tidak Ada"}
              </span>
              <span>
                <i
                  className={`statusBadge ${remaining >= 0 ? "success" : "neutral"}`}
                >
                  {!t.warrantyDays
                    ? "Tidak Ada"
                    : remaining >= 0
                      ? `${remaining} Hari Lagi`
                      : "Hangus"}
                </i>
              </span>
              <span>
                {t.warrantyDays && remaining >= 0 ? (
                  <button onClick={() => onClaim(t)}>Terima Garansi</button>
                ) : (
                  "-"
                )}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="noData">
            <Shield />
            <strong>Belum ada servis bergaransi</strong>
            <p>Atur garansi di detail servis sebelum perangkat diambil.</p>
          </div>
        )}
        <Pager total={rows.length} page={page} onPage={setPage} />
      </section>
    </div>
  );
}

function ServiceReport({ tickets, shopName }: { tickets: Ticket[]; shopName: string }) {
  const months = useMemo(() => monthsPresent(tickets, localDateStr()), [tickets]);
  const [month, setMonth] = useState(localDateStr().slice(0, 7));
  const { rows, total } = useMemo(() => monthlyDaily(tickets, month), [tickets, month]);
  // Overview of every month, same rules as the day-by-day table.
  const overview = useMemo(
    () => months.map((m) => ({ month: m, ...monthlyDaily(tickets, m).total })),
    [tickets, months],
  );
  function exportMonth() {
    downloadXls(
      `Laporan Servis {toko} Bulan ${monthName(month)}`,
      shopName,
      ["Tanggal", "Barang Servis Masuk", "Barang Servis Telah Ditangani", "Barang Servis Keluar", "Total Pemasukan (Rp)", "Modal Sparepart (Rp)", "Profit (Rp)"],
      rows.map((r) => [fmtTglPanjang(r.date), fmtBarang(r.in), fmtBarang(r.done), fmtBarang(r.out), fmtRp(r.revenue), fmtRp(r.cost), fmtRp(r.profit)]),
      [["Total Laporan Servis Bulan Ini", fmtBarang(total.in), fmtBarang(total.done), fmtBarang(total.out), fmtRp(total.revenue), fmtRp(total.cost), fmtRp(total.profit)]],
    );
  }
  return (
    <div className="modulePage">
      <section className="reportSummary">
        <article>
          <small>Servis Masuk</small>
          <strong>{total.in}</strong>
        </article>
        <article>
          <small>Telah Ditangani</small>
          <strong>{total.done}</strong>
        </article>
        <article>
          <small>Barang Keluar</small>
          <strong>{total.out}</strong>
        </article>
        <article>
          <small>Total Pemasukan</small>
          <strong>{money(total.revenue)}</strong>
        </article>
        <article>
          <small>Modal Sparepart</small>
          <strong>{money(total.cost)}</strong>
        </article>
        <article>
          <small>Profit</small>
          <strong>{money(total.profit)}</strong>
        </article>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Laporan Servis</h3>
            <p>
              Per hari: masuk (tanggal terima), telah ditangani (tanggal selesai), keluar (tanggal
              diambil). Pemasukan, modal, dan profit dihitung pada tanggal pengambilan dan hanya
              dari uang yang sudah dibayar — servis tempo yang belum dibayar baru masuk setelah lunas.
            </p>
          </div>
          <div className="panelTools">
            <select aria-label="Pilih bulan" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
            </select>
            <button onClick={exportMonth}>
              <Download size={17} />
              <span>Export</span>
            </button>
          </div>
        </div>
        <div className="simpleDataHead reportCols">
          <span>Tanggal</span>
          <span>Masuk</span>
          <span>Telah Ditangani</span>
          <span>Keluar</span>
          <span>Total Pemasukan</span>
          <span>Modal Sparepart</span>
          <span>Profit</span>
        </div>
        {rows.map((r) => (
          <div className="simpleDataRow reportCols" key={r.date}>
            <span>{fmtTglPanjang(r.date)}</span>
            <span>{fmtBarang(r.in)}</span>
            <span>{fmtBarang(r.done)}</span>
            <span>{fmtBarang(r.out)}</span>
            <span>{money(r.revenue)}</span>
            <span>{money(r.cost)}</span>
            <span>
              <b>{money(r.profit)}</b>
            </span>
          </div>
        ))}
        <div className="simpleDataRow reportCols reportTotalRow">
          <span>Total Laporan Servis Bulan Ini</span>
          <span>{fmtBarang(total.in)}</span>
          <span>{fmtBarang(total.done)}</span>
          <span>{fmtBarang(total.out)}</span>
          <span>{money(total.revenue)}</span>
          <span>{money(total.cost)}</span>
          <span>{money(total.profit)}</span>
        </div>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Ringkasan per Bulan</h3>
            <p>Klik sebuah bulan untuk melihat rincian per harinya.</p>
          </div>
        </div>
        <div className="simpleDataHead reportCols">
          <span>Bulan</span>
          <span>Masuk</span>
          <span>Telah Ditangani</span>
          <span>Keluar</span>
          <span>Total Pemasukan</span>
          <span>Modal Sparepart</span>
          <span>Profit</span>
        </div>
        {overview.map((r) => (
          <div
            className={`simpleDataRow reportCols clickableRow${r.month === month ? " activeRow" : ""}`}
            key={r.month}
            role="button"
            tabIndex={0}
            onClick={() => setMonth(r.month)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setMonth(r.month);
            }}
          >
            <span>{monthName(r.month)}</span>
            <span>{fmtBarang(r.in)}</span>
            <span>{fmtBarang(r.done)}</span>
            <span>{fmtBarang(r.out)}</span>
            <span>{money(r.revenue)}</span>
            <span>{money(r.cost)}</span>
            <span>
              <b>{money(r.profit)}</b>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function TechnicianReport({ tickets, shopName }: { tickets: Ticket[]; shopName: string }) {
  const months = useMemo(() => monthsPresent(tickets, localDateStr()), [tickets]);
  const [month, setMonth] = useState(localDateStr().slice(0, 7));
  const rep = useMemo(() => technicianMonthly(tickets, month), [tickets, month]);
  const cols = `150px repeat(${Math.max(rep.names.length, 1)}, minmax(110px, 1fr))`;
  function exportMonth() {
    downloadXls(
      `Laporan Teknisi {toko} Bulan ${monthName(month)}`,
      shopName,
      ["Tanggal", ...rep.names],
      rep.rows.map((r) => [fmtTglPanjang(r.date), ...rep.names.map((n) => fmtKali(r.counts[n] || 0))]),
      [
        ["Total Menangani Servis Bulan Ini", ...rep.names.map((n) => fmtKali(rep.handled[n] || 0))],
        ["Total Pemasukan Oleh Teknisi Bulan Ini", ...rep.names.map((n) => fmtRp(rep.revenue[n] || 0))],
        ["Total Profit Oleh Teknisi Bulan Ini", ...rep.names.map((n) => fmtRp(rep.profit[n] || 0))],
      ],
    );
  }
  return (
    <div className="modulePage">
      <section className="moduleHero techReportHero">
        <div>
          <span className="miniTag">
            <Users size={14} /> PRODUKTIVITAS
          </span>
          <h2>Laporan Teknisi</h2>
          <p>Jumlah servis yang selesai ditangani setiap teknisi per tanggal, dan profit dari servis yang diambil.</p>
        </div>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Bulan {monthName(month)}</h3>
          </div>
          <div className="panelTools">
            <select aria-label="Pilih bulan" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
            </select>
            <button onClick={exportMonth}>
              <Download size={17} />
              <span>Export</span>
            </button>
          </div>
        </div>
        <div className="techReportTable">
          <div className="techReportHead" style={{ display: "grid", gridTemplateColumns: cols }}>
            <span>Tanggal</span>
            {rep.names.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          {rep.rows.map((r) => (
            <div className="techReportRow" key={r.date} style={{ display: "grid", gridTemplateColumns: cols }}>
              <span>{fmtTglPanjang(r.date)}</span>
              {rep.names.map((n) => (
                <span key={n}>{fmtKali(r.counts[n] || 0)}</span>
              ))}
            </div>
          ))}
          <div className="techReportRow reportTotalRow" style={{ display: "grid", gridTemplateColumns: cols }}>
            <span>Total Menangani Servis Bulan Ini</span>
            {rep.names.map((n) => (
              <span key={n}>{fmtKali(rep.handled[n] || 0)}</span>
            ))}
          </div>
          <div className="techReportRow reportTotalRow" style={{ display: "grid", gridTemplateColumns: cols }}>
            <span>Total Pemasukan Oleh Teknisi Bulan Ini</span>
            {rep.names.map((n) => (
              <span key={n}>{money(rep.revenue[n] || 0)}</span>
            ))}
          </div>
          <div className="techReportRow reportTotalRow" style={{ display: "grid", gridTemplateColumns: cols }}>
            <span>Total Profit Oleh Teknisi Bulan Ini</span>
            {rep.names.map((n) => (
              <span key={n}>{money(rep.profit[n] || 0)}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({
  shop,
  onSave,
  onAddType,
  onRemoveType,
}: {
  shop: ShopSettings;
  onSave: (shop: ShopSettings) => void;
  onAddType: (name: string) => Promise<string | null>;
  onRemoveType: (name: string) => void;
}) {
  const [newType, setNewType] = useState("");
  const [form, setForm] = useState(shop);
  // Skip re-syncing from the shop prop while the user has unsaved edits,
  // so a cross-tab conflict-merge (useAutosave's setShop on a 409) can't
  // silently wipe out what they're typing.
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setForm(shop);
  }, [shop]);
  const field = (key: keyof ShopSettings, value: string | boolean) => {
    dirty.current = true;
    setForm((old) => ({ ...old, [key]: value }));
  };
  return (
    <div className="modulePage settingsPage">
      <section className="moduleHero settingsHero">
        <div>
          <span className="miniTag">
            <Settings size={14} /> PROFIL & SISTEM
          </span>
          <h2>Pengaturan Toko</h2>
          <p>
            Informasi ini digunakan pada tanda terima, QR servis, dan pesan
            pelanggan.
          </p>
        </div>
        <Settings size={50} />
      </section>
      <form
        className="settingsForm"
        onSubmit={(e) => {
          e.preventDefault();
          dirty.current = false;
          onSave(form);
        }}
      >
        <section className="settingsCard">
          <div className="settingsTitle">
            <span>
              <Settings />
            </span>
            <div>
              <h3>Profil Toko</h3>
              <p>Nama usaha dan informasi kontak utama</p>
            </div>
          </div>
          <div className="settingsGrid">
            <label>
              Nama toko / usaha
              <input
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </label>
            <label>
              Telepon
              <input
                value={form.phone}
                onChange={(e) => field("phone", e.target.value)}
              />
            </label>
            <label>
              WhatsApp toko
              <input
                value={form.whatsapp}
                onChange={(e) => field("whatsapp", e.target.value)}
              />
            </label>
            <label>
              Instagram
              <input
                value={form.instagram}
                placeholder="tanpa @"
                onChange={(e) => field("instagram", e.target.value)}
              />
            </label>
            <label>
              TikTok
              <input
                value={form.tiktok}
                placeholder="tanpa @"
                onChange={(e) => field("tiktok", e.target.value)}
              />
            </label>
            <label className="full">
              Link ulasan Google Maps
              <input
                value={form.reviewUrl || ""}
                placeholder="https://g.page/r/…/review"
                onChange={(e) => field("reviewUrl", e.target.value)}
              />
              <small className="fieldHint">
                Opsional. Jika diisi, kode QR ke halaman ulasan dicetak di nota lunas untuk semua pelanggan. Ambil dari
                Google Business Profile → &quot;Minta ulasan&quot;.
              </small>
            </label>
            <label className="full">
              Alamat toko
              <textarea
                value={form.address}
                onChange={(e) => field("address", e.target.value)}
              />
              <small className="fieldHint">
                Tampil di bawah logo pada tanda terima dan nota. Instagram &amp; TikTok tampil di bagian bawah.
              </small>
            </label>
            <div className="full deviceTypeManage">
              <span>Jenis barang saat input servis</span>
              <div>
                {deviceTypeList(shop).map((t) => (
                  <i key={t}>
                    {t}
                    <button type="button" title={`Hapus ${t}`} onClick={() => onRemoveType(t)}>
                      ×
                    </button>
                  </i>
                ))}
              </div>
              <div className="deviceTypeRow">
                <input
                  value={newType}
                  maxLength={40}
                  placeholder="Tambah jenis baru, mis. Proyektor"
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddType(newType).then((ok) => ok && setNewType(""));
                    }
                  }}
                />
                <button
                  type="button"
                  className="deviceTypeAdd"
                  disabled={!newType.trim()}
                  onClick={() => onAddType(newType).then((ok) => ok && setNewType(""))}
                >
                  + Tambah
                </button>
              </div>
              <small className="fieldHint">Berlaku langsung tanpa menekan Simpan. Servis lama tidak berubah.</small>
            </div>
            <label className="full">
              Deskripsi usaha
              <textarea
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="settingsCard">
          <div className="settingsTitle">
            <span>
              <FileText />
            </span>
            <div>
              <h3>Nota & Pembayaran</h3>
              <p>Syarat servis dan rekening pembayaran</p>
            </div>
          </div>
          <div className="settingsGrid">
            <label className="full">
              Syarat dan ketentuan
              <textarea
                value={form.terms}
                onChange={(e) => field("terms", e.target.value)}
              />
            </label>
            <label className="full">
              Rekening / metode pembayaran
              <textarea
                value={form.bank}
                onChange={(e) => field("bank", e.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="settingsCard lockCard">
          <div className="settingsTitle">
            <span>
              <ClipboardCheck />
            </span>
            <div>
              <h3>Cek Awal (QC)</h3>
              <p>Checklist pengecekan unit oleh magang dan tinjauan teknisi. Jika dimatikan, panel QC, notifikasi, dan antrean QC magang tidak aktif (data QC tetap tersimpan).</p>
            </div>
          </div>
          <button
            type="button"
            className={`switchControl ${form.qcEnabled !== false ? "on" : ""}`}
            onClick={() => field("qcEnabled", form.qcEnabled === false)}
          >
            <i />
            <span>{form.qcEnabled !== false ? "AKTIF" : "NONAKTIF"}</span>
          </button>
        </section>
        <section className="settingsCard lockCard">
          <div className="settingsTitle">
            <span>
              <ShieldCheck />
            </span>
            <div>
              <h3>Gembok Toko</h3>
              <p>Cegah perubahan data oleh pegawai saat toko tutup</p>
            </div>
          </div>
          <button
            type="button"
            className={`switchControl ${form.lockEnabled ? "on" : ""}`}
            onClick={() => field("lockEnabled", !form.lockEnabled)}
          >
            <i />
            <span>{form.lockEnabled ? "DIKUNCI" : "DIBUKA"}</span>
          </button>
        </section>
        <div className="settingsSave">
          <button type="button" onClick={() => setForm(defaultSettings)}>
            Kembalikan Default
          </button>
          <button className="newButton">
            <CheckCircle2 size={18} /> Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}

function WaTemplatesPanel({
  shop,
  onSave,
}: {
  shop: ShopSettings;
  onSave: (shop: ShopSettings) => void;
}) {
  const [form, setForm] = useState(shop);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setForm(shop);
  }, [shop]);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const field = (key: WaTemplateKey, value: string) => {
    dirty.current = true;
    setForm((old) => ({ ...old, [key]: value }));
  };
  const insertToken = (key: WaTemplateKey, token: string) => {
    const el = textareaRefs.current[key];
    const current = form[key];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    field(key, current.slice(0, start) + token + current.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  const keys = Object.keys(WA_TEMPLATE_LABELS) as WaTemplateKey[];
  return (
    <div className="modulePage settingsPage">
      <section className="moduleHero settingsHero">
        <div>
          <span className="miniTag">
            <MessageCircle size={14} /> TEMPLATE PESAN
          </span>
          <h2>Pesan WhatsApp</h2>
          <p>
            Ubah kata-kata pesan yang dikirim ke pelanggan. Klik kode di bawah
            tiap kotak untuk menyisipkan data seperti nama atau nomor servis
            secara otomatis — jangan diketik manual.
          </p>
        </div>
        <MessageCircle size={50} />
      </section>
      <form
        className="settingsForm"
        onSubmit={(e) => {
          e.preventDefault();
          dirty.current = false;
          onSave(form);
        }}
      >
        {keys.map((key) => (
          <section className="settingsCard" key={key}>
            <div className="settingsTitle">
              <span>
                <MessageCircle />
              </span>
              <div>
                <h3>{WA_TEMPLATE_LABELS[key]}</h3>
                {WA_PLACEHOLDERS[key].length > 0 && (
                  <p>Kode yang bisa disisipkan, klik untuk menambah:</p>
                )}
              </div>
            </div>
            {WA_PLACEHOLDERS[key].length > 0 && (
              <div className="waPlaceholderChips">
                {WA_PLACEHOLDERS[key].map((p) => (
                  <button
                    type="button"
                    key={p.token}
                    onClick={() => insertToken(key, p.token)}
                    title={p.label}
                  >
                    {p.token}
                  </button>
                ))}
              </div>
            )}
            <div className="settingsGrid">
              <label className="full">
                <textarea
                  ref={(el) => { textareaRefs.current[key] = el; }}
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                  rows={key === "waClosing" || key === "waSalutation" ? 2 : 6}
                />
              </label>
            </div>
          </section>
        ))}
        <div className="settingsSave">
          <button
            type="button"
            onClick={() => {
              dirty.current = true;
              setForm((old) => ({ ...old, ...WA_TEMPLATE_DEFAULTS }));
            }}
          >
            Kembalikan Default
          </button>
          <button className="newButton">
            <CheckCircle2 size={18} /> Simpan Template Pesan
          </button>
        </div>
      </form>
    </div>
  );
}
