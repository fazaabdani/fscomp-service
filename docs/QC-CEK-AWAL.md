# QC / Cek Awal (23 Okt 2026)

QC dikerjakan anak magang dengan **satu akun bersama** berperan **Magang (hanya QC)**. Kasir mengurus penerimaan
servis. Teknisi/Admin meninjau hasilnya.

## Alur
1. Kasir menerima servis (status *Belum Cek*).
2. Magang masuk dengan akun Magang → hanya melihat **Antrean QC** (tab *Perlu dicek* / *Sudah dicek*).
   Tidak ada harga, nomor HP pelanggan, pembayaran, laporan, atau menu lain.
3. Magang membuka unit → mengisi **checklist** sesuai Jenis barang (Laptop, Komputer / PC, Monitor, Printer; jenis
   lain memakai checklist *Umum*). Tiap item: Baik / Bermasalah / Tidak yakin / Tidak bisa dites. Bermasalah dan
   Tidak yakin **wajib** diberi catatan. Nama pengecek diketik (akun dipakai bersama; nama diingat di browser).
4. Kirim → status servis otomatis *Belum Cek → Sedang Cek*, muncul notifikasi **QC Perlu Ditinjau** untuk
   Admin/Teknisi, dan baris servis diberi tanda "QC selesai oleh … — tinjau".
5. Teknisi/Admin membuka detail servis → panel **Hasil QC**: lihat temuan, *Salin temuan ke Tindakan*,
   *Isi ulang QC* (jika perlu), lalu *Tandai sudah ditinjau*. Teknisi menulis tindakan dan estimasi biaya.
6. Pesan WA konfirmasi biaya bisa memakai `{temuan}` (item bermasalah dari QC); template yang sudah ada tidak
   diubah otomatis.

## Pembatasan akun Magang
Dipaksa di server (`middleware.ts`): semua `/api/*` selain `/api/qc*` dan `/api/auth/*` dijawab 403. Antrean QC
(`/api/qc/tickets`) tidak memuat estimasi, DP, biaya, atau nomor HP. Magang tidak muncul di pilihan Teknisi/Penerima.
Magang hanya bisa mengisi QC untuk servis berstatus Belum Cek / Sedang Tes / Sedang Cek.

## Membuat akun
Menu **Akun** (Admin) → peran **Magang (hanya QC)** → Buat Akun → berikan password sementara ke magang;
magang menggantinya lewat ikon kunci.

## Data
Tabel `QcCheck` (ticketId, template, items JSON berisi label saat itu, checkedBy, badCount, unsureCount,
reviewedBy/At). Isi ulang menambah baris baru; baris terbaru yang berlaku. Menghapus servis ikut menghapus QC-nya.
Checklist ada di `lib/qc-templates.ts` (belum bisa diubah dari layar — rencana Fase 2).

## Belum ada (Fase 2+)
Foto temuan, QC akhir sebelum "Bisa Diambil", checklist yang bisa diedit Admin, hasil QC di halaman cek status
pelanggan, riwayat QC per unit berdasarkan serial.
