# Audit total: kesiapan dijual sebagai langganan bulanan (13 Nov 2026)

Cakupan: kode (`D:\servis.fscomp.id`), keamanan, operasional di server toko, UX, dan kesiapan model
"satu aplikasi, banyak pelanggan, bayar bulanan". Audit ini **hanya membaca**; belum ada yang diubah
karena temuannya menyangkut keputusan Anda (bagian "Keputusan yang perlu Anda ambil").

## 1. Ringkasan satu paragraf
Aplikasinya sudah matang untuk **satu toko** (FS Comp): otorisasi rapi, backup harian dengan restore
yang pernah diuji, UI sudah diseragamkan, 46 tes lolos. Tetapi **belum siap dijual**: (a) masih berupa
aplikasi satu toko tanpa konsep pelanggan/langganan, (b) data dan merek FS Comp tertanam di kode
(termasuk nomor rekening), (c) password bawaan `admin/admin123` masih berlaku di produksi dan tertulis
di dokumen, (d) dependensi Next.js perlu naik patch karena ada 23 temuan kerentanan. Semuanya bisa
dibereskan; urutannya ada di bagian 5.

## 2. Yang sudah bagus (jangan dirusak)
- Semua rute data memeriksa sesi; `middleware.ts` memeriksa ulang akun ke database di **setiap
  request** (akun nonaktif langsung tertendang), dan peran Magang dikunci di middleware, bukan hanya di UI.
- Password di-hash scrypt + salt; cookie sesi `httpOnly`, `sameSite=lax`, `secure` di produksi; rate limit
  pada login, ganti password, dan pelacakan publik; log audit untuk perubahan penting.
- Pelacakan publik hanya mengembalikan kolom aman (tanpa DP/biaya). Endpoint internal memakai token rahasia.
- Backup harian otomatis + prosedur restore yang sudah diuji ujung ke ujung (DEPLOYMENT.md).
- Aturan bisnis ditegakkan di server (kabar WhatsApp wajib, huruf kapital, kunci toko), bukan hanya di layar.
- UI sudah satu skala (tombol, kolom isian, fokus keyboard, kontras) setelah audit 28 Okt; lihat `UI-KONSISTENSI.md`.

## 3. Temuan, berurutan menurut tingkat

### KRITIS: blokir untuk dijual
| # | Temuan | Bukti | Perbaikan |
|---|---|---|---|
| K1 | Password bawaan `admin/admin123` **masih berlaku di produksi** dan tertulis di README, DEPLOYMENT, panduan. Login otomatis membuat Admin dari `ADMIN_USERNAME/ADMIN_PASSWORD` di `.env` bila akun itu belum ada. | `app/api/auth/login/route.ts:19`; dokumen | Sekarang: ganti password admin FS Comp dan hapus kedua variabel dari `.env`. Untuk produk: layar **setup awal** (pemilik membuat password sendiri), tanpa password bawaan. |
| K2 | Dependensi rentan: `next 15.5.18` terpasang, `pnpm audit --prod` melaporkan **23 temuan (3 kritis, 12 tinggi, 8 sedang)**: `next` (DoS Server Actions, cache confusion), `postcss`, `nanoid`, `sharp`, `source-map-js`. Temuan "kritis" RCE hanya untuk host **Windows**; server kita Linux, jadi tidak terkena, tetapi DoS dan cache confusion berlaku. | `package.json`; audit | Naik ke `next >= 15.5.27` (patch dalam rentang `^15.5`, risiko kecil) + perbarui transitif, uji, deploy. |
| K3 | `prisma db push --accept-data-loss` dijalankan **setiap container start**. Perubahan skema yang menghapus kolom/tabel akan membuang datanya tanpa bertanya. (Mitigasi yang ada: backup otomatis sebelum start.) | `Dockerfile` baris CMD | Untuk banyak pelanggan: pakai migrasi bertahap (`prisma migrate`) atau minimal buang flag itu dan batalkan start bila ada risiko kehilangan data. |
| K4 | **Merek dan data pemilik tertanam di kode**: halaman login ("FS COMP", "Wiradesa, Pekalongan"), nilai awal profil toko (telepon 0816660056, alamat, **rekening BCA a/n Faza Abdani**, IG/TikTok `fscomp_id`), logo `public/logo-*.png`, ikon, domain `servis.fscomp.id` di compose, nama berkas ekspor, nama paket. Instalasi baru akan menampilkan semua ini, termasuk nomor rekening Anda di nota, sampai pelanggan mengisi profilnya. | `app/login/page.tsx`, `app/service-desk.tsx:202-211`, `prisma/schema.prisma:125-126`, `docker-compose.yml` | Nilai awal kosong, wizard setup, logo/warna/nama diatur dari pengaturan (belum ada unggah logo sama sekali). |

