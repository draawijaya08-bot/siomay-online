# PANDUAN LENGKAP ADMIN CMS & SUPABASE — SIOMAY ONLINE

Dokumentasi resmi arsitektur backend, skema database, otorisasi pemilik (owner), penyimpanan media, dan deployment untuk **Admin CMS Siomay Online**.

---

## 1. IKHTISAR SISTEM ADMIN CMS

Admin CMS Siomay Online dirancang sebagai panel manajemen terpadu yang aman, modular, dan terhubung langsung ke backend Supabase dengan sinkronisasi otomatis ke website publik:

- **URL Akses Admin**:
  - Lokal: `http://localhost:5173/admin` atau `http://localhost:5173/admin.html`
  - Produksi: `https://[domain-kamu]/admin` (otomatis di-rewrite via [`vercel.json`](file:///d:/siomay%20online/vercel.json))
- **Fitur Utama CMS**:
  1. **Owner Authentication**: Autentikasi email & password menggunakan Supabase Auth yang diverifikasi dengan tabel whitelist `public.admin_users`.
  2. **Food Menu Management (CRUD)**: Tambah menu baru, edit nama/harga/porsi/deskripsi, toggle ketersediaan (tersedia/habis), highlight best seller, dan upload foto makanan.
  3. **Banner & Konten Promosi**: Ubah headline hero banner, subheadline, teks CTA, unggah foto hero banner baru, serta sematkan video promosi (MP4/WebM).
  4. **Pengaturan WhatsApp & Pesanan**: Ubah nomor WhatsApp resmi toko dengan normalisasi otomatis dan pratinjau link pemesanan dinamis.
  5. **Ulasan Pelanggan Langsung & Mandiri**: Ulasan yang dibuat pelanggan di website utama langsung tampil secara instan tanpa perlu konfirmasi admin, dan pelanggan dapat mengedit atau menghapus ulasan mereka sendiri secara mandiri jika ada salah kata atau ingin memperbarui penilaian.

---

## 2. STRUKTUR SKEMA DATABASE

File migrasi database tersedia di:
- Skema Utama CMS: [`supabase/migrations/20261024_complete_admin_cms.sql`](file:///d:/siomay%20online/supabase/migrations/20261024_complete_admin_cms.sql)
- Skema Ulasan Pelanggan: [`supabase/migrations/20261024_customer_reviews.sql`](file:///d:/siomay%20online/supabase/migrations/20261024_customer_reviews.sql)
- Skema Ulasan Langsung & Hapus Mandiri: [`supabase/migrations/20261026_direct_customer_reviews.sql`](file:///d:/siomay%20online/supabase/migrations/20261026_direct_customer_reviews.sql)

### A. Tabel `admin_users` (Otorisasi Pemilik)
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, merujuk ke `auth.users(id)` |
| `email` | `TEXT` | Email pemilik terdaftar (Unique) |
| `role` | `TEXT` | Default: `'owner'` |
| `created_at` | `TIMESTAMPTZ` | Waktu dibuat |

### B. Tabel `menu_items` (Menu Makanan)
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`gen_random_uuid()`) |
| `name` | `VARCHAR(120)` | Nama menu (wajib) |
| `price` | `INTEGER` | Harga dalam Rupiah (wajib, min: 0) |
| `description` | `TEXT` | Deskripsi menu |
| `image_url` | `TEXT` | URL foto menu (dari Storage atau URL eksternal) |
| `badge` | `VARCHAR(60)` | Badge khusus (misal: "BEST SELLER") |
| `portion` | `VARCHAR(60)` | Porsi (misal: "Porsi Mantap") |
| `rating` | `NUMERIC(2,1)` | Rating rata-rata (default: 4.9) |
| `is_best_seller` | `BOOLEAN` | Highlight best seller |
| `is_available` | `BOOLEAN` | Status ketersediaan stok (default: true) |
| `sort_order` | `INTEGER` | Urutan tampil |

### C. Tabel `site_settings` (Pengaturan Hero & WhatsApp - Singleton)
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary Key bernilai 1 |
| `whatsapp_number` | `VARCHAR(30)` | Nomor WhatsApp resmi (contoh: `6281234567890`) |
| `default_order_message` | `TEXT` | Pesan default saat klik pesan via WA |
| `hero_title` | `TEXT` | Headline hero banner utama |
| `hero_subtitle` | `TEXT` | Subheadline / deskripsi hero banner |
| `hero_badge` | `TEXT` | Teks label badge hero banner |
| `hero_cta_text` | `TEXT` | Teks tombol call-to-action hero |
| `hero_image_url` | `TEXT` | URL foto hero banner |
| `promo_video_url` | `TEXT` | URL file video promosi (MP4/WebM) |
| `updated_at` | `TIMESTAMPTZ` | Waktu update terakhir |

### D. Storage Bucket `media`
- Bucket publik khusus untuk menyimpan foto menu, banner, dan video promosi.
- Kebijakan RLS Storage:
  - **Public**: Dapat melihat dan mendownload file gambar/video.
  - **Authenticated Owner**: Hanya akun pemilik di `admin_users` yang dapat mengunggah (*INSERT*), memperbarui (*UPDATE*), atau menghapus (*DELETE*) file.

---

## 3. LANGKAH SETUP SUPABASE

### Langkah 1: Jalankan Migrasi SQL
1. Buka dashboard proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Masuk ke menu **SQL Editor** pada sidebar kiri.
3. Klik tombol **New Query**.
4. Salin isi [`supabase/migrations/20261024_complete_admin_cms.sql`](file:///d:/siomay%20online/supabase/migrations/20261024_complete_admin_cms.sql) dan tempel ke editor, lalu klik **Run**.
5. Ulangi untuk file [`supabase/migrations/20261024_customer_reviews.sql`](file:///d:/siomay%20online/supabase/migrations/20261024_customer_reviews.sql).

### Langkah 2: Buat Akun Owner di Supabase Auth
1. Di Supabase Dashboard, buka menu **Authentication** -> **Users**.
2. Klik tombol **Add User** -> **Create User**.
3. Masukkan Email Owner (misal: `owner@siomayonline.com`) dan Kata Sandi yang aman.
4. Klik **Create User**. Salin nilai **User UID** akun tersebut (berupa string UUID).

### Langkah 3: Daftarkan Akun ke Tabel `admin_users`
Buka kembali **SQL Editor** dan jalankan perintah berikut untuk mengesahkan akun sebagai owner:
```sql
INSERT INTO public.admin_users (id, email, role)
VALUES ('PASTE_USER_UID_DISINI', 'owner@siomayonline.com', 'owner')
ON CONFLICT (id) DO NOTHING;
```
*Catatan: Langkah ini menjamin bahwa hanya email ini yang dapat masuk ke dashboard CMS dan memodifikasi data atau storage.*

---

## 4. KONFIGURASI ENVIRONMENT VARIABLES

### Untuk Pengembangan Lokal (`.env`):
Salin file [`.env.example`](file:///d:/siomay%20online/.env.example) menjadi `.env`:
```bash
cp .env.example .env
```
Isi kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Untuk Deployment Produksi (Vercel):
1. Buka project Anda di dashboard Vercel: [https://vercel.com](https://vercel.com).
2. Masuk ke **Settings** -> **Environment Variables**.
3. Tambahkan dua variabel berikut:
   - `VITE_SUPABASE_URL`: URL project Supabase Anda.
   - `VITE_SUPABASE_ANON_KEY`: Kunci anonim (public anon key) Supabase Anda.
4. Redeploy aplikasi Anda.

---

## 5. CARA PENGGUNAAN ADMIN CMS

### Akun Pemilik Terdaftar (Owner Login)
Untuk mengakses dashboard CMS, masukkan kredensial akun owner:
- **Email:** `admin@siomayonline.com`
- **Password:** `admin123`

### Langkah Masuk:
1. Buka `http://localhost:5173/admin` (atau `/admin` pada domain produksi).
2. Anda akan diarahkan ke halaman login pemilik.
3. Masukkan Email dan Kata Sandi owner, lalu klik **Masuk ke Dashboard →**.
4. Masuk ke Dashboard CMS:
   - **Ringkasan**: Melihat statistik total menu, kontak WhatsApp, serta pesanan masuk.
   - **Kelola Menu**:
     - Klik **+ Tambah Menu Baru** untuk menambah produk.
     - Klik tombol **Pilih Foto Baru** untuk mengunggah gambar produk (otomatis terhubung ke Supabase Storage, atau ke buffer Base64 Data URL jika Supabase belum terhubung).
     - Klik **Tandai Habis / Tersedia** untuk mengubah status stok secara langsung.
     - Klik **Edit** untuk mengubah harga, porsi, atau deskripsi.
     - Klik **Hapus** untuk menghapus menu setelah konfirmasi.
   - **Banner & Video**:
     - Edit headline hero banner dan teks tombol.
     - Unggah foto hero banner pengganti.
     - Unggah video promosi (MP4/WebM) atau masukkan tautan video.
     - Klik **Simpan Pengaturan Konten**.
   - **WhatsApp & Pesanan**:
     - Perbarui nomor WhatsApp pemesanan toko.
     - Uji coba link WhatsApp langsung dari tombol preview.
     - Pantau dan kelola status pesanan masuk di Order Inbox.
     - Klik **Simpan Nomor WhatsApp**. Perubahan nomor akan langsung aktif di seluruh tombol pemesanan dan checkout keranjang belanja website publik!
5. Klik **Keluar** di bagian bawah sidebar untuk mengakhiri sesi admin.

---

## 6. PENGUJIAN OTOMATIS

Jalankan test suite proyek:
```bash
npm test
```
Test suite memverifikasi:
- Sanitasi HTML & pencegahan XSS.
- Validasi rating bintang (1–5) dan format tanggal.
- Skema tabel `menu_items`, `site_settings`, `admin_users`, dan `media` storage bucket.
- Hak akses RLS dan otorisasi fungsi `is_admin_owner()`.
- Rewrite routing Vercel & Vite (`/admin` -> `/admin.html`).
- Sinkronisasi dinamis backend di `main.js`.
