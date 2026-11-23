/**
 * Jurnal Kesehatan Privat (Private Longitudinal Health Journal).
 *
 * Menyimpan riwayat Cek Awal, check-in berkala (tidur, stres, aktivitas, rokok, alkohol,
 * berat badan, keluhan fisik, kesehatan seksual), serta status Jalur Perawatan.
 * Seluruhnya tersimpan terenkripsi AES-GCM di perangkat (IndexedDB) dan—untuk Mode Akun—
 * tersinkron terenkripsi AES-256-GCM at rest di server.
 *
 * Partner privacy: `partner_context` is stripped before any snapshot is stored.
 */
import { assessmentRulesConfig, getLocalizedAssessmentConfig, type AssessmentLevelCode } from '../config/schemas';
import type { AssessmentAnswers, AssessmentEvaluationResult } from './assessment-engine';
import { summarizeDomainInfluence, type InfluenceLevel } from './risk-explainer';
import type { RiskDomainKey } from '../config/risk-explanations';
import type { CarePathwayState } from './care-pathway';
import { createEmptyCarePathway, describePlanItem } from './care-pathway';

type Locale = 'id' | 'en';

export interface AssessmentSnapshot {
  id: string;
  takenAt: string;
  levelCode: AssessmentLevelCode;
  answers: AssessmentAnswers;
  domainInfluence: Record<RiskDomainKey, InfluenceLevel>;
}

export type HeatExposure = 'none' | 'some' | 'frequent';
export type Discomfort = 'none' | 'mild' | 'significant';
export type SexualWellbeing = 'good' | 'some_concerns' | 'significant_concerns';

export interface CheckInEntry {
  id: string;
  date: string; // YYYY-MM-DD
  sleepHours?: number;
  stressLevel?: number; // 1 (tenang) – 5 (sangat tertekan)
  activeDays?: number; // 0–7 hari/minggu dengan ≥30 menit aktivitas
  cigarettesPerDay?: number; // termasuk sesi vape
  alcoholDrinksPerWeek?: number;
  weightKg?: number;
  heatExposure?: HeatExposure;
  discomfort?: Discomfort;
  sexualWellbeing?: SexualWellbeing;
  note?: string;
  createdAt: string;
}

export interface HealthJournal {
  assessmentHistory: AssessmentSnapshot[];
  checkIns: CheckInEntry[];
  carePathway: CarePathwayState;
  updatedAt: string;
}

export const MAX_ASSESSMENT_SNAPSHOTS = 60;
export const MAX_CHECKINS = 400;

export function createEmptyJournal(): HealthJournal {
  return {
    assessmentHistory: [],
    checkIns: [],
    carePathway: createEmptyCarePathway(),
    updatedAt: new Date(0).toISOString(),
  };
}

/** Menormalkan jurnal dari penyimpanan / server agar selalu berbentuk lengkap. */
export function normalizeJournal(raw: Partial<HealthJournal> | null | undefined): HealthJournal {
  const empty = createEmptyJournal();
  if (!raw || typeof raw !== 'object') return empty;
  return {
    assessmentHistory: Array.isArray(raw.assessmentHistory) ? raw.assessmentHistory : [],
    checkIns: Array.isArray(raw.checkIns) ? raw.checkIns : [],
    carePathway: { ...empty.carePathway, ...(raw.carePathway || {}) },
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : empty.updatedAt,
  };
}

/** Membatasi ukuran jurnal agar selalu lolos validasi sinkronisasi server. */
export function boundJournal(j: HealthJournal): HealthJournal {
  return {
    ...j,
    assessmentHistory: j.assessmentHistory.slice(-MAX_ASSESSMENT_SNAPSHOTS),
    checkIns: j.checkIns.slice(-MAX_CHECKINS),
    carePathway: {
      ...j.carePathway,
      consultations: j.carePathway.consultations.slice(-50),
      carePlan: j.carePathway.carePlan.slice(-100),
      importedPlanIds: j.carePathway.importedPlanIds.slice(-100),
    },
  };
}

