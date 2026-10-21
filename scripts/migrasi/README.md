# Migrasi data aplikasi lama → servis.fscomp.id

Alat sekali pakai yang dipakai pada 21 Okt 2026 untuk memindahkan database aplikasi lama.
Folder ini TIDAK berisi data pelanggan.

1. Letakkan file ekspor `.xls` (sebenarnya HTML) aplikasi lama di sebuah folder bernama `old/`
   di samping skrip ini (Proses Servis, Bisa Diambil, Sudah Diambil, Status Garansi,
   Status Pembayaran, Pelanggan, Laporan Servis bulanan, Laporan Teknisi).
2. `python handled_assign.py` — merekonstruksi *Tgl. Selesai Ditangani* untuk servis yang sudah
   diambil (ekspor lama hanya menyimpannya untuk status Bisa Diambil) supaya laporan harian
   "Telah Ditangani" Jul–Okt 2026 dan laporan teknisi Oktober identik dengan aplikasi lama.
3. `python build_import.py` — menghasilkan `import_data.json` (pelanggan, servis, pembayaran).
4. `node ../import-old-data.mjs import_data.json` (dry run) lalu `... --yes` di dalam container.
   Skrip impor mengambil backup dulu dan membatalkan diri jika backup gagal.

Detail pemetaan dan hasil verifikasi: `docs/IMPOR-DATA-APLIKASI-LAMA.md`.
