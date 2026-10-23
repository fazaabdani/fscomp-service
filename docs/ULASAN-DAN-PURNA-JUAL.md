# Ulasan & purna jual (24 Okt 2026)

Latar: dua ulasan Google Maps negatif dalam sebulan (soal harga "mahal" dan anak magang). Yang dibangun:

1. **Rincian biaya per item** (`Ticket.costItems`, `lib/cost-items.ts`). Di detail servis: panel *Rincian biaya*
   (nama + harga, bisa ambil dari Jasa Servis; tombol "Pakai sebagai Estimasi/Biaya final"). Tampil di tanda terima,
   nota lunas, dan pesan WA biaya lewat `{rincian}`. Jika total rincian ≠ biaya sebenarnya, nota menampilkan baris
   "Penyesuaian / Potongan" supaya angka nota tetap sama dengan yang ditagih. Maks. 5 baris di dokumen cetak (sisanya
   dilipat jadi "Lainnya (n item)"). Uang tetap bersumber dari `estimate`/`finalCost`.
2. **Tindak Lanjut** (menu baru + notifikasi). Servis yang diambil 2–14 hari lalu dan belum ditanya muncul di daftar;
   tombol *Tanya kabar* membuka WA dengan template `waFollowUp` dan menandai `followedUpAt`. Pesannya sama untuk semua
   pelanggan (bukan hanya yang diduga puas).
3. **Peran jelas**: nota lunas menampilkan Teknisi; halaman cek status publik menampilkan nama teknisi dan kalimat
   bahwa perbaikan diputuskan teknisi, magang hanya membantu pengecekan awal.
4. **QR ulasan Google di nota lunas** untuk semua pelanggan jika *Link ulasan Google Maps* diisi di Profil Toko
   (`ShopSettings.reviewUrl`, harus http/https).
5. **Jalur komplain tanpa menekan ulasan**: pesan WA `waPickedUp` ("Servis Diambil — Terima Kasih") dan bagian
   "Ada kendala? Kami siap membantu lewat WhatsApp …" di nota lunas. Sengaja TIDAK meminta pelanggan menahan ulasan —
   kebijakan Google Maps melarang menghalangi ulasan negatif atau hanya meminta ulasan dari yang puas.

Template baru bisa diedit di menu *Pesan WhatsApp*. Pesan biaya yang sudah tersimpan di database produksi diberi
`{rincian}` satu kali lewat skrip (hanya jika belum ada).
