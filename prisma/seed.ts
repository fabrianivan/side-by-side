import { PrismaClient } from '@prisma/client';
import { seedFacilities } from '../src/config/seed-facilities';
import { seedArticles } from '../src/config/seed-articles';

const prisma = new PrismaClient();

/**
 * Seed data referensi klinis produksi (hanya direktori fasilitas kesehatan & artikel edukasi).
 * Tidak menyisipkan akun demo maupun data kesehatan pribadi fiktif ke database.
 */
export async function runSeed() {
  console.log('🌱 Seeding reference clinical directory & educational library...');

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
  console.log(`✅ ${seedFacilities.length} curated care facilities ready.`);

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
  console.log(`✅ ${seedArticles.length} educational articles ready.`);
}

if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .catch((e) => {
      console.error('❌ Failed to run seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
