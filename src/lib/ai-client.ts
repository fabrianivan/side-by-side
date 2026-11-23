/**
 * Klien fitur AI (opt-in). Hanya mengirim data minimum yang dibutuhkan setiap fitur:
 * tidak ada nama, email, NIK, nomor telepon, alias pasangan, atau catatan check-in pribadi.
 */
import { useEffect, useState } from 'react';
import type { AssessmentAnswers, AssessmentEvaluationResult } from './assessment-engine';
import { explainAssessment, INFLUENCE_LABELS, CHANGEABILITY_LABELS } from './risk-explainer';
import { computePathwayStages, describePlanItem, PATHWAY_STAGES, SPECIALISTS } from './care-pathway';
import { describeMetricTrend, NUMERIC_METRICS, type HealthJournal } from './health-journal';
import type { LabResultEntry } from '../context/AppContext';

type Locale = 'id' | 'en';

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  supportsPdf: boolean;
  loading: boolean;
}

let statusPromise: Promise<Omit<AiStatus, 'loading'>> | null = null;

export function resetAiStatusCache() {
  statusPromise = null;
}

function fetchAiStatus(): Promise<Omit<AiStatus, 'loading'>> {
  if (!statusPromise) {
    statusPromise = fetch('/api/ai/status', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return { enabled: false, provider: null, model: null, supportsPdf: true };
        }
        const data = (await res.json()) as {
          enabled?: boolean;
          provider?: string | null;
          model?: string | null;
          supportsPdf?: boolean;
        };
        return {
          enabled: Boolean(data.enabled),
          provider: data.provider ?? null,
          model: data.model ?? null,
          supportsPdf: typeof data.supportsPdf === 'boolean' ? data.supportsPdf : data.provider !== 'openai-compatible',
        };
      })
      .catch(() => ({ enabled: false, provider: null, model: null, supportsPdf: true }));
  }
  return statusPromise;
}

export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>({
    enabled: false,
    provider: null,
    model: null,
    supportsPdf: true,
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    void fetchAiStatus().then((s) => {
      if (alive) setStatus({ ...s, loading: false });
    });
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function generateAnonSessionId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return `anon-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10)}`;
  }
  return `anon-${Date.now().toString(36)}`;
}

/** POST dengan sesi: untuk pengguna anonim yang belum punya cookie sesi (401), buat sesi anonim lalu ulangi sekali. */
async function postAi<T>(path: string, body: unknown, locale: Locale): Promise<T> {
  const send = () =>
    fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  let res: Response;
  try {
    res = await send();
    const authMode = typeof localStorage !== 'undefined' ? localStorage.getItem('sbs_auth_mode') : null;
    const canAutoAnon = path !== '/api/ai/visit-brief' && authMode !== 'account' && authMode !== 'nakes';
    if (res.status === 401 && canAutoAnon) {
      const storedId = typeof localStorage !== 'undefined' ? localStorage.getItem('sbs_user_id') : null;
      const anonId = storedId && storedId.startsWith('anon-') ? storedId : generateAnonSessionId();
      await fetch('/api/auth/anonymous', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: anonId }),
      });
      res = await send();
    }
  } catch {
    throw new AiRequestError(
      locale === 'en' ? 'Network error reaching the AI assistant.' : 'Gangguan jaringan saat menghubungi asisten AI.',
      0,
    );
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? ((await res.json()) as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new AiRequestError(
      typeof data.error === 'string'
        ? data.error
        : locale === 'en'
        ? 'The AI assistant is unavailable right now.'
        : 'Asisten AI sedang tidak tersedia.',
      res.status,
    );
  }
  return data as T;
}

/* ---------------- Pendamping (agen) ---------------- */

export type CompanionAction =
  | { type: 'open_page'; page: CompanionPage; label: string }
  | { type: 'care_plan_task'; title: string; dueInDays?: number }
  | { type: 'reminder'; title: string; daysFromNow: number; kind: 'initial_checkup' | 'semen_analysis' | 'follow_up' | 'lifestyle' };

export type CompanionPage =
  | 'self_check'
  | 'care_pathway'
  | 'progress'
  | 'find_care'
  | 'results'
  | 'doctor_checklist'
  | 'library'
  | 'share_with_doctor'
  | 'couple_plan';

export const COMPANION_ROUTES: Record<CompanionPage, { id: string; en: string }> = {
  self_check: { id: '/cek-awal', en: '/assessment' },
  care_pathway: { id: '/jalur-perawatan', en: '/care-pathway' },
  progress: { id: '/progres', en: '/progress' },
  find_care: { id: '/layanan', en: '/facilities' },
  results: { id: '/hasil', en: '/results' },
  doctor_checklist: { id: '/checklist-dokter', en: '/doctor-checklist' },
  library: { id: '/pustaka', en: '/library' },
  share_with_doctor: { id: '/bagikan-nakes', en: '/share' },
  couple_plan: { id: '/berdua', en: '/couple' },
};

