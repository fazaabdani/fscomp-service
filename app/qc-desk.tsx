"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, KeyRound, LogOut, X } from "lucide-react";
import {
  QC_RESULTS,
  QC_TEMPLATES,
  blankItems,
  qcTemplateFor,
  type QcItem,
  type QcResult,
} from "@/lib/qc-templates";
import { PasswordModal } from "./password-modal";

export type QcTicket = {
  id: string;
  customer: string;
  device: string;
  deviceType?: string | null;
  brand?: string;
  serial?: string;
  issue: string;
  accessories?: string;
  status?: string;
  receivedAt?: string;
  receivedTime?: string | null;
};
export type QcCheckData = {
  id: string;
  ticketId?: string;
  template: string;
  items: QcItem[];
  summary: string | null;
  checkedBy: string;
  badCount: number;
  unsureCount: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

const CHECKER_KEY = "fs-qc-checker";

/** The QC checklist for one job. Used by the intern's desk and, for
 * technicians, from the job detail. */
export function QcForm({
  ticket,
  existing,
  defaultChecker,
  onClose,
  onSaved,
}: {
  ticket: QcTicket;
  existing?: QcCheckData | null;
  defaultChecker?: string;
  onClose: () => void;
  onSaved: (check: QcCheckData) => void;
}) {
  const initialTemplate = existing?.template || qcTemplateFor(ticket.deviceType, ticket.device);
  const [template, setTemplate] = useState(initialTemplate);
  const [items, setItems] = useState<QcItem[]>(() => {
    const base = blankItems(initialTemplate);
    if (!existing) return base;
    const prev = new Map(existing.items.map((i) => [i.id, i]));
    return base.map((b) => {
      const p = prev.get(b.id);
      return p ? { ...b, result: p.result, note: p.note } : b;
    });
  });
  const [summary, setSummary] = useState(existing?.summary || "");
  const [checker, setChecker] = useState(() => {
    if (defaultChecker) return defaultChecker;
    try {
      return localStorage.getItem(CHECKER_KEY) || "";
    } catch {
      return "";
    }
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const answered = items.filter((i) => i.result).length;
  const missingNote = items.filter((i) => (i.result === "bad" || i.result === "unsure") && !i.note.trim()).length;
  const ready = answered === items.length && missingNote === 0 && checker.trim().length > 0;
  const groups = useMemo(() => {
    const out: { name: string; rows: QcItem[] }[] = [];
    for (const i of items) {
      const g = out.find((x) => x.name === i.group);
      if (g) g.rows.push(i);
      else out.push({ name: i.group, rows: [i] });
    }
    return out;
  }, [items]);

  const setItem = (id: string, patch: Partial<QcItem>) =>
    setItems((old) => old.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  function changeTemplate(next: string) {
    if (answered > 0 && !window.confirm("Mengganti jenis checklist akan mengosongkan jawaban. Lanjutkan?")) return;
    setTemplate(next);
    setItems(blankItems(next));
  }

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      try {
        localStorage.setItem(CHECKER_KEY, checker.trim());
      } catch {
        /* remembering the name is only a convenience */
      }
      const res = await fetch("/api/qc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, template, items, summary, checkedBy: checker.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.check) {
        setError(data?.error || "Gagal menyimpan QC, coba lagi");
        return;
      }
      onSaved(data.check);
    } catch {
      setError("Tidak terhubung ke server — QC belum tersimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qcxOverlay" role="dialog" aria-modal="true">
      <div className="qcxPanel">
        <div className="qcxHead">
          <div>
            <span>CEK AWAL / QC</span>
            <h2>
              {ticket.id} · {ticket.customer}
            </h2>
            <p>
              {ticket.device}
              {ticket.brand ? ` ${ticket.brand}` : ""}
              {ticket.serial && ticket.serial !== "-" ? ` · SN ${ticket.serial}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <X />
          </button>
        </div>

        <div className="qcxBody">
          <div className="qcxComplaint">
            <small>Keluhan pelanggan</small>
            <b>{ticket.issue}</b>
            {ticket.accessories && ticket.accessories !== "Unit only" && <small>Kelengkapan: {ticket.accessories}</small>}
          </div>

          <div className="qcxMeta">
            <label>
              Nama pengecek
              <input value={checker} maxLength={60} placeholder="Nama Anda" onChange={(e) => setChecker(e.target.value)} />
            </label>
            <label>
              Jenis checklist
              <select value={template} onChange={(e) => changeTemplate(e.target.value)}>
                {Object.keys(QC_TEMPLATES).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          {groups.map((g) => (
            <section key={g.name} className="qcxGroup">
              <h4>{g.name}</h4>
              {g.rows.map((i) => (
                <div key={i.id} className={`qcxItem ${i.result}`}>
                  <p>{i.label}</p>
                  <div className="qcxChoices" role="radiogroup" aria-label={i.label}>
                    {QC_RESULTS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        role="radio"
                        aria-checked={i.result === r.value}
                        className={`${r.value} ${i.result === r.value ? "on" : ""}`}
                        onClick={() => setItem(i.id, { result: r.value as QcResult })}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {(i.result === "bad" || i.result === "unsure") && (
                    <input
                      className={!i.note.trim() ? "needNote" : ""}
                      value={i.note}
                      maxLength={300}
                      placeholder={i.result === "bad" ? "Apa yang terlihat? (wajib)" : "Apa yang membuat ragu? (wajib)"}
                      onChange={(e) => setItem(i.id, { note: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </section>
          ))}

          <label className="qcxSummary">
            Catatan tambahan (opsional)
            <textarea
              value={summary}
              maxLength={600}
              placeholder="Hal lain yang perlu diketahui teknisi"
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
        </div>

        <div className="qcxFoot">
          <div className="qcxProgress">
            <span>
              {answered}/{items.length} dijawab
            </span>
            <i>
              <b style={{ width: `${(answered / items.length) * 100}%` }} />
            </i>
            {error ? (
              <em>{error}</em>
            ) : !ready ? (
              <small>
                {!checker.trim()
                  ? "Isi nama pengecek."
                  : answered < items.length
                    ? "Jawab semua item."
                    : `${missingNote} catatan masih kosong.`}
              </small>
            ) : null}
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="newButton" disabled={!ready || busy} onClick={submit}>
            <CheckCircle2 size={17} /> {busy ? "Menyimpan..." : "Selesai & kirim ke teknisi"}
          </button>
        </div>
      </div>
    </div>
  );
}

type QueueTicket = QcTicket & { qc: QcCheckData | null };

/** What an intern sees: only the QC queue. No prices, phones or other menus. */
export default function QcDesk({ userName, shopName, enabled: enabledAtLoad }: { userName: string; shopName: string; enabled: boolean }) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [opened, setOpened] = useState<QueueTicket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [pwOpen, setPwOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [enabled, setEnabled] = useState(enabledAtLoad);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/qc/tickets", { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!r.ok) return;
      const d = await r.json();
      setTickets(d.tickets);
      setEnabled(d.enabled !== false);
      setOnline(true);
      setLoaded(true);
    } catch {
      setOnline(false);
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const todo = tickets.filter((t) => !t.qc);
  const done = tickets.filter((t) => t.qc);
  const shown = tab === "todo" ? todo : done;
  // Latest server copy while it is still in the queue, else the snapshot taken
  // on open — a refresh must not close a form someone is filling in.
  const open = opened ? tickets.find((t) => t.id === opened.id) || opened : null;
  const age = (d?: string) => {
    if (!d) return "";
    const days = Math.floor((Date.now() - new Date(`${d}T00:00:00`).getTime()) / 86400000);
    return days <= 0 ? "Hari ini" : `${days} hari`;
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="qcxPage">
      <header className="qcxTop">
        <div>
          <strong>{shopName || "FS COMP"}</strong>
          <span>QC / Cek Awal</span>
        </div>
        <div className="qcxUser">
          <span>{userName}</span>
          <button className="iconCircle" onClick={() => setPwOpen(true)} aria-label="Ganti password" title="Ganti password">
            <KeyRound size={16} />
          </button>
          <button className="iconCircle" onClick={logout} aria-label="Keluar" title="Keluar">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {!online && <div className="offlineBanner" role="alert">Koneksi ke server terputus — daftar mungkin tidak terbaru.</div>}

      <main className="qcxMain">
        <div className="qcxTabs">
          <button className={tab === "todo" ? "on" : ""} onClick={() => setTab("todo")}>
            Perlu dicek <b>{todo.length}</b>
          </button>
          <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
            Sudah dicek <b>{done.length}</b>
          </button>
        </div>

        {!enabled ? (
          <p className="qcxEmpty">Fitur QC sedang dinonaktifkan oleh Admin. Tidak ada yang perlu dicek saat ini.</p>
        ) : !loaded ? (
          <p className="qcxEmpty">Memuat…</p>
        ) : shown.length === 0 ? (
          <p className="qcxEmpty">
            {tab === "todo" ? "Tidak ada unit yang menunggu dicek. Kerja bagus!" : "Belum ada hasil QC yang menunggu teknisi."}
          </p>
        ) : (
          <div className="qcxList">
            {shown.map((t) => (
              <button key={t.id} className="qcxCard" onClick={() => setOpened(t)}>
                <div>
                  <b>{t.customer}</b>
                  <span>{t.id}</span>
                </div>
                <p>
                  {t.deviceType && <i>{t.deviceType}</i>} {t.device}
                  {t.brand ? ` ${t.brand}` : ""}
                </p>
                <p className="issue">{t.issue}</p>
                <footer>
                  <small>Masuk {age(t.receivedAt)}</small>
                  {t.qc ? (
                    <em className={t.qc.reviewedAt ? "reviewed" : "waiting"}>
                      {t.qc.reviewedAt ? "Sudah ditinjau teknisi" : `Menunggu teknisi · ${t.qc.badCount} bermasalah`}
                    </em>
                  ) : (
                    <em className="todo">
                      <ClipboardCheck size={14} /> Mulai QC
                    </em>
                  )}
                </footer>
              </button>
            ))}
          </div>
        )}
      </main>

      {open && (
        <QcForm
          key={open.id}
          ticket={open}
          existing={open.qc}
          onClose={() => setOpened(null)}
          onSaved={() => {
            setOpened(null);
            setToast(`QC ${open.id} terkirim ke teknisi`);
            setTimeout(() => setToast(""), 3500);
            load();
          }}
        />
      )}
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} onDone={() => {
        setPwOpen(false);
        setToast("Password berhasil diganti");
        setTimeout(() => setToast(""), 3500);
      }} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
