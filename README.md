# RapiMakalah Pro

RapiMakalah membantu menulis atau mengimpor naskah, memeriksa struktur, menerapkan aturan format akademik, melihat pratinjau, dan mengunduh DOCX. Akun dan dokumen disimpan melalui API Node.js dan PostgreSQL; browser tidak menjadi sumber penyimpanan akun.

## Prasyarat

- Node.js 20 atau lebih baru dan npm.
- PostgreSQL 13 atau lebih baru, berjalan dan dapat diakses.

## Persiapan lokal di Windows

1. Buka PowerShell pada folder proyek (folder yang berisi `package.json`).
2. Pasang dependensi:

   ```powershell
   npm.cmd install
   ```

3. Buat database dan pengguna PostgreSQL melalui pgAdmin atau akun administrator PostgreSQL. Contoh SQL:

   ```sql
   CREATE USER rapimakalah WITH PASSWORD 'ganti-dengan-password-yang-kuat';
   CREATE DATABASE rapimakalah OWNER rapimakalah;
   ```

4. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`. Buat secret sesi acak di PowerShell:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

   Tempel hasilnya ke `SESSION_SECRET`. File `.env` diabaikan Git dan tidak boleh dibagikan atau dikomit.
5. Jalankan aplikasi dan API:

   ```powershell
   npm.cmd run dev
   ```

   API membuat tabel awal (`users`, `documents`, `document_versions`, dan `user_sessions`) saat server mulai. Vite tersedia di `http://localhost:5173`.

## Build dan produksi

```powershell
npm.cmd run build
npm.cmd start
```

Server Express melayani build produksi dan endpoint API. Atur `NODE_ENV=production`, `DATABASE_URL`, serta `SESSION_SECRET` di lingkungan deploy. Jika berada di belakang reverse proxy yang Anda kendalikan, atur `TRUST_PROXY=true`; gunakan HTTPS agar cookie sesi beratribut `Secure`.

## Deploy ke Vercel

- Atur **Root Directory** proyek ke folder yang berisi `package.json`.
- Vercel menjalankan endpoint akun/dokumen melalui `api/[...path].js` sebagai Function dan menyajikan frontend dari build Vite.
- Gunakan PostgreSQL online; database `localhost` di komputer tidak dapat dijangkau Vercel. URL database lokal jangan dipakai sebagai `DATABASE_URL`.
- Tambahkan environment variables di Vercel untuk environment yang digunakan:
  - `NODE_ENV=production`
  - `DATABASE_URL` — connection string PostgreSQL online
  - `SESSION_SECRET` — nilai acak minimal 32 karakter
  - `DATABASE_SSL=true` jika diwajibkan oleh penyedia database
- Redeploy proyek setelah menyetel variables. File `.env` lokal tidak diunggah atau digunakan Vercel.

## Pengujian

```powershell
npm.cmd test
npm.cmd run build
```

Tes otomatis mencakup parser, penyimpanan lokal untuk kompatibilitas layanan, validasi input backend, render halaman publik, preview, dan ekspor DOCX. Alur API yang bergantung PostgreSQL perlu diuji dengan database lokal yang sudah dikonfigurasi.

## Alur dan batasan yang perlu diketahui

- Registrasi/login menggunakan sesi server di PostgreSQL, cookie `HttpOnly` dan `SameSite=Lax`, pembatasan percobaan auth, serta password hash bcrypt.
- Endpoint dokumen memeriksa sesi dan pemilik dokumen; riwayat versi dibuat saat dokumen dibuat, isi berubah, atau formatting selesai.
- DOCX dibaca di browser dan output DOCX dibuat sebagai OOXML editable. Preview pagination adalah estimasi; verifikasi hasil akhir di Word/WPS/LibreOffice.
- Tombol **Simpan PDF** membuka dialog cetak browser. Pilih **Save as PDF / Simpan sebagai PDF** untuk menyimpan berkas.
- Upload DOCX dibatasi 25 MB. Konversi DOCX memakai Mammoth; beberapa fitur atau style Word yang tidak didukung perlu ditinjau ulang.
- Konfigurasi pedoman adalah titik awal dan sebaiknya dibandingkan dengan pedoman kampus. Screenshot desain yang disebut pada spesifikasi tidak tersedia di lampiran.
