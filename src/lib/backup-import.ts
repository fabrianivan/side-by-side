/**
 * Validasi & pemulihan salinan cadangan (JSON Backup Import) Side by Side.
 * Memastikan berkas yang diimpor valid, aman, dibatasi ukurannya, dan tidak membocorkan data pasangan.
 */
import { z } from 'zod';
import {
  boundJournal,
  normalizeJournal,
  stripPrivatePartnerContext,
  type HealthJournal,
} from './health-journal';
import type { AssessmentAnswers } from './assessment-engine';

export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024;

const ConsentsBackupSchema = z
  .object({
    store_results: z.boolean().optional(),
    share_partner: z.boolean().optional(),
    share_nakes: z.boolean().optional(),
    ai_assist: z.boolean().optional(),
  })
  .optional();

const LabResultBackupSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  testDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid testDate'),
  volume_ml: z.number().min(0).max(30),
  concentration_m_per_ml: z.number().min(0).max(1000),
  total_motility_pct: z.number().min(0).max(100),
  progressive_motility_pct: z.number().min(0).max(100),
  morphology_normal_pct: z.number().min(0).max(100),
  notes: z.string().max(1000).optional(),
  attachmentName: z.string().max(255).optional(),
  createdAt: z.string().max(40).optional(),
});

const ReminderBackupSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  type: z.enum(['initial_checkup', 'semen_analysis', 'follow_up', 'lifestyle']),
  title: z.string().trim().min(1).max(200),
  facilityName: z.string().max(200).optional(),
  remindAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid remindAt'),
  notes: z.string().max(1000).optional(),
  completed: z.boolean().optional(),
});

const DoctorChecklistBackupSchema = z
  .object({
    context: z.record(z.string().max(64), z.boolean()).default({}),
    selected: z.record(z.string().max(80), z.boolean()).default({}),
    customQuestions: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          text: z.string().trim().min(3).max(500),
        }),
      )
      .max(30)
      .default([]),
  })
  .optional();

const HabitLogSchema = z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.array(z.string().max(64)).max(20));

const BackupPayloadSchema = z.object({
  app: z.string().max(160).optional(),
  exportedAt: z.string().max(64).optional(),
  consents: ConsentsBackupSchema,
  assessmentAnswers: z.record(z.string().max(64), z.string().max(64)).optional(),
  labResults: z.array(LabResultBackupSchema).max(200).optional(),
  reminders: z.array(ReminderBackupSchema).max(200).optional(),
  habitLog: HabitLogSchema.optional(),
  cycleTracker: z
    .object({
      cycleStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      habitLog: HabitLogSchema.optional(),
    })
    .optional(),
  doctorChecklist: DoctorChecklistBackupSchema,
  healthJournal: z.unknown().optional(),
});

export interface ParsedBackupData {
  consents?: {
    store_results?: boolean;
    share_partner?: boolean;
    share_nakes?: boolean;
    ai_assist?: boolean;
  };
  assessmentAnswers?: AssessmentAnswers;
  labResults?: Array<{
    id: string;
    testDate: string;
    volume_ml: number;
    concentration_m_per_ml: number;
    total_motility_pct: number;
    progressive_motility_pct: number;
    morphology_normal_pct: number;
    notes?: string;
    attachmentName?: string;
    createdAt: string;
  }>;
  reminders?: Array<{
    id: string;
    type: 'initial_checkup' | 'semen_analysis' | 'follow_up' | 'lifestyle';
    title: string;
    facilityName?: string;
    remindAt: string;
    notes?: string;
    completed: boolean;
  }>;
  cycleStartDate?: string;
  habitLog?: Record<string, string[]>;
  doctorChecklist?: {
    context: Record<string, boolean>;
    selected: Record<string, boolean>;
    customQuestions: Array<{ id: string; text: string }>;
  };
  healthJournal?: HealthJournal;
  summary: {
    hasAssessment: boolean;
    labCount: number;
    reminderCount: number;
    checkInCount: number;
    consultationCount: number;
    habitDaysCount: number;
  };
}

export type BackupParseResult =
  | { ok: true; data: ParsedBackupData }
  | { ok: false; error: string };