### TINGGI
| # | Temuan | Catatan |
|---|---|---|
| T1 | **Tidak ada konsep pelanggan/langganan/penagihan.** Tidak ada cara menangguhkan, menagih, atau memantau banyak toko. | Jawaban untuk pertanyaan "dashboard": lihat bagian 4. |
| T2 | **Pelacakan publik bisa dicari hanya dengan nomor WhatsApp** (tanpa nomor servis). Siapa pun yang tahu nomor seseorang bisa melihat riwayat servis (perangkat, tindakan, teknisi). Nomor servis sendiri bisa ditebak (tanggal + jam), dibatasi 15 permintaan/menit/IP. | Wajibkan nomor servis + 4 digit akhir WhatsApp, atau pakai token acak di tautan/QR. |
| T3 | **Tanpa pemantauan galat.** Tidak ada logger/Sentry di kode (0 pemakaian); hanya `/api/health`. Saat pelanggan melapor "error", tidak ada jejaknya. | Tambah log galat terpusat + peringatan ke Telegram (infra bot sudah ada). |
| T4 | Backup ada dan teruji, tetapi **salinan off-site tidak terverifikasi** (dijadwalkan di `apps-backup.d`, belum dibuktikan bahwa unggahan berhasil). Untuk pelanggan berbayar ini wajib terbukti + ada peringatan bila gagal. | Catatan: token rclone di VPS 1 sudah diketahui kedaluwarsa; server toko belum dicek. |
| T5 | Daftar servis dimuat **seluruhnya** ke browser (`GET /api/tickets` tanpa paginasi). Aman untuk 1.367 servis (DB 2,5 MB), tetapi toko ramai (5–10 ribu servis/tahun) akan melambat di HP. | Paginasi + pencarian di server. |
| T6 | Perlindungan akun dasar saja: password minimal 8 karakter, batas percobaan per IP (di memori, hilang saat restart), tanpa kunci akun, tanpa 2FA, tanpa CSP (header lain sudah ada). | Kunci akun sementara, CSP, 2FA opsional untuk Admin. |
| T7 | Tidak ada unggah logo/warna/nama tampilan: white-label butuh ubah kode dan aset per pelanggan. | Bagian dari K4. |

### SEDANG
- **S1.** `service-desk.tsx` satu berkas 6.034 baris + CSS 7.550 baris: mahal dirawat dan didukung bila banyak pelanggan. Pecah bertahap per layar.
- **S2.** Tes: 46 tes unit (uang, laporan, WA, kode servis, dll.) **tanpa tes API/UI di repo** (skrip uji ujung ke ujung yang dipakai selama ini ada di folder sementara). Pindahkan ke repo + jalankan otomatis.
- **S3.** Kalimat bawaan pesan WhatsApp bernuansa Islami ("Assalamu'alaikum", "Jazakallahu khoiron"). Bisa diedit, tetapi bawaan untuk pelanggan baru sebaiknya netral dengan pilihan preset.
- **S4.** Integrasi ke "Owner Command Center" (`dashboard-sync.ts`, `DASHBOARD_INGEST_URL`) khusus ekosistem FS Dev; pisahkan dari produk.
- **S5.** Belum ada panduan pengguna/onboarding, syarat layanan, SLA, dan kebijakan privasi. Anda akan menyimpan nama/telepon/alamat pelanggan milik toko lain (UU PDP): Anda berperan sebagai pemroses data. Konsultasikan ke ahli hukum, ini bukan nasihat hukum.
- **S6.** Pembanding pasar (peluang nilai jual, bukan cacat): tidak ada stok sparepart, multi-cabang, komisi teknisi, e-nota/PDF otomatis, WhatsApp API (sekarang manual lewat tautan, yang justru aman dari pemblokiran).

