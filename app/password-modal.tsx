"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function PasswordModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const current = String(form.get("current") || "");
    const next = String(form.get("next") || "");
    if (next.length < 8) return setError("Password baru minimal 8 karakter");
    if (next !== String(form.get("confirm") || ""))
      return setError("Konfirmasi password tidak sama");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Gagal mengganti password");
        return;
      }
      onDone();
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="serviceModal passwordModal" onSubmit={submit}>
        <div className="modalHead">
          <div>
            <span>AKUN SAYA</span>
            <h2>Ganti Password</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <X />
          </button>
        </div>
        <div className="formGridService single">
          <label>
            Password saat ini
            <input name="current" type="password" required autoComplete="current-password" />
          </label>
          <label>
            Password baru (min. 8 karakter)
            <input name="next" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            Ulangi password baru
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          {error && <div className="authError">{error}</div>}
        </div>
        <div className="modalFoot">
          <button type="button" className="ghost" onClick={onClose}>
            Batal
          </button>
          <button className="newButton" disabled={busy}>
            <CheckCircle2 size={17} /> Simpan Password
          </button>
        </div>
      </form>
    </div>
  );
}
