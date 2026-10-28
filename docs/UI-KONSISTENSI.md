# Audit & konsistensi UI/UX (28 Okt 2026)

## Temuan audit (sebelum)
| Area | Temuan |
|---|---|
| Tombol | 16 ukuran tinggi berbeda (18–45 px); `.ghost` hanya bergaya di dalam `.actionGrid`/`.modalFoot`, di tempat lain tampil polos (radius 0, huruf 15px) |
| Kolom isian | tinggi 41/45 px, huruf 12 vs 15 px dalam satu halaman |
| Huruf | 27 ukuran berbeda; banyak teks 10–11 px |
| Sudut | 20 nilai radius berbeda |
| Warna teks | puluhan abu-abu pucat dengan kontras 2,2–4,4:1 (batas baca 4,5:1) |
| Daftar servis | lebar minimum 1310 px: di laptop 1366–1440 px kolom Biaya/Lama terpotong dan harus digeser |
| Tabel Pembayaran | min 1300 px, kolom "Cara Bayar" dan "Aksi" terpotong di 1440 px |
| Tabel Pelanggan | header biru muda dan tombol Export abu-abu, berbeda dari semua tabel lain |
| Aksesibilitas | tidak ada `role="dialog"`, tidak ada fokus keyboard yang terlihat, Esc tidak menutup dialog |
| Konfirmasi | 5 pertanyaan memakai `confirm()`/`prompt()` bawaan browser (tampil beda dari aplikasi) |
| Placeholder | ikut huruf kapital dan semirip isi sebenarnya, sulit dibedakan dari data terisi |
| Kosong | halaman status kosong selalu bilang "Data tidak ditemukan, coba ubah pencarian" walau tidak ada pencarian |
| Laporan | 6 kartu ringkasan di grid 5 kolom: kartu "Profit" sendirian di baris kedua; Laporan Teknisi kosong tanpa penjelasan |
| Biaya di daftar | menampilkan "DP Rp 0" di setiap baris tanpa DP |

## Aturan baru (lapisan "UI kit v2" di akhir `app/globals.css`)
- **Tombol**: sedang 40 px (form, aksi modal), kecil 34 px (toolbar, aksi dalam panel); radius 8; huruf 13 px tebal; satu baris (`nowrap`); status `:disabled` seragam. Di HP sasaran sentuh minimal 44 px (tombol ikon di bilah atas 40 px).
- **Kolom isian**: tinggi 40 px, huruf 14 px, radius 8; placeholder abu-abu terang, huruf normal.
- **Fokus keyboard**: cincin biru 2 px di semua kontrol (`:focus-visible`).
- **Skala huruf**: 12 / 13 / 14 / 15 / 16 / 18 / 20 / 24 / 28 / 32 px. Minimum 12 px. Aturan cetak (`@media print`: nota, label) tidak diubah.
- **Skala radius**: 6 / 8 / 12 / 16 / 20 px dan pil (999).
- **Teks abu-abu**: seluruh abu-abu pucat di tema terang dinaikkan ke `#5f6c84` (±5,3:1). Sidebar gelap dan tema lama tidak diubah.
- **Dialog**: `app/ask-dialog.tsx` (`askConfirm`, `askPrompt`, `<AskHost/>`) menggantikan `confirm`/`prompt`. Esc = batal; konfirmasi berbahaya mulai di tombol "Batal". Tanpa host, kembali ke dialog bawaan browser.
- **Modal**: `role="dialog"`, `aria-modal`, `aria-labelledby` dipasang otomatis; Esc menutup modal teratas **kecuali** sudah ada yang diketik (supaya input tidak hilang tanpa sengaja; tombol X tetap bisa).
- **Daftar servis**: kolom lebih ramping + padding baris dihitung dalam lebar minimum (1102 px); di bawah 1440 px kolom *Tindakan* disembunyikan (ada di detail servis), min 1007 px.
- Status "kosong" kontekstual per halaman; Laporan Teknisi punya pesan kosong; kartu ringkasan laporan memakai `auto-fit`.

## Belum dikerjakan (saran lanjutan)
- ±350 warna heksa lain di CSS belum disatukan jadi token (hanya abu-abu teks yang diseragamkan).
- Tabel Pelanggan (13 kolom, 1450 px) masih perlu digeser di layar < 1500 px.
- Fokus-jebak (focus trap) di dalam modal belum ada.
- Kata campuran Inggris/Indonesia ("Export", "Scan QR", "Copy WA") dibiarkan karena sudah dikenal staf.
