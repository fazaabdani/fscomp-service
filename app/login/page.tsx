"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, ShieldCheck, Wrench } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "Login gagal");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="authPage">
      <section className="loginShell">
        <aside className="loginWelcome">
          <div className="loginBrand"><span><Wrench /></span><b>FS COMP</b></div>
          <div className="welcomeCopy">
            <small>SISTEM MANAJEMEN SERVIS</small>
            <h1>Servis lebih tertata.<br />Pelanggan lebih percaya.</h1>
            <p>Kelola penerimaan, proses teknisi, pembayaran, garansi, dan tracking dalam satu tempat.</p>
            <div className="loginBenefits">
              <span><CheckCircle2 /> Data servis tersimpan aman</span>
              <span><CheckCircle2 /> Tracking dan QR terintegrasi</span>
              <span><CheckCircle2 /> Laporan usaha lebih mudah</span>
            </div>
          </div>
          <div className="loginLocation"><MapPin /> Wiradesa, Pekalongan</div>
        </aside>

        <form className="authCard" onSubmit={submit}>
          <span className="authLogo"><ShieldCheck /></span>
          <div className="loginTitle"><small>SELAMAT DATANG</small><h2>Masuk ke FS COMP</h2><p>Gunakan akun Anda untuk melanjutkan operasional servis.</p></div>
          <label>Username<input name="username" required autoFocus autoComplete="username" placeholder="Masukkan username" /></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="Masukkan password" /></label>
          {error && <div className="authError">{error}</div>}
          <button disabled={busy}><ShieldCheck />{busy ? "Memeriksa..." : "Masuk ke Sistem"}</button>
          <div className="loginSecure"><span /> Sesi aman berlaku selama 8 jam</div>
        </form>
      </section>
      <footer className="loginFooter">© 2026 FS COMP · Sistem Operasional Servis</footer>
    </main>
  );
}
