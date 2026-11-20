# Platform multi-toko (cabang `multi-tenant`)

Status 21 Nov 2026: **Fase 1a (inti multi-toko) selesai dan teruji di komputer lokal. Belum digabung ke `main`, belum di-deploy.**
Rencana, temuan audit, dan keputusan pemilik: `AUDIT-SIAP-JUAL.md` (bagian 7-8).

## Keputusan terbaru pemilik (21 Nov 2026)
Pemilik ingin **FS Comp ikut menjadi pelanggan (toko pertama) di platform sendiri**, tetap memakai `servis.fscomp.id`
lewat fitur *domain khusus*. Ini menggantikan keputusan 13 Nov ("FS Comp tetap terpisah"). Pemindahan FS Comp dilakukan
paling akhir, setelah platform teruji; sampai itu servis.fscomp.id tetap berjalan di instance lamanya (mode satu toko).

## Cara kerja
- **Satu aplikasi, satu file SQLite per toko** (`data/tenants/<slug>.db`) + **database induk** (`data/master.db`: daftar toko,
  domain, super-admin). Skema toko = skema lama; tiga tabel platform (`Tenant`, `TenantDomain`, `SuperAdmin`) ada di skema yang sama
  tetapi hanya terisi di database induk.
- `TENANT_MODE=single` (bawaan) = perilaku lama persis. `TENANT_MODE=multi` = mode platform. Satu build melayani keduanya.
- **Toko dikenali dari alamat (Host)** oleh `middleware.ts`: `slug.<PLATFORM_DOMAIN>` -> toko; `servisku.id`/`panel.`/`www.` = platform
  (bukan toko); domain lain dicari di tabel `TenantDomain` (domain khusus, mis. `servis.fscomp.id`). Hanya satu label di depan domain
  dasar yang dihitung; nama dicadangkan (`www`, `panel`, `admin`, `api`, ...) tidak bisa jadi toko.
- Penanda toko diteruskan ke kode lewat header `x-tenant-slug` yang **selalu dihapus dari permintaan klien lalu diisi ulang** oleh middleware.
- `lib/prisma.ts`: di mode multi, `prisma.xxx` otomatis diarahkan ke database toko pada permintaan itu (cache maks. 300 klien terbuka,
  yang paling lama tidak dipakai ditutup). Hanya bentuk callback `$transaction(async (tx) => ...)` yang didukung; tes `lib/tenant-host.test.ts`
  menggagalkan build bila ada bentuk array.
- **Sesi**: cookie menyertakan slug toko (`t`) di dalam tanda tangan; cookie satu toko tidak berlaku di toko lain. Batas laju per toko + IP.
- Toko berstatus `SUSPENDED`/`CLOSED`: halaman 402 "Langganan tidak aktif", API 402; data tetap utuh.
- Bukti memori (spike 13 Nov): 100 database toko terbuka sekaligus hanya menambah +-56 MB.

## Lingkungan (`.env`) mode multi
```
TENANT_MODE=multi
PLATFORM_DOMAIN=servisku.id          # domain produk; toko = <slug>.servisku.id
MASTER_DB=data/master.db
TENANT_DATA_DIR=data/tenants
SESSION_SECRET=...                    # tetap wajib
# opsional: TENANT_MAX_OPEN=300, TENANT_CACHE_TTL_MS=30000
```

## Perintah (`node scripts/tenant.mjs ...`)
| Perintah | Fungsi |
|---|---|
| `init` | Membuat database induk dan templat toko kosong |
| `create <slug> "<Nama>" <adminUser> [--domain host] [--trial-days 30]` | Toko baru dari templat; password Admin dari env `TENANT_ADMIN_PASSWORD` (tidak lewat argumen) |
| `import <slug> "<Nama>" <berkas.db> [--domain host]` | Memasukkan database yang sudah ada (cara memindahkan FS Comp); skema dinaikkan tanpa membuang data |
| `list` | Daftar toko, status, masa uji coba/lunas, domain |
| `suspend` / `activate <slug>` | Menangguhkan / mengaktifkan (berlaku <= 30 detik) |
| `domain <slug> <host>` | Menambah domain khusus |
| `migrate` | `prisma db push` aman ke semua database toko + induk; melaporkan yang gagal |
| `backup` | Salinan konsisten (`VACUUM INTO`) semua database, simpan 14 terbaru per toko |

## Hasil uji (lokal, 21 Nov 2026)
- 21/21 skenario isolasi lolos: host tak dikenal 404; login per toko; admin toko B tidak bisa masuk toko A; cookie toko A ditolak di toko B;
  data servis tidak bocor (daftar, ubah, pelacakan publik); header `x-tenant-slug` palsu diabaikan; domain khusus memetakan ke toko yang benar;
  tangguhkan -> 402 lalu aktifkan lagi; toko lain tidak terpengaruh.
- Mode satu toko (build yang sama): 8/8 lolos, cookie tanpa penanda toko, login pertama di database kosong tetap membuat Admin.
- 59 tes unit lolos, `tsc` dan `next lint` bersih.

## Catatan teknis penting
- Nomor servis berbasis jam (`SRV-YYMMDD-HHMMSS`) **hanya unik per toko**: dua toko bisa punya nomor yang sama. Itu wajar karena data terpisah;
  semua pencarian selalu dalam konteks toko dari alamat.
- `prisma db push` di Dockerfile (`--accept-data-loss`) masih dipakai mode satu toko. Untuk mode multi gunakan `tenant.mjs migrate` (tanpa flag itu).
- Gambar logo `public/logo-*.png` dan teks merek FS Comp (halaman login, nilai awal profil) **belum** dibuat per toko: itu Fase 1b.

## Belum dikerjakan (urutan berikutnya)
1. **Fase 1b - siap dibagikan:** halaman login netral/per toko, nilai awal profil kosong (tanpa rekening/alamat FS Comp), layar setup awal, unggah logo,
   pelacakan publik lebih aman (nomor servis + 4 digit akhir WhatsApp), CSP, kunci akun, migrasi aman, paginasi.
2. **Fase 2 - pendaftaran mandiri + Panel Kontrol** (`panel.<domain>`): daftar toko, uji coba 30 hari, status/kesehatan, tangguhkan/aktifkan, catat pembayaran tahunan.
3. **Fase 3 - penagihan, pembaruan, pemantauan**; lalu **pemindahan FS Comp** (`import` + domain khusus `servis.fscomp.id` + DNS/tunnel), terakhir beta tertutup lalu broadcast.
4. Hosting platform: VPS (bukan server toko: mati +-45 menit tiap Minggu 01.30). Wildcard DNS `*.<domain>` + HTTPS lewat Cloudflare atau Traefik DNS-challenge.