export interface CompanionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompanionResponse {
  reply: string;
  actions: CompanionAction[];
  sources: Array<{ slug: string; title: string }>;
  toolsUsed: string[];
  showSupport: boolean;
}

export interface CompanionContext {
  selfCheck?: { level: string; reasons: string[]; factors: Array<{ title: string; influence: string; changeability: string }> };
  pathway?: { nextStage?: string; specialist?: string; facility?: string; appointment?: string; openTasks?: string[] };
  progress?: string[];
  labs?: Array<{
    date: string;
    volume_ml: number;
    concentration_m_per_ml: number;
    total_motility_pct: number;
    progressive_motility_pct: number;
    morphology_normal_pct: number;
  }>;
}

/** Konteks minimum untuk pendamping — tanpa identitas, tanpa usia pasangan, tanpa catatan bebas. */
export function buildCompanionContext(args: {
  locale: Locale;
  assessmentAnswers: AssessmentAnswers;
  assessmentResult: AssessmentEvaluationResult | null;
  healthJournal: HealthJournal;
  labResults: LabResultEntry[];
}): CompanionContext {
  const { locale, assessmentAnswers, assessmentResult, healthJournal, labResults } = args;
  const ctx: CompanionContext = {};
  if (assessmentResult && Object.keys(assessmentAnswers).length > 0) {
    const exp = explainAssessment(assessmentAnswers, locale);
    ctx.selfCheck = {
      level: exp.levelLabel,
      reasons: exp.reasons.map((r) => r.text).slice(0, 4),
      factors: exp.factors.slice(0, 12).map((f) => ({
        title: f.title,
        influence: INFLUENCE_LABELS[locale][f.influence],
        changeability: CHANGEABILITY_LABELS[locale][f.changeability],
      })),
    };
  }
  const pathway = healthJournal.carePathway;
  const next = computePathwayStages(pathway, Boolean(assessmentResult)).find((s) => s.status === 'current');
  const nextStage = next ? PATHWAY_STAGES.find((p) => p.key === next.key) : undefined;
  ctx.pathway = {
    nextStage: nextStage ? (locale === 'en' ? nextStage.title.en : nextStage.title.id) : undefined,
    specialist: pathway.specialistKey
      ? locale === 'en'
        ? SPECIALISTS[pathway.specialistKey].shortName.en
        : SPECIALISTS[pathway.specialistKey].shortName.id
      : undefined,
    facility: pathway.facility?.name,
    appointment: pathway.appointmentAt,
    openTasks: pathway.carePlan
      .filter((i) => !i.done)
      .slice(0, 10)
      .map((i) => describePlanItem(i, locale).slice(0, 200)),
  };
  const trends = NUMERIC_METRICS.map((d) => describeMetricTrend(healthJournal.checkIns, d, locale))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => t.text.slice(0, 300));
  if (trends.length > 0) ctx.progress = trends.slice(0, 12);
  if (labResults.length > 0) {
    ctx.labs = labResults.slice(-5).map((r) => ({
      date: r.testDate.slice(0, 10),
      volume_ml: r.volume_ml,
      concentration_m_per_ml: r.concentration_m_per_ml,
      total_motility_pct: r.total_motility_pct,
      progressive_motility_pct: r.progressive_motility_pct,
      morphology_normal_pct: r.morphology_normal_pct,
    }));
  }
  return ctx;
}

export function askCompanion(messages: CompanionMessage[], context: CompanionContext, locale: Locale) {
  return postAi<CompanionResponse>('/api/ai/companion', { locale, messages: messages.slice(-16), context }, locale);
}

/* ---------------- Pembaca hasil lab ---------------- */

export interface LabReadResult {
  values: Partial<{
    test_date: string;
    volume_ml: number;
    concentration_million_per_ml: number;
    total_motility_pct: number;
    progressive_motility_pct: number;
    normal_morphology_pct: number;
  }>;
  missing: string[];
  note?: string;
}

export const MAX_AI_UPLOAD_BYTES = 5 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read')));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export function readLabReport(dataUrl: string, locale: Locale) {
  return postAi<LabReadResult>('/api/ai/lab-report', { locale, file: dataUrl }, locale);
}

/* ---------------- Penjelas rencana, deteksi tekanan, ringkasan Nakes ---------------- */

export function explainPlan(
  plan: {
    specialty: string;
    summary?: string;
    orderedTests: string[];
    lifestyleFocus: string[];
    referralTo?: string;
    nextVisitDate?: string;
  },
  locale: Locale,
) {
  return postAi<{ explanation: string }>('/api/ai/explain-plan', { locale, plan }, locale);
}

export async function checkDistress(text: string, locale: Locale): Promise<{ level: string; showSupport: boolean }> {
  try {
    return await postAi<{ level: string; showSupport: boolean }>('/api/ai/distress-check', { locale, text: text.slice(0, 1000) }, locale);
  } catch {
    return { level: 'none', showSupport: false };
  }
}

export function requestVisitBrief(tokenCode: string, locale: Locale) {
  return postAi<{ brief: string }>('/api/ai/visit-brief', { locale, tokenCode }, locale);
}
