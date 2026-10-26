export interface SeedArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: 'Dasar Kesuburan' | 'Gaya Hidup' | 'Persiapan Tes' | 'Pasangan & Emosi' | 'Privasi & Hak';
  read_minutes: number;
  reviewer: string;
  updated_at: string;
  body_md: string;
}

export interface SeedFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const seedArticles: SeedArticle[] = [
  {
    id: 'art-1',
    slug: 'apa-itu-kesehatan-reproduksi-pria',
    title: 'Apa Itu Kesehatan Reproduksi Pria dan Mengapa Penting Sejak Awal?',
    summary: 'Memahami peran pria dalam program hamil tanpa rasa canggung—karena rencana memiliki anak adalah perjalanan dua orang.',
    category: 'Dasar Kesuburan',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Tim Konsultan Spesialis Andrologi (Placeholder Narasumber Medis) | Sumber: Pedoman WHO & IAUI',
    updated_at: '2026-10-01',
    body_md: `### Kesuburan Adalah Perjalanan Berdua

Selama bertahun-tahun, pembicaraan seputar program hamil di masyarakat hampir selalu berpusat pada pihak perempuan. Padahal, data medis global dari Organisasi Kesehatan Dunia (WHO) menunjukkan bahwa pada pasangan yang membutuhkan waktu lebih lama untuk hamil, **faktor pria berperan pada sekitar 40% hingga 50% kasus**—baik sebagai faktor tunggal maupun bersama faktor pasangan.

### Mengapa Periksa Lebih Awal Itu Menguntungkan?

Banyak pria menunda memeriksakan diri karena merasa tubuhnya bugar atau khawatir dengan stigma sosial. Padahal, pemeriksaan dasar pada pria memiliki tiga keunggulan besar:

1. **Sangat sederhana dan tidak menyakitkan:** Berbeda dengan pemeriksaan pada perempuan yang sering kali memerlukan berbagai prosedur bertahap, pemeriksaan awal pria umumnya hanya berupa konsultasi riwayat kesehatan dan analisis sampel semen di laboratorium.
2. **Hemat waktu dan biaya pasangan:** Mengetahui gambaran kesehatan kedua belah pihak sejak awal membantu dokter menyusun langkah yang tepat tanpa membuang waktu berbulan-bulan.
3. **Banyak faktor yang bisa diperbaiki:** Sel sperma diproduksi terus-menerus setiap hari. Banyak kondisi seperti paparan panas, gaya hidup, hingga pelebaran pembuluh darah (varikokel) yang dapat ditangani secara medis.

### Langkah Kecil Hari Ini

Memahami kesehatan reproduksi bukan tentang mencari siapa yang salah, melainkan wujud kasih sayang dan kerja sama Anda bersama pasangan.`
  },
  {
    id: 'art-2',
    slug: 'mitos-dan-fakta-kesuburan-pria',
    title: 'Mitos vs Fakta: Kesuburan Pria Sama Sekali Bukan Ukuran Kejantanan',
    summary: 'Meluruskan kesalahpahaman yang sering membuat pria enggan bertanya atau memeriksakan diri.',
    category: 'Dasar Kesuburan',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: dr. Spesialis Andrologi, Sp.And (Placeholder Narasumber Medis) | Sumber: PERANDI & WHO',
    updated_at: '2026-10-02',
    body_md: `### Mitos 1: "Kalau tubuh atletis dan fungsi seksual lancar, pasti subur."
**Fakta:** Fungsi ereksi dan gairah seksual diatur oleh aliran darah serta hormon testosteron, sedangkan pembuahan bergantung pada jumlah, gerak (motilitas), dan bentuk (morfologi) mikroskopis sel sperma. Pria yang sangat bugar dan tidak memiliki keluhan seksual tetap bisa memiliki jumlah sel sperma yang perlu dievaluasi melalui mikroskop.

### Mitos 2: "Volume cairan semen yang banyak berarti sel spermanya banyak."
**Fakta:** Lebih dari 90% cairan semen sebenarnya adalah cairan pembawa yang dihasilkan oleh kelenjar prostat dan vesikula seminalis. Sel sperma itu sendiri hanya menyumbang sebagian kecil volume dan tidak dapat dinilai dengan mata telanjang.

### Mitos 3: "Masalah kesuburan berarti kurang jantan."
**Fakta:** Ini adalah stigma paling keliru. Kualitas sel sperma adalah kondisi biologis dan medis biasa—sama halnya seperti tekanan darah atau kadar kolesterol. Kondisi ini bisa dipengaruhi oleh demam di masa lalu, posisi pembuluh darah, atau lingkungan kerja, dan tidak ada hubungannya dengan harga diri maupun maskulinitas Anda.

### Mitos 4: "Hasil tes yang kurang optimal bersifat permanen."
**Fakta:** Tubuh pria memproduksi jutaan sel sperma baru setiap hari dalam siklus sekitar 74 hari. Banyak faktor yang bersifat sementara dan dapat membaik dengan pendampingan dokter yang tepat.`
  },
  {
    id: 'art-3',
    slug: 'siklus-74-hari-dan-gaya-hidup',
    title: 'Siklus 74 Hari: Bagaimana Kebiasaan Harian Memengaruhi Sel Sperma',
    summary: 'Mengapa perubahan kecil pada tidur, olahraga, dan nutrisi hari ini berdampak besar dalam 2,5 hingga 3 bulan ke depan.',
    category: 'Gaya Hidup',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Tim Medis Kesehatan Reproduksi (Placeholder Narasumber Medis) | Sumber: WHO Laboratory Manual 6th Ed.',
    updated_at: '2026-10-03',
    body_md: `### Pabrik Alami yang Bekerja Tanpa Henti

Berbeda dengan perempuan yang lahir dengan cadangan sel telur tetap, tubuh pria memproduksi sel sperma baru dari nol secara terus-menerus. Proses sejak sel benih awal dibentuk hingga matang sempurna dan siap membuahi memakan waktu rata-rata **72 hingga 74 hari** (sekitar 2,5 bulan).

### Apa Artinya Bagi Anda?

1. **Kondisi Hari Ini Adalah Cerminan 2–3 Bulan Lalu:** Jika Anda mengalami demam tinggi, kelelahan ekstrem, atau stres berat dua bulan lalu, hasil analisis semen hari ini mungkin ikut terpengaruh.
2. **Peluang Perbaikan yang Nyata:** Setiap perubahan sehat yang Anda mulai hari ini akan menjadi "modal" bagi generasi sel sperma baru yang matang 3 bulan mendatang.

### Empat Kebiasaan Utama yang Berdampak Positif

- **Tidur nyenyak 7–8 jam:** Puncak pelepasan hormon reproduksi terjadi saat fase tidur dalam di malam hari.
- **Aktivitas fisik terukur:** Olahraga intensitas sedang (seperti jalan cepat, berenang, atau jogging 30 menit, 3–4 kali seminggu) membantu sirkulasi darah dan menjaga berat badan ideal.
- **Konsumsi makanan utuh kaya antioksidan:** Sayuran hijau, buah-buahan, kacang-kacangan, dan ikan membantu melindungi dinding sel sperma dari radikal bebas.
- **Hidrasi cukup:** Membantu menjaga kualitas cairan tubuh secara keseluruhan.`
  },
  {
    id: 'art-4',
    slug: 'kapan-harus-periksa-ke-dokter',
    title: 'Kapan Waktu yang Tepat bagi Pria untuk Periksa ke Dokter?',
    summary: 'Panduan waktu berdasarkan pedoman medis agar Anda dan pasangan tidak menunggu terlalu lama.',
    category: 'Persiapan Tes',
    read_minutes: 2,
    reviewer: 'Ditinjau oleh: Konsultan Urologi & Andrologi (Placeholder Narasumber Medis) | Sumber: Pedoman IAUI & EAU',
    updated_at: '2026-10-04',
    body_md: `### Tidak Perlu Menunggu Bertahun-tahun

Banyak pasangan baru memeriksakan pihak suami setelah 2 atau 3 tahun program hamil. Padahal, evaluasi paralel (suami dan istri diperiksa di periode yang sama) jauh lebih disarankan.

### Panduan Waktu Pemeriksaan

1. **Setelah 12 bulan program hamil:** Bila Anda dan pasangan berhubungan rutin tanpa alat kontrasepsi selama 1 tahun dan belum hamil, pedoman WHO menyarankan kedua pihak melakukan pemeriksaan dasar.
2. **Setelah 6 bulan (bila pasangan berusia 35 tahun ke atas):** Agar perencanaan waktu pasangan lebih optimal, evaluasi dasar dianjurkan lebih awal pada bulan ke-6.
3. **Kapan saja tanpa menunggu 6–12 bulan, bila Anda memiliki riwayat berikut:**
   - Pernah menjalani operasi di area lipat paha (seperti hernia) atau area testis.
   - Pernah mengalami gondongan (mumps) setelah usia pubertas.
   - Merasakan rasa pegal, berat, atau benjolan seperti kumpulan pembuluh darah di skrotum.
   - Ingin melakukan pemeriksaan pra-kehamilan secara terencana demi ketenangan pikiran.

### Ke Mana Harus Memulai?

Anda bisa memulai dari **dokter umum di Puskesmas atau klinik**, **Dokter Spesialis Andrologi (Sp.And)**, atau **Dokter Spesialis Urologi (Sp.U)**.`
  },
  {
    id: 'art-5',
    slug: 'apa-yang-terjadi-saat-pemeriksaan-di-klinik',
    title: 'Apa yang Sebenarnya Terjadi Saat Pemeriksaan di Klinik dan Laboratorium?',
    summary: 'Gambaran langkah demi langkah dari ruang pendaftaran hingga pengambilan sampel agar Anda tidak lagi cemas.',
    category: 'Persiapan Tes',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Tim Patologi Klinik & Andrologi (Placeholder Narasumber Medis) | Sumber: WHO 2021',
    updated_at: '2026-10-05',
    body_md: `### Rasa Canggung Itu Wajar

Rasa ragu terbesar pria sebelum ke klinik biasanya berasal dari ketidaktahuan: *"Nanti ditanya apa saja? Ruangannya seperti apa? Apakah memalukan?"* Mari kita bahas urutannya secara terbuka.

### 1. Sesi Diskusi dengan Dokter
Dokter akan menanyakan riwayat kesehatan umum, kebiasaan harian (tidur, rokok, pekerjaan), serta riwayat program hamil bersama pasangan. Jika diperlukan, dokter melakukan pemeriksaan fisik singkat di ruang periksa tertutup untuk mengecek apakah ada pelebaran pembuluh darah (varikokel).

### 2. Persiapan Sebelum Analisis Semen
Sebelum jadwal tes laboratorium, Anda diminta melakukan **masa pantang (abstinensia)**—tidak mengeluarkan sperma selama **2 hingga 7 hari** (ideal 3–4 hari) agar hasil mencerminkan kondisi optimal.

### 3. Proses di Ruang Pengambilan Sampel
- Petugas laboratorium akan memberikan wadah gelas steril bermulut lebar yang sudah diberi label kode/nama Anda.
- Anda diarahkan ke **ruangan khusus pribadi yang terkunci dari dalam**.
- Pengambilan sampel dilakukan secara mandiri tanpa menggunakan sabun, pelumas, atau air liur (karena dapat merusak sel sperma).
- Setelah selesai, wadah ditutup rapat dan diserahkan ke loket khusus laboratorium.

Seluruh prosedur dilakukan secara profesional, rahasia, dan selesai dalam waktu singkat.`
  },
  {
    id: 'art-6',
    slug: 'cara-bicara-dengan-pasangan-tanpa-menyalahkan',
    title: 'Cara Bicara dengan Pasangan Tentang Pemeriksaan Tanpa Saling Menyalahkan',
    summary: 'Panduan komunikasi hangat bagi suami maupun istri agar program hamil mempererat hubungan, bukan menjauhkan.',
    category: 'Pasangan & Emosi',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Psikolog Klinis Keluarga & Konselor Fertilitas (Placeholder Narasumber Medis)',
    updated_at: '2026-10-06',
    body_md: `### Mengubah "Kamu" Menjadi "Kita"

Saat penantian buah hati berjalan berbulan-bulan, kelelahan emosional sering membuat obrolan terasa sensitif. Istri mungkin takut terkesan menuntut jika mengajak suami periksa, sementara suami mungkin takut mengecewakan pasangan bila hasilnya belum sesuai harapan.

### Tips untuk Suami
- **Ambil inisiatif lebih dulu:** Mengatakan *"Aku mau ikut cek supaya kita punya data lengkap"* akan mengangkat beban besar dari pundak pasangan Anda.
- **Jujur tentang rasa gugup:** Tidak apa-apa mengakui bahwa Anda sempat merasa canggung untuk ke klinik. Pasangan Anda justru akan menghargai keterbukaan tersebut.

### Tips untuk Istri
- **Pilih waktu saat suasana santai:** Hindari membahas jadwal tes saat baru pulang kerja dalam keadaan lelah.
- **Gunakan kalimat kolaboratif:** Alih-alih *"Kamu kapan mau periksa?"*, gunakan *"Yuk kita susun langkah evaluasi kita berdua supaya dokter bisa bantu kita lebih tepat."*

### Sepakati "Zona Bebas Promil"
Sisihkan waktu kencan atau akhir pekan di mana Anda berdua sepakat untuk tidak membicarakan jadwal medis, agar hubungan suami-istri tetap hangat dan menyenangkan.`
  },
  {
    id: 'art-7',
    slug: 'suhu-panas-laptop-dan-kesehatan-reproduksi',
    title: 'Suhu Panas, Laptop di Pangkuan, dan Dampaknya pada Produksi Sperma',
    summary: 'Mengapa suhu 2 derajat lebih sejuk sangat penting bagi pabrik sel sperma dan cara praktis menjaganya.',
    category: 'Gaya Hidup',
    read_minutes: 2,
    reviewer: 'Ditinjau oleh: Tim Konsultan Andrologi & Kesehatan Kerja (Placeholder Narasumber Medis)',
    updated_at: '2026-10-07',
    body_md: `### Mengapa Suhu Sejuk Itu Penting?

Secara anatomis, testis berada di dalam kantung skrotum di luar rongga tubuh utama karena alasan yang sangat spesifik: **proses pembentukan sel sperma membutuhkan suhu sekitar 2°C hingga 3°C lebih rendah daripada suhu inti tubuh (37°C).**

### Sumber Panas Harian yang Sering Tidak Disadari

1. **Memangku laptop berjam-jam:** Suhu bagian bawah laptop ditambah posisi paha yang merapat dapat menaikkan suhu skrotum secara signifikan.
2. **Duduk terus-menerus lebih dari 4–6 jam:** Pekerja kantoran atau pengemudi jarak jauh mengalami peningkatan suhu lokal di area panggul.
3. **Mandi air panas / berendam jacuzzi & sauna rutin:** Paparan air panas langsung di atas 39°C secara berulang dapat menekan jumlah dan gerak sperma sementara waktu.
4. **Lingkungan kerja bersuhu tinggi:** Seperti dekat tungku pembakaran, dapur komersial, atau ruang mesin.

### Langkah Sederhana yang Bisa Langsung Dilakukan

- Letakkan laptop di atas meja kerja, bukan langsung di atas paha.
- Berdiri dan berjalan kaki ringan selama 3–5 menit setiap 1 jam duduk.
- Gunakan pakaian dalam berbahan katun yang menyerap keringat dan tidak terlalu ketat.`
  },
  {
    id: 'art-8',
    slug: 'rokok-vape-dan-pemulihan-alami',
    title: 'Rokok, Vape, dan Stres Oksidatif: Kabar Baik Tentang Pemulihan Alami Tubuh',
    summary: 'Apa yang terjadi pada sel sperma saat terpapar nikotin dan bagaimana tubuh memulihkan diri saat Anda mulai mengurangi.',
    category: 'Gaya Hidup',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Tim Spesialis Andrologi (Placeholder Narasumber Medis) | Sumber: Studi Klinis WHO & ASRM',
    updated_at: '2026-10-08',
    body_md: `### Memahami Stres Oksidatif Tanpa Menghakimi

Berhenti atau mengurangi rokok bukanlah hal yang mudah, terutama ketika pekerjaan sedang padat. Namun, memahami bagaimana asap rokok dan uap vape bekerja di tingkat sel dapat memberi motivasi yang positif.

### Apa yang Terjadi di Tingkat Sel?

Asap tembakau maupun uap cairan vape mengandung nikotin, logam berat mikro, serta senyawa radikal bebas. Di dalam cairan reproduksi, zat-zat ini memicu **stres oksidatif**—yaitu kondisi ketika radikal bebas merusak membran pelindung sel sperma. Dampaknya meliputi:
- Gerakan berenang sperma (**motilitas**) menjadi lebih lambat.
- Persentase bentuk sperma normal (**morfologi**) dapat menurun.
- Keutuhan materi genetik (DNA) di dalam kepala sperma menjadi lebih rentan.

### Kabar Baiknya: Tubuh Punya Kemampuan Pulih

Karena sel sperma diproduksi baru setiap 74 hari, **dampak paparan rokok sebagian besar bersifat reversibel (dapat membaik)**. Penelitian menunjukkan bahwa pria yang mengurangi secara drastis atau berhenti merokok selama 3 hingga 6 bulan menunjukkan peningkatan nyata pada konsentrasi dan kelincahan gerak sperma.`
  },
  {
    id: 'art-9',
    slug: 'mengenal-varikokel-penyebab-umum-yang-bisa-ditangani',
    title: 'Mengenal Varikokel: Kondisi Umum pada Pria yang Sering Tidak Disadari',
    summary: 'Mengenal pelebaran pembuluh darah vena di skrotum yang sering tanpa gejala namun dapat ditangani oleh dokter.',
    category: 'Dasar Kesuburan',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Dokter Spesialis Urologi, Sp.U (Placeholder Narasumber Medis) | Sumber: Pedoman IAUI',
    updated_at: '2026-10-09',
    body_md: `### Apa Itu Varikokel?

Varikokel adalah pelebaran pembuluh darah balik (vena) di dalam kantung skrotum—mirip seperti varises yang terjadi pada tungkai kaki. Kondisi ini sangat umum: ditemukan pada sekitar **15% pria secara umum**, dan pada **35–40% pria yang sedang menjalani evaluasi program hamil**.

### Mengapa Sering Tidak Disadari?

Sebagian besar varikokel berkembang perlahan dan **tidak menimbulkan rasa sakit yang tajam**. Beberapa pria hanya merasakan:
- Rasa pegal atau berat samar di skrotum setelah berdiri lama atau berolahraga berat.
- Rasa nyaman kembali saat berbaring telentang.
- Pada tingkat yang lebih jelas, teraba seperti kumpulan pembuluh di atas testis (lebih sering di sisi kiri).

### Bagaimana Varikokel Memengaruhi Sperma?

Darah yang menggenang di pembuluh vena yang melebar menyebabkan suhu di sekitar testis meningkat sedikit demi sedikit dan meningkatkan zat sisa metabolisme, sehingga menurunkan produksi dan gerak sperma.

### Kabar Baik: Mudah Diperiksa dan Bisa Ditangani

Dokter spesialis urologi atau andrologi dapat mendeteksi varikokel melalui pemeriksaan fisik sederhana (dan USG bila diperlukan). Tidak semua varikokel harus dioperasi—dokter akan mendiskusikan pilihan terbaik sesuai kondisi Anda.`
  },
  {
    id: 'art-10',
    slug: 'membaca-hasil-analisis-semen-tanpa-panik',
    title: 'Membaca Hasil Analisis Semen Tanpa Panik: Memahami Angka Rujukan WHO',
    summary: 'Panduan bahasa awam untuk memahami istilah volume, konsentrasi, motilitas, dan morfologi.',
    category: 'Persiapan Tes',
    read_minutes: 4,
    reviewer: 'Ditinjau oleh: Tim Patologi Klinik & Andrologi (Placeholder Narasumber Medis) | Sumber: WHO 6th Ed. (2021)',
    updated_at: '2026-10-10',
    body_md: `### Satu Kali Hasil Bukanlah Vonis Akhir

Saat membuka lembar hasil laboratorium, melihat banyak istilah medis atau tanda bintang sering kali membuat jantung berdebar. Ingatlah satu prinsip utama dalam pedoman WHO: **hasil analisis semen satu kali dapat bervariasi secara alami**, sehingga hanya dokter yang dapat menafsirkannya secara menyeluruh.

### Empat Parameter Utama (Acuan WHO Edisi ke-6, 2021)

1. **Volume Ejakulat (Rujukan bawah: ≥ 1,4 mL)**
   Menunjukkan total cairan yang tertampung. Jika kurang dari 1,4 mL, kadang hanya disebabkan oleh masa pantang yang terlalu singkat atau ada sebagian cairan yang tumpah saat penampungan.
2. **Konsentrasi Sperma (Rujukan bawah: ≥ 16 juta/mL)**
   Menghitung kepadatan jumlah sel sperma dalam tiap mililiter cairan.
3. **Motilitas / Gerak Sperma (Total ≥ 42%, Progresif ≥ 30%)**
   Mengukur persentase sperma yang hidup dan berenang aktif bergerak maju.
4. **Morfologi / Bentuk Normal (Rujukan bawah: ≥ 4%)**
   Ini adalah angka yang paling sering disalahpahami! Jika tertulis morfologi normal 4% atau 5%, banyak pria mengira 95% spermanya "rusak". Padahal, laboratorium menggunakan kriteria pengukuran mikroskopis yang sangat ketat, sehingga **angka 4% ke atas sudah tergolong berada dalam rentang rujukan normal**.

### Langkah Selanjutnya
Bawa hasil Anda ke dokter untuk melihat gambaran utuhnya bersama riwayat pasangan.`
  },
  {
    id: 'art-11',
    slug: 'tidur-stres-dan-keseimbangan-hormon',
    title: 'Tidur, Stres Kerja, dan Keseimbangan Hormon Reproduksi Pria',
    summary: 'Mengapa istirahat yang cukup dan manajemen stres bukan sekadar saran klise dalam program hamil.',
    category: 'Gaya Hidup',
    read_minutes: 2,
    reviewer: 'Ditinjau oleh: Tim Konsultan Andrologi & Kedokteran Tidur (Placeholder Narasumber Medis)',
    updated_at: '2026-10-11',
    body_md: `### Hubungan Antara Otak dan Produksi Sperma

Produksi sel sperma dan hormon testosteron dikendalikan oleh sinyal hormon dari kelenjar di otak (hipotalamus dan hipofisis). Sinyal ini sangat peka terhadap ritme tidur harian dan tingkat stres tubuh Anda.

### Dampak Kurang Tidur (< 6 Jam per Malam)

Sebagian besar pelepasan hormon testosteron harian pada pria terjadi ketika Anda berada dalam **fase tidur nyenyak (REM dan deep sleep)**. Kurang tidur kronis selama berminggu-minggu dapat menurunkan kadar testosteron alami hingga 10–15%.

### Bagaimana Hormon Stres (Kortisol) Bekerja?

Ketika Anda berada di bawah tekanan kerja atau kecemasan berkepanjangan, tubuh memproduksi hormon kortisol dalam jumlah tinggi. Kortisol yang terus-menerus tinggi dapat menekan sinyal otak yang bertugas memicu produksi hormon reproduksi.

### Langkah Kecil Malam Ini
- Usahakan jam tidur dan bangun yang konsisten, termasuk di akhir pekan.
- Matikan layar gawai 30 menit sebelum tidur.
- Luangkan waktu 15 menit untuk mengobrol santai atau berjalan sore bersama pasangan.`
  },
  {
    id: 'art-12',
    slug: 'privasi-data-kesehatan-dan-hak-anda',
    title: 'Privasi Data Kesehatan Anda di Side by Side & Prinsip Pelindungan Data Pribadi',
    summary: 'Bagaimana kami menjaga kerahasiaan data Anda dengan enkripsi perangkat, persetujuan granular, dan kendali penuh di tangan Anda.',
    category: 'Privasi & Hak',
    read_minutes: 3,
    reviewer: 'Ditinjau oleh: Tim Keamanan Privasi & Etika Kesehatan Digital Side by Side | Acuan: UU No. 27 Tahun 2022 (UU PDP)',
    updated_at: '2026-10-12',
    body_md: `### Data Kesehatan Reproduksi Adalah Milik Anda Sepenuhnya

Kami memahami bahwa kekhawatiran akan bocornya privasi adalah salah satu alasan utama orang enggan mencari informasi kesehatan reproduksi. Oleh karena itu, **Side by Side** dirancang dengan prinsip *Privacy by Design* yang selaras dengan Undang-Undang Pelindungan Data Pribadi (UU PDP).

### Lima Komitmen Privasi Side by Side

1. **Bisa Dipakai Tanpa Akun (Mode Anonim):** Anda dapat mengisi Cek Awal, membaca Pustaka, dan mencatat hasil tanpa memberikan nama, email, atau nomor telepon. Dalam mode ini, jawaban Anda dienkripsi dengan standar **Web Crypto (AES-GCM)** langsung di perangkat Anda (IndexedDB) dan tidak dikirim ke server.
2. **Persetujuan Granular (Default OFF):** Tidak ada data yang disimpan ke akun, dibagikan ke pasangan, atau ditampilkan ke tenaga kesehatan kecuali Anda menyalakan tombol persetujuannya sendiri.
3. **Berbagi ke Pasangan Tanpa Membuka Rahasia Medis:** Di Mode Berdua, pasangan Anda hanya melihat tahapan rencana bersama (checklist)—bukan jawaban kuesioner atau angka laboratorium Anda, kecuali Anda memilih membagikannya per item.
4. **Tautan Nakes Berlaku 1 Jam & Tercatat:** Saat berbagi ringkasan ke dokter via kode QR, tautan otomatis kedaluwarsa dalam 1 jam dan setiap akses tercatat di halaman Anda.
5. **Hak Hapus Seketika:** Tombol *"Hapus semua data saya"* di Pengaturan akan menghapus seluruh data lokal maupun server secara permanen.`
  }
];