export function stripPrivatePartnerContext(answers: AssessmentAnswers): AssessmentAnswers {
  const { partner_context: _hidden, ...rest } = answers;
  return rest;
}

export function createAssessmentSnapshot(
  answers: AssessmentAnswers,
  result: Pick<AssessmentEvaluationResult, 'levelCode' | 'evaluatedAt'>,
): AssessmentSnapshot {
  const safeAnswers = stripPrivatePartnerContext(answers);
  return {
    id: `chk-${new Date(result.evaluatedAt).getTime() || Date.now()}`,
    takenAt: result.evaluatedAt,
    levelCode: result.levelCode,
    answers: safeAnswers,
    domainInfluence: summarizeDomainInfluence(safeAnswers),
  };
}

export function appendAssessmentSnapshot(
  history: AssessmentSnapshot[],
  snapshot: AssessmentSnapshot,
): AssessmentSnapshot[] {
  const withoutDup = history.filter((h) => h.id !== snapshot.id && h.takenAt !== snapshot.takenAt);
  return [...withoutDup, snapshot]
    .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
    .slice(-MAX_ASSESSMENT_SNAPSHOTS);
}

export interface AnswerChange {
  questionId: string;
  topic: string;
  from: string;
  to: string;
  direction: 'better' | 'worse' | 'changed';
}

/** Membandingkan dua Cek Awal: apa yang membaik, memburuk, atau berubah. */
export function diffSnapshots(prev: AssessmentSnapshot, curr: AssessmentSnapshot, locale: Locale): AnswerChange[] {
  const localized = getLocalizedAssessmentConfig(locale);
  const changes: AnswerChange[] = [];
  for (const q of localized.questions) {
    if (q.id === 'partner_context') continue;
    const a = prev.answers[q.id];
    const b = curr.answers[q.id];
    if (!a || !b || a === b) continue;
    if (['unknown', 'skipped'].includes(a) || ['unknown', 'skipped'].includes(b)) continue;
    const optA = q.options.find((o) => o.value === a);
    const optB = q.options.find((o) => o.value === b);
    if (!optA || !optB) continue;
    // Durasi program hamil yang bertambah adalah perjalanan waktu, bukan "memburuk".
    const direction: AnswerChange['direction'] =
      q.id === 'ttc_duration' || q.id === 'prior_pregnancy'
        ? 'changed'
        : optB.weight < optA.weight
        ? 'better'
        : optB.weight > optA.weight
        ? 'worse'
        : 'changed';
    changes.push({ questionId: q.id, topic: q.topic, from: optA.label, to: optB.label, direction });
  }
  return changes;
}

/* ------------------------------------------------------------------ */
/* Check-in berkala                                                    */
/* ------------------------------------------------------------------ */

export type NumericMetricKey =
  | 'sleepHours'
  | 'stressLevel'
  | 'activeDays'
  | 'cigarettesPerDay'
  | 'alcoholDrinksPerWeek'
  | 'weightKg';

export interface NumericMetricDef {
  key: NumericMetricKey;
  label: { id: string; en: string };
  unit: { id: string; en: string };
  min: number;
  max: number;
  step: number;
  better: 'higher' | 'lower' | 'range' | 'neutral';
  target?: { min: number; max: number };
  targetLabel?: { id: string; en: string };
}