## 4. Arsitektur dan "dashboard management akun"

Saya menafsirkan "dashboard management akun-akunnya" sebagai **panel kontrol pemilik produk** untuk mengelola
banyak pelanggan. (Manajemen akun *pegawai* di dalam satu toko sudah ada: menu Akun.)

### Dua jalur arsitektur
| | **A. Satu instance per pelanggan + Panel Kontrol (disarankan)** | B. Multi-tenant sejati |
|---|---|---|
| Cara | Tiap toko punya container + file database sendiri (`toko.domainanda.id`), dibuat otomatis dari satu skrip. Panel Kontrol terpisah mencatat dan mengendalikan semuanya. | Satu aplikasi, `tenantId` di semua tabel, SQLite diganti Postgres. |
| Isolasi data | **Kuat** (database terpisah; tidak mungkin bocor antar toko) | Bergantung pada kebenaran setiap query; satu bug = kebocoran antar pelanggan |
| Perubahan kode | Kecil (white-label, setup awal, endpoint status) | Besar (menyentuh semua tabel/rute), risiko tinggi |
| Backup/ekspor/hapus per pelanggan | Mudah (satu file) | Rumit |
| Biaya server | Naik linear | Hemat di skala besar |
| Cocok sampai | ±30–50 pelanggan | Di atas itu |

**Pengukuran nyata (server toko, 13 Nov 2026):** satu instance memakai **±223 MB RAM**, CPU ~0%; database
FS Comp hanya **2,5 MB** untuk 1.367 servis. Server toko punya 11,9 GB RAM dengan ±7,9 GB tersedia: kira-kira
**20–25 instance** muat dengan sisa aman (perkiraan; ukur ulang saat bertambah). Jalur A cukup untuk
puluhan pelanggan pertama tanpa menambah server.

### Isi Panel Kontrol (MVP)
- **Daftar pelanggan:** nama toko, alamat, paket, status (Aktif / Jatuh tempo / Ditangguhkan / Berhenti), tanggal
  mulai dan jatuh tempo, versi aplikasi, kesehatan (cek `/api/health`), jumlah servis dan akun, terakhir aktif,
  ukuran database, status backup terakhir.
- **Aksi:** buat pelanggan baru (otomatis: subdomain, container, Admin awal, tautan setup), tangguhkan/aktifkan,
  perpanjang, reset Admin, unduh backup, ekspor data pelanggan, hentikan dan hapus dengan masa simpan.
- **Penagihan:** catat pembayaran bulanan (transfer/QRIS), pengingat WhatsApp H-3 dan H+1, rekap pemasukan
  bulanan. Pembayaran otomatis (Midtrans/Xendit) menyusul sebagai tahap berikutnya.
- **Pembaruan:** perbarui satu atau semua instance (tarik kode, build, naikkan) dengan uji coba di satu pelanggan
  dulu dan jalur mundur (rollback).
- **Sisi aplikasi toko:** endpoint status bertoken untuk Panel Kontrol, dan penanda langganan. Bila lewat masa tenggang:
  banner lalu **mode baca-saja** (data tidak pernah dihapus atau disandera).