export const seedFaqs: SeedFaq[] = [
  {
    id: 'faq-1',
    category: 'Privasi',
    question: 'Apakah jawaban Cek Awal saya bisa dilihat oleh orang lain atau pasangan saya?',
    answer: 'Tidak. Secara default, jawaban Cek Awal hanya tersimpan terenkripsi di perangkat Anda. Bahkan jika Anda menautkan kode Mode Berdua dengan pasangan, pasangan hanya dapat melihat status tahapan rencana (misalnya: "Sudah Cek Awal"), bukan isi jawaban atau detail hasilnya, kecuali Anda memilih sendiri untuk membagikannya.'
  },
  {
    id: 'faq-2',
    category: 'Medis & Pemeriksaan',
    question: 'Apakah hasil Cek Awal di aplikasi ini bisa menggantikan pemeriksaan dokter?',
    answer: 'Tidak. Cek Awal di Side by Side adalah alat bantu edukasi dan pemetaan faktor risiko mandiri berbasis pedoman kesehatan, bukan diagnosis medis. Hanya dokter yang dapat menilai kondisi kesehatan Anda secara langsung.'
  },
  {
    id: 'faq-3',
    category: 'Biaya & JKN',
    question: 'Apakah pemeriksaan kesuburan pria ditanggung oleh BPJS Kesehatan (JKN)?',
    answer: 'Konsultasi awal di Puskesmas/FKTP dan rujukan ke Poli Urologi RS untuk keluhan medis (seperti nyeri skrotum, varikokel, atau riwayat infeksi/operasi) umumnya ditanggung JKN sesuai indikasi medis dokter. Namun, tes analisis semen murni untuk program ingin anak di sebagian fasilitas kesehatan dikategorikan sebagai layanan mandiri. Selalu tanyakan kebijakan fasilitas tujuan Anda.'
  },
  {
    id: 'faq-4',
    category: 'Persiapan Tes',
    question: 'Mengapa harus puasa berhubungan (masa pantang) 2 sampai 7 hari sebelum analisis semen?',
    answer: 'Masa pantang 2–7 hari (umumnya ideal 3–4 hari) diperlukan agar jumlah dan kualitas gerak sel sperma yang diperiksa berada pada kondisi standar rujukan WHO. Jika kurang dari 2 hari, volume dan jumlah sperma bisa tampak lebih rendah sementara; jika lebih dari 7 hari, proporsi sperma yang bergerak aktif bisa menurun.'
  },
  {
    id: 'faq-5',
    category: 'Keamanan Aplikasi',
    question: 'Bagaimana jika saya membuka aplikasi ini di tempat umum atau kantor?',
    answer: 'Anda dapat mengaktifkan fitur "Penyamaran Tampilan" (Mode Samaran) di bilah atas atau menu Pengaturan. Fitur ini seketika mengubah judul tab, ikon, dan tampilan header menjadi aplikasi "Catatan Harian" yang netral, serta menyediakan kunci PIN untuk melindungi layar Anda.'
  }
];