export const NUMERIC_METRICS: NumericMetricDef[] = [
  {
    key: 'sleepHours',
    label: { id: 'Tidur rata-rata', en: 'Average sleep' },
    unit: { id: 'jam/malam', en: 'h/night' },
    min: 0,
    max: 14,
    step: 0.5,
    better: 'range',
    target: { min: 7, max: 9 },
    targetLabel: { id: 'Kisaran sehat 7–9 jam', en: 'Healthy range 7–9 h' },
  },
  {
    key: 'stressLevel',
    label: { id: 'Tingkat stres', en: 'Stress level' },
    unit: { id: 'dari 5', en: 'of 5' },
    min: 1,
    max: 5,
    step: 1,
    better: 'lower',
    target: { min: 1, max: 2 },
    targetLabel: { id: '1 = tenang, 5 = sangat tertekan', en: '1 = calm, 5 = very stressed' },
  },
  {
    key: 'activeDays',
    label: { id: 'Hari aktif bergerak', en: 'Active days' },
    unit: { id: 'hari/minggu', en: 'days/week' },
    min: 0,
    max: 7,
    step: 1,
    better: 'higher',
    target: { min: 5, max: 7 },
    targetLabel: { id: 'Target ≥5 hari × 30 menit', en: 'Target ≥5 days × 30 min' },
  },
  {
    key: 'cigarettesPerDay',
    label: { id: 'Rokok / sesi vape', en: 'Cigarettes / vape sessions' },
    unit: { id: 'per hari', en: 'per day' },
    min: 0,
    max: 60,
    step: 1,
    better: 'lower',
    target: { min: 0, max: 0 },
    targetLabel: { id: 'Target: 0', en: 'Target: 0' },
  },
  {
    key: 'alcoholDrinksPerWeek',
    label: { id: 'Minuman beralkohol', en: 'Alcoholic drinks' },
    unit: { id: 'gelas/minggu', en: 'drinks/week' },
    min: 0,
    max: 50,
    step: 1,
    better: 'lower',
    target: { min: 0, max: 2 },
    targetLabel: { id: 'Semakin sedikit semakin baik', en: 'The less the better' },
  },
  {
    key: 'weightKg',
    label: { id: 'Berat badan', en: 'Weight' },
    unit: { id: 'kg', en: 'kg' },
    min: 30,
    max: 250,
    step: 0.1,
    better: 'neutral',
    targetLabel: { id: 'Target ditetapkan bersama dokter', en: 'Set a target with your doctor' },
  },
];

export const CATEGORICAL_OPTIONS = {
  heatExposure: {
    label: { id: 'Paparan panas (laptop di pangkuan, sauna, kerja panas)', en: 'Heat exposure (laptop on lap, sauna, hot work)' },
    options: {
      none: { id: 'Hampir tidak ada', en: 'Hardly any' },
      some: { id: 'Kadang-kadang', en: 'Sometimes' },
      frequent: { id: 'Sering', en: 'Often' },
    },
  },
  discomfort: {
    label: { id: 'Keluhan di area testis/lipat paha', en: 'Discomfort in testicles / groin' },
    options: {
      none: { id: 'Tidak ada', en: 'None' },
      mild: { id: 'Ringan / sesekali', en: 'Mild / occasional' },
      significant: { id: 'Nyeri, benjolan, atau bengkak', en: 'Pain, a lump, or swelling' },
    },
  },
  sexualWellbeing: {
    label: { id: 'Kesehatan seksual (ereksi/ejakulasi)', en: 'Sexual health (erection / ejaculation)' },
    options: {
      good: { id: 'Baik', en: 'Good' },
      some_concerns: { id: 'Ada sedikit kekhawatiran', en: 'Some concerns' },
      significant_concerns: { id: 'Kekhawatiran yang mengganggu', en: 'Concerns that bother me' },
    },
  },
} as const;

export function upsertCheckIn(list: CheckInEntry[], entry: CheckInEntry): CheckInEntry[] {
  const filtered = list.filter((c) => c.date !== entry.date && c.id !== entry.id);
  return [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_CHECKINS);
}

