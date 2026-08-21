"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { normalizePhone } from "@/lib/phone";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
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
  Wallet,
  Landmark,
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
  pickupBy?: string;
  handedBy?: string;
};
type ServiceItem = {
  id: string;
  name: string;
  partCost: number;
  shopPrice: number;
  userPrice: number;
  warrantyDays: number;
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
  role: "ADMIN" | "TECHNICIAN";
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
};
type ShopSettings = {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  description: string;
  terms: string;
  bank: string;
  lockEnabled: boolean;
};
const defaultSettings: ShopSettings = {
  name: "FS COMP",
  phone: "0816692428",
  whatsapp: "0816692428",
  address: "Jalan Raya Wiradesa No. 1, Pekalongan",
  description: "Service, upgrade, jual beli laptop dan komputer",
  terms:
    "Barang yang tidak diambil lebih dari 30 hari setelah konfirmasi bukan tanggung jawab toko.",
  bank: "BCA 251-029-8724 a/n Faza Abdani Auni Robbi",
  lockEnabled: false,
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
  [Plus, "Terima Servis"],
  [Wrench, "Proses Servis"],
  [PackageCheck, "Bisa Diambil"],
  [CheckCircle2, "Sudah Diambil"],
  [Shield, "Status Garansi"],
  [Banknote, "Status Pembayaran"],
  [BarChart3, "Laporan Servis"],
  [Users, "Laporan Teknisi"],
] as const;

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const tone = (s: Status) =>
  s === "Bisa Diambil" || s === "Sudah Diambil"
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
const waLink = (phone: string) => `https://wa.me/${normalizePhone(phone)}`;
// finalCost defaults to 0 until costConfirmed is set, so `finalCost || estimate`
// wrongly falls back to the estimate for a genuinely free (Rp0) confirmed job.
const finalPrice = (t: Ticket) =>
  t.costConfirmed ? (t.finalCost ?? 0) : t.finalCost || t.estimate;
// Gate for printing a "Nota Lunas" — requires the final cost to have been
// explicitly confirmed (not just defaulting to an unconfirmed estimate) and
// the remaining balance to actually be zero, so the app can never hand out
// a paid-in-full receipt for a ticket that hasn't really been settled.
const isFullyPaid = (t: Ticket) =>
  t.costConfirmed && Math.max(0, finalPrice(t) - t.downPayment) === 0;
function mergeById<T extends { id: string }>(
  serverArr: T[],
  localArr: T[],
  stamp: (item: T) => string,
): T[] {
  const serverIds = new Set(serverArr.map((s) => s.id));
  const merged = serverArr.map((s) => {
    const l = localArr.find((x) => x.id === s.id);
    if (!l) return s;
    return stamp(l) >= stamp(s) ? l : s;
  });
  const localOnly = localArr.filter((l) => !serverIds.has(l.id));
  return [...localOnly, ...merged];
}
const mergeTickets = (server: Ticket[], local: Ticket[]) =>
  mergeById(
    server,
    local,
    (t) => t._touchedAt || t.updatedAt || t.receivedAt || "",
  );
const mergeCustomers = (server: Customer[], local: Customer[]) =>
  mergeById(server, local, (c) => c._touchedAt || c.createdAt || "");
function useAutosave<T>(
  key: "tickets" | "shop" | "services" | "customers",
  value: T,
  ready: boolean,
  versions: React.MutableRefObject<Record<string, number>>,
  merge: ((server: T, local: T) => T) | null,
  apply: (value: T) => void,
  notify: (message: string) => void,
) {
  // The first render after `ready` flips true carries the value we just
  // loaded FROM the server — writing it straight back would bump the
  // version and log an audit entry for a no-op on every page load/refresh.
  const skipNext = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/state/${key}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            value,
            expectedVersion: versions.current[key],
          }),
        });
        if (res.status === 409) {
          const conflict = await res.json();
          versions.current[key] = conflict.version;
          const resolved = merge
            ? merge(conflict.value, value)
            : conflict.value;
          apply(resolved);
          notify(
            "Ada perubahan dari pengguna lain, data disinkronkan otomatis",
          );
          return;
        }
        if (res.ok) {
          const data = await res.json();
          versions.current[key] = data.version;
        } else {
          const body = await res.json().catch(() => null);
          notify(
            body?.error
              ? `Gagal menyimpan: ${body.error}`
              : "Gagal menyimpan perubahan ke server",
          );
        }
      } catch {
        /* offline: local state and localStorage fallback still apply */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [key, value, ready]);
}

