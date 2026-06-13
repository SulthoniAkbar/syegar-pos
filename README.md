# SYEGAR POS

Aplikasi POS untuk UMKM minuman dan makanan. Project ini memakai Next.js/React, TypeScript, Tailwind CSS, Prisma Client, dan PostgreSQL online.

## Fitur

- Login: `superadmin/superadmin123`, `owner/owner123`, dan `kasir/kasir123`
- Dashboard omzet, transaksi, menu terlaris, stok minimum, pembayaran tunai/QRIS
- CRUD kategori, menu, varian/topping, dan bahan baku
- Resep menu untuk pengurangan stok otomatis
- Kasir dengan keranjang, tunai/kembalian, QRIS manual "Sudah Dibayar"
- Tutup shift, ringkasan omzet, dan catatan shift
- Laporan transaksi dan export CSV sederhana
- Admin keuangan, stok masuk, dan stock opname

## Environment

Buat `.env` atau isi environment di hosting:

```bash
DATABASE_URL="postgresql://user:password@db.example.com:5432/syegar_pos?sslmode=require"
```

Gunakan URL PostgreSQL dari provider online seperti Supabase, Neon, Railway, Render, atau server PostgreSQL sendiri.

## Menjalankan Project

```bash
cd syegar-pos
npm install
npm run dev
```

Untuk deploy production:

```bash
npm run build
npm run start
```

Saat aplikasi pertama kali mengakses API, tabel PostgreSQL yang dibutuhkan akan dibuat otomatis jika belum ada, lalu data awal akan di-seed jika tabel user masih kosong.

## Database

- Runtime memakai PostgreSQL dari `DATABASE_URL`

## Smoke Test

Jalankan aplikasi lalu tes endpoint inti:

```bash
SYEGAR_URL=https://domain-anda.com npm run test:smoke
```

Untuk development lokal, `SYEGAR_URL` boleh diarahkan ke server dev yang sedang berjalan.

## Struktur Penting

- `app/api/*`: API Next.js untuk akses PostgreSQL
- `services/*`: business logic per fitur (`auth`, `catalog`, `finance`, `kasir`, `shift`, `stock`, `stock-opname`)
- `repositories/*`: query database per domain
- `stores/*`: state client lintas komponen (`auth`, `cart`, `shift`)
- `hooks/*`: reusable hooks
- `utils/*`: formatter dan helper murni
- `types/*`: tipe domain bersama
- `components/features/*`: komponen aplikasi per area fitur
- `components/common/*`: komponen/helper UI reusable
- `components/ui/*`: primitive UI
- `components/tables/*`: komponen tabel
- `lib/database.ts`: layer query PostgreSQL berbasis driver `pg`
- `components/SyegarApp.tsx`: UI utama semua halaman
- `prisma/schema.prisma`: rancangan schema PostgreSQL
- `middleware.ts`: guard halaman login/protected
- `src-tauri/*`: konfigurasi wrapper desktop jika masih ingin dipakai
