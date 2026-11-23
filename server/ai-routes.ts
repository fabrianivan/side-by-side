/**
 * Endpoint AI Side by Side (semua opt-in, dibatasi laju, tanpa log isi).
 *
 *  GET  /api/ai/status          → apakah AI aktif (tanpa membocorkan kunci)
 *  POST /api/ai/companion       → agen pendamping: alat server (pustaka, rujukan WHO, fasilitas) + saran aksi yang dikonfirmasi pengguna
 *  POST /api/ai/lab-report      → membaca foto/PDF hasil analisis semen menjadi angka yang diperiksa ulang pengguna
 *  POST /api/ai/explain-plan    → menjelaskan rencana pasca-kunjungan dari dokter dengan bahasa awam
 *  POST /api/ai/distress-check  → deteksi tekanan emosional pada catatan bebas (cadangan: kata kunci)
 *  POST /api/ai/visit-brief     → ringkasan pra-konsultasi untuk Nakes (hanya bila pasien mengizinkan AI pada QR)
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getLocalizedArticles } from '../src/config/seed-articles';
import { getLocalizedFacilities } from '../src/config/seed-facilities';
import { getLocalizedSemenReference, assessmentRulesConfig } from '../src/config/schemas';
import { ARTICLES_EN, EN_DISTRESS_KEYWORDS, FACILITIES_EN } from '../src/config/localization-en';
import {
  AiProviderError,
  COMPANION_PAGES,
  COMPANION_TOOLS,
  LAB_REPORT_TOOL,
  companionSystemPrompt,
  distressSystemPrompt,
  explainPlanSystemPrompt,
  labReportSystemPrompt,
  visitBriefSystemPrompt,
  type AiContent,
  type AiToolCall,
  type ChatProvider,
} from './ai';

type Session = { userId: string; role: string };

export interface AiRouteDeps {
  db: PrismaClient;
  provider: ChatProvider | null;
  requireAnySession: (req: FastifyRequest, reply: FastifyReply) => Session | null;
  parseEncryptedJson: <T>(raw: string | null | undefined, fallback: T) => T;
  filterSnapshotByScope: (scope: string[], full: Record<string, unknown>) => Record<string, unknown>;
}

const LocaleSchema = z.enum(['id', 'en']).default('id');
const MAX_COMPANION_TURNS = 4;

export function keywordDistress(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    assessmentRulesConfig.emotionalDistressKeywords.some((k) => t.includes(k.toLowerCase())) ||
    EN_DISTRESS_KEYWORDS.some((k) => t.includes(k))
  );
}

/* ---------------- Alat sisi server (data kurasi aplikasi, tanpa data pribadi) ---------------- */

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

interface SearchableArticle {
  slug: string;
  title: string;
  category: string;
  summary: string;
  body_md: string;
  reviewer: string;
}

interface SearchableFacility {
  name: string;
  displayType: string;
  city: string;
  services: string[];
  accepts_jkn: boolean;
  price_min: number;
  price_max: number;
  hours: string;
  friendliness_score: number;
}

async function loadArticlesForAi(db: PrismaClient | undefined, locale: 'id' | 'en'): Promise<SearchableArticle[]> {
  if (db) {
    try {
      const rows = await db.article.findMany();
      if (rows.length > 0) {
        return rows.map((row) => {
          const en = locale === 'en' ? ARTICLES_EN[row.id] : undefined;
          return {
            slug: row.slug,
            title: en?.title ?? row.title,
            category: row.category,
            summary: en?.summary ?? row.summary,
            body_md: en?.body_md ?? row.body_md,
            reviewer: en?.reviewer ?? row.reviewer,
          };
        });
      }
    } catch {
      // Fallback to curated reference catalog if DB table is unavailable
    }
  }
  return getLocalizedArticles(locale);
}