export function parseBackupJson(rawText: string, locale: 'id' | 'en' = 'id'): BackupParseResult {
  const isEn = locale === 'en';
  if (!rawText || rawText.length > MAX_BACKUP_FILE_BYTES) {
    return {
      ok: false,
      error: isEn ? 'Backup file is empty or exceeds the 2 MB limit.' : 'Berkas cadangan kosong atau melebihi batas 2 MB.',
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error: isEn ? 'Invalid JSON file. Choose a backup exported from Side by Side.' : 'Format JSON tidak valid. Pilih berkas ekspor dari Side by Side.',
    };
  }

  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return {
      ok: false,
      error: isEn ? 'Unrecognized backup structure.' : 'Struktur berkas cadangan tidak dikenali.',
    };
  }

  const record = parsedJson as Record<string, unknown>;
  const recognizedKeys = [
    'app',
    'consents',
    'assessmentAnswers',
    'labResults',
    'reminders',
    'habitLog',
    'cycleTracker',
    'doctorChecklist',
    'healthJournal',
  ];
  const hasKnownSection = recognizedKeys.some((k) => record[k] !== undefined);
  if (!hasKnownSection) {
    return {
      ok: false,
      error: isEn
        ? 'This JSON file does not appear to be a Side by Side backup.'
        : 'Berkas JSON ini tampaknya bukan cadangan data Side by Side.',
    };
  }

  const parsed = BackupPayloadSchema.safeParse(record);
  if (!parsed.success) {
    return {
      ok: false,
      error: isEn
        ? 'Some fields in the backup file are malformed or out of range.'
        : 'Beberapa bagian di dalam berkas cadangan tidak valid atau di luar batas.',
    };
  }

  const v = parsed.data;
  const nowIso = new Date().toISOString();

  const labResults = v.labResults
    ?.map((item, idx) => ({
      id: item.id || `lab-restored-${idx + 1}`,
      testDate: item.testDate.slice(0, 10),
      volume_ml: item.volume_ml,
      concentration_m_per_ml: item.concentration_m_per_ml,
      total_motility_pct: item.total_motility_pct,
      progressive_motility_pct: item.progressive_motility_pct,
      morphology_normal_pct: item.morphology_normal_pct,
      notes: item.notes,
      attachmentName: item.attachmentName,
      createdAt: item.createdAt || nowIso,
    }))
    .sort((a, b) => a.testDate.localeCompare(b.testDate));

  const reminders = v.reminders?.map((item, idx) => ({
    id: item.id || `rem-restored-${idx + 1}`,
    type: item.type,
    title: item.title,
    facilityName: item.facilityName,
    remindAt: item.remindAt.slice(0, 16),
    notes: item.notes,
    completed: Boolean(item.completed),
  }));

  const habitLog = v.cycleTracker?.habitLog ?? v.habitLog;
  const cycleStartDate = v.cycleTracker?.cycleStartDate;

  let healthJournal: HealthJournal | undefined;
  if (v.healthJournal && typeof v.healthJournal === 'object' && !Array.isArray(v.healthJournal)) {
    const normalized = normalizeJournal(v.healthJournal as Partial<HealthJournal>);
    // Pastikan aturan privasi: partner_context tidak pernah masuk ke riwayat jurnal.
    normalized.assessmentHistory = normalized.assessmentHistory.map((snap) => ({
      ...snap,
      answers: stripPrivatePartnerContext(snap.answers || {}),
    }));
    healthJournal = boundJournal({ ...normalized, updatedAt: nowIso });
  }

  const hasAssessment = Boolean(v.assessmentAnswers && Object.keys(v.assessmentAnswers).length > 0);
  const habitDaysCount = habitLog ? Object.values(habitLog).filter((arr) => arr.length > 0).length : 0;

  return {
    ok: true,
    data: {
      consents: v.consents,
      assessmentAnswers: hasAssessment ? v.assessmentAnswers : undefined,
      labResults,
      reminders,
      cycleStartDate,
      habitLog,
      doctorChecklist: v.doctorChecklist,
      healthJournal,
      summary: {
        hasAssessment,
        labCount: labResults?.length ?? 0,
        reminderCount: reminders?.length ?? 0,
        checkInCount: healthJournal?.checkIns.length ?? 0,
        consultationCount: healthJournal?.carePathway.consultations.length ?? 0,
        habitDaysCount,
      },
    },
  };
}
