# Panduan Go-Live servis.fscomp.id

Status 21 Okt 2026: data uji sudah DIGANTI dengan database aplikasi lama (1.358 servis, 935 pelanggan;
lihat `docs/IMPOR-DATA-APLIKASI-LAMA.md`). Langkah menghapus data uji di bawah tidak perlu lagi dijalankan
— jangan jalankan `reset-test-data.mjs` di produksi, itu akan menghapus data asli.

## Urutan langkah (jangan dibalik)

1. **Ganti password Admin.** Login `admin` → ikon kunci di kiri bawah (sebelah tombol keluar) →
   *Ganti Password*. Password lama bawaan `admin/admin123` harus tidak berlaku lagi.
2. **Hapus nilai bawaan di `.env` server** (`/opt/fscomp-service/.env`): `ADMIN_USERNAME` dan
   `ADMIN_PASSWORD`. Variabel itu hanya dipakai untuk membuat Admin pertama saat database kosong;
   setelah Admin ada, tidak diperlukan lagi.
3. **Buat akun staf** (menu Akun → Buat Data Akun Baru). Password sementara yang tampil diberikan ke
   orangnya; minta dia menggantinya sendiri lewat ikon kunci.
4. **Lengkapi Profil Toko** (nama, telepon, WhatsApp, alamat, ketentuan servis, rekening) dan
   **Jasa Servis** — dipakai di nota dan pesan WhatsApp.
5. ~~Hapus data uji~~ — sudah selesai lewat impor data aplikasi lama (21 Okt 2026).
6. Coba 1 servis sungguhan dari awal sampai nota lunas, cetak nota di printer yang akan dipakai.

## Menghapus data uji

Menghapus: tiket, pelanggan, pembayaran, log chat, notifikasi, audit log. Mempertahankan: akun,
profil toko, katalog jasa. Backup penuh otomatis diambil dulu; jika backup gagal, penghapusan batal.

```bash
ssh -i ~/.ssh/fscomp_local_server faza@100.97.87.101
cd /opt/fscomp-service
docker compose exec -T fs-service node scripts/reset-test-data.mjs        # lihat jumlah saja
docker compose exec -T fs-service node scripts/reset-test-data.mjs --yes  # hapus
```

Catatan: pembayaran uji yang sudah terkirim ke dashboard Owner (`DASHBOARD_INGEST_URL`) tidak ikut
terhapus — bersihkan juga di sisi dashboard.

## Backup

- Harian ~02:30 WIB (systemd timer `fscomp-service-backup.timer`), disimpan di volume
  `fs_service_backups`. Sejak 20 Okt 2026 memakai snapshot konsisten (`VACUUM INTO`) dan retensi
  per hari (30 hari terakhir, satu per hari + semua backup hari ini).
- Otomatis juga diambil setiap container start/deploy (sebelum `prisma db push`).
- Salinan off-site ke Google Drive dijadwalkan lewat `apps-backup.d/fscomp-service.conf` di server
  toko; **belum diverifikasi** dari sesi ini (butuh akses sudo) — cek berkala file di
  `gdrive:FS-Server/apps-daily/fscomp-service`.

## Catatan teknis yang perlu diingat

- Sesi login berlaku 8 jam; akun yang dinonaktifkan langsung tidak bisa akses, tetapi mengganti
  password tidak mengeluarkan sesi lain yang masih aktif (maks. 8 jam).
- Pembatasan data keuangan dari teknisi hanya di tampilan (data tetap dikirim ke browser).
- Batas login: 10 percobaan/menit per alamat IP.
