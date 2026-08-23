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

Login default saat instalasi pertama: `admin / admin123`. **Wajib diganti sebelum aplikasi
dipakai untuk transaksi nyata** — bukan sekadar "setelah stabil". Ganti lewat menu Akun (Reset
Password) begitu login pertama berhasil, lalu simpan password baru di pengelola kata sandi, bukan
di dokumen ini.

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

Backup harian sudah berjalan otomatis di server toko lewat systemd timer (bukan cron/Coolify — itu
dokumentasi lama yang keliru): `fscomp-service-backup.timer` menjalankan
`docker compose exec -T fs-service npm run backup` setiap hari (~02:30 WIB), menyimpan ke volume
`fs_service_backups` di dalam container. `fscomp-backup-retention.timer` membersihkan backup lama
sesuai kebijakan retensi (`KEEP_DAILY=7 KEEP_WEEKLY=4 KEEP_MONTHLY=3`) dan menyalin ke luar server
(lihat `D:\backup otmatis server\rencana-backup-otomatis-google-drive.md` di PC dev untuk detail
infra backup lintas-app). Cek status: `systemctl status fscomp-service-backup.timer` di server.

**Restore — sudah diuji ujung ke ujung** (2026-08-23): backup di-copy keluar container, dibuka
dengan Prisma Client langsung (bukan cuma dicek ukuran filenya), `PRAGMA integrity_check` = `ok`,
dan jumlah baris tickets/customers/payments cocok persis dengan database live saat backup diambil.
Prosedur restore produksi:

```bash
# 1. Stop aplikasi supaya tidak ada tulisan ke DB selagi restore
cd /opt/fscomp-service
docker compose stop fs-service

# 2. Salin backup terpilih menimpa database aktif (backup ADA di volume yang sama — lihat
#    volume fs_service_backups vs fs_service_data, keduanya ter-mount di /app/backups dan
#    /app/prisma/data di dalam container)
docker compose run --rm --no-deps fs-service \
  cp /app/backups/<nama-file-backup>.db /app/prisma/data/fs-service.db

# 3. Start lagi dan verifikasi
docker compose up -d
sleep 8
curl -s http://127.0.0.1:${APP_PORT:-3216}/api/health
```

Backup rutin dibuat dengan `copyFile` mentah pada file SQLite yang sedang aktif (bukan lewat
`.backup` SQLite yang atomik) — praktik sama seperti `scripts/backup.mjs` sejak awal. Untuk SQLite
mode `journal_mode=DELETE` (default, bukan WAL) tanpa write bersamaan, ini konsisten; risikonya
hanya jika backup kebetulan berjalan di tengah sebuah write, yang bisa menghasilkan snapshot
setengah-tertulis. Belum diprioritaskan untuk diganti ke `.backup` SQLite karena kejadian ini
jarang dan sudah tertangkap lewat `PRAGMA integrity_check` sebelum sebuah backup dipakai untuk
restore.

## Pemeriksaan sebelum go-live

- Login admin.
- Tambah pelanggan dan penerimaan servis.
- Cetak nota, QR utama, serta QR perlengkapan.
- Buka link tracking dari jaringan luar.
- Uji tiga pilihan chat WhatsApp.
- Uji perubahan status, pembayaran, garansi, dan laporan.
- Pastikan volume tetap berisi data setelah container diredeploy.

SQLite sesuai untuk satu instance aplikasi. Jangan menjalankan dua replica yang menulis ke file database yang sama. Migrasikan ke PostgreSQL jika nanti aplikasi digunakan beberapa cabang atau beberapa instance.
