import { PrismaClient } from '@prisma/client';
import { seedFacilities } from '../src/config/seed-facilities';
import { seedArticles } from '../src/config/seed-articles';
import { hashPassword } from '../server/crypto-auth';

const prisma = new PrismaClient();

export async function runSeed() {
  console.log('🌱 Memulai proses seeding database Side by Side...');

  // 1. Seed Direktori Fasilitas Layanan (16 fasilitas di 3 kota: Jakarta, Bandung, Surabaya)
  for (const fac of seedFacilities) {
    await prisma.facility.upsert({
      where: { id: fac.id },
      update: {
        name: fac.name,
        type: fac.type,
        city: fac.city,
        address: fac.address,
        latitude: fac.latitude,
        longitude: fac.longitude,
        services_json: JSON.stringify(fac.services),
        price_min: fac.price_min,
        price_max: fac.price_max,
        accepts_jkn: fac.accepts_jkn,
        hours: fac.hours,
        map_url: fac.map_url,
        friendliness_score: fac.friendliness_score,
        friendliness_notes: fac.friendliness_notes,
      },
      create: {
        id: fac.id,
        name: fac.name,
        type: fac.type,
        city: fac.city,
        address: fac.address,
        latitude: fac.latitude,
        longitude: fac.longitude,
        services_json: JSON.stringify(fac.services),
        price_min: fac.price_min,
        price_max: fac.price_max,
        accepts_jkn: fac.accepts_jkn,
        hours: fac.hours,
        map_url: fac.map_url,
        friendliness_score: fac.friendliness_score,
        friendliness_notes: fac.friendliness_notes,
      },
    });
  }
  console.log(`✅ ${seedFacilities.length} fasilitas layanan kesehatan berhasil di-seed.`);

  // 2. Seed Pustaka Edukasi (12 artikel markdown)
  for (const art of seedArticles) {
    await prisma.article.upsert({
      where: { slug: art.slug },
      update: {
        title: art.title,
        summary: art.summary,
        body_md: art.body_md,
        category: art.category,
        read_minutes: art.read_minutes,
        reviewer: art.reviewer,
      },
      create: {
        id: art.id,
        slug: art.slug,
        title: art.title,
        summary: art.summary,
        body_md: art.body_md,
        category: art.category,
        read_minutes: art.read_minutes,
        reviewer: art.reviewer,
      },
    });
  }
  console.log(`✅ ${seedArticles.length} artikel edukasi berhasil di-seed.`);

  // 3. Seed Akun Demo: Rendra (Suami), Sari (Istri), dr. Maya (Nakes Puskesmas)
  const demoPasswordHash = await hashPassword('DemoAman123!');

  const rendra = await prisma.user.upsert({
    where: { email: 'rendra@demo.id' },
    update: {
      display_name: 'Rendra (32 thn)',
      role: 'user',
      locale: 'id',
    },
    create: {
      id: 'user-rendra-demo',
      email: 'rendra@demo.id',
      password_hash: demoPasswordHash,
      display_name: 'Rendra (32 thn)',
      role: 'user',
      locale: 'id',
    },
  });

  const sari = await prisma.user.upsert({
    where: { email: 'sari@demo.id' },
    update: {
      display_name: 'Sari (30 thn)',
      role: 'user',
      locale: 'id',
    },
    create: {
      id: 'user-sari-demo',
      email: 'sari@demo.id',
      password_hash: demoPasswordHash,
      display_name: 'Sari (30 thn)',
      role: 'user',
      locale: 'id',
    },
  });

  const drMaya = await prisma.user.upsert({
    where: { email: 'maya@puskesmas.id' },
    update: {
      display_name: 'dr. Maya (Dokter Umum Puskesmas)',
      role: 'nakes',
      locale: 'id',
    },
    create: {
      id: 'user-drmaya-demo',
      email: 'maya@puskesmas.id',
      password_hash: demoPasswordHash,
      display_name: 'dr. Maya (Dokter Umum Puskesmas)',
      role: 'nakes',
      locale: 'id',
    },
  });

  // Default consents untuk akun demo (semua default OFF sesuai prinsip privasi, bisa dinyalakan di UI)
  for (const key of ['store_results', 'share_partner', 'share_nakes']) {
    await prisma.consent.upsert({
      where: {
        user_id_key: {
          user_id: rendra.id,
          key,
        },
      },
      update: {},
      create: {
        user_id: rendra.id,
        key,
        granted: false,
      },
    });
  }

  // 4. Seed Pairing Mode Berdua Rendra & Sari (Kode: BERSAMA24)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pairing = await prisma.pairing.upsert({
    where: { invite_code: 'BERSAMA24' },
    update: {
      user_a: rendra.id,
      user_b: sari.id,
      status: 'active',
      expires_at: tomorrow,
    },
    create: {
      id: 'pairing-rendra-sari',
      invite_code: 'BERSAMA24',
      user_a: rendra.id,
      user_b: sari.id,
      partner_a_alias: 'Rendra',
      partner_b_alias: 'Sari',
      status: 'active',
      shared_items_json: JSON.stringify({
        shareAssessmentLevel: false,
        shareLabSummary: false,
        noteFromA: 'Aku mau kita cek bareng, bukan karena ada yang salah, tapi biar kita tahu langkah terbaik.',
        noteFromB: 'Terima kasih sudah mau melangkah bareng. Kita jalani pelan-pelan ya.',
      }),
      expires_at: tomorrow,
    },
  });

  const planStepsSeed = [
    { step_key: 'cek_awal', step_order: 1, title: 'Cek Awal Mandiri', status_a: 'done', status_b: 'done' },
    { step_key: 'pilih_layanan', step_order: 2, title: 'Pilih Layanan Pemeriksaan', status_a: 'done', status_b: 'done' },
    { step_key: 'jadwalkan', step_order: 3, title: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)', status_a: 'in_progress', status_b: 'done' },
    { step_key: 'periksa', step_order: 4, title: 'Kunjungan Pemeriksaan', status_a: 'not_started', status_b: 'done' },
    { step_key: 'pahami_hasil', step_order: 5, title: 'Pahami Hasil Bersama', status_a: 'not_started', status_b: 'not_started' },
    { step_key: 'tindak_lanjut', step_order: 6, title: 'Rencana Tindak Lanjut Dokter', status_a: 'not_started', status_b: 'not_started' },
  ];

  for (const step of planStepsSeed) {
    await prisma.planStep.upsert({
      where: {
        pairing_id_step_key: {
          pairing_id: pairing.id,
          step_key: step.step_key,
        },
      },
      update: {
        status_a: step.status_a,
        status_b: step.status_b,
      },
      create: {
        pairing_id: pairing.id,
        step_key: step.step_key,
        step_order: step.step_order,
        title: step.title,
        status_a: step.status_a,
        status_b: step.status_b,
        due_date: new Date(Date.now() + step.step_order * 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 5. Seed ShareToken Demo untuk dr. Maya (Berlaku 1 jam dari waktu seed)
  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.shareToken.upsert({
    where: { token_code: 'MAYA-RENDRA-1H' },
    update: {
      expires_at: oneHourLater,
      revoked: false,
    },
    create: {
      id: 'share-rendra-maya',
      token_code: 'MAYA-RENDRA-1H',
      user_id: rendra.id,
      scope_json: JSON.stringify(['history', 'risk_factors', 'lab_results']),
      snapshot_json: JSON.stringify({
        patientAlias: 'Rendra (32 thn)',
        programDuration: '8 bulan program hamil bersama istri',
        assessmentLevel: 'Sebaiknya periksa dalam 1 sampai 2 bulan',
        reportedRiskFactors: [
          'Durasi program hamil 6–12 bulan (8 bulan)',
          'Paparan panas: sering memangku laptop & duduk kerja >6 jam/hari',
          'Kebiasaan merokok ringan/vape yang sedang mulai dikurangi',
          'Tidur kadang kurang dari 6 jam karena beban pekerjaan',
        ],
        labResults: [
          {
            testDate: '2026-08-10',
            volume_ml: 2.1,
            concentration_m_per_ml: 14.5,
            total_motility_pct: 39,
            progressive_motility_pct: 28,
            morphology_normal_pct: 4.0,
            notes: 'Pemeriksaan perdana (sempat kurang tidur dan kerja lembur)',
          },
          {
            testDate: '2026-10-18',
            volume_ml: 2.4,
            concentration_m_per_ml: 18.5,
            total_motility_pct: 45,
            progressive_motility_pct: 33,
            morphology_normal_pct: 4.5,
            notes: 'Pemeriksaan kedua setelah mengurangi vape dan tidak memangku laptop',
          },
        ],
      }),
      expires_at: oneHourLater,
      accessed_log_json: JSON.stringify([
        {
          accessed_at: new Date().toISOString(),
          viewer_name: 'dr. Maya (Puskesmas Kecamatan Tebet)',
          viewer_role: 'nakes',
          action: 'Melihat ringkasan pasien via Kode QR',
        },
      ]),
    },
  });

  // 6. Seed Contoh Tiket Pertanyaan Anonim (F6 Tanya Nakes)
  await prisma.questionTicket.upsert({
    where: { id: 'ticket-demo-1' },
    update: {},
    create: {
      id: 'ticket-demo-1',
      anon_token: 'anon-rendra-demo',
      category: 'Persiapan Tes',
      text: 'Dok, saya sudah 8 bulan promil. Kalau mau analisis semen di RS rujukan JKN, apakah saya bisa minta pengantar dari dokter umum Puskesmas dulu?',
      status: 'dijawab',
      reply_text:
        'Halo, terima kasih sudah berani bertanya. Ya, Anda sangat disarankan berkonsultasi ke dokter umum di Puskesmas/FKTP terlebih dahulu. Dokter akan melakukan wawancara medis dan pemeriksaan fisik dasar (misalnya mengecek ada tidaknya keluhan varikokel) untuk menentukan alur rujukan yang tepat.',
      replied_by: 'dr. Maya (Dokter Umum Puskesmas)',
    },
  });

  console.log(`✅ Akun demo (${rendra.email}, ${sari.email}, ${drMaya.email}) & skenario siap pakai berhasil di-seed.`);
}

// Jalankan bila dipanggil langsung via CLI
if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .catch((e) => {
      console.error('❌ Gagal menjalankan seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