export default function ServiceDesk() {
  const [tickets, setTickets] = useState<Ticket[]>(seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "Semua">("Semua");
  const [active, setActive] = useState("Proses Servis");
  const [modal, setModal] = useState<"new" | "detail" | "edit" | "chat" | "handoff" | "scan" | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
        .filter((u) => u.active)
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
  const [serverReady, setServerReady] = useState(false);
  const stateVersions = useRef<Record<string, number>>({});
  const submittingRef = useRef(false);
  const paymentInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (modal === "new") {
      setCustomerQuery("");
      setCustomerPickerOpen(false);
    }
  }, [modal]);

  useEffect(() => {
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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCurrentUser(data.user));
    Promise.all(
      ["tickets", "shop", "services", "customers"].map(async (key) => {
        const r = await fetch(`/api/state/${key}`, { cache: "no-store" });
        if (!r.ok) return [key, null, 0] as const;
        const data = await r.json();
        return [key, data.value, data.version as number] as const;
      }),
    )
      .then((values) => {
        for (const [key, value, version] of values) {
          stateVersions.current[key] = version;
          if (value) {
            if (key === "tickets") setTickets(value);
            if (key === "shop") setShop(value);
            if (key === "services") setServices(value);
            if (key === "customers") setCustomers(value);
          } else {
            const fallback =
              key === "tickets"
                ? saved
                  ? JSON.parse(saved)
                  : seed
                : key === "shop"
                  ? savedShop
                    ? JSON.parse(savedShop)
                    : defaultSettings
                  : key === "services"
                    ? savedServices
                      ? JSON.parse(savedServices)
                      : defaultServices
                    : savedCustomers
                      ? JSON.parse(savedCustomers)
                      : seedCustomers;
            if (key === "tickets") setTickets(fallback);
            if (key === "shop") setShop(fallback);
            if (key === "services") setServices(fallback);
            if (key === "customers") setCustomers(fallback);
            // Never auto-write placeholder/demo data to a production
            // server — an empty production DB should stay empty until an
            // admin enters real data, not get silently seeded with
            // sample tickets/customers that look real. Local dev keeps
            // the old convenience of a self-seeding first run.
            if (process.env.NODE_ENV !== "production") {
              fetch(`/api/state/${key}`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ value: fallback, expectedVersion: 0 }),
              })
                .then((r) => (r.ok ? r.json() : null))
                .then((r) => {
                  if (r) stateVersions.current[key] = r.version;
                });
            }
          }
        }
        setServerReady(true);
      })
      .catch(() => {
        setServerReady(false);
      });
  }, []);
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
  useAutosave("tickets", tickets, serverReady, stateVersions, mergeTickets, setTickets, notify);
  useAutosave("shop", shop, serverReady, stateVersions, null, setShop, notify);
  useAutosave("services", services, serverReady, stateVersions, null, setServices, notify);
  useAutosave("customers", customers, serverReady, stateVersions, mergeCustomers, setCustomers, notify);
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
      const ticket =
        tickets.find(
          (t) => t.phone && anchor.href.includes(t.phone.replace(/^0/, "")),
        ) || selected;
      if (ticket)
        fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ticketId: ticket.id,
            phone: ticket.phone,
            message: decodeURIComponent(
              anchor.href.split("text=")[1] || "Chat pelanggan",
            ),
            template: "STATUS",
          }),
        });
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
    () =>
      tickets.filter((t) => {
        const matches = `${t.id} ${t.customer} ${t.device} ${t.issue}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const statusMatch = filter === "Semua" || t.status === filter;
        const sectionMatch =
          active === "Bisa Diambil"
            ? t.status === "Bisa Diambil"
            : active === "Sudah Diambil"
              ? t.status === "Sudah Diambil"
              : active === "Proses Servis"
                ? processStatuses.includes(t.status)
                : true;
        const technicianMatch = technicianFilter === "Semua Teknisi" || t.technician === technicianFilter;
        return matches && statusMatch && sectionMatch && technicianMatch;
      }),
    [tickets, query, filter, active, technicianFilter],
  );

  const stats = {
    process: tickets.filter((t) => processStatuses.includes(t.status)).length,
    ready: tickets.filter((t) => t.status === "Bisa Diambil").length,
    customers: new Set(tickets.map((t) => t.phone)).size,
    revenue: tickets
      .filter((t) => t.status === "Sudah Diambil")
      .reduce((a, t) => a + finalPrice(t), 0),
  };

  function notify(message: string) {
    setToast(message);
  }
  async function recordPayment(
    ticketId: string,
    amount: number,
    method: string,
    note: string,
  ) {
    if (!amount) return;
    // Guards against the common "impatient double click" duplicate — not a
    // real server-side idempotency key, but cheap and covers the everyday
    // case without a schema change.
    const guardKey = `${ticketId}:${amount}:${method}`;
    if (paymentInFlightRef.current.has(guardKey)) return;
    paymentInFlightRef.current.add(guardKey);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId, amount, method, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        notify(
          body?.error
            ? `Pembayaran gagal tercatat: ${body.error}`
            : "Pembayaran gagal tercatat di server",
        );
      }
    } catch {
      notify("Pembayaran gagal tercatat — periksa koneksi lalu cek ulang");
    } finally {
      paymentInFlightRef.current.delete(guardKey);
    }
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
    setTickets((old) =>
      old.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: localDateStr(),
              statusChangedAt: localDateStr(),
              _touchedAt: new Date().toISOString(),
              // Stamp the pickup date the first time a ticket reaches "Sudah
              // Diambil" via this quick dropdown, since that's the everyday
              // path (not the rarely-used edit form) and warranty countdown
              // depends on it staying fixed instead of drifting with updatedAt.
              ...(status === "Sudah Diambil" && !t.pickedUpAt
                ? {
                    pickedUpAt: localDateStr(),
                    pickedUpTime: new Date().toTimeString().slice(0, 5),
                  }
                : {}),
            }
          : t,
      ),
    );
    setSelected((old) => (old?.id === id ? { ...old, status } : old));
    notify(`Status diperbarui: ${status}`);
  }
  function patchTicket(id: string, patch: Partial<Ticket>, message: string) {
    const before = tickets.find((t) => t.id === id);
    if (before && patch.downPayment !== undefined && patch.downPayment !== before.downPayment) {
      const delta = patch.downPayment - before.downPayment;
      recordPayment(
        id,
        delta,
        patch.paymentMethod || before.paymentMethod || "Tunai",
        delta > 0 ? message : `Koreksi turun DP — ${message}`,
      );
    }
    setTickets((old) =>
      old.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              updatedAt: localDateStr(),
              _touchedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
    setSelected((old) => (old?.id === id ? { ...old, ...patch } : old));
    notify(message);
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
      brand: String(form.get("brand")),
      serial: String(form.get("serial") || "-"),
      accessories: String(form.get("accessories") || "Unit only"),
      issue: String(form.get("issue")),
      condition: conditionVal ? (conditionVal as Ticket["condition"]) : undefined,
      serviceAction: String(form.get("serviceAction") || ""),
      technician: String(form.get("technician")),
      partCost: Number(form.get("partCost") || 0),
      estimate: Number(form.get("estimate") || 0),
      downPayment: Number(form.get("downPayment") || 0),
      finalCost: Number(form.get("finalCost") || 0),
      handledAt: String(form.get("handledAt") || ""),
      handledTime: String(form.get("handledTime") || ""),
      notes: String(form.get("notes") || ""),
      pickedUpAt: String(form.get("pickedUpAt") || ""),
      pickedUpTime: String(form.get("pickedUpTime") || ""),
      paymentMethod: String(form.get("paymentMethod") || "Tunai"),
      warrantyDays: Number(form.get("warrantyDays") || 0),
      pickupBy: String(form.get("pickupBy") || ""),
      handedBy: String(form.get("handedBy") || "Admin"),
    };
    patchTicket(selected.id, patch, `Data servis ${selected.id} berhasil diubah`);
    setModal("detail");
  }
  const salutation = (name: string) =>
    `Assalamu'alaikum warahmatullahi wabarakatuh, Kak ${name}`;
  const closing =
    "Jazakallahu khoiron 🤲😊";
  function whatsappUrl(ticket: Ticket, kind: "empty" | "received" | "cost" | "cost-options") {
    const base = waLink(ticket.phone);
    if (kind === "empty") return base;
    const tracking = `${location.origin}/track?id=${encodeURIComponent(ticket.id)}`;
    const received = `${salutation(ticket.customer)},\n\nTerima kasih sudah mempercayakan servis ${ticket.device} kepada *${shop.name}*. Semoga Allah membalas kepercayaan Kakak dengan kebaikan. Barang Kakak sudah kami terima dengan nomor servis *${ticket.id}* pada ${new Date(`${ticket.receivedAt}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}.\n\nPerkembangan servis dapat dicek kapan saja melalui link berikut:\n${tracking}\n\nJika link belum dapat dibuka, silakan simpan nomor WhatsApp kami terlebih dahulu. Insya Allah kami akan mengabari kembali saat ada perkembangan.\n\n${closing}`;
    const cost = `${salutation(ticket.customer)},\n\nKami sudah melakukan pengecekan ${ticket.device}. Untuk penanganan *${ticket.serviceAction || ticket.issue}*, estimasi biaya servisnya adalah *${money(ticket.estimate)}*.\n\nApakah servisnya boleh kami lanjutkan? Mohon balas *LANJUT* atau *TIDAK*. Jika ada yang ingin ditanyakan, silakan sampaikan ya, insya Allah kami bantu.\n\n${closing}`;
    const options = `${salutation(ticket.customer)},\n\nAlhamdulillah, hasil pengecekan ${ticket.device} sudah selesai. Kami menawarkan pilihan penanganan berikut:\n\n1. Perbaikan utama — *${money(ticket.estimate)}*\n2. Perbaikan tanpa penggantian komponen — silakan konfirmasi\n3. Tidak dilanjutkan\n\nMohon balas nomor pilihan yang diinginkan. Kami belum mengerjakan sebelum mendapat persetujuan dari Kakak.\n\n${closing}`;
    return `${base}?text=${encodeURIComponent(kind === "received" ? received : kind === "cost" ? cost : options)}`;
  }
  function printTicket(mode: "receipt" | "receipt2" | "qr" | "accessories" | "paid") {
    if (mode === "paid" && selected && !isFullyPaid(selected)) {
      notify("Belum bisa cetak nota lunas — biaya final belum dikonfirmasi atau saldo belum Rp0");
      return;
    }
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 120);
  }
  function accessoryItems(value: string) {
    return value
      .split(/[,+;\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => !/^(-|tidak ada|unit only)$/i.test(x));
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
  function submitTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => {
      submittingRef.current = false;
    }, 1000);
    const form = new FormData(e.currentTarget);
    const now = new Date();
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
          t.status !== "Sudah Diambil",
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
    const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    let seq = tickets.length + 17;
    let id = `SRV-${datePart}-${String(seq).padStart(3, "0")}`;
    while (tickets.some((t) => t.id === id)) {
      seq += 1;
      id = `SRV-${datePart}-${String(seq).padStart(3, "0")}`;
    }
    const next: Ticket = {
      id,
      customer: String(form.get("customer")),
      phone,
      device: String(form.get("device")),
      brand: String(form.get("brand")),
      serial,
      issue: String(form.get("issue")),
      accessories: String(form.get("accessories") || "Unit only"),
      technician: String(form.get("technician")),
      status: "Belum Cek",
      estimate: Number(form.get("estimate") || 0),
      downPayment: Number(form.get("downPayment") || 0),
      finalCost: 0,
      rating: 0,
      customerConfirmed: false,
      costConfirmed: false,
      category: String(form.get("category")) as "Toko" | "User",
      address: String(form.get("address") || "-"),
      paymentTermDays: Number(form.get("paymentTermDays") || 0),
      receivedAt: localDateStr(now),
      updatedAt: localDateStr(now),
      statusChangedAt: localDateStr(now),
      _touchedAt: now.toISOString(),
    };
    setTickets((old) => [next, ...old]);
    setSelected(next);
    setHandoffDone({ receipt: false, whatsapp: false, qr: false, accessories: accessoryItems(next.accessories).length === 0 });
    setModal("handoff");
    notify(`Servis ${id} berhasil dibuat`);
    if (next.downPayment > 0)
      recordPayment(id, next.downPayment, "Tunai", `DP awal saat servis ${id} diterima`);
    if (!customers.some((c) => c.phone === phone))
      setCustomers((old) => [
        {
          id: `C-${Date.now()}`,
          name: next.customer,
          category: next.category || "User",
          phone,
          address: next.address || "-",
          rating: 0,
          createdAt: next.receivedAt,
          _touchedAt: now.toISOString(),
        },
        ...old,
      ]);
  }
  function exportCsv() {
    const head = [
      "No Servis",
      "Pelanggan",
      "Telepon",
      "Perangkat",
      "Keluhan",
      "Teknisi",
      "Status",
      "Estimasi",
      "DP",
      "Tanggal",
    ];
    const rows = visible.map((t) => [
      t.id,
      t.customer,
      t.phone,
      t.device,
      t.issue,
      t.technician,
      t.status,
      t.estimate,
      t.downPayment,
      t.receivedAt,
    ]);
    const csv = [head, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `laporan-servis-${localDateStr()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify(
      `${rows.length} servis diunduh sesuai filter yang aktif saat ini`,
    );
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
                !["Profil Toko", "Akun", "Jasa Servis"].includes(label),
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
              {label === "Status Pembayaran" && (
                <b>
                  {
                    tickets.filter((t) => finalPrice(t) > t.downPayment)
                      .length
                  }
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebarHelp">
          <ShieldCheck />
          <strong>Data tersimpan lokal</strong>
          <small>Aman di perangkat ini dan siap dipakai offline.</small>
        </div>
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
            <button className="iconCircle">
              <Bell size={19} />
              <i />
            </button>
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
              tickets={tickets}
              customers={customers}
              onChange={(value) => {
                setCustomers(value);
                notify("Data pelanggan diperbarui");
              }}
              onPhoneChanged={(oldPhone, newPhone) => {
                setTickets((old) =>
                  old.map((t) =>
                    normalizePhone(t.phone) === normalizePhone(oldPhone)
                      ? {
                          ...t,
                          phone: newPhone,
                          _touchedAt: new Date().toISOString(),
                        }
                      : t,
                  ),
                );
                notify(
                  `Nomor WA diperbarui — riwayat servis lama ikut disesuaikan ke ${newPhone}`,
                );
              }}
              onOpen={openDetail}
            />
          ) : active === "Status Pembayaran" ? (
            <PaymentsPanel
              tickets={tickets}
              onSettle={(t) =>
                patchTicket(
                  t.id,
                  {
                    finalCost: finalPrice(t),
                    downPayment: finalPrice(t),
                    costConfirmed: true,
                    paymentMethod: t.paymentMethod || "Tunai",
                  },
                  `Pembayaran ${t.id} telah lunas`,
                )
              }
              onOpen={openDetail}
            />
          ) : active === "Profil Toko" ? (
            <SettingsPanel
              shop={shop}
              onSave={(value) => {
                setShop(value);
                notify("Profil toko berhasil disimpan");
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
              onChange={(value) => {
                setServices(value);
                notify("Data jasa servis diperbarui");
              }}
            />
          ) : active === "Status Garansi" ? (
            <WarrantyPanel tickets={tickets} onOpen={openDetail} />
          ) : active === "Laporan Servis" ? (
            <ServiceReport tickets={tickets} />
          ) : active === "Laporan Teknisi" ? (
            <TechnicianReport tickets={tickets} staff={staff} />
          ) : (
            <>
              <section className="welcomeCard">
                <div>
                  <span className="miniTag">
                    <Smartphone size={14} /> Service Command Center
                  </span>
                  <h2>Selamat datang, {currentUser?.name?.split(" ")[0] || "kembali"}.</h2>
                  <p>
                    Pantau setiap perangkat dari meja penerimaan sampai kembali
                    ke tangan pelanggan.
                  </p>
                </div>
                <div className="orb">
                  <Wrench size={44} />
                </div>
              </section>
              <div className="serviceStats">
                <article>
                  <span className="statIcon blue">
                    <Wrench />
                  </span>
                  <div>
                    <small>Sedang diproses</small>
                    <strong>{stats.process}</strong>
                    <em>Unit aktif</em>
                  </div>
                </article>
                <article>
                  <span className="statIcon green">
                    <PackageCheck />
                  </span>
                  <div>
                    <small>Siap diambil</small>
                    <strong>{stats.ready}</strong>
                    <em>Menunggu pelanggan</em>
                  </div>
                </article>
                <article>
                  <span className="statIcon purple">
                    <Users />
                  </span>
                  <div>
                    <small>Total pelanggan</small>
                    <strong>{stats.customers}</strong>
                    <em>Tersimpan lokal</em>
                  </div>
                </article>
                <article>
                  <span className="statIcon orange">
                    <CircleDollarSign />
                  </span>
                  <div>
                    <small>Pendapatan selesai</small>
                    <strong className="moneyStat">
                      {money(stats.revenue)}
                    </strong>
                    <em>Akumulasi layanan</em>
                  </div>
                </article>
              </div>

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
                      {statuses.map((s) => (
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
                      {staff.map((person) => <option key={person.id}>{person.name}</option>)}
                    </select>
                    <button className="copyWorkList" onClick={copyServiceList}>
                      <Copy size={17} />
                      <span>Copy WA {selectedJobs.size ? `(${selectedJobs.size})` : ""}</span>
                    </button>
                    <button onClick={exportCsv}>
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
                    <span>No. Servis</span>
                    <span>Pelanggan & Perangkat</span>
                    <span>Keluhan</span>
                    <span>Teknisi</span>
                    <span>Status & Lama</span>
                    <span>Biaya</span>
                    <span />
                  </div>
                  {visible.map((t) => {
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
                        <span className="jobCheck" onClick={(e) => e.stopPropagation()}>
                          <input
                            aria-label={`Pilih servis ${t.id}`}
                            type="checkbox"
                            checked={selectedJobs.has(t.id)}
                            onChange={() => toggleJob(t.id)}
                          />
                        </span>
                        <span>
                          <b>{t.id}</b>
                          <small>
                            <Clock3 size={12} />
                            {t.receivedAt}
                          </small>
                        </span>
                        <span>
                          <b>{t.customer}</b>
                          <small>{t.device}</small>
                          <span className="starsMini">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                size={10}
                                fill={
                                  (t.rating || 0) >= n ? "currentColor" : "none"
                                }
                              />
                            ))}
                          </span>
                        </span>
                        <span>
                          <b>{t.issue}</b>
                          <small>{t.accessories}</small>
                        </span>
                        <span>
                          <span className="avatarMini">
                            {t.technician.slice(0, 2).toUpperCase()}
                          </span>
                          {t.technician}
                        </span>
                        <span>
                          <i className={`statusBadge ${tone(t.status)}`}>
                            {t.status}
                          </i>
                          <small className={`ageBadge ${ageTone(days)}`}>
                            <CalendarDays size={11} />
                            {days === 0 ? "Hari ini" : `${days} hari`}
                          </small>
                        </span>
                        <span>
                          <b>{money(finalPrice(t))}</b>
                          <small>DP {money(t.downPayment)}</small>
                        </span>
                        <span>
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
              <div className="formGridService">
                <label className="customerLookup">
                  Nama pemilik barang
                  <input
                    name="customer"
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
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
                <label>
                  Kategori pelanggan
                  <select name="category">
                    <option>User</option>
                    <option>Toko</option>
                  </select>
                </label>
                <label>
                  Alamat pelanggan
                  <input name="address" placeholder="Desa / kecamatan / kota" />
                </label>
                <label>
                  Jenis / model barang
                  <input
                    name="device"
                    required
                    placeholder="Contoh: Laptop ThinkPad T14"
                  />
                </label>
                <label>
                  Merek
                  <input
                    name="brand"
                    required
                    placeholder="Lenovo, ASUS, Epson..."
                  />
                </label>
                <label>
                  Serial number
                  <input name="serial" placeholder="Opsional" />
                </label>
                <label>
                  Kelengkapan untuk label QR
                  <input
                    name="accessories"
                    placeholder="Contoh: Charger, tas, mouse"
                  />
                  <small className="fieldHint">
                    Pisahkan dengan koma atau tanda +. Setiap barang mendapat QR sendiri.
                  </small>
                </label>
                <label className="full">
                  Kerusakan / keluhan
                  <textarea
                    name="issue"
                    required
                    placeholder="Tuliskan gejala atau kerusakan secara rinci"
                  />
                </label>
                <label>
                  Penerima
                  <select name="technician">
                    {staff.map((x) => (
                      <option key={x.id}>{x.name}</option>
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
                  Tempo pembayaran
                  <select name="paymentTermDays">
                    <option value="0">Tidak ada</option>
                    <option value="3">3 Hari</option>
                    <option value="7">1 Minggu</option>
                    <option value="14">2 Minggu</option>
                    <option value="30">1 Bulan</option>
                  </select>
                </label>
                <label className="acceptLine full">
                  <input type="checkbox" required /> Dengan ini penerima setuju
                  menerima barang servis dan data sudah benar.
                </label>
              </div>
              <div className="modalFoot">
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
                    size={142}
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
                  <div className="serviceAge">
                    <Clock3 size={15} />
                    <strong>
                      {ageDays(selected.receivedAt) === 0
                        ? "Diterima hari ini"
                        : `${ageDays(selected.receivedAt)} hari dalam servis`}
                    </strong>
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
                    <span>
                      Modal
                      <strong>{money(selected.partCost || 0)}</strong>
                    </span>
                    <span>
                      Profit
                      <strong>
                        {money(finalPrice(selected) - (selected.partCost || 0))}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
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
              <div className="detailGrid">
                <div>
                  <small>Keluhan</small>
                  <strong>{selected.issue}</strong>
                </div>
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
                      { costConfirmed: !selected.costConfirmed },
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
              <div className="serviceControls">
                <label>
                  Ubah status
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      updateStatus(selected.id, e.target.value as Status)
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Estimasi biaya
                  <input
                    type="number"
                    min="0"
                    value={selected.estimate}
                    onChange={(e) =>
                      patchTicket(
                        selected.id,
                        { estimate: Number(e.target.value) },
                        "Estimasi diperbarui",
                      )
                    }
                  />
                </label>
                <label>
                  DP / uang muka
                  <input
                    type="number"
                    min="0"
                    value={selected.downPayment}
                    onChange={(e) =>
                      patchTicket(
                        selected.id,
                        { downPayment: Number(e.target.value) },
                        "DP diperbarui",
                      )
                    }
                  />
                </label>
                <label>
                  Biaya final
                  <input
                    type="number"
                    min="0"
                    value={selected.finalCost || 0}
                    onChange={(e) =>
                      patchTicket(
                        selected.id,
                        { finalCost: Number(e.target.value) },
                        "Biaya final diperbarui",
                      )
                    }
                  />
                </label>
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
              <div className="actionGrid">
                <button
                  className="ghost"
                  onClick={() => printTicket("receipt")}
                >
                  <Printer size={17} /> Print tanda terima
                </button>
                <button
                  className="ghost"
                  disabled={!isFullyPaid(selected)}
                  title={isFullyPaid(selected) ? undefined : "Konfirmasi biaya final dan lunaskan saldo dulu"}
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
                <button className="ghost" onClick={() => setModal("edit")}>
                  <FileText size={17} /> Ubah Data Lainnya
                </button>
                <button className="waButton" onClick={() => setModal("chat")}>
                  <MessageCircle size={17} /> Chat pelanggan
                </button>
              </div>
            </div>
          )}
          {modal === "handoff" && selected && (
            <div className="serviceModal handoffModal">
              <div className="handoffHero"><span><ClipboardList /></span><div><small>SOP PENERIMAAN WAJIB</small><h2>Servis berhasil diterima</h2><p>{selected.id} · {selected.customer} · {selected.device}</p></div></div>
              <div className="handoffProgress"><span>{Object.values(handoffDone).filter(Boolean).length}/4 selesai</span><i><b style={{width:`${Object.values(handoffDone).filter(Boolean).length*25}%`}} /></i></div>
              <div className="handoffSteps">
                <button className={handoffDone.receipt ? "done" : ""} onClick={() => { setHandoffDone((x) => ({...x,receipt:true})); printTicket("receipt2"); }}><span>{handoffDone.receipt ? <Check /> : "1"}</span><div><b>Cetak nota 2 rangkap</b><small>1 lembar untuk pelanggan dan 1 lembar untuk arsip toko.</small></div><Printer /></button>
                <a className={handoffDone.whatsapp ? "done" : ""} target="_blank" href={whatsappUrl(selected,"received")} onClick={() => setHandoffDone((x) => ({...x,whatsapp:true}))}><span>{handoffDone.whatsapp ? <Check /> : "2"}</span><div><b>Kirim konfirmasi WhatsApp</b><small>Pesan ramah berisi nomor servis dan link tracking.</small></div><MessageCircle /></a>
                <button className={handoffDone.qr ? "done" : ""} onClick={() => { setHandoffDone((x) => ({...x,qr:true})); printTicket("qr"); }}><span>{handoffDone.qr ? <Check /> : "3"}</span><div><b>Cetak QR barang utama</b><small>Tempelkan label pada perangkat servis.</small></div><QrCode /></button>
                <button disabled={accessoryItems(selected.accessories).length===0} className={handoffDone.accessories ? "done" : ""} onClick={() => { setHandoffDone((x) => ({...x,accessories:true})); printTicket("accessories"); }}><span>{handoffDone.accessories ? <Check /> : "4"}</span><div><b>Cetak QR perlengkapan</b><small>{accessoryItems(selected.accessories).length ? `${accessoryItems(selected.accessories).length} label: ${accessoryItems(selected.accessories).join(", ")}` : "Tidak ada perlengkapan tambahan."}</small></div><PackageCheck /></button>
              </div>
              <div className="handoffFoot"><button className="skipSop" onClick={() => setModal("detail")}>Lewati SOP kali ini</button><button className="finishSop" disabled={!Object.values(handoffDone).every(Boolean)} onClick={() => setModal("detail")}><CheckCircle2 /> Selesai & buka detail servis</button></div>
            </div>
          )}
          {modal === "edit" && selected && (
            <form className="serviceModal wideModal editServiceModal" onSubmit={saveTicketEdit}>
              <div className="modalHead"><div><span>UBAH DATA SERVIS</span><h2>{selected.id}</h2><p>Teliti kembali data sebelum menyimpan.</p></div><button type="button" onClick={() => setModal("detail")}><X /></button></div>
              <div className="formGridService editServiceGrid">
                <label>Tanggal terima<input name="receivedAt" type="date" required defaultValue={selected.receivedAt}/></label>
                <label>Jam terima<input name="receivedTime" type="time" defaultValue={selected.receivedTime || "09:00"}/></label>
                <label>Nama pemilik<input name="customer" required defaultValue={selected.customer}/></label>
                <label>Nomor WhatsApp<input name="phone" required defaultValue={selected.phone}/></label>
                <label>Nama / model barang<input name="device" required defaultValue={selected.device}/></label>
                <label>Merek<input name="brand" required defaultValue={selected.brand}/></label>
                <label>Serial number<input name="serial" defaultValue={selected.serial}/></label>
                <label>Kelengkapan<input name="accessories" defaultValue={selected.accessories}/></label>
                <label className="full">Kerusakan<textarea name="issue" required defaultValue={selected.issue}/></label>
                <label>Kondisi servis<select name="condition" defaultValue={selected.condition || ""}><option value="">Belum ditentukan</option><option>Sudah Jadi</option><option>Tidak Bisa</option><option>Dibatalkan</option></select></label>
                <label>Teknisi<select name="technician" defaultValue={selected.technician}>{staff.map((person) => <option key={person.id}>{person.name}</option>)}</select></label>
                <label className="full">Keterangan / tindakan<textarea name="serviceAction" defaultValue={selected.serviceAction}/></label>
                <label>DP / uang muka<input name="downPayment" type="number" min="0" defaultValue={selected.downPayment}/></label>
                <label>Modal sparepart<input name="partCost" type="number" min="0" defaultValue={selected.partCost || 0}/></label>
                <label>Estimasi biaya<input name="estimate" type="number" min="0" defaultValue={selected.estimate}/></label>
                <label>Biaya servis final<input name="finalCost" type="number" min="0" defaultValue={selected.finalCost || 0}/></label>
                <label>Tanggal ditangani<input name="handledAt" type="date" defaultValue={selected.handledAt || ""}/></label>
                <label>Jam ditangani<input name="handledTime" type="time" defaultValue={selected.handledTime || ""}/></label>
                <label className="full">Catatan<textarea name="notes" defaultValue={selected.notes}/></label>
                <label>Tanggal ambil<input name="pickedUpAt" type="date" defaultValue={selected.pickedUpAt || ""}/></label>
                <label>Jam ambil<input name="pickedUpTime" type="time" defaultValue={selected.pickedUpTime || ""}/></label>
                <label>Cara pembayaran<select name="paymentMethod" defaultValue={selected.paymentMethod || "Tunai"}><option>Tunai</option><option>Transfer BCA</option><option>Transfer BRI</option><option>Transfer Mandiri</option><option>QRIS</option><option>Tempo</option></select></label>
                <label>Garansi servis<select name="warrantyDays" defaultValue={selected.warrantyDays || 0}><option value="0">Tidak ada</option><option value="3">3 Hari</option><option value="7">1 Minggu</option><option value="14">2 Minggu</option><option value="30">1 Bulan</option><option value="60">2 Bulan</option><option value="90">3 Bulan</option>{![0,3,7,14,30,60,90].includes(selected.warrantyDays || 0) && <option value={selected.warrantyDays}>{selected.warrantyDays} Hari</option>}</select></label>
                <label>Pengambil<input name="pickupBy" defaultValue={selected.pickupBy || selected.customer}/></label>
                <label>Penyerah<input name="handedBy" defaultValue={selected.handedBy || "Admin"}/></label>
              </div>
              <div className="modalFoot"><button type="button" className="ghost" onClick={() => setModal("detail")}>Batal</button><button className="newButton"><CheckCircle2 size={17}/> Simpan Perubahan</button></div>
            </form>
          )}
          {modal === "chat" && selected && (
            <div className="serviceModal chatChoiceModal">
              <div className="modalHead"><div><span>CHAT WHATSAPP</span><h2>Pilih pesan untuk {selected.customer}</h2><p>Nomor tujuan: {selected.phone}</p></div><button onClick={() => setModal("detail")}><X /></button></div>
              <div className="chatChoices">
                <a target="_blank" href={whatsappUrl(selected, "empty")}><MessageCircle/><span><b>Chat WhatsApp Kosong</b><small>Hanya membuka percakapan pelanggan tanpa isi pesan.</small></span></a>
                <a target="_blank" href={whatsappUrl(selected, "received")}><PackageCheck/><span><b>Konfirmasi Servis Diterima</b><small>Salam, data barang, nomor servis, dan link tracking.</small></span></a>
                <div className="chatCostGroup"><CircleDollarSign/><span><b>Konfirmasi Biaya Servis</b><small>Pilih format pesan sesuai hasil pengecekan.</small><span className="costChatVariants"><a target="_blank" href={whatsappUrl(selected, "cost")}>Satu nominal</a><a target="_blank" href={whatsappUrl(selected, "cost-options")}>Beberapa pilihan</a></span></span></div>
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
              <small className="scanHint">
                Pemindaian menggunakan kamera perangkat dan tidak mengunggah
                gambar.
              </small>
            </div>
          )}
        </div>
      )}
      {(printMode === "receipt" || printMode === "qr") && selected && (
        <div className={`servicePrint ${printMode}`}>
          <div className="printHeader">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="printLogoFull" src="/logo-full.png" alt={shop.name || "FS Comp"} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="printHeaderDivider" />
            <div className="printHeaderId">
              <small>Tanda Terima Servis</small>
              <em>Service ID</em>
              <b>{selected.id}</b>
              <span>
                Tanggal Cetak:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="printQr">
              <QRCodeSVG
                value={`${location.origin}/track?id=${encodeURIComponent(selected.id)}`}
                size={printMode === "qr" ? 260 : 86}
                level="H"
              />
              <small>
                <Smartphone size={10} /> Scan untuk tracking servis
              </small>
            </div>
          </div>
          {printMode === "receipt" && (
            <>
              <div className="printInfoGrid">
                <div>
                  <span className="printInfoIcon">
                    <User size={14} color="#fff" />
                  </span>
                  <div>
                    <small>Pelanggan</small>
                    <strong>{selected.customer}</strong>
                    <span>{selected.phone}</span>
                  </div>
                </div>
                <div>
                  <span className="printInfoIcon">
                    <Smartphone size={14} color="#fff" />
                  </span>
                  <div>
                    <small>Perangkat</small>
                    <strong>{selected.device}</strong>
                    <span>SN: {selected.serial || "-"}</span>
                  </div>
                </div>
                <div>
                  <span className="printInfoIcon">
                    <CalendarDays size={14} color="#fff" />
                  </span>
                  <div>
                    <small>Tanggal Terima</small>
                    <strong>{selected.receivedAt}</strong>
                    <span>Teknisi: {selected.technician}</span>
                  </div>
                </div>
                <div>
                  <span className="printInfoIcon">
                    <CheckCircle2 size={14} color="#fff" />
                  </span>
                  <div>
                    <small>Kelengkapan Diterima</small>
                    {accessoryItems(selected.accessories).length ? (
                      <ul>
                        {accessoryItems(selected.accessories).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>Unit only</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="printIssueRow">
                <span className="printInfoIcon">
                  <Wrench size={14} color="#fff" />
                </span>
                <div>
                  <small>Keluhan / Kondisi Awal</small>
                  <strong>{selected.issue}</strong>
                  {selected.notes && (
                    <>
                      <em>Catatan Tambahan</em>
                      <span>{selected.notes}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="printSummaryRow">
                <div className="printSummary">
                  <div className="printSummaryHead">Ringkasan Servis</div>
                  <div className="printSummaryGrid">
                    <div>
                      <FileText size={13} />
                      <small>Estimasi Biaya</small>
                      <b>
                        {selected.estimate
                          ? money(selected.estimate)
                          : "Belum diestimasi"}
                      </b>
                    </div>
                    <div>
                      <Wallet size={13} />
                      <small>DP (Uang Muka)</small>
                      <b>{money(selected.downPayment)}</b>
                    </div>
                    <div>
                      <Banknote size={13} />
                      <small>Sisa Pembayaran</small>
                      <b>
                        {money(
                          Math.max(
                            0,
                            selected.estimate - selected.downPayment,
                          ),
                        )}
                      </b>
                    </div>
                  </div>
                  {shop.bank && (
                    <div className="printPayNote">
                      <Landmark size={13} />
                      <div>
                        <b>Info Pembayaran</b>
                        <span>
                          Konfirmasi pembayaran harap menyertakan nomor
                          Service ID pada keterangan.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {shop.bank && (
                  <div className="printBankCard">
                    <div className="printBankHead">Rekening Transaksi</div>
                    {shop.bank
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((line) => (
                        <div className="printBankRow" key={line}>
                          <Landmark size={12} />
                          <span>{line}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="printTermsRow">
                <div className="printTermsBox">
                  <ShieldCheck size={14} />
                  <div>
                    <small>Ketentuan Servis</small>
                    <p>
                      {shop.terms ||
                        "Simpan tanda terima ini. Pengambilan perangkat wajib menunjukkan nomor servis atau QR Code."}
                    </p>
                  </div>
                </div>
                <div className="printSign">
                  <span>
                    <em>Pelanggan</em>
                    <i className="printSignSpace" />
                    <b>{selected.customer}</b>
                  </span>
                  <span>
                    <em>Petugas {shop.name || "FS Comp"}</em>
                    <i className="printSignSpace" />
                    <b>{selected.handedBy || "Admin"}</b>
                  </span>
                </div>
              </div>
              <div className="printFooter">
                <div className="printFooterContact">
                  {shop.phone && (
                    <span>
                      <Phone size={11} /> {shop.phone}
                    </span>
                  )}
                  {shop.whatsapp && (
                    <span>
                      <MessageCircle size={11} /> {shop.whatsapp}
                    </span>
                  )}
                  {shop.address && (
                    <span>
                      <MapPin size={11} /> {shop.address}
                    </span>
                  )}
                  <span>
                    <Globe size={11} /> {shop.name?.toLowerCase().replace(/\s+/g, "") || "fscomp"}.id
                  </span>
                </div>
                <div className="printFooterBrand">
                  <b>{(shop.name || "FS Comp").toUpperCase()}</b>
                  <small>Service &amp; Technology Center</small>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {printMode === "paid" && selected && (
        <div className="servicePrint paid">
          <div className="printHeader">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="printLogoFull" src="/logo-full.png" alt={shop.name || "FS Comp"} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="printHeaderDivider" />
            <div className="printHeaderId">
              <small>Nota Lunas Pembayaran</small>
              <em>Service ID</em>
              <b>{selected.id}</b>
              <span>
                Tanggal Cetak:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="printQr">
              <QRCodeSVG
                value={`${location.origin}/track?id=${encodeURIComponent(selected.id)}`}
                size={70}
                level="H"
              />
              <small>
                <Smartphone size={10} /> Scan untuk tracking servis
              </small>
            </div>
          </div>
          <div className="printInfoGrid">
            <div>
              <span className="printInfoIcon">
                <User size={14} color="#fff" />
              </span>
              <div>
                <small>Pelanggan</small>
                <strong>{selected.customer}</strong>
                <span>{selected.phone}</span>
              </div>
            </div>
            <div>
              <span className="printInfoIcon">
                <Smartphone size={14} color="#fff" />
              </span>
              <div>
                <small>Perangkat</small>
                <strong>{selected.device}</strong>
                <span>SN: {selected.serial || "-"}</span>
              </div>
            </div>
            <div>
              <span className="printInfoIcon">
                <CalendarDays size={14} color="#fff" />
              </span>
              <div>
                <small>Tanggal Ambil</small>
                <strong>{selected.pickedUpAt || localDateStr()}</strong>
                <span>Petugas: {selected.handedBy || "Admin"}</span>
              </div>
            </div>
            <div>
              <span className="printInfoIcon">
                <CircleDollarSign size={14} color="#fff" />
              </span>
              <div>
                <small>Metode Pembayaran</small>
                <strong>{selected.paymentMethod || "Tunai"}</strong>
                <span>Status: Lunas</span>
              </div>
            </div>
          </div>
          <div className="printSummaryRow">
            <div className="printSummary">
              <div className="printSummaryHead">Ringkasan Pembayaran</div>
              <div className="printSummaryGrid">
                <div>
                  <FileText size={13} />
                  <small>Biaya Final</small>
                  <b>{money(finalPrice(selected))}</b>
                </div>
                <div>
                  <Wallet size={13} />
                  <small>DP (Sudah Dibayar)</small>
                  <b>{money(selected.downPayment)}</b>
                </div>
                <div>
                  <Banknote size={13} />
                  <small>Pelunasan (Sekarang)</small>
                  <b>
                    {money(
                      Math.max(
                        0,
                        finalPrice(selected) - selected.downPayment,
                      ),
                    )}
                  </b>
                </div>
              </div>
              <div className="printPayNote">
                <CircleDollarSign size={13} />
                <div>
                  <b>Status Pembayaran</b>
                  <span>
                    LUNAS — {money(finalPrice(selected))} telah diterima
                    secara penuh.
                  </span>
                </div>
              </div>
            </div>
            <div className="printBankCard">
              <div className="printBankHead">Garansi Servis</div>
              {selected.warrantyDays ? (
                <>
                  <div className="printBankRow">
                    <ShieldCheck size={12} />
                    <span>{selected.warrantyDays} hari sejak pengambilan</span>
                  </div>
                  <div className="printBankRow">
                    <ShieldCheck size={12} />
                    <span>
                      Berlaku sampai{" "}
                      {new Date(
                        new Date(
                          `${selected.pickedUpAt || localDateStr()}T00:00:00`,
                        ).getTime() +
                          selected.warrantyDays * 86400000,
                      ).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="printBankRow">
                  <ShieldCheck size={12} />
                  <span>Tidak ada garansi untuk servis ini</span>
                </div>
              )}
            </div>
          </div>
          <div className="printTermsRow">
            <div className="printTermsBox">
              <ShieldCheck size={14} />
              <div>
                <small>Ketentuan Garansi</small>
                <p>
                  {selected.warrantyDays
                    ? "Garansi hanya untuk keluhan yang sama, tidak mencakup kerusakan baru akibat kelalaian pemakaian."
                    : "Servis ini tanpa garansi. Simpan nota ini sebagai bukti pembayaran."}
                </p>
              </div>
            </div>
            <div className="printSign">
              <span>
                <em>Diserahkan oleh</em>
                <i className="printSignSpace" />
                <b>{selected.handedBy || "Admin"}</b>
              </span>
              <span>
                <em>Diterima oleh</em>
                <i className="printSignSpace" />
                <b>{selected.pickupBy || selected.customer}</b>
              </span>
            </div>
          </div>
          <div className="printFooter">
            <div className="printFooterContact">
              {shop.phone && (
                <span>
                  <Phone size={11} /> {shop.phone}
                </span>
              )}
              {shop.whatsapp && (
                <span>
                  <MessageCircle size={11} /> {shop.whatsapp}
                </span>
              )}
              {shop.address && (
                <span>
                  <MapPin size={11} /> {shop.address}
                </span>
              )}
              <span>
                <Globe size={11} /> {shop.name?.toLowerCase().replace(/\s+/g, "") || "fscomp"}.id
              </span>
            </div>
            <div className="printFooterBrand">
              <b>{(shop.name || "FS Comp").toUpperCase()}</b>
              <small>Service &amp; Technology Center</small>
            </div>
          </div>
        </div>
      )}
      {printMode === "receipt2" && selected && (
        <div className="servicePrint receipt2">
          {["Untuk Pelanggan", "Arsip Toko"].map((copy) => (
            <article className="receiptCard" key={copy}>
              <header className="receiptCardHead">
                <div className="receiptBrand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="receiptBrandMark">
                    <img src="/logo-mark.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </span>
                  <div>
                    <strong>{shop.name || "FS COMP"}</strong>
                    <small>Tanda Terima Servis · {copy}</small>
                  </div>
                </div>
                <div className="receiptCardId">
                  <small>No. Servis</small>
                  <b>{selected.id}</b>
                </div>
              </header>
              <section className="receiptCardBody">
                <QRCodeSVG
                  value={`${location.origin}/track?id=${encodeURIComponent(selected.id)}`}
                  size={88}
                  level="H"
                />
                <div className="receiptCardGrid">
                  <div>
                    <small>Pelanggan</small>
                    <b>{selected.customer}</b>
                    <span>{selected.phone}</span>
                  </div>
                  <div>
                    <small>Perangkat</small>
                    <b>{selected.device}</b>
                    <span>SN: {selected.serial || "-"}</span>
                  </div>
                  <div>
                    <small>Tanggal Terima</small>
                    <b>{selected.receivedAt}</b>
                    <span>Teknisi: {selected.technician}</span>
                  </div>
                  <div>
                    <small>Estimasi / DP</small>
                    <b>{money(selected.estimate)}</b>
                    <span>DP {money(selected.downPayment)}</span>
                  </div>
                </div>
              </section>
              <div className="receiptIssue">
                <small>Keluhan / Kerusakan</small>
                <p>{selected.issue}</p>
                <span>Kelengkapan: {selected.accessories}</span>
              </div>
              {shop.bank && (
                <div className="receiptPay">
                  <small>Info Pembayaran</small>
                  <span>{shop.bank}</span>
                </div>
              )}
              <footer className="receiptCardFoot">
                <span>Scan QR untuk cek status servis</span>
                <span>Tanda tangan: ____________________</span>
              </footer>
              {shop.terms && <p className="receiptTerms">{shop.terms}</p>}
              {(shop.phone || shop.address) && (
                <div className="receiptContact">
                  {shop.phone && <span>{shop.phone}</span>}
                  {shop.address && <span>{shop.address}</span>}
                </div>
              )}
            </article>
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
      {toast && (
        <div className="serviceToast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
    </div>
  );
}

function CustomersPanel({
  tickets,
  customers: data,
  onChange,
  onPhoneChanged,
  onOpen,
}: {
  tickets: Ticket[];
  customers: Customer[];
  onChange: (customers: Customer[]) => void;
  onPhoneChanged: (oldPhone: string, newPhone: string) => void;
  onOpen: (ticket: Ticket) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 15;
  function persist(next: Customer[]) {
    onChange(next);
  }
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") || "").replace(/\D/g, "");
    if (phone.length < 9 || phone.length > 15)
      return setError("Nomor telepon harus 9-15 digit");
    if (data.some((c) => c.phone === phone && c.id !== editing?.id))
      return setError("Nomor telepon sudah terdaftar");
    const customer: Customer = {
      id: editing?.id || `C-${Date.now()}`,
      name: String(f.get("name")).trim(),
      category: String(f.get("category")) as Customer["category"],
      phone,
      address: String(f.get("address") || "-").trim(),
      rating: Number(f.get("rating") || 0),
      createdAt: editing?.createdAt || localDateStr(),
      _touchedAt: new Date().toISOString(),
    };
    persist(
      editing
        ? data.map((c) => (c.id === editing.id ? customer : c))
        : [customer, ...data],
    );
    if (editing && editing.phone !== phone) onPhoneChanged(editing.phone, phone);
    setFormOpen(false);
    setEditing(null);
  }
  function remove(customer: Customer) {
    if (tickets.some((t) => t.phone === customer.phone)) return;
    persist(data.filter((c) => c.id !== customer.id));
  }
  function exportCustomers() {
    const rows = [
      ["Nama", "Kategori", "Telepon", "WhatsApp", "Alamat", "Rating"],
      ...data.map((c) => [
        c.name,
        c.category,
        c.phone,
        normalizePhone(c.phone),
        c.address,
        c.rating,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "daftar-pelanggan.csv";
    a.click();
    URL.revokeObjectURL(a.href);
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
          const history = tickets.filter((t) => t.phone === c.phone);
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
                    onClick={() =>
                      persist(
                        data.map((x) =>
                          x.id === c.id
                            ? { ...x, rating: n, _touchedAt: new Date().toISOString() }
                            : x,
                        ),
                      )
                    }
                    aria-label={`${n} bintang`}
                  >
                    <Star fill={c.rating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </span>
              <span className="customerChoices">
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
              <button className="newButton">
                <CheckCircle2 /> Simpan Pelanggan
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
}: {
  tickets: Ticket[];
  onSettle: (ticket: Ticket) => void;
  onOpen: (ticket: Ticket) => void;
}) {
  const [mode, setMode] = useState<"Semua" | "Belum Lunas" | "Lunas">("Semua");
  const rows = tickets.filter((t) => {
    const total = finalPrice(t);
    const paid = t.downPayment >= total && (total > 0 || t.costConfirmed);
    return mode === "Semua" || (mode === "Lunas" ? paid : !paid);
  });
  const receivable = tickets.reduce(
    (a, t) => a + Math.max(0, finalPrice(t) - t.downPayment),
    0,
  );
  return (
    <div className="modulePage">
      <section className="paymentStats">
        <article>
          <small>Total Tagihan</small>
          <strong>
            {money(tickets.reduce((a, t) => a + finalPrice(t), 0))}
          </strong>
          <span>Semua transaksi servis</span>
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
          <span>Perlu ditagih</span>
        </article>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Status Pembayaran</h3>
            <p>Konfirmasi DP, pelunasan, tagihan, dan tempo pelanggan</p>
          </div>
          <div className="paymentTabs">
            {(["Semua", "Belum Lunas", "Lunas"] as const).map((x) => (
              <button
                className={mode === x ? "active" : ""}
                onClick={() => setMode(x)}
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
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {rows.map((t) => {
            const total = finalPrice(t);
            const due = Math.max(0, total - t.downPayment);
            const paid = due === 0 && (total > 0 || t.costConfirmed);
            const termDays =
              t.paymentMethod === "Tempo" && t.paymentTermDays
                ? t.paymentTermDays
                : 7;
            const isOverdue = !paid && ageDays(t.receivedAt) > termDays;
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
                <span>
                  <i className={`statusBadge ${paid ? "success" : "warning"}`}>
                    {paid ? "Lunas" : isOverdue ? "Jatuh Tempo" : "Belum Lunas"}
                  </i>
                </span>
                <span>
                  {paid ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <button
                      className="settleButton"
                      onClick={() => onSettle(t)}
                    >
                      Pelunasan
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
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
        role: String(f.get("role")) === "Admin" ? "ADMIN" : "TECHNICIAN",
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
                  {u.role === "ADMIN" ? "Admin" : "Teknisi/Pegawai"}
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
            Admin dapat mengubah profil, akun, pelanggan, jasa, pembayaran, dan
            laporan. Teknisi/Pegawai dapat menerima servis, memperbarui proses,
            dan menghubungi pelanggan.
          </p>
        </div>
      </section>
    </div>
  );
}

function ServicesPanel({
  services,
  onChange,
}: {
  services: ServiceItem[];
  onChange: (items: ServiceItem[]) => void;
}) {
  const [show, setShow] = useState(false);
  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onChange([
      ...services,
      {
        id: `JS-${Date.now()}`,
        name: String(f.get("name")),
        partCost: Number(f.get("partCost")),
        shopPrice: Number(f.get("shopPrice")),
        userPrice: Number(f.get("userPrice")),
        warrantyDays: Number(f.get("warrantyDays")),
      },
    ]);
    setShow(false);
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
            <option value="0">Tanpa garansi</option>
            <option value="7">1 Minggu</option>
            <option value="14">2 Minggu</option>
            <option value="30">1 Bulan</option>
            <option value="90">3 Bulan</option>
          </select>
          <button className="newButton">Simpan</button>
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
              {s.warrantyDays ? `${s.warrantyDays} Hari` : "Tidak Ada"}
            </span>
            <span>
              <button
                onClick={() => onChange(services.filter((x) => x.id !== s.id))}
              >
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
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
}) {
  const rows = tickets.filter((t) => t.status === "Sudah Diambil");
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
          {rows.filter((t) => t.warrantyDays).length}
          <small>Servis bergaransi</small>
        </strong>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="simpleDataHead warrantyCols">
          <span>No. Servis</span>
          <span>Pemilik</span>
          <span>Barang</span>
          <span>Tgl. Ambil</span>
          <span>Garansi</span>
          <span>Status Garansi</span>
          <span>Pilihan</span>
        </div>
        {rows.map((t) => {
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
                {t.warrantyDays ? `${t.warrantyDays} Hari` : "Tidak Ada"}
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
                {remaining >= 0 ? (
                  <button onClick={() => onOpen(t)}>Terima Garansi</button>
                ) : (
                  "-"
                )}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ServiceReport({ tickets }: { tickets: Ticket[] }) {
  const rows = useMemo(
    () =>
      Array.from(
        tickets
          .reduce((m, t) => {
            const r = m.get(t.receivedAt) || {
              date: t.receivedAt,
              in: 0,
              done: 0,
              out: 0,
              revenue: 0,
              cost: 0,
            };
            r.in++;
            if (t.status === "Bisa Diambil" || t.status === "Sudah Diambil")
              r.done++;
            if (t.status === "Sudah Diambil") {
              r.out++;
              r.revenue += finalPrice(t);
              r.cost += t.partCost || 0;
            }
            m.set(t.receivedAt, r);
            return m;
          }, new Map<string, { date: string; in: number; done: number; out: number; revenue: number; cost: number }>())
          .values(),
      ).sort((a, b) => b.date.localeCompare(a.date)),
    [tickets],
  );
  const monthRows = useMemo(
    () =>
      Array.from(
        rows
          .reduce((m, r) => {
            const month = r.date.slice(0, 7);
            const x = m.get(month) || { month, in: 0, done: 0, out: 0, revenue: 0, cost: 0 };
            x.in += r.in;
            x.done += r.done;
            x.out += r.out;
            x.revenue += r.revenue;
            x.cost += r.cost;
            m.set(month, x);
            return m;
          }, new Map<string, { month: string; in: number; done: number; out: number; revenue: number; cost: number }>())
          .values(),
      ).sort((a, b) => b.month.localeCompare(a.month)),
    [rows],
  );
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };
  return (
    <div className="modulePage">
      <section className="reportSummary">
        <article>
          <small>Total Servis Masuk</small>
          <strong>{tickets.length}</strong>
        </article>
        <article>
          <small>Selesai Ditangani</small>
          <strong>
            {
              tickets.filter((t) =>
                ["Bisa Diambil", "Sudah Diambil"].includes(t.status),
              ).length
            }
          </strong>
        </article>
        <article>
          <small>Barang Keluar</small>
          <strong>
            {tickets.filter((t) => t.status === "Sudah Diambil").length}
          </strong>
        </article>
        <article>
          <small>Total Profit</small>
          <strong>
            {money(rows.reduce((a, r) => a + r.revenue - r.cost, 0))}
          </strong>
        </article>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Keuntungan per Bulan</h3>
            <p>
              Rekap pemasukan, modal, dan profit setiap bulan dari servis yang
              sudah diambil.
            </p>
          </div>
        </div>
        <div className="simpleDataHead reportCols">
          <span>Bulan</span>
          <span>Masuk</span>
          <span>Selesai</span>
          <span>Keluar</span>
          <span>Pemasukan</span>
          <span>Modal</span>
          <span>Profit</span>
        </div>
        {monthRows.length === 0 && (
          <div className="emptyState">Belum ada data servis.</div>
        )}
        {monthRows.map((r) => (
          <div className="simpleDataRow reportCols" key={r.month}>
            <span>{monthLabel(r.month)}</span>
            <span>{r.in} Barang</span>
            <span>{r.done} Barang</span>
            <span>{r.out} Barang</span>
            <span>{money(r.revenue)}</span>
            <span>{money(r.cost)}</span>
            <span>
              <b>{money(r.revenue - r.cost)}</b>
            </span>
          </div>
        ))}
      </section>
      <section className="ticketPanel modulePanel">
        <div className="panelTop">
          <div>
            <h3>Laporan Servis</h3>
            <p>
              Servis masuk, selesai, keluar, pemasukan, modal, dan profit per
              hari.
            </p>
          </div>
        </div>
        <div className="simpleDataHead reportCols">
          <span>Tanggal</span>
          <span>Masuk</span>
          <span>Selesai</span>
          <span>Keluar</span>
          <span>Pemasukan</span>
          <span>Modal</span>
          <span>Profit</span>
        </div>
        {rows.map((r) => (
          <div className="simpleDataRow reportCols" key={r.date}>
            <span>{r.date}</span>
            <span>{r.in} Barang</span>
            <span>{r.done} Barang</span>
            <span>{r.out} Barang</span>
            <span>{money(r.revenue)}</span>
            <span>{money(r.cost)}</span>
            <span>
              <b>{money(r.revenue - r.cost)}</b>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function TechnicianReport({
  tickets,
  staff,
}: {
  tickets: Ticket[];
  staff: Staff[];
}) {
  const workDate = (t: Ticket) => t.statusChangedAt || t.updatedAt;
  const dates = Array.from(new Set(tickets.map(workDate)))
    .sort()
    .reverse();
  return (
    <div className="modulePage">
      <section className="moduleHero techReportHero">
        <div>
          <span className="miniTag">
            <Users size={14} /> PRODUKTIVITAS
          </span>
          <h2>Laporan Teknisi</h2>
          <p>Jumlah servis yang ditangani setiap teknisi per tanggal.</p>
        </div>
      </section>
      <section className="ticketPanel modulePanel">
        <div className="techReportTable">
          <div className="techReportHead">
            <span>Tanggal</span>
            {staff.map((s) => (
              <span key={s.id}>{s.name}</span>
            ))}
          </div>
          {dates.map((d) => (
            <div className="techReportRow" key={d}>
              <span>{d}</span>
              {staff.map((s) => (
                <span key={s.id}>
                  {
                    tickets.filter(
                      (t) => workDate(t) === d && t.technician === s.name,
                    ).length
                  }{" "}
                  Kali
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({
  shop,
  onSave,
}: {
  shop: ShopSettings;
  onSave: (shop: ShopSettings) => void;
}) {
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
            <label className="full">
              Alamat toko
              <textarea
                value={form.address}
                onChange={(e) => field("address", e.target.value)}
              />
            </label>
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