async function loadFacilitiesForAi(db: PrismaClient | undefined, locale: 'id' | 'en'): Promise<SearchableFacility[]> {
  if (db) {
    try {
      const rows = await db.facility.findMany();
      if (rows.length > 0) {
        return rows.map((row) => {
          let services: string[] = [];
          try {
            const parsed = JSON.parse(row.services_json);
            if (Array.isArray(parsed)) services = parsed.map(String);
          } catch {
            services = [];
          }
          const en = locale === 'en' ? FACILITIES_EN[row.id] : undefined;
          return {
            name: row.name,
            displayType: en?.typeLabel ?? row.type,
            city: row.city,
            services,
            accepts_jkn: row.accepts_jkn,
            price_min: row.price_min,
            price_max: row.price_max,
            hours: en?.hours ?? row.hours,
            friendliness_score: row.friendliness_score,
          };
        });
      }
    } catch {
      // Fallback to curated reference directory if DB table is unavailable
    }
  }
  return getLocalizedFacilities(locale);
}

function scoreArticles(articles: SearchableArticle[], query: string) {
  const terms = tokenize(query);
  const scored = articles
    .map((a) => {
      const title = tokenize(a.title);
      const summary = tokenize(a.summary);
      const body = tokenize(a.body_md);
      let score = 0;
      for (const t of terms) {
        if (title.some((w) => w.startsWith(t) || t.startsWith(w))) score += 3;
        if (summary.some((w) => w.startsWith(t))) score += 2;
        if (body.some((w) => w.startsWith(t))) score += 1;
      }
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
  return scored.map(({ a }) => ({
    slug: a.slug,
    title: a.title,
    category: a.category,
    summary: a.summary,
    reviewer: a.reviewer,
    excerpt: a.body_md.replace(/[#*_>`]/g, '').slice(0, 700),
  }));
}

export function searchLibrary(query: string, locale: 'id' | 'en') {
  return scoreArticles(getLocalizedArticles(locale), query);
}

async function searchLibraryFromDb(db: PrismaClient, query: string, locale: 'id' | 'en') {
  const articles = await loadArticlesForAi(db, locale);
  return scoreArticles(articles, query);
}

async function findFacilities(db: PrismaClient, input: Record<string, unknown>, locale: 'id' | 'en') {
  const city = typeof input.city === 'string' ? input.city.trim().toLowerCase() : undefined;
  const service = typeof input.service === 'string' ? input.service : undefined;
  const jknOnly = input.jkn_only === true;
  const facilities = await loadFacilitiesForAi(db, locale);
  return facilities
    .filter(
      (f) =>
        (!city || f.city.toLowerCase() === city) &&
        (!service || f.services.includes(service)) &&
        (!jknOnly || f.accepts_jkn),
    )
    .sort((a, b) => b.friendliness_score - a.friendliness_score)
    .slice(0, 3)
    .map((f) => ({
      name: f.name,
      type: f.displayType,
      city: f.city,
      services: f.services,
      accepts_jkn: f.accepts_jkn,
      price_range_idr: `${f.price_min}–${f.price_max}`,
      hours: f.hours,
      men_friendly_score: f.friendliness_score,
    }));
}

function semenReference(locale: 'id' | 'en') {
  const ref = getLocalizedSemenReference(locale);
  return {
    source: ref.source,
    disclaimer: ref.disclaimer,
    parameters: ref.parameters.map((p) => ({
      parameter: p.label,
      unit: p.unit,
      lower_reference_limit: p.lowerReferenceLimit,
      plain_explanation: p.plainExplanation,
      below_range_note: p.belowRangeNote,
    })),
  };
}

/* ---------------- Validasi saran aksi agen ---------------- */

const OpenPageAction = z.object({ page: z.enum(COMPANION_PAGES), label: z.string().trim().min(2).max(60) });
const TaskAction = z.object({ title: z.string().trim().min(3).max(120), due_in_days: z.number().int().min(1).max(365).optional() });
const ReminderAction = z.object({
  title: z.string().trim().min(3).max(120),
  days_from_now: z.number().int().min(1).max(365),
  kind: z.enum(['initial_checkup', 'semen_analysis', 'follow_up', 'lifestyle']),
});

export type CompanionAction =
  | { type: 'open_page'; page: (typeof COMPANION_PAGES)[number]; label: string }
  | { type: 'care_plan_task'; title: string; dueInDays?: number }
  | { type: 'reminder'; title: string; daysFromNow: number; kind: z.infer<typeof ReminderAction>['kind'] };

function toAction(call: AiToolCall): CompanionAction | null {
  if (call.name === 'suggest_open_page') {
    const p = OpenPageAction.safeParse(call.input);
    return p.success ? { type: 'open_page', page: p.data.page, label: p.data.label } : null;
  }
  if (call.name === 'suggest_care_plan_task') {
    const p = TaskAction.safeParse(call.input);
    return p.success ? { type: 'care_plan_task', title: p.data.title, dueInDays: p.data.due_in_days } : null;
  }
  if (call.name === 'suggest_reminder') {
    const p = ReminderAction.safeParse(call.input);
    return p.success ? { type: 'reminder', title: p.data.title, daysFromNow: p.data.days_from_now, kind: p.data.kind } : null;
  }
  return null;
}

/* ---------------- Skema masukan ---------------- */

const CompanionContextSchema = z
  .object({
    selfCheck: z
      .object({
        level: z.string().max(80),
        reasons: z.array(z.string().max(400)).max(4),
        factors: z
          .array(z.object({ title: z.string().max(120), influence: z.string().max(40), changeability: z.string().max(40) }))
          .max(12),
      })
      .optional(),
    pathway: z
      .object({
        nextStage: z.string().max(60).optional(),
        specialist: z.string().max(120).optional(),
        facility: z.string().max(200).optional(),
        appointment: z.string().max(40).optional(),
        openTasks: z.array(z.string().max(200)).max(10).optional(),
      })
      .optional(),
    progress: z.array(z.string().max(300)).max(12).optional(),
    labs: z
      .array(
        z.object({
          date: z.string().max(20),
          volume_ml: z.number(),
          concentration_m_per_ml: z.number(),
          total_motility_pct: z.number(),
          progressive_motility_pct: z.number(),
          morphology_normal_pct: z.number(),
        }),
      )
      .max(5)
      .optional(),
  })
  .default({});

const CompanionBodySchema = z.object({
  locale: LocaleSchema,
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(16),
  context: CompanionContextSchema,
});

const ALLOWED_UPLOAD = /^data:(image\/jpeg|image\/png|image\/webp|application\/pdf);base64,([A-Za-z0-9+/=]+)$/;
const LabReportBodySchema = z.object({
  locale: LocaleSchema,
  file: z.string().max(7_500_000),
});

const LabValuesSchema = z.object({
  test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  volume_ml: z.number().min(0).max(30).optional(),
  concentration_million_per_ml: z.number().min(0).max(1000).optional(),
  total_motility_pct: z.number().min(0).max(100).optional(),
  progressive_motility_pct: z.number().min(0).max(100).optional(),
  normal_morphology_pct: z.number().min(0).max(100).optional(),
});

const ExplainPlanBodySchema = z.object({
  locale: LocaleSchema,
  plan: z.object({
    specialty: z.string().max(80),
    summary: z.string().max(1500).optional(),
    orderedTests: z.array(z.string().max(80)).max(10).default([]),
    lifestyleFocus: z.array(z.string().max(80)).max(6).default([]),
    referralTo: z.string().max(80).optional(),
    nextVisitDate: z.string().max(20).optional(),
  }),
});

const DistressBodySchema = z.object({ locale: LocaleSchema, text: z.string().max(1000) });
const VisitBriefBodySchema = z.object({ locale: LocaleSchema, tokenCode: z.string().min(4).max(40) });

function handleAiError(reply: FastifyReply, err: unknown, locale: 'id' | 'en') {
  const status = err instanceof AiProviderError ? err.status : 502;
  const code = status === 429 ? 429 : status === 415 ? 415 : 502;
  return reply.status(code).send({
    error:
      code === 429
        ? locale === 'en'
          ? 'The AI assistant is busy. Please try again in a minute.'
          : 'Asisten AI sedang sibuk. Silakan coba lagi sebentar lagi.'
        : code === 415
        ? locale === 'en'
          ? 'This file type cannot be read by the AI provider. Try a photo (JPG/PNG).'
          : 'Jenis berkas ini tidak dapat dibaca penyedia AI. Coba foto (JPG/PNG).'
        : locale === 'en'
        ? 'The AI assistant is unavailable right now. Everything else in the app still works.'
        : 'Asisten AI sedang tidak tersedia. Fitur lain di aplikasi tetap berjalan.',
  });
}

function aiDisabled(reply: FastifyReply, locale: 'id' | 'en') {
  return reply.status(503).send({
    error: locale === 'en' ? 'AI features are not configured on this server.' : 'Fitur AI belum dikonfigurasi di server ini.',
  });
}

export function registerAiRoutes(app: FastifyInstance, deps: AiRouteDeps) {
  const { db, provider } = deps;

  app.get('/api/ai/status', async () => ({
    enabled: Boolean(provider),
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
    supportsPdf: Boolean(provider?.supportsPdf),
  }));

  /* ---------- 1. Agen pendamping ---------- */
  app.post(
    '/api/ai/companion',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = CompanionBodySchema.safeParse(req.body);
      const locale = parsed.success ? parsed.data.locale : 'id';
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid request.' });
      if (!deps.requireAnySession(req, reply)) return;
      if (!provider) return aiDisabled(reply, locale);
      const { messages, context } = parsed.data;
      if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
        return reply.status(400).send({ error: 'Invalid request.' });
      }
      // Gabungkan giliran berurutan dengan peran sama agar protokol Anthropic/OpenAI selalu bergantian user/assistant.
      const normalizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const m of messages) {
        const prev = normalizedMessages[normalizedMessages.length - 1];
        if (prev && prev.role === m.role) {
          prev.content = `${prev.content}\n\n${m.content}`;
        } else {
          normalizedMessages.push({ role: m.role, content: m.content });
        }
      }

      const lastUser = normalizedMessages[normalizedMessages.length - 1].content;
      const showSupport = keywordDistress(lastUser);

      const convo: unknown[] = normalizedMessages.map((m) =>
        m.role === 'user' ? provider.userMessage([{ type: 'text', text: m.content }]) : provider.assistantText(m.content),
      );
      const system = companionSystemPrompt(locale, JSON.stringify(context));
      const actions: CompanionAction[] = [];
      const sources = new Map<string, { slug: string; title: string }>();
      const toolsUsed: string[] = [];
      let reply_text = '';

      try {
        for (let turn = 0; turn < MAX_COMPANION_TURNS; turn += 1) {
          const lastTurn = turn === MAX_COMPANION_TURNS - 1;
          const res = await provider.complete({
            system,
            messages: convo,
            tools: lastTurn ? undefined : COMPANION_TOOLS,
            maxTokens: 4000,
          });
          if (res.toolCalls.length === 0 || lastTurn) {
            reply_text = res.text;
            break;
          }
          convo.push(res.assistantMessage);
          const results: Array<{ id: string; content: string }> = [];
          for (const call of res.toolCalls) {
            toolsUsed.push(call.name);
            let content: unknown;
            if (call.name === 'search_library') {
              const found = await searchLibraryFromDb(db, String(call.input.query ?? ''), locale);
              for (const f of found) sources.set(f.slug, { slug: f.slug, title: f.title });
              content = found.length ? found : { note: 'No matching guide found.' };
            } else if (call.name === 'get_semen_reference') {
              content = semenReference(locale);
            } else if (call.name === 'find_facilities') {
              content = await findFacilities(db, call.input, locale);
            } else {
              const action = actions.length < 3 ? toAction(call) : null;
              if (action) actions.push(action);
              content = action
                ? { status: 'shown_to_user_as_button', note: 'Nothing happens unless the person presses it.' }
                : { status: 'rejected', note: 'Invalid or too many suggestions.' };
            }
            results.push({ id: call.id, content: JSON.stringify(content) });
          }
          convo.push(...provider.toolResults(results));
        }
      } catch (err) {
        return handleAiError(reply, err, locale);
      }

      return {
        reply: reply_text || (locale === 'en' ? 'Sorry, I could not answer that. Please try rephrasing.' : 'Maaf, saya belum bisa menjawab. Coba ulangi dengan kata lain.'),
        actions,
        sources: Array.from(sources.values()),
        toolsUsed,
        showSupport,
      };
    },
  );

  /* ---------- 2. Pembaca hasil lab ---------- */
  app.post(
    '/api/ai/lab-report',
    { bodyLimit: 8 * 1024 * 1024, config: { rateLimit: { max: 6, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = LabReportBodySchema.safeParse(req.body);
      const locale = parsed.success ? parsed.data.locale : 'id';
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid request.' });
      if (!deps.requireAnySession(req, reply)) return;
      if (!provider) return aiDisabled(reply, locale);
      const match = ALLOWED_UPLOAD.exec(parsed.data.file);
      if (!match) {
        return reply.status(400).send({
          error: locale === 'en' ? 'Upload a JPG, PNG, WEBP or PDF file.' : 'Unggah berkas JPG, PNG, WEBP, atau PDF.',
        });
      }
      const [, mediaType, base64] = match;
      if (mediaType === 'application/pdf' && !provider.supportsPdf) {
        return handleAiError(reply, new AiProviderError('PDF input is not supported by this AI provider', 415), locale);
      }
      const content: AiContent =
        mediaType === 'application/pdf'
          ? { type: 'pdf', base64 }
          : { type: 'image', mediaType: mediaType as 'image/jpeg', base64 };

      try {
        const res = await provider.complete({
          system: labReportSystemPrompt(),
          messages: [
            provider.userMessage([
              content,
              { type: 'text', text: 'Transcribe the semen analysis values from this report using record_semen_values.' },
            ]),
          ],
          tools: [LAB_REPORT_TOOL],
          maxTokens: 3000,
        });
        let raw: Record<string, unknown> | null =
          res.toolCalls.find((c) => c.name === LAB_REPORT_TOOL.name)?.input ?? null;
        if (!raw) {
          const jsonMatch = /\{[\s\S]*\}/.exec(res.text);
          if (jsonMatch) {
            try {
              raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
            } catch {
              raw = null;
            }
          }
        }
        if (!raw) {
          return reply.status(422).send({
            error: locale === 'en' ? 'Could not read values from this file. Please enter them manually.' : 'Angka tidak terbaca dari berkas ini. Silakan isi secara manual.',
          });
        }
        // Buang nilai di luar rentang wajar; pengguna akan memeriksa ulang sebelum menyimpan.
        const values: Record<string, unknown> = {};
        const rejected: string[] = [];
        for (const key of Object.keys(LabValuesSchema.shape) as Array<keyof typeof LabValuesSchema.shape>) {
          if (raw[key] === undefined || raw[key] === null || raw[key] === '') continue;
          const v = typeof raw[key] === 'string' && key !== 'test_date' ? Number(raw[key]) : raw[key];
          const single = LabValuesSchema.shape[key].safeParse(v);
          if (single.success && single.data !== undefined) values[key] = single.data;
          else rejected.push(key);
        }
        const missing = Array.isArray(raw.missing) ? (raw.missing as unknown[]).map(String).slice(0, 10) : [];
        return {
          values,
          missing: [...missing, ...rejected],
          note: typeof raw.note === 'string' ? raw.note.slice(0, 300) : undefined,
        };
      } catch (err) {
        return handleAiError(reply, err, locale);
      }
    },
  );

  /* ---------- 3. Penjelas rencana dokter ---------- */
  app.post(
    '/api/ai/explain-plan',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = ExplainPlanBodySchema.safeParse(req.body);
      const locale = parsed.success ? parsed.data.locale : 'id';
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid request.' });
      if (!deps.requireAnySession(req, reply)) return;
      if (!provider) return aiDisabled(reply, locale);
      try {
        const res = await provider.complete({
          system: explainPlanSystemPrompt(locale),
          messages: [provider.userMessage([{ type: 'text', text: `Doctor's plan (JSON):\n${JSON.stringify(parsed.data.plan)}` }])],
          maxTokens: 3000,
        });
        return { explanation: res.text };
      } catch (err) {
        return handleAiError(reply, err, locale);
      }
    },
  );

  /* ---------- 4. Deteksi tekanan emosional ---------- */
  app.post(
    '/api/ai/distress-check',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = DistressBodySchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid request.' });
      if (!deps.requireAnySession(req, reply)) return;
      const keyword = keywordDistress(parsed.data.text);
      if (!provider || !parsed.data.text.trim()) {
        return { level: keyword ? 'concern' : 'none', showSupport: keyword, source: 'keywords' };
      }
      try {
        const res = await provider.complete({
          system: distressSystemPrompt(),
          messages: [provider.userMessage([{ type: 'text', text: parsed.data.text }])],
          fast: true,
          noThinking: true,
          maxTokens: 60,
        });
        const m = /"level"\s*:\s*"(none|concern|crisis)"/.exec(res.text);
        const level = m ? m[1] : 'none';
        return { level, showSupport: keyword || level !== 'none', source: 'ai' };
      } catch {
        // Gagal AI tidak boleh menyembunyikan dukungan: kembali ke kata kunci.
        return { level: keyword ? 'concern' : 'none', showSupport: keyword, source: 'keywords' };
      }
    },
  );

  /* ---------- 5. Ringkasan kunjungan untuk Nakes ---------- */
  app.post(
    '/api/ai/visit-brief',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = VisitBriefBodySchema.safeParse(req.body);
      const locale = parsed.success ? parsed.data.locale : 'id';
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid request.' });
      const session = deps.requireAnySession(req, reply);
      if (!session) return;
      if (session.role !== 'nakes') {
        return reply.status(403).send({ error: 'Hanya Tenaga Kesehatan terverifikasi yang dapat membuat ringkasan AI.' });
      }
      if (!provider) return aiDisabled(reply, locale);

      const token = await db.shareToken.findUnique({ where: { token_code: parsed.data.tokenCode.toUpperCase() } });
      if (!token) return reply.status(404).send({ error: 'Kode ringkasan pasien tidak ditemukan.' });
      if (token.revoked || new Date(token.expires_at).getTime() <= Date.now()) {
        return reply.status(410).send({ error: 'Tautan berbagi telah dicabut atau kedaluwarsa.' });
      }
      const full = deps.parseEncryptedJson<Record<string, unknown>>(token.snapshot_json, {});
      if (full.aiAllowed !== true) {
        return reply.status(403).send({
          error:
            locale === 'en'
              ? 'The patient did not allow AI processing of this summary.'
              : 'Pasien tidak mengizinkan pemrosesan AI pada ringkasan ini.',
        });
      }
      const scope = JSON.parse(token.scope_json) as string[];
      const filtered = deps.filterSnapshotByScope(scope, full);
      // Alias pasien tidak diperlukan untuk ringkasan; jangan kirim ke penyedia AI.
      const { patientAlias: _alias, ...forAi } = filtered;

      try {
        const res = await provider.complete({
          system: visitBriefSystemPrompt(locale),
          messages: [provider.userMessage([{ type: 'text', text: `Shared summary (JSON):\n${JSON.stringify(forAi)}` }])],
          maxTokens: 3000,
        });
        const provider_name = await db.user.findUnique({ where: { id: session.userId }, select: { display_name: true, email: true } });
        const logs = JSON.parse(token.accessed_log_json || '[]') as unknown[];
        await db.shareToken.update({
          where: { id: token.id },
          data: {
            accessed_log_json: JSON.stringify(
              [
                {
                  accessed_at: new Date().toISOString(),
                  viewer_name: (provider_name?.display_name || provider_name?.email || 'Tenaga Kesehatan').slice(0, 80),
                  viewer_role: 'nakes',
                  action: 'Membuat Ringkasan AI',
                },
                ...logs,
              ].slice(0, 50),
            ),
          },
        });
        return { brief: res.text };
      } catch (err) {
        return handleAiError(reply, err, locale);
      }
    },
  );
}
