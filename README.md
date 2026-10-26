# Side by Side — *"Better together."*

Aplikasi web responsif (mobile-first, PWA-ready) untuk tantangan hackathon **"[Kesuburan] Kesehatan Reproduksi Pria"**.

> **Misi:** Membantu pria memahami, memeriksakan, dan menindaklanjuti kesehatan reproduksinya lebih awal, secara privat, tanpa penghakiman, dengan pendampingan pasangan, dan terhubung ke layanan medis yang tepat.

---

## Cara Menjalankan Proyek (Lokal & Demo Hackathon)

```bash
cd /Users/fabrianivan/.gemini/antigravity/scratch/side-by-side

# 1. Instal dependensi
npm install

# 2. Inisialisasi database SQLite & jalankan seed data lengkap
npm run db:setup

# 3. Jalankan server API Fastify (port 3001) + frontend Vite (port 5173)
npm run dev

# 4. Jalankan seluruh pengujian (23 unit, flow, & accessibility tests)
npm test

# 5. Build produksi (TypeScript + Vite PWA bundle)
npm run build
```

---

## Panduan Skenario Demo Hackathon (Rendra, Sari, & dr. Maya)

Di bagian bawah layar aplikasi terdapat **Panel Demo Hackathon** yang memungkinkan juri atau presenter berpindah peran dalam **1 klik**:

1. **Persona 1 — Rendra (32 thn, karyawan swasta, 8 bulan program hamil):**
   - Klik **`1. Rendra (32 thn, Suami)`** pada Panel Demo atau masuk ke halaman **Cek Awal** (`/cek-awal`) lalu klik **`Isi Contoh Rendra (Selesai Instan)`**.
   - Rendra mendapatkan tingkat saran **"Sebaiknya periksa dalam 1 sampai 2 bulan"** beserta penjelasan faktor risiko bahasa awam (durasi 6–12 bulan, paparan panas laptop di pangkuan, rokok/vape ringan, waktu tidur) dan disclaimer medis jelas.
   - Di halaman **Cari Layanan** (`/layanan`), Rendra memfilter klinik/RS yang **Menerima JKN** dengan **Skor Ramah Pria** tertinggi, membuat **Daftar Pertanyaan untuk Dokter** (siap salin/cetak PDF), dan menekan **Ingatkan saya** (termasuk pengingat masa pantang 2–7 hari).
   - Di halaman **Hasil Saya** (`/hasil`), Rendra mencatat 2 riwayat hasil analisis semen dan melihat **Grafik Tren** peningkatan konsentrasi (14,5 → 18,5 juta/mL) dan motilitas (39% → 45%) dibandingkan acuan **WHO Edisi ke-6 (2021)**.
   - Di halaman **Bagi ke Nakes** (`/bagikan-nakes`), Rendra memilih cakupan data dan membuat **Kode QR Berlaku 1 Jam** (`MAYA-RENDRA-1H`).

2. **Persona 2 — Sari (30 thn, istri Rendra):**
   - Klik **`2. Sari (30 thn, Istri)`** pada Panel Demo untuk membuka **Mode Berdua / Rencana Kita** (`/berdua`).
   - Sari melihat progres 6 tahapan bersama (`Cek Awal`, `Pilih layanan`, `Jadwalkan`, `Periksa`, `Pahami hasil`, `Tindak lanjut`) dan dapat mengirim pesan semangat singkat atau menyalin templat **"Ajak dengan lembut"** (3 nada: *Hangat*, *Santai*, *Praktis*), **tanpa bisa melihat jawaban kuesioner maupun angka lab Rendra** kecuali Rendra mengizinkannya per item.

3. **Persona 3 — dr. Maya (Dokter Umum di Puskesmas):**
   - Klik **`3. dr. Maya (Nakes Puskesmas)`** pada Panel Demo atau tombol **`Simulasikan dr. Maya Membuka QR Ini`** di halaman QR Rendra (`/nakes`).
   - dr. Maya melihat ringkasan terstruktur (hanya cakupan yang disetujui Rendra) serta menyalin **Templat Konseling** (*Gaya Hidup & Siklus 74 Hari*, *Validasi Kecemasan*, *Komunikasi Pasangan*, *Rencana Tindak Lanjut*).
   - Setiap kali dr. Maya membuka kode QR, akses tersebut langsung tercatat di **Catatan Akses Tenaga Kesehatan** milik Rendra.

---

## Keputusan Arsitektur & Asumsi Produk

1. **Monorepo Full-Stack (React + TypeScript + Vite + Tailwind CSS + Fastify + Prisma):**
   - Menggunakan SQLite (`file:./dev.db`) secara default agar demo berjalan instan tanpa ketergantungan server DB eksternal, dengan skema Prisma yang siap dialihkan ke PostgreSQL melalui variabel `DATABASE_URL`.
2. **Enkripsi Sisi Klien (Web Crypto AES-GCM 256-bit) & IndexedDB:**
   - Pada **Mode Anonim**, jawaban kuesioner dan catatan hasil dienkripsi di perangkat (`src/lib/crypto-storage.ts`) menggunakan `AES-GCM` 256-bit dan disimpan di IndexedDB (`sbs_encrypted_vault`). Jawaban mentah tidak pernah dikirim ke server.
   - Kunci perangkat dibuat otomatis saat menekan *"Mulai tanpa akun"* agar alur Cek Awal selesai < 3 menit, dan dibungkus dengan turunan kunci `PBKDF2` ketika pengguna mengaktifkan PIN.
3. **Konfigurasi Aturan Medis & Rujukan WHO Terpisah (Mudah Diaudit Dokter):**
   - Aturan penilaian mandiri disimpan di `src/config/assessment-rules.json` dan rentang rujukan analisis semen WHO Edisi ke-6 (2021) disimpan di `src/config/semen-reference.json`, keduanya divalidasi dengan skema Zod di `src/config/schemas.ts`.
   - Aturan wajib: lama program hamil > 12 bulan (atau > 6 bulan bila usia pasangan perempuan ≥ 35 tahun) menghasilkan saran minimal *"Sebaiknya periksa dalam 1 sampai 2 bulan"* **tanpa membocorkan data usia pasangan** di daftar faktor hasil.
4. **Kepatuhan Prinsip UU PDP & Etika Medis:**
   - Semua toggle persetujuan granular (`store_results`, `share_partner`, `share_nakes`) bernilai **OFF secara default**.
   - Tidak ada klaim diagnosis, pengobatan, janji kesuburan, maupun saran obat/dosis/suplemen di seluruh aplikasi.
   - Dilengkapi pendeteksi tekanan emosional berat pada isian teks bebas untuk menampilkan informasi bantuan profesional (Hotline SEJIWA Kemenkes `119 ext 8`).
   - Tombol **"Hapus semua data saya"** selalu terlihat di Pengaturan dengan konfirmasi 2 langkah yang memusnahkan data lokal (IndexedDB/LocalStorage) dan data server.
5. **Mode Samaran (Discreet Mode) & Kunci PIN:**
   - Mengubah judul tab browser, favicon, dan header menjadi aplikasi kebugaran netral **"Catatan Harian"** serta menyediakan kunci layar berbasis PIN untuk menjaga kenyamanan di tempat umum.