export function metricSeries(entries: CheckInEntry[], key: NumericMetricKey): Array<{ date: string; value: number }> {
  return entries
    .filter((e) => typeof e[key] === 'number' && Number.isFinite(e[key] as number))
    .map((e) => ({ date: e.date, value: e[key] as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatShortDate(dateStr: string, locale: Locale): string {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export interface MetricTrend {
  direction: 'better' | 'worse' | 'steady' | 'changed';
  inTarget: boolean | null;
  text: string;
  first: { date: string; value: number };
  latest: { date: string; value: number };
}

function distanceToRange(v: number, range: { min: number; max: number }): number {
  if (v < range.min) return range.min - v;
  if (v > range.max) return v - range.max;
  return 0;
}

/** Kalimat tren berbahasa awam untuk satu metrik check-in. */
export function describeMetricTrend(
  entries: CheckInEntry[],
  def: NumericMetricDef,
  locale: Locale,
): MetricTrend | null {
  const series = metricSeries(entries, def.key);
  if (series.length === 0) return null;
  const isEn = locale === 'en';
  const first = series[0];
  const latest = series[series.length - 1];
  const label = isEn ? def.label.en : def.label.id;
  const unit = isEn ? def.unit.en : def.unit.id;
  const inTarget = def.target ? latest.value >= def.target.min && latest.value <= def.target.max : null;

  if (series.length === 1) {
    return {
      direction: 'steady',
      inTarget,
      first,
      latest,
      text: isEn
        ? `${label}: ${fmt(latest.value)} ${unit} (first entry on ${formatShortDate(latest.date, locale)}). Add another check-in to see a trend.`
        : `${label}: ${fmt(latest.value)} ${unit} (catatan pertama ${formatShortDate(latest.date, locale)}). Tambahkan check-in berikutnya untuk melihat tren.`,
    };
  }

  let direction: MetricTrend['direction'] = 'steady';
  const delta = latest.value - first.value;
  if (Math.abs(delta) < 1e-9) direction = 'steady';
  else if (def.better === 'higher') direction = delta > 0 ? 'better' : 'worse';
  else if (def.better === 'lower') direction = delta < 0 ? 'better' : 'worse';
  else if (def.better === 'range' && def.target) {
    const dFirst = distanceToRange(first.value, def.target);
    const dLatest = distanceToRange(latest.value, def.target);
    direction = dLatest < dFirst ? 'better' : dLatest > dFirst ? 'worse' : 'steady';
  } else direction = 'changed';

  const verdict: Record<MetricTrend['direction'], { id: string; en: string }> = {
    better: { id: 'bergerak ke arah yang sehat.', en: 'moving in a healthy direction.' },
    worse: { id: 'layak mendapat perhatian lebih.', en: 'worth a little more attention.' },
    steady: { id: 'stabil.', en: 'steady.' },
    changed: { id: 'berubah—diskusikan target yang tepat dengan dokter.', en: 'changed—discuss the right target with your doctor.' },
  };

  const span = isEn
    ? `${fmt(first.value)} → ${fmt(latest.value)} ${unit} since ${formatShortDate(first.date, locale)}`
    : `${fmt(first.value)} → ${fmt(latest.value)} ${unit} sejak ${formatShortDate(first.date, locale)}`;
  const targetNote =
    inTarget === true
      ? isEn
        ? ' Now within target.'
        : ' Kini sudah sesuai target.'
      : '';

  return {
    direction,
    inTarget,
    first,
    latest,
    text: `${label}: ${span} — ${isEn ? verdict[direction].en : verdict[direction].id}${targetNote}`,
  };
}

/** TMSC (juta) = volume × konsentrasi × motilitas progresif — sama dengan rumus di Simulator Lab. */
export function computeTmsc(r: { volume_ml: number; concentration_m_per_ml: number; progressive_motility_pct: number }): number {
  return Math.round(r.volume_ml * r.concentration_m_per_ml * (r.progressive_motility_pct / 100) * 10) / 10;
}

export interface TimelineEvent {
  id: string;
  date: string;
  kind: 'self_check' | 'check_in' | 'lab' | 'consultation' | 'care_plan';
  title: string;
  detail?: string;
}

export function buildTimeline(
  journal: HealthJournal,
  labResults: Array<{ id: string; testDate: string; concentration_m_per_ml: number; total_motility_pct: number }>,
  levelLabels: Record<AssessmentLevelCode, string>,
  locale: Locale,
): TimelineEvent[] {
  const isEn = locale === 'en';
  const events: TimelineEvent[] = [];
  for (const s of journal.assessmentHistory) {
    events.push({
      id: s.id,
      date: s.takenAt.slice(0, 10),
      kind: 'self_check',
      title: isEn ? 'Self-check completed' : 'Cek Awal selesai',
      detail: levelLabels[s.levelCode],
    });
  }
  for (const c of journal.checkIns) {
    events.push({
      id: c.id,
      date: c.date,
      kind: 'check_in',
      title: isEn ? 'Health check-in' : 'Check-in kesehatan',
      detail: [
        typeof c.sleepHours === 'number' ? `${isEn ? 'Sleep' : 'Tidur'} ${fmt(c.sleepHours)}h` : null,
        typeof c.stressLevel === 'number' ? `${isEn ? 'Stress' : 'Stres'} ${c.stressLevel}/5` : null,
        typeof c.activeDays === 'number' ? `${isEn ? 'Active' : 'Aktif'} ${c.activeDays}/7` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }
  for (const r of labResults) {
    events.push({
      id: r.id,
      date: r.testDate.slice(0, 10),
      kind: 'lab',
      title: isEn ? 'Semen analysis recorded' : 'Hasil analisis semen dicatat',
      detail: `${fmt(r.concentration_m_per_ml)} ${isEn ? 'M/mL' : 'jt/mL'} · ${isEn ? 'motility' : 'motilitas'} ${fmt(r.total_motility_pct)}%`,
    });
  }
  for (const c of journal.carePathway.consultations) {
    events.push({
      id: c.id,
      date: c.date,
      kind: 'consultation',
      title: c.source === 'clinician'
        ? isEn
          ? 'Doctor’s care plan received'
          : 'Rencana perawatan dari dokter diterima'
        : isEn
        ? 'Consultation logged'
        : 'Konsultasi dicatat',
      detail: c.facilityName || c.clinicianName,
    });
  }
  for (const item of journal.carePathway.carePlan) {
    if (item.done && item.doneAt) {
      events.push({
        id: `${item.id}-done`,
        date: item.doneAt.slice(0, 10),
        kind: 'care_plan',
        title: isEn ? 'Care plan step done' : 'Langkah rencana perawatan selesai',
        detail: describePlanItem(item, locale),
      });
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export function checkInsToCsv(entries: CheckInEntry[]): string {
  const header = [
    'date',
    'sleep_hours',
    'stress_1_5',
    'active_days_per_week',
    'cigarettes_per_day',
    'alcohol_drinks_per_week',
    'weight_kg',
    'heat_exposure',
    'discomfort',
    'sexual_wellbeing',
    'note',
  ];
  const esc = (v: unknown) => {
    if (v === undefined || v === null) return '';
    let s = String(v);
    // Netralkan awalan rumus spreadsheet (=, +, -, @) pada kolom teks agar aman dibuka di Excel/Sheets.
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entries.map((e) =>
    [
      e.date,
      e.sleepHours,
      e.stressLevel,
      e.activeDays,
      e.cigarettesPerDay,
      e.alcoholDrinksPerWeek,
      e.weightKg,
      e.heatExposure,
      e.discomfort,
      e.sexualWellbeing,
      e.note,
    ]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export const LEVEL_ORDER: AssessmentLevelCode[] = ['routine', 'within_1_2_months', 'immediate'];

export function getLevelLabels(locale: Locale): Record<AssessmentLevelCode, string> {
  const cfg = locale === 'en' ? getLocalizedAssessmentConfig('en') : assessmentRulesConfig;
  return {
    routine: cfg.levels.routine.label,
    within_1_2_months: cfg.levels.within_1_2_months.label,
    immediate: cfg.levels.immediate.label,
  };
}
