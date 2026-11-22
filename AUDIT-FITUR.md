# Audit fitur RapiMakalah Pro

Tanggal audit: 21 November 2026  
Ruang lingkup: source project di folder ini, tes yang tersedia, dan build produksi.

## Batas pemeriksaan

Lampiran prompt memuat checklist, tetapi tidak menyertakan file atau tautan video referensi. Karena itu, audit ini menilai checklist dan kode yang ada; kesetaraan visual dengan video belum dapat dipastikan. Project yang diperiksa berupa frontend React/Vite tanpa API, server aplikasi, autentikasi, atau database server. Pratinjau React berhasil dirender lewat tes server-side; interaksi visual langsung di browser dan pembukaan hasil di Microsoft Word belum diuji.

Status **SUDAH ADA & BERFUNGSI** hanya digunakan pada bagian yang punya bukti uji langsung di project. Status **SUDAH ADA TAPI BELUM SEMPURNA** berarti fungsi atau UI tersedia, tetapi cakupan/hasil belum dapat dipastikan sepenuhnya atau masih berbatasan jelas.

## Tabel audit

| No | Fitur | Status | Lokasi file | Keterangan |
|---:|---|---|---|---|
| 1 | Halaman awal, identitas, navigasi, dan tombol mulai | SUDAH ADA TAPI BELUM SEMPURNA | `src/pages/Dashboard.jsx`, `src/components/Sidebar.jsx`, `src/components/Header.jsx` | Dashboard punya identitas, navigasi, dan tombol membuat dokumen. Belum ada landing page publik khusus dengan uraian fitur lengkap. |
| 2 | Responsif HP dan desktop | SUDAH ADA TAPI BELUM SEMPURNA | `src/styles/app.css` | Breakpoint tablet/HP tersedia. Pemeriksaan visual pada perangkat/browser belum dilakukan. |
| 3 | Registrasi, nama, email, password, konfirmasi, dan login | BELUM ADA | — | Tidak ditemukan halaman atau sistem akun. |
| 4 | Validasi autentikasi dan perlindungan dokumen per pengguna | BELUM ADA | — | Tidak ada backend, sesi akun, atau pemeriksaan kepemilikan dokumen. Penyimpanan lokal browser bukan isolasi akun. |
| 5 | Workspace dan membuat dokumen baru | SUDAH ADA TAPI BELUM SEMPURNA | `src/App.jsx`, `src/components/Workspace.jsx` | Alur editor dan tombol dokumen baru tersedia; interaksi UI belum diuji otomatis di browser. |
| 6 | Riwayat dan membuka dokumen kembali | SUDAH ADA TAPI BELUM SEMPURNA | `src/pages/Documents.jsx`, `src/services/storage.js` | IndexedDB diuji untuk simpan, daftar, dan hapus. Pembukaan kembali tersedia di UI, tetapi klik alurnya belum diuji di browser. |
| 7 | Upload DOCX, TXT, HTML; batas file dan validasi | SUDAH ADA TAPI BELUM SEMPURNA | `src/App.jsx`, `src/services/docxReader.js`, `src/services/uploadValidation.js` | DOCX berhasil diuji lewat impor hasil ekspor. Batas unggah 25 MB, file kosong, ekstensi, struktur DOCX, jumlah entri ZIP, dan ukuran hasil ekstrak divalidasi. Alur file picker belum diuji langsung di browser. |
| 8 | Drag-and-drop file | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/DocumentUpload.jsx`, `src/styles/app.css` | Dropzone sudah ditambahkan; event drag/drop belum diuji langsung pada browser. |
| 9 | Tempel/tulis teks biasa dan Markdown | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/DocumentEditor.jsx`, `src/services/documentParser.js` | Konversi Markdown dasar (heading, daftar, tebal/miring, kode inline) diuji. Handler tempel teks tersedia, tetapi interaksi editor belum diuji langsung. |
| 10 | Validasi naskah sebelum formatting | SUDAH ADA & BERFUNGSI | `src/App.jsx` | Formatting menolak naskah kosong; impor juga menolak file kosong/tidak terbaca. Parser dan validasi file diuji. |
| 11 | Baca DOCX dan pertahankan isi/struktur | SUDAH ADA TAPI BELUM SEMPURNA | `src/services/docxReader.js`, `src/services/documentParser.js` | Tes round-trip memeriksa heading, paragraf, tabel, gambar, dan teks. Mammoth hanya mempertahankan elemen yang didukung; beberapa gaya Word mungkin perlu ditinjau ulang. |
| 12 | Analisis format dan deteksi kesalahan | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/InspectionPanel.jsx` | Pemeriksaan mencakup heading/BAB, daftar pustaka, judul kosong, nomor halaman, spasi kosong berulang, serta variasi font/ukuran. Ini pemeriksaan aturan dasar, bukan validasi pedoman kampus. |
| 13 | Temuan per bagian/paragraf, penjelasan, dan saran | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/InspectionPanel.jsx` | Setiap temuan menampilkan kategori lokasi, alasan, dan saran. Lokasi belum menunjuk nomor paragraf atau rentang teks tertentu. |
| 14 | Editor, struktur heading, daftar, dan navigasi bagian | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/DocumentEditor.jsx`, `src/components/PageNavigation.jsx` | Editor dan kontrol struktur tersedia. Heading/list dikenali parser; pengujian klik toolbar dan lompatan struktur di browser belum ada. |
| 15 | Pratinjau halaman dan ukuran kertas | SUDAH ADA & BERFUNGSI | `src/components/DocumentPreview.jsx`, `src/services/documentFormatter.js` | Tes render menemukan dan memperbaiki referensi ukuran kertas yang sebelumnya menyebabkan error. Render ukuran potret/lanskap A4/A5 kini diuji. Pembagian halaman tetap estimasi. |
| 16 | Navigasi halaman, jumlah halaman, zoom, dan status dokumen | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/DocumentPreview.jsx`, `src/components/Header.jsx` | Kontrol tersedia dan status gagal simpan kini ditampilkan dengan benar. Interaksi tombol zoom/navigasi belum diuji langsung di browser. |
| 17 | Panel formatting, pemeriksaan, template, dan konfigurasi manual | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/FormattingPanel.jsx`, `src/components/TemplateSelector.jsx`, `src/pages/Templates.jsx` | Preset, template makalah, margin, font, ukuran, spasi, alignment, heading, nomor halaman, daftar isi, cover, checklist, dan tombol penerapan tersedia. Tes layanan DOCX mencakup sebagian keluaran, bukan setiap kombinasi kontrol UI. |
| 18 | Pemeriksaan ulang dan jumlah temuan | SUDAH ADA TAPI BELUM SEMPURNA | `src/components/InspectionPanel.jsx`, `src/App.jsx` | Tombol sekarang memicu kalkulasi pemeriksaan lagi; jumlah yang tampil menghitung temuan termasuk informasi. Belum ada tes interaksi browser. |
| 19 | Export DOCX, isi, struktur, penomoran, cover, dan daftar isi | SUDAH ADA TAPI BELUM SEMPURNA | `src/services/docxGenerator.js`, `src/services/docxProcessor.js`, `src/services/pageNumbering.js`, `src/services/tableOfContents.js` | Tes memeriksa DOCX ZIP/XML, teks, heading, tabel, gambar, field TOC, ukuran kertas, dan nomor halaman editable. Microsoft Word tidak tersedia untuk uji buka visual; hasil masih perlu dicek di Word/WPS untuk dokumen nyata. |
| 20 | Riwayat lokal, akses publik, dan keamanan server | SUDAH ADA TAPI BELUM SEMPURNA | `src/services/storage.js`, `src/pages/Settings.jsx` | Data disimpan di IndexedDB browser dan tidak dikirim ke server. Tidak ada URL/file server publik, tetapi juga tidak ada akun atau otorisasi backend untuk membedakan pengguna perangkat/browser yang sama. |

## A. Fitur yang sudah berhasil

- Tes parser untuk BAB, subbab, daftar, tabel, gambar, dan bagian awal dokumen.
- Impor DOCX dan round-trip yang mempertahankan isi dan beberapa struktur Word yang didukung.
- Generator DOCX editable dengan tabel, gambar, nomor halaman, opsi cover, serta field daftar isi Word.
- Penyimpanan IndexedDB (simpan, daftar, hapus) dan parser HTML yang membersihkan event handler serta URL berbahaya.
- Render preview potret/lanskap setelah perbaikan ukuran halaman.
- Konversi Markdown dasar dan validasi ekstensi/ukuran/file kosong.

## B. Fitur yang perlu diperbaiki atau diuji lanjut

- Uji manual tampilan responsif, file picker, drag-and-drop, toolbar editor, zoom/navigasi, dan alur unduh di browser nyata.
- Tingkatkan pemeriksaan agar menunjukkan paragraf atau teks sumber yang tepat dan membandingkannya dengan pedoman tertentu.
- Cocokkan pagination/hasil akhir dengan Word atau WPS; preview saat ini mengestimasi pemisahan halaman.
- Tambahkan landing page publik dan uraian fitur yang lebih lengkap bila website akan dipublikasikan sebagai produk.
- Tambahkan backend bila unggahan, akun, dan dokumen harus tersedia lintas perangkat atau terlindungi per akun.

## C. Fitur yang belum tersedia

- Registrasi, login, konfirmasi password, sesi, serta validasi akun.
- Otorisasi kepemilikan dokumen di backend dan penyimpanan privat per pengguna.
- Penyimpanan server/API dan pengujian akses file dengan izin.
- Video referensi yang disebut pada prompt tidak ada di lampiran, sehingga perbandingan fitur/visual langsung belum dapat dilakukan.

## Perbaikan setelah audit

- Memperbaiki error render preview akibat ukuran/tinggi halaman yang tidak didefinisikan; ukuran kertas dan orientasi kini digunakan konsisten.
- Menambahkan konversi Markdown dasar untuk file teks dan tempelan editor.
- Menambahkan batas unggahan 25 MB, penolakan file kosong/ekstensi yang tidak didukung, validasi struktur DOCX, serta batas jumlah dan ukuran entri hasil ekstrak.
- Menambahkan drag-and-drop pada kontrol unggah.
- Membuat pemeriksaan ulang benar-benar menjalankan pemeriksa lagi dan menghitung semua temuan di panel.
- Memperbaiki indikator agar kegagalan autosave tidak ditampilkan sebagai berhasil, serta menerapkan ukuran font pilihan pada teks yang diseleksi di editor.
- Mengubah impor `file-saver` ke bentuk CommonJS-compatible agar entry aplikasi juga dapat dirender pada tes smoke SSR.

## Verifikasi

Setelah perubahan, `npm test` lulus **15/15 tes** dan `npm run build` berhasil. Tes ini memverifikasi layanan/parser, hasil DOCX, validasi unggahan, penyimpanan IndexedDB, render dashboard, serta preview halaman. Tes tidak menggantikan uji visual di browser atau pembukaan DOCX di Microsoft Word.
