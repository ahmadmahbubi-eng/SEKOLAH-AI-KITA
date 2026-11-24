# SAKITA — Sekolah AI Kita Smart Registration System

**"Belajar AI, Berkarya untuk Masa Depan."**

Platform resmi full-stack Sekolah AI Kita (SAKITA) untuk pemasaran pelatihan, pendaftaran peserta multi-langkah, pembayaran melalui transfer bank langsung, verifikasi bukti transfer privat, akses komunitas terlindungi, dan administrasi multi-program pelatihan AI.

## Fitur Utama

1. **Landing Page Konversi (Dark Theme Premium)**
   - Hero section dengan ilustrasi interaktif dashboard aplikasi pendidikan, 3 statistik utama, Problem & Solution, Tentang Program, 10 Proyek Aplikasi Digital, Target Peserta, Profil Mentor (otomatis tersembunyi jika belum diisi admin), Jadwal & Lokasi dengan hitung mundur `Asia/Jakarta (WIB)`, Galeri Foto Hotel Grand Makmur (placeholder netral hingga admin mengunggah foto asli), Investasi Pendidikan dengan kuota aktual dari database, FAQ Accordion, Final CTA, dan Footer lengkap.
2. **Sistem Pendaftaran Peserta (`/daftar`)**
   - Formulir 4 langkah: Biodata Peserta (normalisasi WhatsApp Indonesia), Konfirmasi Data (pembuatan nomor registrasi unik `SAKITA-YYYY-NNNN` via transaksi Firestore), Instruksi Pembayaran Transfer Bank Langsung, dan Unggah Bukti Transfer (JPG/JPEG/PNG/PDF maks. 5 MB dengan validasi magic-bytes di server).
   - Mendukung **Daftar Tunggu (Waitlist)** otomatis tanpa transfer ketika kuota penuh.
3. **Halaman Sukses & Status Pribadi (`/sukses/:token` & `/status/:token`)**
   - Menggunakan token acak 48-karakter (tidak bergantung pada nomor registrasi berurutan).
   - Link Komunitas Sekolah AI Kita tidak pernah terekspos di halaman publik atau source code frontend, dan langsung terbuka setelah bukti transfer berhasil diunggah.
   - Bukti pendaftaran & E-Tiket dapat diunduh/dicetak.
4. **SAKITA Command Center (`/admin/login` & `/admin`)**
   - Autentikasi nyata menggunakan **Firebase Authentication (Google Sign-In)** + RBAC Firestore.
   - 11 modul navigasi: Overview (metrik aktual & grafik Recharts), Data Peserta (real-time, filter, sort, pagination, edit, batalkan, WhatsApp, ekspor Excel `.xlsx` & CSV, cetak), Verifikasi Pembayaran (penampil bukti privat + zoom + Konfirmasi Lunas / Tolak / Minta Bukti Ulang), Keuangan, Komunitas, Program Pelatihan (multi-program & multi-angkatan), Kelola Website (CMS langsung ke landing page), Notifikasi Otomatis, Laporan & Audit Log Immutable, dan Pengaturan Rekening.

## Konfigurasi Awal Setelah Deploy

1. **Aktivasi Database & Program Awal**
   - Buka `/admin/login` dan masuk menggunakan akun Google admin utama (`ahmadmahbubi@gmail.com`).
   - Saat login pertama kali, sistem otomatis menginisialisasi program awal *Kelas Intensif AI untuk Pengelolaan Sekolah & Pesantren* (21–24 Desember 2026, Hotel Grand Makmur, Jambi, Rp2.700.000, kuota 30 peserta) beserta dokumen pengaturan awal di Firestore.
2. **Atur Rekening Bank & Komunitas**
   - Masuk ke menu **Pengaturan** untuk mengisi Nama Bank, Nomor Rekening, dan Nama Pemilik Rekening resmi.
   - Masuk ke menu **Komunitas** untuk memasukkan tautan undangan grup/komunitas WhatsApp dan mengaktifkannya.
   - Masuk ke menu **Kelola Website** untuk mengunggah Logo SAKITA, Foto Hotel Grand Makmur, dan Profil Mentor apabila sudah siap.

## Environment Variables

Salin `.env.example` ke `.env` atau konfigurasi melalui panel Secrets di lingkungan hosting:

```env
APP_URL="https://domain-sakita-anda.id"
RESEND_API_KEY=""
RESEND_FROM_EMAIL="SAKITA <no-reply@sekolahai.id>"
WHATSAPP_API_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
COMMUNITY_WHATSAPP_LINK=""
INITIAL_ADMIN_EMAIL="ahmadmahbubi@gmail.com"
```

- Jika `RESEND_API_KEY` atau kredensial `WHATSAPP_API_TOKEN` belum diatur, dashboard menampilkan status **"Belum Terhubung"** secara jujur dan tidak mengklaim notifikasi terkirim.

## Arsitektur Keamanan

- **Firestore Security Rules (`firestore.rules`)**: Default-deny, isolasi ketat PII pada `/registrations` dan `/payments` (hanya admin terverifikasi), `/community_settings` privat untuk admin, `/audit_logs` immutable, dan validasi transaksi kuota (`confirmedCount + reservedCount <= quota`).
- **Verifikasi Token Server-Side**: Endpoint admin pada `server.ts` memverifikasi Firebase ID Token menggunakan Google JWKS RS256.
- **Penyimpanan Bukti Transfer Privat**: File bukti transfer disimpan di direktori `storage_private/proofs` (di luar `dist/`), divalidasi ukuran <= 5 MB serta magic bytes (JPG/PNG/PDF), dilindungi dari path traversal, dan hanya dapat diunduh dengan token admin atau token kepemilikan peserta.
- **Rate Limiting**: Diterapkan pada endpoint inisialisasi pendaftaran, unggah bukti, dan akses komunitas.
- **Penting**: Tinjau kembali `firestore.rules` sebelum digunakan secara luas pada skala produksi publik.

## Pengembangan & Deployment

```bash
npm install
npm run dev       # Menjalankan Express + Vite middleware pada port 3000
npm run build     # Membangun bundle produksi ke dist/
NODE_ENV=production npm start
```
