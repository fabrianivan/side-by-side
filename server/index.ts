import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { seedFacilities } from '../src/config/seed-facilities';
import { seedArticles, seedFaqs } from '../src/config/seed-articles';
import { templatesConfig, assessmentRulesConfig, semenReferenceConfig } from '../src/config/schemas';
import { hashPassword, verifyPassword } from './crypto-auth';

export const prisma = new PrismaClient();

export async function buildServer() {
  // KEAMANAN & ETIKA: Logger TIDAK boleh mencatat body request atau isi data kesehatan
  const app = Fastify({
    logger: {
      level: 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url.split('?')[0],
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'side-by-side-dev-secret-change-in-production-32chars',
  });

  await app.register(rateLimit, {
    max: 150,
    timeWindow: '1 minute',
  });

  // 1. Healthcheck
  app.get('/api/health', async () => ({
    status: 'ok',
    app: 'Side by Side API',
    privacy: 'zero-health-payload-logging',
  }));

  // 2. Konfigurasi Medis & Templat
  app.get('/api/config', async () => ({
    assessmentRules: assessmentRulesConfig,
    semenReference: semenReferenceConfig,
    templates: templatesConfig,
    faqs: seedFaqs,
  }));

  // 3. Direktori Layanan Pemeriksaan (F3)
  app.get('/api/facilities', async () => {
    try {
      const rows = await prisma.facility.findMany({
        orderBy: { friendliness_score: 'desc' },
      });
      if (rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          services: JSON.parse(r.services_json) as string[],
        }));
      }
    } catch {
      // Fallback ke seed
    }
    return seedFacilities;
  });

  // 4. Pustaka Artikel Edukasi (F6)
  app.get('/api/articles', async () => {
    try {
      const rows = await prisma.article.findMany({
        orderBy: { updated_at: 'desc' },
      });
      if (rows.length > 0) return rows;
    } catch {
      // Fallback ke seed
    }
    return seedArticles;
  });

  // 5. Autentikasi Akun & Nakes (F1 & F7)
  const AuthSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['user', 'nakes']).optional().default('user'),
    displayName: z.string().max(80).optional(),
  });

  app.post('/api/auth/register', async (req, reply) => {
    const parsed = AuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Format email atau kata sandi tidak valid (minimal 6 karakter).' });
    }
    const { email, password, role, displayName } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email sudah terdaftar. Silakan masuk.' });
    }
    const password_hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        role,
        display_name: displayName || email.split('@')[0],
      },
    });
    // Inisialisasi semua persetujuan default OFF
    for (const key of ['store_results', 'share_partner', 'share_nakes']) {
      await prisma.consent.create({
        data: { user_id: user.id, key, granted: false },
      });
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      locale: user.locale,
    };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const parsed = AuthSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Masukkan email dan kata sandi yang valid.' });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return reply.status(401).send({ error: 'Email atau kata sandi tidak sesuai.' });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Email atau kata sandi tidak sesuai.' });
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      locale: user.locale,
    };
  });

  app.post('/api/auth/magic-link', async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(['user', 'nakes']).optional().default('user'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Format email tidak valid.' });
    }
    const { email, role } = parsed.data;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role,
          display_name: email.split('@')[0],
        },
      });
      for (const key of ['store_results', 'share_partner', 'share_nakes']) {
        await prisma.consent.create({
          data: { user_id: user.id, key, granted: false },
        });
      }
    }
    return {
      success: true,
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      token: 'magic-' + Math.random().toString(36).substring(2, 10),
    };
  });

  app.get('/api/auth/profile/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        locale: true,
        created_at: true,
      },
    });
    if (!user) {
      return reply.status(404).send({ error: 'Pengguna tidak ditemukan.' });
    }
    return user;
  });

  app.put('/api/auth/profile/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const schema = z.object({
      displayName: z.string().min(2).max(80).optional(),
      newPassword: z.string().min(6).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Nama minimal 2 karakter, atau kata sandi baru minimal 6 karakter.' });
    }
    const updateData: Record<string, unknown> = {};
    if (parsed.data.displayName) {
      updateData.display_name = parsed.data.displayName;
    }
    if (parsed.data.newPassword) {
      updateData.password_hash = await hashPassword(parsed.data.newPassword);
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        locale: true,
      },
    });
    return user;
  });

  // Sinkronisasi Data Antar Perangkat untuk Mode Akun (F1)
  app.post('/api/sync', async (req, reply) => {
    const schema = z.object({
      userId: z.string(),
      results: z.array(z.record(z.string(), z.unknown())).optional(),
      reminders: z.array(z.record(z.string(), z.unknown())).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Payload sinkronisasi tidak valid.' });
    }
    const { userId, results, reminders } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: 'Akun tidak ditemukan di server.' });
    }

    if (results && results.length > 0) {
      for (const resItem of results) {
        if (typeof resItem.testDate === 'string') {
          await prisma.result.create({
            data: {
              user_id: userId,
              test_date: new Date(resItem.testDate),
              values_json_encrypted: JSON.stringify(resItem),
              notes: typeof resItem.notes === 'string' ? resItem.notes : null,
              attachment_name: typeof resItem.attachmentName === 'string' ? resItem.attachmentName : null,
            },
          });
        }
      }
    }

    return {
      synced: true,
      syncedAt: new Date().toISOString(),
      itemCount: (results?.length || 0) + (reminders?.length || 0),
    };
  });

  // 6. Persetujuan Granular (F1 & F8)
  app.get('/api/consents/:userId', async (req) => {
    const { userId } = req.params as { userId: string };
    const rows = await prisma.consent.findMany({ where: { user_id: userId } });
    const map: Record<string, boolean> = {
      store_results: false,
      share_partner: false,
      share_nakes: false,
    };
    for (const r of rows) {
      map[r.key] = r.granted;
    }
    return map;
  });

  app.put('/api/consents/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const schema = z.object({
      key: z.enum(['store_results', 'share_partner', 'share_nakes']),
      granted: z.boolean(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parameter persetujuan tidak valid.' });
    }
    const { key, granted } = parsed.data;
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (userExists) {
      await prisma.consent.upsert({
        where: { user_id_key: { user_id: userId, key } },
        update: { granted },
        create: { user_id: userId, key, granted },
      });
    }
    return { key, granted, updated_at: new Date().toISOString() };
  });

  // 7. Mode Berdua / Pairing & Rencana Kita (F4)
  app.get('/api/pairings/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const pairing = await prisma.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
      include: {
        plan_steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });
    if (!pairing) {
      return reply.status(404).send({ error: 'Kode pasangan tidak ditemukan.' });
    }
    return {
      ...pairing,
      shared_items: JSON.parse(pairing.shared_items_json || '{}'),
    };
  });

  app.post('/api/pairings', async (req) => {
    const schema = z.object({
      userId: z.string().optional(),
      partnerAAlias: z.string().max(40).default('Suami'),
      partnerBAlias: z.string().max(40).default('Istri'),
    });
    const body = schema.parse(req.body || {});
    let ownerId = body.userId || 'user-rendra-demo';
    const userExists = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!userExists) {
      const anonUser = await prisma.user.create({
        data: {
          id: ownerId,
          anon_token: ownerId,
          role: 'user',
        },
      });
      ownerId = anonUser.id;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase() + '24';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const pairing = await prisma.pairing.create({
      data: {
        invite_code: inviteCode,
        user_a: ownerId,
        partner_a_alias: body.partnerAAlias,
        partner_b_alias: body.partnerBAlias,
        status: 'active',
        expires_at: expiresAt,
        shared_items_json: JSON.stringify({
          shareAssessmentLevel: false,
          shareLabSummary: false,
          noteFromA: 'Aku mau kita cek bareng, bukan karena ada yang salah, tapi biar kita tahu langkah terbaik.',
          noteFromB: '',
        }),
      },
    });

    const defaultSteps = [
      { step_key: 'cek_awal', step_order: 1, title: 'Cek Awal Mandiri' },
      { step_key: 'pilih_layanan', step_order: 2, title: 'Pilih Layanan Pemeriksaan' },
      { step_key: 'jadwalkan', step_order: 3, title: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)' },
      { step_key: 'periksa', step_order: 4, title: 'Kunjungan Pemeriksaan' },
      { step_key: 'pahami_hasil', step_order: 5, title: 'Pahami Hasil Bersama' },
      { step_key: 'tindak_lanjut', step_order: 6, title: 'Rencana Tindak Lanjut Dokter' },
    ];

    for (const s of defaultSteps) {
      await prisma.planStep.create({
        data: {
          pairing_id: pairing.id,
          step_key: s.step_key,
          step_order: s.step_order,
          title: s.title,
          status_a: 'not_started',
          status_b: 'not_started',
        },
      });
    }

    const created = await prisma.pairing.findUnique({
      where: { id: pairing.id },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    return {
      ...created,
      shared_items: JSON.parse(created?.shared_items_json || '{}'),
    };
  });

  app.put('/api/pairings/:code/step', async (req, reply) => {
    const { code } = req.params as { code: string };
    const schema = z.object({
      stepKey: z.string(),
      actor: z.enum(['a', 'b']),
      status: z.enum(['not_started', 'in_progress', 'done']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Input tahapan tidak valid.' });
    }
    const pairing = await prisma.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Tautan pasangan tidak aktif atau telah dicabut.' });
    }

    const updateData =
      parsed.data.actor === 'a'
        ? { status_a: parsed.data.status }
        : { status_b: parsed.data.status };

    const updatedStep = await prisma.planStep.update({
      where: {
        pairing_id_step_key: {
          pairing_id: pairing.id,
          step_key: parsed.data.stepKey,
        },
      },
      data: updateData,
    });
    return updatedStep;
  });

  app.put('/api/pairings/:code/shared', async (req, reply) => {
    const { code } = req.params as { code: string };
    const pairing = await prisma.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Tautan pasangan tidak ditemukan.' });
    }
    const current = JSON.parse(pairing.shared_items_json || '{}');
    const updatedJson = { ...current, ...(req.body as Record<string, unknown>) };
    const updated = await prisma.pairing.update({
      where: { id: pairing.id },
      data: { shared_items_json: JSON.stringify(updatedJson) },
    });
    return {
      ...updated,
      shared_items: updatedJson,
    };
  });

  app.post('/api/pairings/:code/revoke', async (req, reply) => {
    const { code } = req.params as { code: string };
    const pairing = await prisma.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
    });
    if (!pairing) {
      return reply.status(404).send({ error: 'Kode pasangan tidak ditemukan.' });
    }
    const updated = await prisma.pairing.update({
      where: { id: pairing.id },
      data: {
        status: 'revoked',
        revoked_at: new Date(),
      },
    });
    return updated;
  });

  // 8. Tanya Tenaga Kesehatan — Tiket Pertanyaan Anonim (F6)
  app.get('/api/tickets', async () => {
    return prisma.questionTicket.findMany({
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  });

  app.post('/api/tickets', async (req, reply) => {
    const schema = z.object({
      anonToken: z.string().min(3),
      category: z.string().default('Umum'),
      text: z.string().min(10).max(1000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Pertanyaan minimal 10 karakter.' });
    }
    const ticket = await prisma.questionTicket.create({
      data: {
        anon_token: parsed.data.anonToken,
        category: parsed.data.category,
        text: parsed.data.text,
        status: 'terkirim',
      },
    });
    return ticket;
  });

  app.post('/api/tickets/:id/reply', async (req, reply) => {
    const { id } = req.params as { id: string };
    const schema = z.object({
      replyText: z.string().min(5).max(2000),
      repliedBy: z.string().default('dr. Maya (Dokter Umum Puskesmas)'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Balasan tidak valid.' });
    }
    const updated = await prisma.questionTicket.update({
      where: { id },
      data: {
        status: 'dijawab',
        reply_text: parsed.data.replyText,
        replied_by: parsed.data.repliedBy,
      },
    });
    return updated;
  });

  // 9. Mode Tenaga Kesehatan & ShareToken QR Berlaku 1 Jam (F7)
  app.post('/api/share-tokens', async (req, reply) => {
    const schema = z.object({
      userId: z.string().optional(),
      scope: z.array(z.enum(['history', 'risk_factors', 'lab_results'])).min(1),
      snapshot: z.record(z.string(), z.unknown()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Pilih minimal satu cakupan data untuk dibagikan.' });
    }

    let ownerId = parsed.data.userId || 'user-rendra-demo';
    const userExists = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!userExists) {
      await prisma.user.create({
        data: { id: ownerId, anon_token: ownerId, role: 'user' },
      });
    }

    const tokenCode = 'SBS-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-1H';
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Berlaku tepat 1 jam

    const created = await prisma.shareToken.create({
      data: {
        token_code: tokenCode,
        user_id: ownerId,
        scope_json: JSON.stringify(parsed.data.scope),
        snapshot_json: JSON.stringify(parsed.data.snapshot),
        expires_at: expiresAt,
        accessed_log_json: JSON.stringify([]),
      },
    });

    return {
      id: created.id,
      token_code: created.token_code,
      scope: parsed.data.scope,
      expires_at: created.expires_at,
      accessed_log: [],
    };
  });

  app.get('/api/share-tokens/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const viewerName = ((req.query as Record<string, string>)?.viewer || 'dr. Maya (Tenaga Kesehatan)').slice(0, 80);

    const token = await prisma.shareToken.findUnique({
      where: { token_code: code.toUpperCase() },
    });

    if (!token) {
      return reply.status(404).send({ error: 'Kode ringkasan pasien tidak ditemukan.' });
    }
    if (token.revoked) {
      return reply.status(410).send({ error: 'Tautan berbagi ini telah dicabut oleh pasien.' });
    }
    if (new Date(token.expires_at).getTime() < Date.now()) {
      return reply.status(410).send({ error: 'Tautan berbagi telah kedaluwarsa (melewati batas 1 jam).' });
    }

    const currentLogs = JSON.parse(token.accessed_log_json || '[]');
    const newLogEntry = {
      accessed_at: new Date().toISOString(),
      viewer_name: viewerName,
      viewer_role: 'nakes',
      action: 'Membuka Ringkasan Pasien',
    };
    const updatedLogs = [newLogEntry, ...currentLogs].slice(0, 50);

    await prisma.shareToken.update({
      where: { id: token.id },
      data: { accessed_log_json: JSON.stringify(updatedLogs) },
    });

    const scope = JSON.parse(token.scope_json) as string[];
    const fullSnapshot = JSON.parse(token.snapshot_json) as Record<string, unknown>;

    // Filter hanya bagian yang disetujui dalam scope!
    const filteredSnapshot: Record<string, unknown> = {
      patientAlias: fullSnapshot.patientAlias || 'Pasien Anonim',
    };
    if (scope.includes('history')) {
      filteredSnapshot.programDuration = fullSnapshot.programDuration;
      filteredSnapshot.assessmentLevel = fullSnapshot.assessmentLevel;
    }
    if (scope.includes('risk_factors')) {
      filteredSnapshot.reportedRiskFactors = fullSnapshot.reportedRiskFactors;
    }
    if (scope.includes('lab_results')) {
      filteredSnapshot.labResults = fullSnapshot.labResults;
    }

    return {
      token_code: token.token_code,
      scope,
      expires_at: token.expires_at,
      revoked: token.revoked,
      snapshot: filteredSnapshot,
      accessed_log: updatedLogs,
    };
  });

  app.post('/api/share-tokens/:code/revoke', async (req, reply) => {
    const { code } = req.params as { code: string };
    const token = await prisma.shareToken.findUnique({
      where: { token_code: code.toUpperCase() },
    });
    if (!token) {
      return reply.status(404).send({ error: 'Token tidak ditemukan.' });
    }
    await prisma.shareToken.update({
      where: { id: token.id },
      data: { revoked: true },
    });
    return { token_code: token.token_code, revoked: true };
  });

  // 10. Hapus Semua Data Saya (F1, F8, Kriteria Penerimaan #4)
  app.delete('/api/users/:userId/data', async (req) => {
    const { userId } = req.params as { userId: string };
    try {
      await prisma.consent.deleteMany({ where: { user_id: userId } });
      await prisma.assessment.deleteMany({ where: { user_id: userId } });
      await prisma.result.deleteMany({ where: { user_id: userId } });
      await prisma.reminder.deleteMany({ where: { user_id: userId } });
      await prisma.shareToken.deleteMany({ where: { user_id: userId } });
      await prisma.pairing.deleteMany({
        where: { OR: [{ user_a: userId }, { user_b: userId }] },
      });
      await prisma.questionTicket.deleteMany({ where: { anon_token: userId } });
      // Jangan hapus user seed demo agar tombol reset demo tetap berfungsi, tapi bersihkan untuk user reguler
      if (!['user-rendra-demo', 'user-sari-demo', 'user-drmaya-demo'].includes(userId)) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    } catch {
      // Abaikan bila user anonim belum pernah menyimpan apa pun di server
    }
    return { deleted: true, timestamp: new Date().toISOString() };
  });

  return app;
}

if (process.argv[1]?.endsWith('server/index.ts')) {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '0.0.0.0';
  buildServer().then((app) => {
    app.listen({ port, host }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`🛡️ Side by Side API berjalan di ${address}`);
    });
  });
}
