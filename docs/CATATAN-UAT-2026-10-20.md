# Catatan UAT & perbaikan — 20 Okt 2026

UAT penuh sebagai Teknisi pada salinan DB produksi (lokal, sudah dihapus). Siklus servis ujung ke ujung
(terima → diagnosa → konfirmasi → selesai → bayar → diambil → nota) berjalan normal.

## Diperbaiki & dideploy (commit f76cbab)
- Auto-refresh daftar servis/pelanggan tiap 30 dtk + saat tab fokus (tidak jalan saat modal terbuka atau ada tulis pending).
- `receivedTime` kini jam masuk sebenarnya (dulu kosong → form edit menulis "09:00" palsu).
- Nama "Petugas" di nota memakai teknisi/handedBy yang benar; Penerima default = user login.
- Statistik pelanggan memakai jumlah record pelanggan.
- Notifikasi: judul PAYMENT_DUE memuat sisa & hari lewat tempo; diurutkan menurut prioritas.
- Panel notifikasi tidak terpotong di layar HP.

## Perlu keputusan pemilik (belum dilakukan)
- **Ganti password admin** (`admin/admin123` masih berlaku) via Akun → Reset Password.
- Tidak ada aktivitas staf tercatat sejak 24 Agu 2026 — cek apakah staf bisa login / tahu password.
- Belum ada status "Dibatalkan" untuk servis terbengkalai (12 servis >7 hari belum siap, terlama 607 hari).
- Teknisi masih melihat kartu pendapatan; 18 servis "Sudah Diambil" belum lunas (±Rp9,5 jt); 10 tiket belum dikonfirmasi.
