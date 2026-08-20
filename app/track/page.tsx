"use client";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";

type TrackTicket = {
  id: string;
  device: string;
  status: string;
  receivedAt: string;
  updatedAt: string;
  serviceAction?: string;
};

export default function TrackPage() {
  const [results, setResults] = useState<TrackTicket[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function find(query: string) {
    setError("");
    setResults(null);
    const trimmed = query.trim();
    const digits = trimmed.replace(/\D/g, "");
    const looksLikePhone = /^[0-9\s+()-]+$/.test(trimmed) && digits.length >= 8;
    setBusy(true);
    const param = looksLikePhone
      ? `phone=${encodeURIComponent(digits)}`
      : `id=${encodeURIComponent(trimmed)}`;
    const r = await fetch(`/api/public/track?${param}`);
    const j = await r.json();
    setBusy(false);
    if (!r.ok) setError(j.error);
    else setResults(j.tickets);
  }

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("id");
    if (id) find(id);
  }, []);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    find(String(new FormData(e.currentTarget).get("query") || ""));
  }

  return (
    <main className="trackPage">
      <section className="trackCard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="authLogo">
          <img src="/logo-mark.png" alt="FS Comp" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </span>
        <h1>Cek Status Servis</h1>
        <p>
          Masukkan nomor servis, atau nomor WhatsApp untuk melihat semua
          servis Anda.
        </p>
        <form onSubmit={submit}>
          <input
            name="query"
            required
            placeholder="Contoh: SRV-260702-016 atau 08xxxxxxxxxx"
          />
          <button disabled={busy}>
            <Search /> {busy ? "Mencari..." : "Cari"}
          </button>
        </form>
        {error && <div className="authError">{error}</div>}
        {results?.map((t) => (
          <div className="trackResult" key={t.id}>
            <CheckCircle2 />
            <small>No. Servis</small>
            <strong>{t.id}</strong>
            <h2>{t.device}</h2>
            <i>{t.status}</i>
            <dl>
              <div>
                <dt>Diterima</dt>
                <dd>{t.receivedAt}</dd>
              </div>
              <div>
                <dt>Terakhir diperbarui</dt>
                <dd>{t.updatedAt}</dd>
              </div>
              <div>
                <dt>Tindakan</dt>
                <dd>{t.serviceAction || "Belum ada tindakan"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </section>
    </main>
  );
}
