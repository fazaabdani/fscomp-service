# Impor data aplikasi lama — 21 Okt 2026

Sumber: 11 file ekspor aplikasi lama tanggal 21 Okt 2026 (Proses Servis, Bisa Diambil, Sudah Diambil,
Status Garansi, Status Pembayaran, Pelanggan, Laporan Servis Jul/Agu/Sep/Okt, Laporan Teknisi Okt).
Data uji di produksi dihapus; akun, profil toko, dan katalog jasa dipertahankan.

## Hasil
| Data | Jumlah |
|---|---|
| Servis | 1.358 (26 proses, 19 bisa diambil, 1.313 sudah diambil) |
| Pelanggan | 935 |
| Catatan pembayaran | 1.162 (satu per servis yang ada uang masuknya) |

## Pemetaan field
| Aplikasi lama | Sistem baru |
|---|---|
| `#YYMMDDHHMMSS` | `SRV-YYMMDD-HHMMSS` (ditampilkan kembali sebagai `#…` di ekspor; pencarian dan halaman cek status menerima kedua bentuk) |
| Nama Barang | `device` (satu kolom "Nama barang"; kolom Merek tidak lagi wajib) |
| Penerima (Proses Servis) | `receivedBy` |
| Teknisi | `technician` (huruf besar/kecil disesuaikan dengan nama akun: Rosyadi, Ludfy, Faza, Irham, Admin) |
| Kerusakan / Ket./Tindakan / Kondisi | `issue` / `serviceAction` / `condition` |
| Biaya, Modal | `finalCost` (=`estimate`, terkonfirmasi), `partCost` |
| Tagihan | `downPayment = Biaya − Tagihan` (uang yang sudah masuk) |
| Cara Pembayaran | `paymentMethod` apa adanya ("Tunai - Cash", "Transfer QRIS", "Tempo 1 Minggu", …); tempo → `paymentTermDays` |
| Garansi | `warrantyDays` dihitung dari Tgl. Ambil → Tgl. Garansi Berakhir (tepat sampai ke hari) |
| Tgl. Terima / Ambil / Selesai Ditangani | `receivedAt/Time`, `pickedUpAt/Time`, `handledAt/Time` |
| Status "Proses Servis" | "Sedang Dikerjakan" |

## Aturan laporan (diverifikasi terhadap laporan lama)
- Masuk = tanggal terima; Telah Ditangani = tanggal selesai ditangani; Keluar = tanggal diambil.
- Pemasukan, modal, profit = pada tanggal diambil, **hanya dari uang yang sudah dibayar**
  (servis tempo yang belum lunas belum dihitung; sebagian dibayar dihitung proporsional).
- Laporan Teknisi: jumlah servis selesai per teknisi per hari; total menangani, pemasukan, dan profit per teknisi.

## Verifikasi (ekspor aplikasi baru vs file lama, sel demi sel)
- Proses Servis (26), Bisa Diambil (19), Sudah Diambil (1.313), Status Garansi (1.313), Status Pembayaran
  (1.313): semua kolom identik, kecuali perbedaan yang tercantum di bawah.
- Pelanggan (935): kategori, alamat, total servis identik.
- Laporan Servis Juli, Agustus, Oktober 2026: setiap baris harian dan total identik. September: identik
  kecuali Telah Ditangani 1 Sep (0, lama: 1) sehingga total September 58 (lama: 59).
- Laporan Teknisi Oktober 2026: 34 baris identik.

## Perbedaan yang disengaja / tidak bisa dihindari
1. **Tgl. Selesai Ditangani untuk servis yang sudah diambil** tidak ada di ekspor lama (hanya untuk Bisa
   Diambil). Tanggalnya direkonstruksi sehingga laporan harian Jul–Okt cocok; itu estimasi per servis,
   bukan data asli. Sebelum Juli, diisi tanggal pengambilan.
2. Satu slot "Telah Ditangani" 1 Sep 2026 tidak bisa dipenuhi oleh servis mana pun yang ada di ekspor.
3. Satu servis tanpa nama pemilik tertulis "Tanpa Nama".
4. Dua pelanggan nomor WhatsApp-nya salah di aplikasi lama (AURA AZIFA tanpa awalan 62, MARGANA kosong);
   di sistem baru dinormalisasi dari nomor telepon.
5. Pembayaran uang muka servis yang belum diambil: cara bayarnya tidak tercatat di aplikasi lama
   (dicatat "Tidak tercatat"). Tanggal pembayaran servis yang sudah diambil = tanggal pengambilan.
6. Nomor serial servis yang sudah diambil kosong di ekspor lama.
