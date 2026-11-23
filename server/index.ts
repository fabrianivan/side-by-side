import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getLocalizedFacilities } from '../src/config/seed-facilities';
import { getLocalizedArticles, getLocalizedFaqs } from '../src/config/seed-articles';
import { ARTICLES_EN, FACILITIES_EN } from '../src/config/localization-en';
import {
  getLocalizedAssessmentConfig,
  getLocalizedSemenReference,
  getLocalizedTemplates,
} from '../src/config/schemas';
import {
  decryptAtRest,
  encryptAtRest,
  hashPassword,
  timingSafeStringMatch,
  verifyPassword,
} from './crypto-auth';
import { createAiProviderFromEnv, type ChatProvider } from './ai';
import { registerAiRoutes } from './ai-routes';

function loadLocalEnvFile(): void {
  if (process.env.VITEST) return;
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore unreadable .env
  }
}

loadLocalEnvFile();

export const prisma = new PrismaClient();

const SESSION_COOKIE_NAME = 'sbs_session';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_DEV_SESSION_SECRET = 'side-by-side-dev-secret-change-in-production-32chars';

const DEFAULT_PREP_CHECKLIST = [
  {
    id: 'prep-1',
    text: 'Sepakati jendela masa pantang (abstinensia 2–7 hari) sebelum jadwal analisis semen',
    textEn: 'Agree on the 2–7 day abstinence window before your semen analysis appointment',
    checked: false,
  },
  {
    id: 'prep-2',
    text: 'Siapkan kartu identitas & rujukan JKN/asuransi untuk kunjungan klinik',
    textEn: 'Prepare ID cards and insurance / JKN referral paperwork for the clinic visit',
    checked: false,
  },
  {
    id: 'prep-3',
    text: 'Susun daftar pertanyaan bersama untuk ditanyakan saat konsultasi dokter',
    textEn: 'Prepare a shared list of questions to bring to the doctor consultation',
    checked: false,
  },
  {
    id: 'prep-4',
    text: 'Jadwalkan waktu santai berdua setelah kunjungan klinik (zona bebas stres)',
    textEn: 'Schedule relaxing time together after the clinic visit (stress-free zone)',
    checked: false,
  },
];

const DEFAULT_PLAN_STEPS = [
  { step_key: 'cek_awal', step_order: 1, title: 'Cek Awal Mandiri' },
  { step_key: 'pilih_layanan', step_order: 2, title: 'Pilih Layanan Pemeriksaan' },
  { step_key: 'jadwalkan', step_order: 3, title: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)' },
  { step_key: 'periksa', step_order: 4, title: 'Kunjungan Pemeriksaan' },
  { step_key: 'pahami_hasil', step_order: 5, title: 'Pahami Hasil Bersama' },
  { step_key: 'tindak_lanjut', step_order: 6, title: 'Rencana Tindak Lanjut Dokter' },
];

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const SessionPayloadSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
  iat: z.number().optional(),
});

function generateSecureCode(prefix: string, length = 6, suffix = ''): string {
  let randomPart = '';
  for (let i = 0; i < length; i++) {
    randomPart += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return `${prefix}${randomPart}${suffix}`;
}

function shouldUseSecureCookie(req: FastifyRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return req.protocol === 'https';
}

function setSessionCookie(req: FastifyRequest, reply: FastifyReply, userId: string, role: string): void {
  const payload = JSON.stringify({ userId, role, iat: Date.now() });
  reply.setCookie(SESSION_COOKIE_NAME, payload, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: shouldUseSecureCookie(req),
  });
}

function getSessionFromRequest(req: FastifyRequest): { userId: string; role: string } | null {
  const raw = req.cookies?.[SESSION_COOKIE_NAME];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  try {
    const parsed = SessionPayloadSchema.safeParse(JSON.parse(unsigned.value));
    return parsed.success ? { userId: parsed.data.userId, role: parsed.data.role } : null;
  } catch {
    return null;
  }
}

function requireAnySession(req: FastifyRequest, reply: FastifyReply): { userId: string; role: string } | null {
  const session = getSessionFromRequest(req);
  if (!session) {
    reply.status(401).send({ error: 'Sesi tidak ditemukan atau tidak valid. Silakan mulai atau masuk terlebih dahulu.' });
    return null;
  }
  return session;
}

function requireUserSession(
  req: FastifyRequest,
  reply: FastifyReply,
  targetUserId: string,
): { userId: string; role: string } | null {
  const session = requireAnySession(req, reply);
  if (!session) return null;
  if (session.userId !== targetUserId) {
    reply.status(403).send({ error: 'Akses ditolak: Anda tidak memiliki izin untuk akun ini.' });
    return null;
  }
  return session;
}

function parseEncryptedJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  const decrypted = decryptAtRest(raw);
  if (!decrypted) return fallback;
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return fallback;
  }
}

/**
 * Menjaga waktu `datetime-local` (YYYY-MM-DDTHH:mm tanpa zona waktu) agar tidak bergeser
 * oleh offset zona waktu server saat bolak-balik sinkronisasi.
 */