## 5. Peta jalan yang disarankan (perkiraan kerja, bukan janji)
| Fase | Isi | Perkiraan |
|---|---|---|
| **0. Segera** (tanpa menunggu keputusan; **SELESAI 13 Nov 2026**: password admin produksi diganti, `ADMIN_*` dihapus dari `.env`, login `.env` hanya untuk database kosong, `next 15.5.29` + dependensi transitif ditambal, `pnpm audit` bersih; **sisa: verifikasi backup off-site**) | Ganti password admin produksi + hapus `ADMIN_*` dari `.env`; naik `next >= 15.5.27`; verifikasi backup off-site | 0,5–1 hari |
| **1. Siap dibagikan** | K3 dan K4: nilai awal kosong, layar setup awal, unggah logo/nama/warna, bawaan netral, skrip buat-pelanggan satu perintah, migrasi aman, T2 (pelacakan), T6 (CSP, kunci akun), paginasi (T5), tes ujung ke ujung masuk repo | ±1 minggu |
| **2. Panel Kontrol MVP** | Daftar pelanggan, status/kesehatan, tangguhkan/aktifkan, buat pelanggan, backup/ekspor | ±1–2 minggu |
| **3. Penagihan & operasi** | Catat pembayaran, pengingat WA, laporan pemasukan, pembaruan massal + rollback, pemantauan galat ke Telegram | ±1–2 minggu |
| **4. Nilai tambah** | Stok sparepart, multi-cabang, komisi teknisi, e-nota PDF, pembayaran otomatis, panduan pengguna | berkelanjutan |

## 6. Keputusan yang perlu Anda ambil
1. **Arsitektur:** jalur A (disarankan) atau B.
2. **Merek dan domain produk:** nama produk yang netral (bukan "FS Comp"), domain induk (mis. `servis.domainanda.id` dengan
   subdomain per toko, atau domain sendiri milik pelanggan).
3. **Harga dan penagihan:** harga per bulan, ada masa uji coba atau tidak, tagih manual dulu atau langsung otomatis.
4. **FS Comp tetap instance sendiri** (data nyata tidak dipakai/dibagi ke pelanggan lain); saya asumsikan ya.
5. **Cakupan Fase 0:** boleh langsung dikerjakan dan di-deploy ke produksi FS Comp?

## 7. Catatan pelaksanaan Fase 0 (13 Nov 2026)
- Akun Admin pemilik: username diganti menjadi `adminfscomp` (akun yang sama, riwayat audit tetap menempel) dan password diganti sesuai permintaan pemilik. Password **tidak** dicatat di berkas mana pun.
- `.env` server dibersihkan dari `ADMIN_USERNAME/ADMIN_PASSWORD` (cadangan `.env.bak-*` di `/opt/fscomp-service/`, hapus bila tidak diperlukan karena memuat nilai lama).
- Login lama `admin/admin123` diuji: 401, dan tidak membuat akun baru. Akun `zume` (Admin) dan teknisi tidak berubah.
- Cadangan database sebelum perubahan: `fs-service_2026-11-13_02-33-51.004.db` di volume backup container.
- Perubahan kode: `app/api/auth/login/route.ts` (bootstrap hanya bila `user.count()==0`), Next 15.5.18 -> 15.5.29, override `postcss/nanoid/source-map-js/sharp` di `pnpm-workspace.yaml`.

## 8. REVISI (13 Nov 2026): target ratusan toko, dibagikan lewat broadcast ke sesama penjual laptop
Tujuan pemilik: ratusan pelanggan, dipasarkan lewat broadcast ke rekan penjual laptop dkk. Ini **mengubah rekomendasi arsitektur** di bagian 4.

**Jalur A (satu container per toko) tidak cocok untuk ratusan:** ±223 MB × 200 toko ≈ 45 GB RAM, banyak server, pembaruan harus diulang ke tiap container.

