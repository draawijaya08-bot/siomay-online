# Panduan Lengkap Login & Penggunaan Siomay Admin

Panduan resmi untuk masuk ke portal manajemen **Siomay Admin** dan mengelola seluruh website Siomay Online secara live.

---

## 1. Alamat / URL Akses Admin

* **Di Komputer Lokal (Development):**  
  👉 [http://localhost:5173/admin](http://localhost:5173/admin) atau [http://localhost:5173/admin.html](http://localhost:5173/admin.html)

* **Di Website Publik / Vercel (Produksi):**  
  👉 `https://domain-anda.vercel.app/admin` atau `https://domain-anda.vercel.app/admin.html`

---

## 2. Kredensial Login Resmi (Akun Owner)

Pada form login bergaya WordPress yang bersih, Anda dapat memasukkan:

| Kolom | Pilihan yang Dapat Digunakan |
|---|---|
| **Username or Email Address** | `admin`<br>*(atau email terdaftar: `admin@siomayonline.com`)* |
| **Password** | `admin123` |

> [!TIP]
> **Ikon Mata (Eye Toggle)**: Klik ikon mata di sisi kanan kolom kata sandi untuk memeriksa apakah ketikan kata sandi Anda sudah benar.  
> **Remember Me**: Centang opsi *Remember Me* agar sesi login Anda tetap tersimpan dan tidak perlu login berulang kali.

---

## 3. Langkah-Langkah Masuk (Login)

1. Buka link **`/admin`** di browser Anda.
2. Di layar login bertema WordPress yang bersih:
   * Masukkan Username: `admin` (atau email `admin@siomayonline.com`).
   * Masukkan Password: `admin123`.
3. Klik tombol biru **Log In**.
4. Anda akan langsung diarahkan ke Dashboard **Siomay Admin**.

---

## 4. Fitur-Fitur di Dalam Siomay Admin

Setelah berhasil masuk, Anda dapat mengelola seluruh elemen toko melalui menu samping:

1. **Ringkasan (Overview)**:  
   Pantau total menu makanan yang aktif, status buka/tutup toko, nomor WhatsApp aktif, dan pesanan pelanggan.
2. **Kelola Menu**:  
   * Tambah menu siomay/batagor baru beserta foto dan harga.
   * Ubah status menu (*Tersedia* / *Stok Habis*) hanya dengan 1 klik.
   * Edit nama, harga, deskripsi, porsi, rating, atau hapus menu.
3. **Pesanan Masuk**:  
   Daftar pesanan dari pelanggan, lengkap dengan rincian porsi, alamat, catatan, dan tombol hubungi via WhatsApp.
4. **Pengaturan WhatsApp**:  
   Ganti nomor WhatsApp toko penerima pesanan dan sesuaikan template pesan pembuka.
5. **Branding & Logo (AI Studio)**:  
   * Ganti logo website dan ikon favicon tab browser.
   * Gunakan **AI Background Remover** terintegrasi dengan slider toleransi warna untuk menghapus latar belakang gambar logo Anda secara instan dan aman.
6. **Banner & Video Promo**:  
   Ubah teks headline utama, subjudul, dan sematkan video promosi toko.
7. **Jam & Lokasi Toko**:  
   Atur jam buka operasional, area pesan antar (delivery), serta teks pengumuman atas.

---

## 5. Sinkronisasi Otomatis Tanpa Perlu Deploy

Setiap perubahan yang Anda simpan di dalam **Siomay Admin** akan langsung tersimpan ke database **Supabase SQL** dan secara otomatis muncul di website utama secara **real-time** tanpa perlu melakukan deploy ulang atau mengubah kode manual lagi.