function parseWallClockDate(raw: string): Date {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}Z`);
  }
  return new Date(trimmed);
}

function encodeReminderMeta(notes?: string, facilityName?: string): string | null {
  if (!notes && !facilityName) return null;
  return encryptAtRest(JSON.stringify({ ...(notes ? { notes } : {}), ...(facilityName ? { facilityName } : {}) }));
}

function decodeReminderMeta(raw: string | null | undefined): { notes?: string; facilityName?: string } {
  if (!raw) return {};
  const decrypted = decryptAtRest(raw);
  if (!decrypted) return {};
  try {
    const parsed = JSON.parse(decrypted) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
        facilityName: typeof parsed.facilityName === 'string' ? parsed.facilityName : undefined,
      };
    }
  } catch {
    // Fallback catatan plaintext lama sebelum enkripsi metadata pengingat
  }
  return { notes: decrypted };
}

async function buildPartnerSharedPreview(
  db: PrismaClient,
  pairing: { user_a: string; shared_items_json: string },
) {
  let shared: Record<string, unknown> = {};
  try {
    shared = JSON.parse(pairing.shared_items_json || '{}') as Record<string, unknown>;
  } catch {
    return undefined;
  }

  const wantsAnswers = Boolean(shared.shareAssessmentAnswers);
  const wantsLevel = Boolean(shared.shareAssessmentLevel);
  const wantsLabs = Boolean(shared.shareLabSummary);
  if (!wantsAnswers && !wantsLevel && !wantsLabs) {
    return undefined;
  }

  const preview: {
    assessmentLevel?: string;
    answeredTopicsCount?: number;
    labCount?: number;
  } = {};

  if (wantsAnswers || wantsLevel) {
    const latestAssessment = await db.assessment.findFirst({
      where: { user_id: pairing.user_a },
      orderBy: { created_at: 'desc' },
    });
    if (latestAssessment) {
      if (wantsLevel) {
        preview.assessmentLevel = latestAssessment.level;
      }
      if (wantsAnswers) {
        const parsedAnswers = parseEncryptedJson<Record<string, unknown>>(
          latestAssessment.answers_json_encrypted,
          {},
        );
        preview.answeredTopicsCount = Object.keys(parsedAnswers).length;
      }
    }
  }

  if (wantsLabs) {
    preview.labCount = await db.result.count({ where: { user_id: pairing.user_a } });
  }

  return preview;
}

function formatPairingResponse(
  pairing: {
    id: string;
    invite_code: string;
    user_a: string;
    user_b: string | null;
    partner_a_alias: string;
    partner_b_alias: string;
    status: string;
    shared_items_json: string;
    prep_checklist_json: string;
    expires_at: Date;
    created_at: Date;
    revoked_at: Date | null;
    plan_steps: Array<{
      id: string;
      pairing_id: string;
      step_key: string;
      step_order: number;
      title: string;
      status_a: string;
      status_b: string;
      due_date: Date | null;
      updated_at: Date;
    }>;
  },
  partnerPreview?: Awaited<ReturnType<typeof buildPartnerSharedPreview>>,
) {
  let sharedItems: Record<string, unknown> = {};
  try {
    sharedItems = JSON.parse(pairing.shared_items_json || '{}') as Record<string, unknown>;
  } catch {
    sharedItems = {};
  }

  let prepChecklist = DEFAULT_PREP_CHECKLIST;
  try {
    const parsedPrep = JSON.parse(pairing.prep_checklist_json || '[]');
    if (Array.isArray(parsedPrep) && parsedPrep.length > 0) {
      prepChecklist = parsedPrep;
    }
  } catch {
    prepChecklist = DEFAULT_PREP_CHECKLIST;
  }

  return {
    ...pairing,
    shared_items: sharedItems,
    prep_checklist: prepChecklist,
    ...(partnerPreview ? { partner_shared_preview: partnerPreview } : {}),
  };
}

/** Menyaring snapshot QR sesuai cakupan persetujuan pasien (dipakai tampilan Nakes & ringkasan AI). */
export function filterSnapshotByScope(scope: string[], fullSnapshot: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {
    patientAlias: fullSnapshot.patientAlias || 'Pasien Anonim',
  };
  if (scope.includes('history')) {
    filtered.programDuration = fullSnapshot.programDuration;
    filtered.assessmentLevel = fullSnapshot.assessmentLevel;
  }
  if (scope.includes('risk_factors')) {
    filtered.reportedRiskFactors = fullSnapshot.reportedRiskFactors;
    filtered.riskExplanation = fullSnapshot.riskExplanation;
  }
  if (scope.includes('care_pathway')) {
    filtered.referral = fullSnapshot.referral;
  }
  if (scope.includes('progress')) {
    filtered.progressSummary = fullSnapshot.progressSummary;
  }
  if (scope.includes('lab_results')) {
    filtered.labResults = fullSnapshot.labResults;
  }
  return filtered;
}

export interface BuildServerOptions {
  /** Penyedia AI; `undefined` = dari variabel lingkungan, `null` = AI nonaktif. */
  ai?: ChatProvider | null;
}

export async function buildServer(db: PrismaClient = prisma, options: BuildServerOptions = {}) {
  const aiProvider = options.ai !== undefined ? options.ai : createAiProviderFromEnv();
  const sessionSecret = process.env.SESSION_SECRET || DEFAULT_DEV_SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !process.env.VITEST) {
    if (sessionSecret === DEFAULT_DEV_SESSION_SECRET || !process.env.ENCRYPTION_KEY) {
      console.warn(
        '⚠️ Security notice: Configure custom SESSION_SECRET and ENCRYPTION_KEY in production environment.',
      );
    }
  }

  // KEAMANAN & ETIKA: Logger TIDAK boleh mencatat body request atau isi data kesehatan
  const app = Fastify({
    bodyLimit: 2 * 1024 * 1024,
    logger: process.env.VITEST
      ? false
      : {
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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  });

  const configuredOrigin = process.env.CORS_ORIGIN;
  await app.register(cors, {
    origin: configuredOrigin
      ? configuredOrigin.split(',').map((o) => o.trim())
      : process.env.NODE_ENV === 'production'
      ? false
      : true,
    credentials: true,
  });

  await app.register(cookie, {
    secret: sessionSecret,
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // 1. Health & Readiness Check
  app.get('/api/health', async (_req, reply) => {
    try {
      await db.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'connected',
        app: 'Side by Side API',
        privacy: 'aes-256-gcm-at-rest-zero-payload-logging',
      };
    } catch {
      return reply.status(503).send({ status: 'error', db: 'disconnected' });
    }
  });

  // 2. Konfigurasi Klinis & Templat (mendukung ?locale=en|id)
  app.get('/api/config', async (req) => {
    const locale = (req.query as Record<string, string>)?.locale === 'en' ? 'en' : 'id';
    return {
      assessmentRules: getLocalizedAssessmentConfig(locale),
      semenReference: getLocalizedSemenReference(locale),
      templates: getLocalizedTemplates(locale),
      faqs: getLocalizedFaqs(locale),
    };
  });

  // 3. Direktori Layanan Pemeriksaan (DB-backed dengan dukungan lokal ID/EN & filter query)
  app.get('/api/facilities', async (req) => {
    const query = (req.query as Record<string, string>) || {};
    const locale = query.locale === 'en' ? 'en' : 'id';
    const cityFilter = query.city && query.city !== 'Semua' ? query.city : undefined;
    const jknOnly = query.jkn === 'true';
    const serviceFilter = query.service && query.service !== 'Semua' ? query.service : undefined;
    const searchQ = query.q?.trim().toLowerCase() || '';

    let items: Array<{
      id: string;
      name: string;
      type: string;
      displayType: string;
      city: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      services: string[];
      price_min: number;
      price_max: number;
      accepts_jkn: boolean;
      hours: string;
      map_url: string;
      friendliness_score: number;
      friendliness_notes: string;
    }> = [];

    try {
      const rows = await db.facility.findMany({
        orderBy: { friendliness_score: 'desc' },
      });
      if (rows.length > 0) {
        items = rows.map((r) => {
          const en = locale === 'en' ? FACILITIES_EN[r.id] : undefined;
          return {
            id: r.id,
            name: r.name,
            type: r.type,
            displayType: en ? en.typeLabel : r.type,
            city: r.city,
            address: r.address,
            latitude: r.latitude,
            longitude: r.longitude,
            services: JSON.parse(r.services_json) as string[],
            price_min: r.price_min,
            price_max: r.price_max,
            accepts_jkn: r.accepts_jkn,
            hours: en ? en.hours : r.hours,
            map_url: r.map_url,
            friendliness_score: r.friendliness_score,
            friendliness_notes: en ? en.friendliness_notes : r.friendliness_notes,
          };
        });
      }
    } catch {
      // Fallback only if table empty/unavailable
    }

    if (items.length === 0) {
      items = getLocalizedFacilities(locale);
    }

    return items.filter((f) => {
      if (cityFilter && f.city !== cityFilter) return false;
      if (jknOnly && !f.accepts_jkn) return false;
      if (serviceFilter && !f.services.includes(serviceFilter)) return false;
      if (
        searchQ &&
        !f.name.toLowerCase().includes(searchQ) &&
        !f.address.toLowerCase().includes(searchQ) &&
        !f.city.toLowerCase().includes(searchQ) &&
        !f.friendliness_notes.toLowerCase().includes(searchQ)
      ) {
        return false;
      }
      return true;
    });
  });

  // 4. Pustaka Artikel Edukasi & FAQ (DB-backed dengan dukungan lokal ID/EN)
  app.get('/api/articles', async (req) => {
    const query = (req.query as Record<string, string>) || {};
    const locale = query.locale === 'en' ? 'en' : 'id';
    const categoryFilter = query.category && query.category !== 'Semua' ? query.category : undefined;
    const searchQ = query.q?.trim().toLowerCase() || '';

    let items: Array<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      body_md: string;
      category: string;
      read_minutes: number;
      reviewer: string;
      updated_at: string | Date;
    }> = [];

    try {
      const rows = await db.article.findMany({
        orderBy: { id: 'asc' },
      });
      if (rows.length > 0) {
        items = rows.map((r) => {
          const en = locale === 'en' ? ARTICLES_EN[r.id] : undefined;
          return {
            id: r.id,
            slug: r.slug,
            title: en ? en.title : r.title,
            summary: en ? en.summary : r.summary,
            body_md: en ? en.body_md : r.body_md,
            category: r.category,
            read_minutes: r.read_minutes,
            reviewer: en ? en.reviewer : r.reviewer,
            updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString().slice(0, 10) : r.updated_at,
          };
        });
      }
    } catch {
      // Fallback only if DB table empty
    }

    if (items.length === 0) {
      items = getLocalizedArticles(locale);
    }

    return items.filter((art) => {
      if (categoryFilter && art.category !== categoryFilter) return false;
      if (
        searchQ &&
        !art.title.toLowerCase().includes(searchQ) &&
        !art.summary.toLowerCase().includes(searchQ) &&
        !art.body_md.toLowerCase().includes(searchQ)
      ) {
        return false;
      }
      return true;
    });
  });

  // 5. Autentikasi Nyata (Email + Password, Sesi Cookie HttpOnly, & Kode Undangan Nakes)
  const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['user', 'nakes']).optional().default('user'),
    displayName: z.string().max(80).optional(),
    inviteCode: z.string().max(120).optional(),
  });

  const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.get('/api/auth/session', async (req) => {
    const session = getSessionFromRequest(req);
    return {
      authenticated: Boolean(session),
      userId: session?.userId ?? null,
      role: session?.role ?? null,
    };
  });

  app.post('/api/auth/anonymous', async (req, reply) => {
    const schema = z.object({
      userId: z.string().regex(/^anon-[a-zA-Z0-9_-]{3,40}$/).optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Format ID anonim tidak valid.' });
    }
    const anonId = parsed.data.userId || `anon-${crypto.randomBytes(8).toString('hex')}`;
    await db.user.upsert({
      where: { id: anonId },
      update: {},
      create: {
        id: anonId,
        anon_token: anonId,
        role: 'user',
      },
    });
    setSessionCookie(req, reply, anonId, 'user');
    return { authenticated: true, userId: anonId, role: 'user' };
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { loggedOut: true };
  });

  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Format email atau kata sandi tidak valid (minimal 8 karakter).',
      });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const { password, role, displayName, inviteCode } = parsed.data;

    if (role === 'nakes') {
      const expectedCode = process.env.NAKES_INVITE_CODE?.trim();
      if (!expectedCode || !inviteCode || !timingSafeStringMatch(inviteCode.trim(), expectedCode)) {
        return reply.status(403).send({
          error: 'Kode akses klinik tidak valid. Pendaftaran Tenaga Kesehatan memerlukan kode undangan resmi.',
        });
      }
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email sudah terdaftar. Silakan masuk.' });
    }

    const password_hash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        password_hash,
        role,
        display_name: displayName?.trim() || email.split('@')[0],
      },
    });

    for (const key of ['store_results', 'share_partner', 'share_nakes', 'ai_assist']) {
      await db.consent.create({
        data: { user_id: user.id, key, granted: false },
      });
    }

    setSessionCookie(req, reply, user.id, user.role);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      locale: user.locale,
    };
  });

  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Masukkan email dan kata sandi yang valid.' });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return reply.status(401).send({ error: 'Email atau kata sandi tidak sesuai.' });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Email atau kata sandi tidak sesuai.' });
    }
    setSessionCookie(req, reply, user.id, user.role);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      locale: user.locale,
    };
  });

  app.get('/api/auth/profile/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    if (!requireUserSession(req, reply, userId)) return;

    const user = await db.user.findUnique({
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
    if (!requireUserSession(req, reply, userId)) return;

    const schema = z.object({
      displayName: z.string().min(2).max(80).optional(),
      locale: z.enum(['id', 'en']).optional(),
      currentPassword: z.string().min(1).optional(),
      newPassword: z.string().min(8).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Nama minimal 2 karakter, atau kata sandi baru minimal 8 karakter.',
      });
    }
    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return reply.status(404).send({ error: 'Pengguna tidak ditemukan.' });
    }

    const updateData: { display_name?: string; locale?: string; password_hash?: string } = {};
    if (parsed.data.displayName) {
      updateData.display_name = parsed.data.displayName.trim();
    }
    if (parsed.data.locale) {
      updateData.locale = parsed.data.locale;
    }
    if (parsed.data.newPassword) {
      if (existing.password_hash) {
        if (!parsed.data.currentPassword) {
          return reply.status(400).send({
            error: 'Masukkan kata sandi saat ini untuk mengganti kata sandi.',
          });
        }
        const currentValid = await verifyPassword(parsed.data.currentPassword, existing.password_hash);
        if (!currentValid) {
          return reply.status(401).send({
            error: 'Kata sandi saat ini tidak sesuai.',
          });
        }
      }
      updateData.password_hash = await hashPassword(parsed.data.newPassword);
    }

    const user = await db.user.update({
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

  // Muat seluruh state akun terautentikasi dari database secara terisolasi per akun
  app.get('/api/account/data', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        locale: true,
      },
    });
    if (!user) {
      return reply.status(404).send({ error: 'Akun tidak ditemukan.' });
    }

    const [
      consentRows,
      latestAssessment,
      resultRows,
      reminderRows,
      activePairing,
      activeShareToken,
      ticketRows,
      cycleTrackerRow,
      doctorChecklistRow,
      journalRow,
    ] = await Promise.all([
      db.consent.findMany({ where: { user_id: user.id } }),
      db.assessment.findFirst({ where: { user_id: user.id }, orderBy: { created_at: 'desc' } }),
      db.result.findMany({ where: { user_id: user.id }, orderBy: { test_date: 'asc' } }),
      db.reminder.findMany({ where: { user_id: user.id }, orderBy: { remind_at: 'asc' } }),
      db.pairing.findFirst({
        where: {
          OR: [{ user_a: user.id }, { user_b: user.id }],
          status: { not: 'revoked' },
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
        include: { plan_steps: { orderBy: { step_order: 'asc' } } },
      }),
      db.shareToken.findFirst({
        where: {
          user_id: user.id,
          revoked: false,
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      }),
      user.role === 'nakes'
        ? db.questionTicket.findMany({ orderBy: { created_at: 'desc' }, take: 50 })
        : db.questionTicket.findMany({
            where: { anon_token: user.id },
            orderBy: { created_at: 'desc' },
            take: 30,
          }),
      db.cycleTracker.findUnique({ where: { user_id: user.id } }),
      db.doctorChecklistState.findUnique({ where: { user_id: user.id } }),
      db.healthJournal.findUnique({ where: { user_id: user.id } }),
    ]);

    const consentsMap: Record<string, boolean> = {
      store_results: false,
      share_partner: false,
      share_nakes: false,
      ai_assist: false,
    };
    for (const c of consentRows) {
      consentsMap[c.key] = c.granted;
    }

    const assessmentAnswers = latestAssessment
      ? parseEncryptedJson<Record<string, unknown> | null>(latestAssessment.answers_json_encrypted, null)
      : null;

    const labResults = resultRows.map((row) => {
      const parsed = parseEncryptedJson<Record<string, unknown>>(row.values_json_encrypted, {});
      return {
        id: (typeof parsed.id === 'string' && parsed.id) || row.id,
        testDate:
          (typeof parsed.testDate === 'string' && parsed.testDate) || row.test_date.toISOString().slice(0, 10),
        volume_ml: Number(parsed.volume_ml ?? 0),
        concentration_m_per_ml: Number(parsed.concentration_m_per_ml ?? 0),
        total_motility_pct: Number(parsed.total_motility_pct ?? 0),
        progressive_motility_pct: Number(parsed.progressive_motility_pct ?? 0),
        morphology_normal_pct: Number(parsed.morphology_normal_pct ?? 0),
        notes: (typeof parsed.notes === 'string' ? parsed.notes : row.notes) ?? undefined,
        attachmentName:
          (typeof parsed.attachmentName === 'string' ? parsed.attachmentName : row.attachment_name) ?? undefined,
        createdAt:
          (typeof parsed.createdAt === 'string' && parsed.createdAt) || row.created_at.toISOString(),
      };
    });

    const reminders = reminderRows.map((rem) => {
      const meta = decodeReminderMeta(rem.notes);
      return {
        id: rem.id,
        type: rem.type,
        title: rem.title,
        ...(meta.facilityName ? { facilityName: meta.facilityName } : {}),
        ...(meta.notes ? { notes: meta.notes } : {}),
        remindAt: rem.remind_at.toISOString().slice(0, 16),
        completed: rem.completed,
      };
    });

    let formattedPairing: Record<string, unknown> | null = null;
    if (activePairing) {
      const partnerPreview =
        activePairing.user_b === user.id ? await buildPartnerSharedPreview(db, activePairing) : undefined;
      formattedPairing = formatPairingResponse(activePairing, partnerPreview);
    }

    let formattedShareToken: Record<string, unknown> | null = null;
    if (activeShareToken) {
      formattedShareToken = {
        token_code: activeShareToken.token_code,
        scope: JSON.parse(activeShareToken.scope_json || '[]'),
        expires_at: activeShareToken.expires_at,
        revoked: activeShareToken.revoked,
        accessed_log: JSON.parse(activeShareToken.accessed_log_json || '[]'),
        care_plan_written_at: activeShareToken.care_plan_at ? activeShareToken.care_plan_at.toISOString() : null,
        snapshot: parseEncryptedJson<Record<string, unknown>>(activeShareToken.snapshot_json, {}),
      };
    }

    const cycleTracker = cycleTrackerRow
      ? {
          cycleStartDate: cycleTrackerRow.cycle_start_date,
          habitLog: parseEncryptedJson<Record<string, string[]>>(
            cycleTrackerRow.habit_log_json_encrypted,
            {},
          ),
        }
      : null;

    let doctorChecklist: Record<string, unknown> | null = null;
    if (doctorChecklistRow) {
      try {
        doctorChecklist = {
          context: JSON.parse(doctorChecklistRow.context_json || '{}'),
          selected: JSON.parse(doctorChecklistRow.selected_json || '{}'),
          customQuestions: parseEncryptedJson<Array<{ id: string; text: string }>>(
            doctorChecklistRow.custom_questions_json,
            [],
          ),
        };
      } catch {
        doctorChecklist = null;
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        locale: user.locale,
      },
      consents: consentsMap,
      assessmentAnswers,
      results: labResults,
      reminders,
      pairing: formattedPairing,
      shareToken: formattedShareToken,
      tickets: ticketRows,
      cycleTracker,
      doctorChecklist,
      journal: journalRow
        ? parseEncryptedJson<Record<string, unknown> | null>(journalRow.journal_json_encrypted, null)
        : null,
    };
  });

  // Sinkronisasi Data Antar Perangkat untuk Mode Akun (terenkripsi AES-256-GCM at rest)
  const SyncResultItemSchema = z
    .object({
      id: z.string().optional(),
      testDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid testDate'),
      volume_ml: z.number().nonnegative().max(30).optional(),
      concentration_m_per_ml: z.number().nonnegative().max(1000).optional(),
      total_motility_pct: z.number().min(0).max(100).optional(),
      progressive_motility_pct: z.number().min(0).max(100).optional(),
      morphology_normal_pct: z.number().min(0).max(100).optional(),
      notes: z.string().max(1000).optional(),
      attachmentName: z.string().max(255).optional(),
    })
    .passthrough();

  const SyncReminderItemSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['initial_checkup', 'semen_analysis', 'follow_up', 'lifestyle']),
    title: z.string().min(1).max(200),
    facilityName: z.string().max(200).optional(),
    remindAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid remindAt'),
    notes: z.string().max(1000).optional(),
    completed: z.boolean().optional().default(false),
  });

  const SyncAssessmentSchema = z.object({
    answers: z.record(z.string(), z.unknown()),
    level: z.string().max(64),
    summaryFactors: z.array(z.unknown()).optional(),
  });

  const SyncCycleTrackerSchema = z.object({
    cycleStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    habitLog: z.record(z.string(), z.array(z.string().max(64)).max(20)),
  });

  const SyncDoctorChecklistSchema = z.object({
    context: z.record(z.string(), z.boolean()),
    selected: z.record(z.string(), z.boolean()),
    customQuestions: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          text: z.string().min(3).max(500),
        }),
      )
      .max(30),
  });

  // Jurnal kesehatan privat (riwayat Cek Awal, check-in berkala, Jalur Perawatan) — divalidasi ketat & dibatasi ukurannya.
  const IsoDateString = z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
  const DayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const SpecialistKeySchema = z.enum(['gp', 'andrology', 'urology', 'lab', 'fertility_clinic', 'counselling']);
  const OrderedTestSchema = z.enum([
    'repeat_semen_analysis',
    'hormone_panel',
    'scrotal_ultrasound',
    'infection_screening',
    'genetic_testing',
    'partner_evaluation',
  ]);
  const LifestyleFocusSchema = z.enum(['smoking', 'alcohol', 'heat', 'activity', 'weight', 'sleep_stress']);
  const InfluenceSchema = z.enum(['none', 'low', 'moderate', 'high']);

  const SyncJournalSchema = z.object({
    assessmentHistory: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          takenAt: IsoDateString,
          levelCode: z.enum(['routine', 'within_1_2_months', 'immediate']),
          answers: z.record(z.string().max(64), z.string().max(64)),
          domainInfluence: z.object({ medical: InfluenceSchema, timing: InfluenceSchema, lifestyle: InfluenceSchema }),
        }),
      )
      .max(60),
    checkIns: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          date: DayString,
          sleepHours: z.number().min(0).max(14).optional(),
          stressLevel: z.number().int().min(1).max(5).optional(),
          activeDays: z.number().int().min(0).max(7).optional(),
          cigarettesPerDay: z.number().min(0).max(100).optional(),
          alcoholDrinksPerWeek: z.number().min(0).max(100).optional(),
          weightKg: z.number().min(20).max(300).optional(),
          heatExposure: z.enum(['none', 'some', 'frequent']).optional(),
          discomfort: z.enum(['none', 'mild', 'significant']).optional(),
          sexualWellbeing: z.enum(['good', 'some_concerns', 'significant_concerns']).optional(),
          note: z.string().max(500).optional(),
          createdAt: IsoDateString,
        }),
      )
      .max(400),
    carePathway: z.object({
      specialistKey: SpecialistKeySchema.optional(),
      route: z.enum(['jkn', 'private']).optional(),
      facility: z
        .object({
          id: z.string().max(64),
          name: z.string().max(200),
          city: z.string().max(80).optional(),
          type: z.string().max(40).optional(),
          acceptsJkn: z.boolean().optional(),
        })
        .optional(),
      appointmentAt: z.string().max(40).optional(),
      prepDone: z.record(z.string().max(40), z.boolean()),
      consultations: z
        .array(
          z.object({
            id: z.string().min(1).max(80),
            date: DayString,
            clinicianType: SpecialistKeySchema,
            facilityName: z.string().max(200).optional(),
            clinicianName: z.string().max(80).optional(),
            outcomes: z.array(z.string().max(40)).max(12),
            orderedTests: z.array(OrderedTestSchema).max(10).optional(),
            lifestyleFocus: z.array(LifestyleFocusSchema).max(6).optional(),
            referralTo: SpecialistKeySchema.optional(),
            advice: z.string().max(1500).optional(),
            nextVisitDate: DayString.optional(),
            source: z.enum(['self', 'clinician']),
          }),
        )
        .max(50),
      carePlan: z
        .array(
          z.object({
            id: z.string().min(1).max(80),
            key: z.string().max(40).optional(),
            focus: z.array(LifestyleFocusSchema).max(6).optional(),
            specialist: SpecialistKeySchema.optional(),
            title: z.string().max(200).optional(),
            dueDate: DayString.optional(),
            done: z.boolean(),
            doneAt: IsoDateString.optional(),
            source: z.enum(['suggested', 'clinician', 'self']),
          }),
        )
        .max(100),
      importedPlanIds: z.array(z.string().max(120)).max(100),
    }),
    updatedAt: IsoDateString,
  });

  app.post('/api/sync', async (req, reply) => {
    const schema = z.object({
      userId: z.string().min(1),
      results: z.array(SyncResultItemSchema).max(200).optional(),
      reminders: z.array(SyncReminderItemSchema).max(200).optional(),
      assessment: SyncAssessmentSchema.optional(),
      cycleTracker: SyncCycleTrackerSchema.optional(),
      doctorChecklist: SyncDoctorChecklistSchema.optional(),
      journal: z.unknown().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Payload sinkronisasi tidak valid.' });
    }
    const { userId, results, reminders, assessment, cycleTracker, doctorChecklist } = parsed.data;
    // Jurnal divalidasi terpisah: bila tidak valid, data lain tetap tersinkron dan jurnal dilewati.
    const journalParsed = parsed.data.journal !== undefined ? SyncJournalSchema.safeParse(parsed.data.journal) : null;
    const journal = journalParsed?.success ? journalParsed.data : undefined;
    if (!requireUserSession(req, reply, userId)) return;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: 'Akun tidak ditemukan di server.' });
    }

    const dedupedResults = new Map<string, z.infer<typeof SyncResultItemSchema>>();
    for (const item of results || []) {
      const key = item.id || `${item.testDate}:${item.concentration_m_per_ml ?? ''}:${item.volume_ml ?? ''}`;
      dedupedResults.set(key, item);
    }

    const dedupedReminders = new Map<string, z.infer<typeof SyncReminderItemSchema>>();
    for (const item of reminders || []) {
      const key = item.id || `${item.type}:${item.title}:${item.remindAt}`;
      dedupedReminders.set(key, item);
    }

    await db.$transaction(async (tx) => {
      if (assessment !== undefined) {
        await tx.assessment.deleteMany({ where: { user_id: userId } });
        await tx.assessment.create({
          data: {
            user_id: userId,
            answers_json_encrypted: encryptAtRest(JSON.stringify(assessment.answers)),
            level: assessment.level,
            summary_factors_json: encryptAtRest(JSON.stringify(assessment.summaryFactors || [])),
          },
        });
      }

      if (results !== undefined) {
        await tx.result.deleteMany({ where: { user_id: userId } });
        if (dedupedResults.size > 0) {
          await tx.result.createMany({
            data: Array.from(dedupedResults.values()).map((resItem) => ({
              user_id: userId,
              test_date: new Date(resItem.testDate),
              values_json_encrypted: encryptAtRest(JSON.stringify(resItem)),
              // Catatan & nama lampiran sudah berada di dalam values_json_encrypted (AES-256-GCM) agar tidak ada duplikasi plaintext di DB.
              notes: null,
              attachment_name: null,
            })),
          });
        }
      }

      if (reminders !== undefined) {
        await tx.reminder.deleteMany({ where: { user_id: userId } });
        if (dedupedReminders.size > 0) {
          await tx.reminder.createMany({
            data: Array.from(dedupedReminders.values()).map((remItem) => ({
              user_id: userId,
              type: remItem.type,
              title: remItem.title,
              notes: encodeReminderMeta(remItem.notes, remItem.facilityName),
              remind_at: parseWallClockDate(remItem.remindAt),
              completed: remItem.completed ?? false,
            })),
          });
        }
      }

      if (cycleTracker !== undefined) {
        await tx.cycleTracker.upsert({
          where: { user_id: userId },
          update: {
            cycle_start_date: cycleTracker.cycleStartDate,
            habit_log_json_encrypted: encryptAtRest(JSON.stringify(cycleTracker.habitLog)),
          },
          create: {
            user_id: userId,
            cycle_start_date: cycleTracker.cycleStartDate,
            habit_log_json_encrypted: encryptAtRest(JSON.stringify(cycleTracker.habitLog)),
          },
        });
      }

      if (doctorChecklist !== undefined) {
        const encryptedQuestions = encryptAtRest(JSON.stringify(doctorChecklist.customQuestions));
        await tx.doctorChecklistState.upsert({
          where: { user_id: userId },
          update: {
            context_json: JSON.stringify(doctorChecklist.context),
            selected_json: JSON.stringify(doctorChecklist.selected),
            custom_questions_json: encryptedQuestions,
          },
          create: {
            user_id: userId,
            context_json: JSON.stringify(doctorChecklist.context),
            selected_json: JSON.stringify(doctorChecklist.selected),
            custom_questions_json: encryptedQuestions,
          },
        });
      }

      if (journal !== undefined) {
        const encryptedJournal = encryptAtRest(JSON.stringify(journal));
        await tx.healthJournal.upsert({
          where: { user_id: userId },
          update: { journal_json_encrypted: encryptedJournal },
          create: { user_id: userId, journal_json_encrypted: encryptedJournal },
        });
      }
    });

    return {
      synced: true,
      syncedAt: new Date().toISOString(),
      itemCount: dedupedResults.size + dedupedReminders.size,
      resultCount: dedupedResults.size,
      reminderCount: dedupedReminders.size,
      journalSynced: journalParsed ? journalParsed.success : null,
    };
  });

  // 6. Persetujuan Granular (F1 & F8)
  app.get('/api/consents/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    if (!requireUserSession(req, reply, userId)) return;

    const rows = await db.consent.findMany({ where: { user_id: userId } });
    const map: Record<string, boolean> = {
      store_results: false,
      share_partner: false,
      share_nakes: false,
      ai_assist: false,
    };
    for (const r of rows) {
      map[r.key] = r.granted;
    }
    return map;
  });

  app.put('/api/consents/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    if (!requireUserSession(req, reply, userId)) return;

    const schema = z.object({
      key: z.enum(['store_results', 'share_partner', 'share_nakes', 'ai_assist']),
      granted: z.boolean(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parameter persetujuan tidak valid.' });
    }
    const { key, granted } = parsed.data;
    const userExists = await db.user.findUnique({ where: { id: userId } });
    if (userExists) {
      await db.consent.upsert({
        where: { user_id_key: { user_id: userId, key } },
        update: { granted },
        create: { user_id: userId, key, granted },
      });
    }
    return { key, granted, updated_at: new Date().toISOString() };
  });

  // 7. Mode Berdua / Pairing & Rencana Kita (Strict Session & Participant Authorization)
  app.get('/api/pairings/:code', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const pairing = await db.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
      include: {
        plan_steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Kode pasangan tidak ditemukan atau telah dicabut.' });
    }
    if (new Date(pairing.expires_at).getTime() <= Date.now()) {
      return reply.status(410).send({ error: 'Kode pasangan telah kedaluwarsa.' });
    }
    if (session.userId !== pairing.user_a && session.userId !== pairing.user_b) {
      return reply.status(403).send({
        error: 'Akses ditolak. Gunakan tautan Gabung terlebih dahulu untuk mengakses rencana pasangan ini.',
      });
    }

    const partnerPreview =
      session.userId === pairing.user_b ? await buildPartnerSharedPreview(db, pairing) : undefined;
    return formatPairingResponse(pairing, partnerPreview);
  });

  app.post(
    '/api/pairings/:code/join',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const schema = z.object({
      partnerBAlias: z.string().min(1).max(40).optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Data tautan pasangan tidak valid.' });
    }

    const pairing = await db.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Kode pasangan tidak ditemukan atau telah dicabut.' });
    }
    if (new Date(pairing.expires_at).getTime() <= Date.now()) {
      return reply.status(410).send({ error: 'Kode pasangan telah kedaluwarsa.' });
    }

    const joinerId = session.userId;
    if (pairing.user_b && pairing.user_b !== joinerId && joinerId !== pairing.user_a) {
      return reply.status(409).send({
        error: 'Kode pasangan ini sudah terhubung dengan akun pasangan lain.',
      });
    }

    let updated = pairing;
    if (joinerId !== pairing.user_a && (!pairing.user_b || pairing.user_b === joinerId)) {
      const joinerExists = await db.user.findUnique({ where: { id: joinerId } });
      if (!joinerExists) {
        await db.user.create({
          data: { id: joinerId, anon_token: joinerId, role: 'user' },
        });
      }
      updated = await db.pairing.update({
        where: { id: pairing.id },
        data: {
          user_b: joinerId,
          status: 'active',
          ...(parsed.data.partnerBAlias ? { partner_b_alias: parsed.data.partnerBAlias } : {}),
        },
        include: { plan_steps: { orderBy: { step_order: 'asc' } } },
      });
    }

    const partnerPreview =
      joinerId === updated.user_b ? await buildPartnerSharedPreview(db, updated) : undefined;
    return formatPairingResponse(updated, partnerPreview);
  });

  app.post('/api/pairings', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const schema = z.object({
      partnerAAlias: z.string().max(40).default('Pasangan A'),
      partnerBAlias: z.string().max(40).default('Pasangan B'),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Data pasangan tidak valid.' });
    }
    const body = parsed.data;
    const ownerId = session.userId;

    const userExists = await db.user.findUnique({ where: { id: ownerId } });
    if (!userExists) {
      await db.user.create({
        data: {
          id: ownerId,
          anon_token: ownerId,
          role: 'user',
        },
      });
    }

    await db.pairing.updateMany({
      where: { user_a: ownerId, status: 'active' },
      data: { status: 'revoked', revoked_at: new Date() },
    });

    const inviteCode = generateSecureCode('', 6, '');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const pairing = await db.pairing.create({
      data: {
        invite_code: inviteCode,
        user_a: ownerId,
        partner_a_alias: body.partnerAAlias,
        partner_b_alias: body.partnerBAlias,
        status: 'active',
        expires_at: expiresAt,
        shared_items_json: JSON.stringify({
          shareAssessmentAnswers: false,
          shareAssessmentLevel: false,
          shareLabSummary: false,
          noteFromA: 'Aku mau kita cek bareng, bukan karena ada yang salah, tapi biar kita tahu langkah terbaik.',
          noteFromB: '',
        }),
        prep_checklist_json: JSON.stringify(DEFAULT_PREP_CHECKLIST),
      },
    });

    for (const s of DEFAULT_PLAN_STEPS) {
      await db.planStep.create({
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

    const created = await db.pairing.findUnique({
      where: { id: pairing.id },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    if (!created) {
      return reply.status(500).send({ error: 'Gagal memuat data tautan pasangan.' });
    }
    return formatPairingResponse(created);
  });

  app.put('/api/pairings/:code/step', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

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
    const pairing = await db.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Tautan pasangan tidak aktif atau telah dicabut.' });
    }
    if (new Date(pairing.expires_at).getTime() <= Date.now()) {
      return reply.status(410).send({ error: 'Tautan pasangan telah kedaluwarsa.' });
    }

    const isOwnerA = session.userId === pairing.user_a;
    const isOwnerB = session.userId === pairing.user_b;
    if (!isOwnerA && !isOwnerB) {
      return reply.status(403).send({ error: 'Tidak memiliki izin memperbarui rencana pasangan ini.' });
    }
    if (parsed.data.actor === 'a' && !isOwnerA) {
      return reply.status(403).send({ error: 'Hanya Pasangan A yang dapat mengubah statusnya sendiri.' });
    }
    if (parsed.data.actor === 'b' && pairing.user_b && !isOwnerB) {
      return reply.status(403).send({ error: 'Hanya Pasangan B yang dapat mengubah statusnya sendiri.' });
    }

    const updateData =
      parsed.data.actor === 'a'
        ? { status_a: parsed.data.status }
        : { status_b: parsed.data.status };

    const updatedStep = await db.planStep.update({
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

  const SharedItemsPatchSchema = z
    .object({
      shareAssessmentAnswers: z.boolean().optional(),
      shareAssessmentLevel: z.boolean().optional(),
      shareLabSummary: z.boolean().optional(),
      noteFromA: z.string().max(1000).optional(),
      noteFromB: z.string().max(1000).optional(),
    })
    .strict();

  app.put('/api/pairings/:code/shared', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const parsed = SharedItemsPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Format pembaruan privasi pasangan tidak valid.' });
    }
    const pairing = await db.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Tautan pasangan tidak ditemukan.' });
    }
    if (new Date(pairing.expires_at).getTime() <= Date.now()) {
      return reply.status(410).send({ error: 'Tautan pasangan telah kedaluwarsa.' });
    }

    const isOwnerA = session.userId === pairing.user_a;
    const isOwnerB = session.userId === pairing.user_b;
    if (!isOwnerA && !isOwnerB) {
      return reply.status(403).send({ error: 'Tidak memiliki izin memperbarui privasi pasangan ini.' });
    }

    const touchesOwnerAFields =
      parsed.data.shareAssessmentAnswers !== undefined ||
      parsed.data.shareAssessmentLevel !== undefined ||
      parsed.data.shareLabSummary !== undefined ||
      parsed.data.noteFromA !== undefined;
    if (touchesOwnerAFields && !isOwnerA) {
      return reply.status(403).send({
        error: 'Hanya pemilik data (Pasangan A) yang dapat mengubah izin berbagi data pribadinya.',
      });
    }

    if (parsed.data.noteFromB !== undefined && pairing.user_b && !isOwnerB) {
      return reply.status(403).send({
        error: 'Hanya Pasangan B yang dapat mengubah pesan dukungannya sendiri.',
      });
    }

    const current = JSON.parse(pairing.shared_items_json || '{}') as Record<string, unknown>;
    const updatedJson = { ...current, ...parsed.data };
    const updated = await db.pairing.update({
      where: { id: pairing.id },
      data: { shared_items_json: JSON.stringify(updatedJson) },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    const partnerPreview = isOwnerB ? await buildPartnerSharedPreview(db, updated) : undefined;
    return formatPairingResponse(updated, partnerPreview);
  });

  const PrepChecklistSchema = z.object({
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          text: z.string().min(1).max(300),
          textEn: z.string().min(1).max(300),
          checked: z.boolean(),
        }),
      )
      .max(30),
  });

  app.put('/api/pairings/:code/prep', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const parsed = PrepChecklistSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Format daftar persiapan tidak valid.' });
    }
    const pairing = await db.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    if (!pairing || pairing.status === 'revoked') {
      return reply.status(404).send({ error: 'Tautan pasangan tidak ditemukan.' });
    }
    if (new Date(pairing.expires_at).getTime() <= Date.now()) {
      return reply.status(410).send({ error: 'Tautan pasangan telah kedaluwarsa.' });
    }
    if (session.userId !== pairing.user_a && session.userId !== pairing.user_b) {
      return reply.status(403).send({ error: 'Tidak memiliki izin memperbarui daftar persiapan ini.' });
    }

    const updated = await db.pairing.update({
      where: { id: pairing.id },
      data: { prep_checklist_json: JSON.stringify(parsed.data.items) },
      include: { plan_steps: { orderBy: { step_order: 'asc' } } },
    });
    const partnerPreview =
      session.userId === updated.user_b ? await buildPartnerSharedPreview(db, updated) : undefined;
    return formatPairingResponse(updated, partnerPreview);
  });

  app.post('/api/pairings/:code/revoke', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const pairing = await db.pairing.findUnique({
      where: { invite_code: code.toUpperCase() },
    });
    if (!pairing) {
      return reply.status(404).send({ error: 'Kode pasangan tidak ditemukan.' });
    }
    if (session.userId !== pairing.user_a && session.userId !== pairing.user_b) {
      return reply.status(403).send({ error: 'Tidak memiliki izin mencabut kode pasangan ini.' });
    }

    const updated = await db.pairing.update({
      where: { id: pairing.id },
      data: {
        status: 'revoked',
        revoked_at: new Date(),
      },
    });
    return updated;
  });

  // 8. Tanya Tenaga Kesehatan — Tiket Pertanyaan Anonim (Terisolasi per Sesi & Role Nakes)
  app.get('/api/tickets', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    if (session.role === 'nakes') {
      return db.questionTicket.findMany({
        orderBy: [{ status: 'desc' }, { created_at: 'desc' }],
        take: 50,
      });
    }

    return db.questionTicket.findMany({
      where: { anon_token: session.userId },
      orderBy: { created_at: 'desc' },
      take: 30,
    });
  });

  app.post('/api/tickets', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const schema = z.object({
      category: z.string().max(80).default('Umum'),
      text: z.string().min(10).max(1000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Pertanyaan minimal 10 karakter.' });
    }
    const ticket = await db.questionTicket.create({
      data: {
        anon_token: session.userId,
        category: parsed.data.category,
        text: parsed.data.text.trim(),
        status: 'terkirim',
      },
    });
    return ticket;
  });

  app.post('/api/tickets/:id/reply', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;
    if (session.role !== 'nakes') {
      return reply.status(403).send({
        error: 'Hanya akun Tenaga Kesehatan terverifikasi yang dapat membalas tiket pertanyaan.',
      });
    }

    const { id } = req.params as { id: string };
    const schema = z.object({
      replyText: z.string().min(5).max(2000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Balasan minimal 5 karakter.' });
    }
    const existing = await db.questionTicket.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Tiket tidak ditemukan.' });
    }

    const provider = await db.user.findUnique({
      where: { id: session.userId },
      select: { display_name: true },
    });

    const updated = await db.questionTicket.update({
      where: { id },
      data: {
        status: 'dijawab',
        reply_text: parsed.data.replyText.trim(),
        replied_by: provider?.display_name || 'Tenaga Kesehatan',
      },
    });
    return updated;
  });

  // 9. Mode Tenaga Kesehatan & ShareToken QR Berlaku 1 Jam (Protected for Nakes + Owner Audit)
  app.post('/api/share-tokens', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const schema = z.object({
      scope: z.array(z.enum(['history', 'risk_factors', 'lab_results', 'care_pathway', 'progress'])).min(1),
      snapshot: z.record(z.string(), z.unknown()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Pilih minimal satu cakupan data untuk dibagikan.' });
    }

    const ownerId = session.userId;
    const userExists = await db.user.findUnique({ where: { id: ownerId } });
    if (!userExists) {
      await db.user.create({
        data: { id: ownerId, anon_token: ownerId, role: 'user' },
      });
    }

    const tokenCode = generateSecureCode('SBS-', 6, '-1H');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const { partner_context: _strippedPartnerCtx, ...safeSnapshot } = parsed.data.snapshot;

    const created = await db.shareToken.create({
      data: {
        token_code: tokenCode,
        user_id: ownerId,
        scope_json: JSON.stringify(Array.from(new Set(parsed.data.scope))),
        snapshot_json: encryptAtRest(JSON.stringify(safeSnapshot)),
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

  app.get('/api/share-tokens/:code/audit', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const token = await db.shareToken.findUnique({
      where: { token_code: code.toUpperCase() },
    });
    if (!token) {
      return reply.status(404).send({ error: 'Token tidak ditemukan.' });
    }
    if (token.user_id !== session.userId) {
      return reply.status(403).send({ error: 'Tidak memiliki izin melihat log akses token ini.' });
    }

    return {
      token_code: token.token_code,
      scope: JSON.parse(token.scope_json) as string[],
      expires_at: token.expires_at,
      revoked: token.revoked,
      accessed_log: JSON.parse(token.accessed_log_json || '[]') as unknown[],
      care_plan_written_at: token.care_plan_at ? token.care_plan_at.toISOString() : null,
    };
  });

  app.get(
    '/api/share-tokens/:code',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;
    if (session.role !== 'nakes') {
      return reply.status(403).send({
        error: 'Hanya Tenaga Kesehatan yang masuk akun yang dapat membuka ringkasan pasien.',
      });
    }

    const { code } = req.params as { code: string };
    const provider = await db.user.findUnique({
      where: { id: session.userId },
      select: { display_name: true, email: true },
    });
    const queryViewer = (req.query as Record<string, string>)?.viewer?.trim();
    const viewerName = (
      queryViewer ||
      provider?.display_name ||
      provider?.email ||
      'Tenaga Kesehatan Pemeriksa'
    ).slice(0, 80);

    const token = await db.shareToken.findUnique({
      where: { token_code: code.toUpperCase() },
    });

    if (!token) {
      return reply.status(404).send({ error: 'Kode ringkasan pasien tidak ditemukan.' });
    }
    if (token.revoked) {
      return reply.status(410).send({ error: 'Tautan berbagi ini telah dicabut oleh pasien.' });
    }
    if (new Date(token.expires_at).getTime() <= Date.now()) {
      return reply.status(410).send({ error: 'Tautan berbagi telah kedaluwarsa (melewati batas 1 jam).' });
    }

    const currentLogs = JSON.parse(token.accessed_log_json || '[]') as unknown[];
    const newLogEntry = {
      accessed_at: new Date().toISOString(),
      viewer_name: viewerName,
      viewer_role: 'nakes',
      action: 'Membuka Ringkasan Pasien',
    };
    const updatedLogs = [newLogEntry, ...currentLogs].slice(0, 50);

    await db.shareToken.update({
      where: { id: token.id },
      data: { accessed_log_json: JSON.stringify(updatedLogs) },
    });

    const scope = JSON.parse(token.scope_json) as string[];
    const fullSnapshot = parseEncryptedJson<Record<string, unknown>>(token.snapshot_json, {});
    const filteredSnapshot = filterSnapshotByScope(scope, fullSnapshot);

    return {
      token_code: token.token_code,
      scope,
      expires_at: token.expires_at,
      revoked: token.revoked,
      snapshot: filteredSnapshot,
      accessed_log: updatedLogs,
      care_plan_written_at: token.care_plan_at ? token.care_plan_at.toISOString() : null,
      ai_allowed: fullSnapshot.aiAllowed === true,
    };
  });

  // 9b. Rencana Pasca-Konsultasi: Dokter menulis rencana tindak lanjut yang langsung masuk ke Jalur Perawatan pasien.
  //     Hanya Nakes terverifikasi, hanya untuk token yang belum dicabut, maks. 24 jam sejak token dibuat.
  const CARE_PLAN_WRITE_WINDOW_MS = 24 * 60 * 60 * 1000;
  const CarePlanSchema = z.object({
    clinicianName: z.string().trim().max(80).optional(),
    specialty: SpecialistKeySchema,
    visitDate: DayString,
    summaryForPatient: z.string().trim().min(10).max(1500),
    orderedTests: z.array(OrderedTestSchema).max(6).default([]),
    lifestyleFocus: z.array(LifestyleFocusSchema).max(6).default([]),
    referralTo: SpecialistKeySchema.optional(),
    nextFollowUpDate: DayString.optional(),
  });

  app.post('/api/share-tokens/:code/care-plan', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;
    if (session.role !== 'nakes') {
      return reply.status(403).send({ error: 'Hanya Tenaga Kesehatan terverifikasi yang dapat menulis rencana perawatan.' });
    }
    const parsed = CarePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Isian rencana perawatan tidak valid.' });
    }

    const { code } = req.params as { code: string };
    const token = await db.shareToken.findUnique({ where: { token_code: code.toUpperCase() } });
    if (!token) {
      return reply.status(404).send({ error: 'Kode ringkasan pasien tidak ditemukan.' });
    }
    if (token.revoked) {
      return reply.status(410).send({ error: 'Tautan berbagi ini telah dicabut oleh pasien.' });
    }
    if (Date.now() - new Date(token.created_at).getTime() > CARE_PLAN_WRITE_WINDOW_MS) {
      return reply.status(410).send({ error: 'Batas waktu menulis rencana (24 jam sejak kode dibuat) telah lewat.' });
    }

    const provider = await db.user.findUnique({
      where: { id: session.userId },
      select: { display_name: true, email: true },
    });
    const clinicianName = (
      parsed.data.clinicianName ||
      provider?.display_name ||
      provider?.email ||
      'Tenaga Kesehatan'
    ).slice(0, 80);
    const writtenAt = new Date();
    const plan = { ...parsed.data, clinicianName, writtenAt: writtenAt.toISOString() };

    const currentLogs = JSON.parse(token.accessed_log_json || '[]') as unknown[];
    const updatedLogs = [
      {
        accessed_at: writtenAt.toISOString(),
        viewer_name: clinicianName,
        viewer_role: 'nakes',
        action: 'Menulis Rencana Pasca-Konsultasi',
      },
      ...currentLogs,
    ].slice(0, 50);

    await db.shareToken.update({
      where: { id: token.id },
      data: {
        care_plan_json_encrypted: encryptAtRest(JSON.stringify(plan)),
        care_plan_at: writtenAt,
        accessed_log_json: JSON.stringify(updatedLogs),
      },
    });

    return { token_code: token.token_code, saved: true, written_at: writtenAt.toISOString() };
  });

  // Pasien mengambil seluruh rencana pasca-konsultasi miliknya (termasuk dari token yang sudah kedaluwarsa).
  app.get('/api/care-plans', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;
    const rows = await db.shareToken.findMany({
      where: { user_id: session.userId, care_plan_at: { not: null } },
      orderBy: { care_plan_at: 'asc' },
      take: 50,
    });
    return rows
      .map((row) => {
        const plan = parseEncryptedJson<Record<string, unknown> | null>(row.care_plan_json_encrypted, null);
        return plan ? { ...plan, tokenCode: row.token_code } : null;
      })
      .filter((p): p is Record<string, unknown> & { tokenCode: string } => p !== null);
  });

  app.post('/api/share-tokens/:code/revoke', async (req, reply) => {
    const session = requireAnySession(req, reply);
    if (!session) return;

    const { code } = req.params as { code: string };
    const token = await db.shareToken.findUnique({
      where: { token_code: code.toUpperCase() },
    });
    if (!token) {
      return reply.status(404).send({ error: 'Token tidak ditemukan.' });
    }
    if (session.userId !== token.user_id) {
      return reply.status(403).send({ error: 'Tidak memiliki izin mencabut tautan ini.' });
    }

    await db.shareToken.update({
      where: { id: token.id },
      data: { revoked: true },
    });
    return { token_code: token.token_code, revoked: true };
  });

  // 10. Hapus Semua Data Saya (Right to Be Forgotten)
  app.delete('/api/users/:userId/data', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    if (!requireUserSession(req, reply, userId)) return;

    try {
      await db.consent.deleteMany({ where: { user_id: userId } });
      await db.assessment.deleteMany({ where: { user_id: userId } });
      await db.result.deleteMany({ where: { user_id: userId } });
      await db.reminder.deleteMany({ where: { user_id: userId } });
      await db.cycleTracker.deleteMany({ where: { user_id: userId } });
      await db.doctorChecklistState.deleteMany({ where: { user_id: userId } });
      await db.healthJournal.deleteMany({ where: { user_id: userId } });
      await db.shareToken.deleteMany({ where: { user_id: userId } });
      await db.pairing.deleteMany({
        where: { OR: [{ user_a: userId }, { user_b: userId }] },
      });
      await db.questionTicket.deleteMany({ where: { anon_token: userId } });
      await db.user.deleteMany({ where: { id: userId } });
    } catch {
      // Abaikan bila user anonim belum pernah menyimpan apa pun di server
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { deleted: true, timestamp: new Date().toISOString() };
  });

  // 10b. Fitur AI (opt-in, dibatasi laju, tanpa log isi) — lihat server/ai-routes.ts
  registerAiRoutes(app, {
    db,
    provider: aiProvider,
    requireAnySession,
    parseEncryptedJson,
    filterSnapshotByScope,
  });

  // 11. Production Static Frontend Serving & SPA Fallback
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const shouldServeStatic =
    (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') &&
    fs.existsSync(indexHtmlPath);

  if (shouldServeStatic) {
    app.get('/*', async (req, reply) => {
      const urlPath = req.url.split('?')[0];
      if (urlPath.startsWith('/api/')) {
        return reply.status(404).send({ error: 'API route not found.' });
      }

      const safeRelPath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
      const candidatePath = path.resolve(distDir, `.${safeRelPath}`);
      if (candidatePath.startsWith(distDir) && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        const ext = path.extname(candidatePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        if (urlPath.startsWith('/assets/')) {
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (urlPath === '/sw.js' || urlPath.endsWith('.html')) {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.type(mime).send(fs.readFileSync(candidatePath));
      }

      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      return reply.type('text/html; charset=utf-8').send(fs.readFileSync(indexHtmlPath));
    });
  }

  return app;
}

if (process.argv[1]?.endsWith('server/index.ts')) {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '0.0.0.0';
  buildServer().then((app) => {
    const shutdown = async () => {
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    app.listen({ port, host }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`🛡️ Side by Side server running at ${address}`);
    });
  });
}