**Rekomendasi baru: B′ = satu aplikasi, satu file database per toko** (database-per-tenant).
- Satu proses aplikasi melayani semua toko; tiap toko tetap punya file SQLite sendiri (`data/tenants/<slug>.db`). Isolasi data tetap kuat (tidak ada `tenantId` yang bisa lupa difilter), backup/ekspor/hapus per toko tetap satu berkas.
- Satu kali pembaruan untuk semua toko; satu Panel Kontrol (daftar toko disimpan di database induk).
- **Diuji nyata (13 Nov 2026, spike lokal):** 100 database toko terbuka sekaligus hanya menambah **±56 MB** RSS (±0,56 MB per toko), membuka satu toko ±7 ms, 300 query ke 100 toko berbeda 40 ms. Ukuran database: FS Comp 2,5 MB untuk 1.367 servis, jadi 300 toko ≈ 1 GB. Satu VPS 8 GB cukup untuk ratusan toko; batas nyatanya CPU saat banyak toko aktif bersamaan (atasi dengan 2–4 proses di belakang Traefik, SQLite mode WAL aman untuk itu).
- **Titik sentuh kode kecil:** seluruh akses DB lewat `lib/prisma.ts` (27 berkas, 71 panggilan). Perubahan: klien DB dipilih per permintaan dari subdomain (tabel `Host` -> toko), tanda toko ikut ditandatangani di cookie sesi, dan runner migrasi menerapkan skema ke semua file toko. `$transaction` mengharuskan memakai klien yang sama, jadi tiap handler mengambil `const prisma = await tenantPrisma()` di awal (mekanis, bisa dibantu tes).
- Risiko yang harus ditangani: satu toko yang menjalankan ekspor besar bisa menahan proses (pakai beberapa proses + batas ukuran ekspor); migrasi skema ke ratusan file harus bisa dijalankan bertahap dan dilaporkan; batas laju (rate limit) harus per toko + IP.

**Syarat sebelum broadcast** (urutan penting):
1. Merek/data FS Comp bersih dari kode dan nilai awal (K4), layar setup awal, unggah logo.
2. Keamanan dasar: pelacakan publik (T2), CSP, kunci akun, `db push --accept-data-loss` diganti migrasi aman (K3).
3. **Pendaftaran mandiri + masa uji coba** (30 hari): form daftar toko, pilih subdomain, Admin dibuat otomatis, batasi satu uji coba per nomor WhatsApp. Dengan ratusan toko, pembuatan manual tidak mungkin.
4. Halaman depan (landing) + panduan singkat/video + saluran dukungan WhatsApp; syarat layanan dan kebijakan privasi sederhana.
5. Penagihan tahunan: awal manual (transfer/QRIS + konfirmasi di Panel Kontrol), otomatis menyusul.
6. **Beta tertutup 5-10 teman dulu**, perbaiki temuan, baru broadcast luas.

**Peta jalan revisi (perkiraan kerja, bukan janji):** 1a inti multi-toko ±1-1,5 minggu (di cabang git terpisah; produksi FS Comp tidak disentuh sampai lolos uji, FS Comp TIDAK dipindah: lihat keputusan di bawah) -> 1b white-label + keamanan ±1 minggu -> 2 pendaftaran mandiri + Panel Kontrol ±1-2 minggu -> 3 penagihan + pembaruan + pemantauan ±1-2 minggu -> beta tertutup -> broadcast.


### Keputusan pemilik (13 Nov 2026)
- **servis.fscomp.id tetap milik pribadi pemilik dan tetap berjalan seperti sekarang** (instance sendiri di server toko, data nyata, tidak ikut platform).
- **Platform jual terpisah di domain produk** (kandidat utama `servisku.id`, belum dibeli; `.com`-nya sudah dimiliki pihak lain, cek dulu merek/usahanya): `servisku.id` = halaman depan + daftar, `panel.servisku.id` = Panel Kontrol pemilik, `namatoko.servisku.id` = tiap toko.
- **Satu basis kode, dua mode**: `TENANT_MODE=single` (FS Comp, perilaku identik seperti sekarang, dijaga tes) dan `TENANT_MODE=multi` (platform, database per toko). Perbaikan bug cukup sekali; pembaruan dicoba di platform dulu, lalu ke FS Comp.
- **Hosting platform jangan di server toko**: semua aplikasi di sana mati +-45 menit tiap Minggu 01.30 (job Image SSD) dan bergantung pada Cloudflare Tunnel. Untuk pelanggan berbayar pakai VPS (VPS 1 Hostinger untuk awal, atau VPS khusus). DNS `*.servisku.id` wildcard + HTTPS lewat Cloudflare (satu tingkat subdomain tercakup gratis) atau Traefik DNS-challenge.
- Opsi masa depan (tidak wajib): FS Comp ikut sebagai toko di platform dengan domain khusus `servis.fscomp.id`.
