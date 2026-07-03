# FS Service Center

Aplikasi manajemen servis lokal dengan antarmuka modern dan responsif.

## Fitur

- Dashboard servis dan statistik operasional.
- Penerimaan servis lengkap dengan pelanggan, perangkat, keluhan, teknisi, estimasi, dan DP.
- Pencarian, filter status, perubahan status, serta riwayat pekerjaan.
- QR unik per work order dan pemindai QR melalui kamera browser.
- Tracking status bertahap dari servis baru hingga selesai.
- Indikator lama pengerjaan dengan warna hijau, kuning, dan merah.
- Konfirmasi pelanggan serta persetujuan estimasi biaya.
- Estimasi, DP, biaya final, sisa pembayaran, dan rating bintang.
- Database pelanggan otomatis lengkap dengan WhatsApp dan riwayat servis.
- Modul pembayaran dengan tagihan, jatuh tempo, filter, dan aksi pelunasan.
- Pengaturan profil toko, nota, rekening pembayaran, syarat servis, dan gembok toko.
- Alur kerja familiar: Belum Cek → Sedang Tes/Cek → Menunggu Konfirmasi → Dikerjakan/Sparepart/Mitra → Bisa Diambil → Sudah Diambil.
- Modul akun dan hak akses, master jasa servis, status garansi, laporan servis, serta laporan teknisi.
- Tiga pilihan WhatsApp: chat kosong, konfirmasi penerimaan dengan tracking, dan konfirmasi biaya.
- Checklist pekerjaan teknisi dan salin daftar servis untuk grup WhatsApp.
- QR utama serta QR terpisah untuk setiap perlengkapan pelanggan.
- Ekspor laporan CSV, cetak ulang tanda terima, cetak QR, dan penyimpanan data lokal/offline.
- Tampilan desktop, tablet, dan seluler.

## Menjalankan lokal

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`.

Build produksi:

```bash
pnpm build
pnpm start
```

Data utama tersimpan pada database server SQLite; `localStorage` browser dipakai sebagai fallback ketika koneksi lokal terganggu.

## Mode produksi lokal

Aplikasi sekarang memakai SQLite server-side dengan fallback `localStorage`, login berbasis sesi HTTP-only, role Admin/Teknisi, audit log, riwayat pembayaran, log WhatsApp, tracking publik, notifikasi operasional, health check, dan backup otomatis.

Login awal mengikuti `.env` (`admin` / `admin123`). Baca `DEPLOYMENT.md` untuk konfigurasi `servis.fscomp.id`, persistent volume, backup, dan checklist go-live.
