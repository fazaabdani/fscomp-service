# Deployment servis.fscomp.id

## Cara deploy sebenarnya: manual Docker Compose (BUKAN Coolify)

Aplikasi ini berjalan di **server toko** (Docker Compose manual, dikelola lewat SSH), bukan lewat
Coolify. Direktori deploy: `/opt/fscomp-service` (berisi clone git repo ini + `.env` produksi).

Alur redeploy setelah ada perubahan di `main`:

```bash
cd /opt/fscomp-service
git pull --ff-only origin main
docker compose build
docker compose up -d
docker compose ps                       # pastikan (healthy)
curl -s http://127.0.0.1:3216/api/health
```

Container port di-bind ke `127.0.0.1:${APP_PORT:-3216}` saja (lihat `docker-compose.yml`) — domain
publik `servis.fscomp.id` di-expose lewat reverse proxy/tunnel di level server, bukan langsung dari
compose ini.

**Sebelum `git pull`, selalu cek `git status` di server dulu.** Server ini pernah punya hotfix yang
dideploy langsung tanpa di-commit (integrasi dashboard-sync, lihat bagian di bawah) sampai akhirnya
direkonsiliasi 2026-08-20 — jangan asumsikan working tree server selalu bersih/sama dengan GitHub.

Environment yang dipakai (isi nilai sesuai server, jangan pakai default berikut di production):

```env
DATABASE_URL=file:./data/fs-service.db
SESSION_SECRET=ganti-dengan-random-minimal-32-karakter
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
TZ=Asia/Jakarta
NEXT_PUBLIC_APP_URL=https://servis.fscomp.id
APP_PORT=3216
# Opsional — integrasi Owner Command Center, lihat bagian "Integrasi dashboard" di bawah
DASHBOARD_INGEST_URL=
OWNER_INGEST_TOKEN=
```

`SESSION_SECRET` sekarang **wajib diisi** (minimal 16 karakter) saat `NODE_ENV=production` — server
akan menolak membuat/memverifikasi sesi kalau env ini kosong, alih-alih diam-diam memakai secret
bawaan yang tidak aman.

Login sementara: `admin / admin123`. Ganti password setelah sistem dinyatakan stabil.

## Integrasi dashboard (Owner Command Center)

Setiap pembayaran baru (`POST /api/payments`) di-push secara fire-and-forget ke dashboard pemilik
lewat `lib/dashboard-sync.ts`, memakai `DASHBOARD_INGEST_URL` + `OWNER_INGEST_TOKEN`. Gagal kirim
tidak boleh mengganggu alur pembayaran (di-swallow dengan sengaja).

`GET /api/internal/payments-export?days=N` adalah endpoint read-only terpisah untuk backfill/sync
manual dari sisi dashboard, diproteksi header `x-api-key` yang harus cocok dengan `OWNER_INGEST_TOKEN`
(bukan session cookie — makanya path ini masuk daftar `publicPath` di `middleware.ts`, otorisasinya
di dalam route itu sendiri).

Kalau env di atas kosong, kedua fitur ini otomatis tidak aktif (bukan error) — aman untuk dev lokal.

## DNS

Buat record `A` untuk subdomain `servis` menuju IP publik server. Jika menggunakan Cloudflare, mulai dengan proxy nonaktif sampai sertifikat HTTPS berhasil diterbitkan.

## Health check

- Path: `/api/health`
- Expected status: HTTP `200`
- Expected response: `{"status":"ok","database":"connected",...}`

Image akan menjalankan `prisma db push` otomatis sebelum aplikasi dimulai, sehingga volume database baru langsung siap digunakan.

## Backup

Jalankan `npm run backup` setiap hari melalui cron/Coolify scheduled task. Simpan salinan tambahan di luar server utama.

## Pemeriksaan sebelum go-live

- Login admin.
- Tambah pelanggan dan penerimaan servis.
- Cetak nota, QR utama, serta QR perlengkapan.
- Buka link tracking dari jaringan luar.
- Uji tiga pilihan chat WhatsApp.
- Uji perubahan status, pembayaran, garansi, dan laporan.
- Pastikan volume tetap berisi data setelah container diredeploy.

SQLite sesuai untuk satu instance aplikasi. Jangan menjalankan dua replica yang menulis ke file database yang sama. Migrasikan ke PostgreSQL jika nanti aplikasi digunakan beberapa cabang atau beberapa instance.
