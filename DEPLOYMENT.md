# Deployment servis.fscomp.id

## Coolify / Docker

1. Buat resource baru dari repository GitHub aplikasi ini.
2. Pilih build pack **Dockerfile** dan gunakan branch `main`.
3. Container port: `3000`.
4. Domain: `https://servis.fscomp.id` dengan HTTPS otomatis.
5. Tambahkan persistent storage:
   - `/app/prisma/data`
   - `/app/backups`
6. Tambahkan environment berikut:

```env
DATABASE_URL=file:./data/fs-service.db
SESSION_SECRET=ganti-dengan-random-minimal-32-karakter
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
TZ=Asia/Jakarta
NEXT_PUBLIC_APP_URL=https://servis.fscomp.id
```

Login sementara: `admin / admin123`. Ganti password setelah sistem dinyatakan stabil.

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
