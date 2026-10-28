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

## Chat WhatsApp wajib (24 Okt 2026)
Pernah terlewat mengabari pelanggan saat servis diterima dan saat pengambilan, sehingga sekarang wajib:

| Kapan | Pesan | Penegakan |
|---|---|---|
| Servis diterima | konfirmasi + link tracking | Layar serah terima: tombol "Lewati" tidak ada sebelum WA dibuka (Admin bisa lewati dengan alasan). Servis yang belum dikabari muncul di lonceng ("Belum Dikabari"). |
| Status → **Bisa Diambil** | kabar siap diambil | **Server menolak** (409 `WA_REQUIRED`) sampai ada log chat `READY`; aplikasi membuka jendela "Wajib kabari pelanggan". |
| Status → **Sudah Diambil** | terima kasih + garansi + jalur komplain | Sama, log `PICKED`. |

- Yang dicatat adalah **membuka tautan WhatsApp** dari aplikasi (ChatLog dengan `template` = jenis pesan). Sistem tidak bisa
  memastikan tombol Kirim di WhatsApp benar-benar ditekan; yang dicegah adalah lupa total.
- Admin dapat melewati dengan alasan wajib (tercatat sebagai `SKIP_<jenis>`); staf lain tidak bisa.
- Nomor WA tidak valid (<5 digit) otomatis dibebaskan.
- Tidak berlaku surut: hanya perpindahan status baru yang diperiksa; peringatan "Belum Dikabari" hanya untuk servis
  yang diterima mulai 24 Okt 2026 (`lib/wa-gate.ts`).
- Detail servis menampilkan kartu **Kabar ke pelanggan** (Diterima / Siap diambil / Sudah diambil) dengan tombol kirim.

## Tampilan daftar, huruf kapital, kelengkapan (28 Okt 2026)
- Daftar Proses Servis: satu baris per servis, kolom terpisah: **Tanggal** (tebal, jam di sebelahnya) · No. Servis (kecil,
  abu-abu) · Pelanggan · Perangkat · Keluhan · Tindakan · Teknisi · **Status** · **Lama** · Biaya. Teks panjang dipotong
  satu baris (isi lengkap muncul saat kursor diarahkan). Tampilan HP tetap kartu bertumpuk.
- **Huruf kapital**: nama pelanggan, alamat, nama barang, serial, keluhan, tindakan, catatan, pengambil, nama item rincian
  biaya, dan kelengkapan diketik/disimpan KAPITAL (`data-upper` di layar + `lib/upper.ts` di server, jadi API pun konsisten).
  Tidak berlaku untuk nomor HP, nama staf, password, template pesan WhatsApp, dan pengaturan toko. Data lama tidak diubah.
- **Kelengkapan** dipilih lewat chip (TAS, CHARGER, ADAPTOR, MOUSE, KABEL POWER, KABEL DATA, KARDUS, BATERAI, FLASHDISK,
  HARDISK EKSTERNAL) + kolom "Lainnya"; setiap item tetap mendapat label QR sendiri. Tanpa pilihan = "Unit only".

## Servis tidak bisa / dibatalkan (28 Okt 2026)
Keluhan staf: servis berkondisi **Tidak Bisa/Dibatalkan** tetap dikabari dengan kalimat "servis sudah selesai". Sekarang:
- Template baru `waNotFixed` ("Servis Tidak Bisa / Dibatalkan — Unit Bisa Diambil") dan `waNotFixedFollowUp` (H+2), bisa diedit di menu Pesan WhatsApp.
- Dipakai otomatis (kartu "Kabar ke pelanggan", jendela wajib-kabar, Tindak Lanjut) bila `condition` = Tidak Bisa/Dibatalkan atau status Dibatalkan (`isNotFixed` di `service-desk.tsx`). Log chat tetap `READY`, jadi aturan wajib-kabar tidak berubah.
- Menu Chat WhatsApp menampilkan kedua pilihan ("Selesai" dan "Tidak Bisa/Dibatalkan"); yang sesuai kondisi diberi tanda "Disarankan".
- `{biaya_cek}` otomatis dari **Biaya final** yang sudah dikonfirmasi: Rp0 = "tidak ada biaya (gratis)" (jika ada DP, ditulis akan dikembalikan), >Rp0 = biaya pengecekan + sisa. Biaya final belum dikonfirmasi = kalimat netral (estimasi perbaikan tidak pernah disebut sebagai tagihan).
