import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  clearEncryptedVault,
  loadEncryptedItem,
  removeEncryptedItem,
  saveEncryptedItem,
  wipeAllLocalData,
} from '../lib/crypto-storage';
import {
  evaluateAssessment,
  type AssessmentAnswers,
  type AssessmentEvaluationResult,
} from '../lib/assessment-engine';
import type { Locale } from '../i18n';
import { PLAN_STEPS_EN } from '../config/localization-en';
import {
  appendAssessmentSnapshot,
  boundJournal,
  createAssessmentSnapshot,
  createEmptyJournal,
  describeMetricTrend,
  getLevelLabels,
  normalizeJournal,
  NUMERIC_METRICS,
  type HealthJournal,
} from '../lib/health-journal';
import { parseBackupJson, type ParsedBackupData } from '../lib/backup-import';
import {
  FIRST_TESTS,
  importClinicianPlans,
  recommendSpecialist,
  SPECIALISTS,
  type ClinicianCarePlan,
} from '../lib/care-pathway';
import { explainAssessment, INFLUENCE_LABELS, CHANGEABILITY_LABELS } from '../lib/risk-explainer';

function secureRandomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export type AuthMode = 'welcome' | 'anonymous' | 'account' | 'nakes';
export type TextScale = 'normal' | 'lg' | 'xl';

export interface ConsentState {
  store_results: boolean;
  share_partner: boolean;
  share_nakes: boolean;
  /** Persetujuan memakai fitur AI (default OFF). */
  ai_assist: boolean;
}

export interface LabResultEntry {
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
}

export interface LabAttachmentData {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ReminderItem {
  id: string;
  type: 'initial_checkup' | 'semen_analysis' | 'follow_up' | 'lifestyle';
  title: string;
  facilityName?: string;
  remindAt: string;
  notes?: string;
  completed: boolean;
}

export interface PlanStepItem {
  step_key: string;
  step_order: number;
  title: string;
  status_a: 'not_started' | 'in_progress' | 'done';
  status_b: 'not_started' | 'in_progress' | 'done';
}

export interface PrepChecklistItem {
  id: string;
  text: string;
  textEn: string;
  checked: boolean;
}

export interface PairingState {
  invite_code: string;
  user_a?: string;
  user_b?: string | null;
  partner_a_alias: string;
  partner_b_alias: string;
  status: 'active' | 'revoked';
  expires_at: string;
  shared_items: {
    shareAssessmentAnswers: boolean;
    shareAssessmentLevel: boolean;
    shareLabSummary: boolean;
    noteFromA: string;
    noteFromB: string;
  };
  prep_checklist?: PrepChecklistItem[];
  partner_shared_preview?: {
    assessmentLevel?: string;
    answeredTopicsCount?: number;
    labCount?: number;
  };
  plan_steps: PlanStepItem[];
}

export interface AccessLogEntry {
  accessed_at: string;
  viewer_name: string;
  viewer_role: string;
  action: string;
}

export type ShareScope = 'history' | 'risk_factors' | 'lab_results' | 'care_pathway' | 'progress';

export interface SharedRiskExplanation {
  headline: string;
  reasons: string[];
  domains: Array<{ title: string; influence: string }>;
  factors: Array<{ title: string; influence: string; changeability: string; decisive: boolean }>;
}

export interface SharedReferral {
  specialist: string;
  reasons: string[];
  firstTests: string[];
  route?: string;
  facility?: string;
  appointmentAt?: string;
}

export interface ShareTokenState {
  token_code: string;
  scope: ShareScope[];
  expires_at: string;
  revoked: boolean;
  accessed_log: AccessLogEntry[];
  snapshot: {
    patientAlias: string;
    programDuration?: string;
    assessmentLevel?: string;
    reportedRiskFactors?: string[];
    riskExplanation?: SharedRiskExplanation;
    referral?: SharedReferral;
    progressSummary?: string[];
    labResults?: LabResultEntry[];
    /** Pasien mengizinkan Nakes memakai ringkasan AI untuk QR ini. */
    aiAllowed?: boolean;
  };
  care_plan_written_at?: string | null;
  ai_allowed?: boolean;
}

export interface QuestionTicketItem {
  id: string;
  category: string;
  text: string;
  status: 'terkirim' | 'dijawab';
  reply_text?: string;
  replied_by?: string;
  created_at: string;
}

export interface DoctorChecklistData {
  context: Record<string, boolean>;
  selected: Record<string, boolean>;
  customQuestions: Array<{ id: string; text: string }>;
}

export interface LoginOptions {
  preserveLocalOnRegister?: boolean;
}

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface AppContextValue {
  authMode: AuthMode;
  userId: string;
  userEmail: string | null;
  displayName: string;
  locale: Locale;
  textScale: TextScale;
  darkMode: boolean;
  consents: ConsentState;
  assessmentAnswers: AssessmentAnswers;
  assessmentResult: AssessmentEvaluationResult | null;
  labResults: LabResultEntry[];
  reminders: ReminderItem[];
  pairing: PairingState | null;
  shareToken: ShareTokenState | null;
  tickets: QuestionTicketItem[];
  habitLog: Record<string, string[]>;
  cycleStartDate: string;
  doctorChecklist: DoctorChecklistData;
  healthJournal: HealthJournal;
  lastSyncTime: string | null;
  syncError: string | null;
  isSyncing: boolean;

  // Actions
  startAnonymousMode: () => Promise<void>;
  loginAccount: (
    email: string,
    role: 'user' | 'nakes',
    name?: string,
    serverUserId?: string,
    options?: LoginOptions
  ) => Promise<void>;
  logoutToWelcome: () => void;
  updateProfile: (
    name: string,
    passwordUpdate?: { currentPassword?: string; newPassword?: string }
  ) => Promise<ActionResult>;
  syncCloudData: () => Promise<boolean>;
  setLocale: (loc: Locale) => void;
  setTextScale: (scale: TextScale) => void;
  setDarkMode: (dark: boolean) => void;
  updateConsent: (key: keyof ConsentState, granted: boolean) => Promise<void>;
  saveAssessment: (answers: AssessmentAnswers, freeText?: string) => Promise<AssessmentEvaluationResult>;
  addLabResult: (
    entry: Omit<LabResultEntry, 'id' | 'createdAt'>,
    attachment?: LabAttachmentData | null
  ) => Promise<void>;
  editLabResult: (
    id: string,
    updates: Partial<Omit<LabResultEntry, 'id' | 'createdAt'>>,
    attachment?: LabAttachmentData | null
  ) => Promise<void>;
  deleteLabResult: (id: string) => Promise<void>;
  loadLabAttachment: (resultId: string) => Promise<LabAttachmentData | null>;
  addReminder: (rem: Omit<ReminderItem, 'id' | 'completed'>) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updatePlanStep: (
    stepKey: string,
    actor: 'a' | 'b',
    status: 'not_started' | 'in_progress' | 'done'
  ) => Promise<ActionResult>;
  updatePairingSharedItems: (updates: Partial<PairingState['shared_items']>) => Promise<ActionResult>;
  updatePrepChecklist: (items: PrepChecklistItem[]) => Promise<ActionResult>;
  createNewPairing: (aliasA?: string, aliasB?: string) => Promise<ActionResult<PairingState>>;
  joinPairing: (code: string, aliasB?: string) => Promise<ActionResult<PairingState>>;
  refreshPairing: () => Promise<ActionResult<PairingState>>;
  revokePairing: () => Promise<ActionResult>;
  createShareToken: (
    scope: ShareScope[],
    options?: { aiAllowed?: boolean }
  ) => Promise<ActionResult<ShareTokenState>>;
  refreshShareTokenAudit: () => Promise<ActionResult<ShareTokenState>>;
  revokeShareToken: () => Promise<ActionResult>;
  recordNakesAccess: (code: string, viewerName?: string) => Promise<ActionResult<ShareTokenState>>;
  refreshTickets: () => Promise<ActionResult<QuestionTicketItem[]>>;
  submitQuestionTicket: (category: string, text: string) => Promise<ActionResult<QuestionTicketItem>>;
  replyToTicket: (ticketId: string, replyText: string) => Promise<ActionResult<QuestionTicketItem>>;
  toggleDailyHabit: (dateStr: string, habitKey: string) => Promise<void>;
  setCycleStartDate: (dateStr: string) => Promise<void>;
  saveDoctorChecklist: (next: DoctorChecklistData) => Promise<void>;
  updateHealthJournal: (updater: (current: HealthJournal) => HealthJournal) => Promise<HealthJournal>;
  fetchClinicianCarePlans: () => Promise<ActionResult<number>>;
  importBackupData: (rawJson: string) => Promise<ActionResult<ParsedBackupData['summary']>>;
  wipeAllData: () => Promise<void>;
}

const DEFAULT_CONSENTS: ConsentState = {
  store_results: false,
  share_partner: false,
  share_nakes: false,
  ai_assist: false,
};

const DEFAULT_DOCTOR_CHECKLIST: DoctorChecklistData = {
  context: {
    hasProlongedDuration: true,
    hasHeatExposure: true,
    hasLabResult: false,
    hasVaricoceleSuspicion: false,
    hasPartnerChecked: true,
  },
  selected: {},
  customQuestions: [],
};

const PLAN_STEPS_ID: Record<string, string> = {
  cek_awal: 'Cek Awal Mandiri',
  pilih_layanan: 'Pilih Layanan Pemeriksaan',
  jadwalkan: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)',
  periksa: 'Kunjungan Pemeriksaan',
  pahami_hasil: 'Pahami Hasil Bersama',
  tindak_lanjut: 'Rencana Tindak Lanjut Dokter',
};

const STEP_KEYS_ORDERED: { step_key: string; step_order: number }[] = [
  { step_key: 'cek_awal', step_order: 1 },
  { step_key: 'pilih_layanan', step_order: 2 },
  { step_key: 'jadwalkan', step_order: 3 },
  { step_key: 'periksa', step_order: 4 },
  { step_key: 'pahami_hasil', step_order: 5 },
  { step_key: 'tindak_lanjut', step_order: 6 },
];

function getStepTitleForLocale(stepKey: string, locale: Locale, fallback = ''): string {
  if (locale === 'en') {
    return PLAN_STEPS_EN[stepKey] || PLAN_STEPS_ID[stepKey] || fallback;
  }
  return PLAN_STEPS_ID[stepKey] || fallback;
}

export function buildDefaultPlanSteps(locale: Locale = 'id'): PlanStepItem[] {
  return STEP_KEYS_ORDERED.map(({ step_key, step_order }) => ({
    step_key,
    step_order,
    title: getStepTitleForLocale(step_key, locale),
    status_a: 'not_started',
    status_b: 'not_started',
  }));
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    if (res.headers.get('content-type')?.includes('application/json')) {
      const data = (await res.json()) as { error?: string };
      if (data.error) return data.error;
    }
  } catch {
    // Ignore parse error
  }
  return fallback;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    return (localStorage.getItem('sbs_auth_mode') as AuthMode) || 'welcome';
  });
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('sbs_user_id') || 'anon-' + secureRandomCode(8).toLowerCase();
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('sbs_user_email'));
  const [displayName, setDisplayName] = useState<string>(() => {
    const saved = localStorage.getItem('sbs_display_name');
    if (saved) return saved;
    return ((localStorage.getItem('sbs_locale') as Locale) || 'id') === 'en'
      ? 'Anonymous User'
      : 'Pengguna Anonim';
  });
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem('sbs_locale') as Locale) || 'id');
  const [textScale, setTextScaleState] = useState<TextScale>(
    () => (localStorage.getItem('sbs_text_scale') as TextScale) || 'normal'
  );
  const [darkMode, setDarkModeState] = useState<boolean>(() => localStorage.getItem('sbs_dark_mode') === 'true');

  const [consents, setConsents] = useState<ConsentState>(DEFAULT_CONSENTS);
  const [assessmentAnswers, setAssessmentAnswers] = useState<AssessmentAnswers>({});
  const [assessmentResult, setAssessmentResult] = useState<AssessmentEvaluationResult | null>(null);
  const [labResults, setLabResults] = useState<LabResultEntry[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [shareToken, setShareToken] = useState<ShareTokenState | null>(null);
  const [tickets, setTickets] = useState<QuestionTicketItem[]>([]);
  const [habitLog, setHabitLog] = useState<Record<string, string[]>>({});
  const [cycleStartDate, setCycleStartDateState] = useState<string>(() =>
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [doctorChecklist, setDoctorChecklist] = useState<DoctorChecklistData>(DEFAULT_DOCTOR_CHECKLIST);
  const [healthJournal, setHealthJournalState] = useState<HealthJournal>(() => createEmptyJournal());
  const healthJournalRef = useRef<HealthJournal>(healthJournal);
  const setHealthJournal = useCallback((next: HealthJournal) => {
    healthJournalRef.current = next;
    setHealthJournalState(next);
  }, []);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('sbs_last_sync'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const resetSessionLocalData = useCallback(async () => {
    await clearEncryptedVault();
    setConsents(DEFAULT_CONSENTS);
    setAssessmentAnswers({});
    setAssessmentResult(null);
    setLabResults([]);
    setReminders([]);
    setPairing(null);
    setShareToken(null);
    setTickets([]);
    setHabitLog({});
    setCycleStartDateState(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setDoctorChecklist(DEFAULT_DOCTOR_CHECKLIST);
    setHealthJournal(createEmptyJournal());
    setLastSyncTime(null);
    setSyncError(null);
    localStorage.removeItem('sbs_last_sync');
  }, [setHealthJournal]);

  const ensureServerSession = useCallback(async (): Promise<boolean> => {
    try {
      const checkRes = await fetch('/api/auth/session', { credentials: 'include' });
      if (checkRes.ok && checkRes.headers.get('content-type')?.includes('application/json')) {
        const s = (await checkRes.json()) as { authenticated: boolean; userId: string | null };
        if (s.authenticated && s.userId) {
          return true;
        }
      }
      const targetAnonId = userId.startsWith('anon-')
        ? userId
        : 'anon-' + secureRandomCode(8).toLowerCase();
      const anonRes = await fetch('/api/auth/anonymous', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetAnonId }),
      });
      if (anonRes.ok && anonRes.headers.get('content-type')?.includes('application/json')) {
        const data = (await anonRes.json()) as { userId: string };
        setUserId(data.userId);
        localStorage.setItem('sbs_user_id', data.userId);
        if (authMode === 'welcome') {
          setAuthMode('anonymous');
          localStorage.setItem('sbs_auth_mode', 'anonymous');
        }
        return true;
      }
    } catch {
      // Handled by caller
    }
    return false;
  }, [authMode, userId]);

  const localizePairing = useCallback(
    (raw: PairingState, activeLocale: Locale): PairingState => ({
      ...raw,
      plan_steps: (raw.plan_steps || []).map((s) => ({
        ...s,
        title: getStepTitleForLocale(s.step_key, activeLocale, s.title),
      })),
    }),
    []
  );

  const hydrateAccountFromServer = useCallback(
    async (activeLocale: Locale): Promise<boolean> => {
      try {
        const res = await fetch('/api/account/data', { credentials: 'include' });
        if (res.status === 401 || res.status === 404) {
          const savedMode = localStorage.getItem('sbs_auth_mode');
          if (savedMode === 'account' || savedMode === 'nakes') {
            const freshAnonId = 'anon-' + secureRandomCode(8).toLowerCase();
            setAuthMode('welcome');
            setUserId(freshAnonId);
            setUserEmail(null);
            setDisplayName(activeLocale === 'en' ? 'Anonymous User' : 'Pengguna Anonim');
            localStorage.setItem('sbs_auth_mode', 'welcome');
            localStorage.setItem('sbs_user_id', freshAnonId);
            localStorage.removeItem('sbs_user_email');
            localStorage.removeItem('sbs_display_name');
          }
          return false;
        }
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return false;
        }
        const data = (await res.json()) as {
          user?: { id: string; email: string | null; displayName: string | null; role: string; locale?: string };
          consents?: ConsentState;
          assessmentAnswers?: AssessmentAnswers | null;
          results?: LabResultEntry[];
          reminders?: ReminderItem[];
          pairing?: PairingState | null;
          shareToken?: ShareTokenState | null;
          tickets?: QuestionTicketItem[];
          cycleTracker?: { cycleStartDate: string; habitLog: Record<string, string[]> } | null;
          doctorChecklist?: DoctorChecklistData | null;
          journal?: Partial<HealthJournal> | null;
        };
        if (!data.user) return false;

        const nextMode: AuthMode = data.user.role === 'nakes' ? 'nakes' : 'account';
        const resolvedName = data.user.displayName || data.user.email?.split('@')[0] || displayName;
        setAuthMode(nextMode);
        setUserId(data.user.id);
        setUserEmail(data.user.email);
        setDisplayName(resolvedName);
        localStorage.setItem('sbs_auth_mode', nextMode);
        localStorage.setItem('sbs_user_id', data.user.id);
        if (data.user.email) localStorage.setItem('sbs_user_email', data.user.email);
        localStorage.setItem('sbs_display_name', resolvedName);

        const nextConsents = { ...DEFAULT_CONSENTS, ...(data.consents || {}) };
        setConsents(nextConsents);
        await saveEncryptedItem('consents', nextConsents);

        if (data.assessmentAnswers && Object.keys(data.assessmentAnswers).length > 0) {
          const evaluated = evaluateAssessment(data.assessmentAnswers, undefined, undefined, activeLocale);
          setAssessmentAnswers(data.assessmentAnswers);
          setAssessmentResult(evaluated);
          await saveEncryptedItem('assessment_answers', data.assessmentAnswers);
          await saveEncryptedItem('assessment_result', evaluated);
        } else {
          setAssessmentAnswers({});
          setAssessmentResult(null);
        }

        const nextResults = data.results || [];
        setLabResults(nextResults);
        if (nextResults.length > 0) {
          await saveEncryptedItem('lab_results', nextResults);
        }

        const nextReminders = data.reminders || [];
        setReminders(nextReminders);
        if (nextReminders.length > 0) {
          await saveEncryptedItem('reminders', nextReminders);
        }

        if (data.pairing) {
          const localizedPairing = localizePairing(data.pairing, activeLocale);
          setPairing(localizedPairing);
          await saveEncryptedItem('pairing', localizedPairing);
        } else {
          setPairing(null);
        }

        if (data.shareToken) {
          setShareToken(data.shareToken);
          await saveEncryptedItem('share_token', data.shareToken);
        } else {
          setShareToken(null);
        }

        const nextTickets = data.tickets || [];
        setTickets(nextTickets);
        if (nextTickets.length > 0) {
          await saveEncryptedItem('tickets', nextTickets);
        }

        if (data.cycleTracker) {
          setCycleStartDateState(data.cycleTracker.cycleStartDate);
          setHabitLog(data.cycleTracker.habitLog || {});
          await saveEncryptedItem('cycle_start_date', data.cycleTracker.cycleStartDate);
          await saveEncryptedItem('habit_log', data.cycleTracker.habitLog || {});
        }

        if (data.doctorChecklist) {
          setDoctorChecklist(data.doctorChecklist);
          await saveEncryptedItem('doctor_checklist', data.doctorChecklist);
        }

        if (data.journal) {
          const serverJournal = normalizeJournal(data.journal);
          const localJournal = healthJournalRef.current;
          // Server adalah sumber utama Mode Akun; versi lokal yang lebih baru dipertahankan (mis. dibuat offline).
          const nextJournal =
            new Date(localJournal.updatedAt).getTime() > new Date(serverJournal.updatedAt).getTime()
              ? localJournal
              : serverJournal;
          setHealthJournal(nextJournal);
          await saveEncryptedItem('health_journal', nextJournal);
        }

        return true;
      } catch {
        return false;
      }
    },
    [displayName, localizePairing, setHealthJournal]
  );

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [
        savedConsents,
        savedAnswers,
        savedResult,
        savedLabs,
        savedReminders,
        savedPairing,
        savedShare,
        savedTickets,
        savedHabits,
        savedCycleDate,
        savedChecklist,
        savedJournal,
      ] = await Promise.all([
        loadEncryptedItem<ConsentState>('consents'),
        loadEncryptedItem<AssessmentAnswers>('assessment_answers'),
        loadEncryptedItem<AssessmentEvaluationResult>('assessment_result'),
        loadEncryptedItem<LabResultEntry[]>('lab_results'),
        loadEncryptedItem<ReminderItem[]>('reminders'),
        loadEncryptedItem<PairingState>('pairing'),
        loadEncryptedItem<ShareTokenState>('share_token'),
        loadEncryptedItem<QuestionTicketItem[]>('tickets'),
        loadEncryptedItem<Record<string, string[]>>('habit_log'),
        loadEncryptedItem<string>('cycle_start_date'),
        loadEncryptedItem<DoctorChecklistData>('doctor_checklist'),
        loadEncryptedItem<HealthJournal>('health_journal'),
      ]);

      if (!mounted) return;
      if (savedConsents) setConsents({ ...DEFAULT_CONSENTS, ...savedConsents });
      if (savedAnswers) setAssessmentAnswers(savedAnswers);
      if (savedResult) setAssessmentResult(savedResult);
      if (savedLabs) setLabResults(savedLabs);
      if (savedReminders) setReminders(savedReminders);
      if (savedPairing) setPairing(savedPairing);
      if (savedShare) setShareToken(savedShare);
      if (savedTickets && savedTickets.length > 0) setTickets(savedTickets);
      if (savedHabits) setHabitLog(savedHabits);
      if (savedCycleDate) setCycleStartDateState(savedCycleDate);
      if (savedChecklist) setDoctorChecklist(savedChecklist);
      if (savedJournal) setHealthJournal(normalizeJournal(savedJournal));

      const savedMode = localStorage.getItem('sbs_auth_mode');
      if (savedMode === 'account' || savedMode === 'nakes') {
        await hydrateAccountFromServer((localStorage.getItem('sbs_locale') as Locale) || 'id');
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = 'Side by Side — Better together.';
    const faviconEl = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (faviconEl) faviconEl.href = '/logo-icon.png';
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('text-scale-lg', 'text-scale-xl');
    if (textScale === 'lg') html.classList.add('text-scale-lg');
    if (textScale === 'xl') html.classList.add('text-scale-xl');
    localStorage.setItem('sbs_text_scale', textScale);
  }, [textScale]);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('sbs_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const startAnonymousMode = useCallback(async () => {
    if (authMode === 'account' || authMode === 'nakes') {
      await resetSessionLocalData();
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    }
    const anonId = 'anon-' + secureRandomCode(8).toLowerCase();
    const anonLabel = locale === 'en' ? 'Anonymous Mode (Private On-Device)' : 'Mode Anonim (Privat di Perangkat)';
    setAuthMode('anonymous');
    setUserId(anonId);
    setUserEmail(null);
    setDisplayName(anonLabel);
    localStorage.setItem('sbs_auth_mode', 'anonymous');
    localStorage.setItem('sbs_user_id', anonId);
    localStorage.removeItem('sbs_user_email');
    localStorage.setItem('sbs_display_name', anonLabel);
    setConsents(DEFAULT_CONSENTS);
    await saveEncryptedItem('consents', DEFAULT_CONSENTS);
    try {
      await fetch('/api/auth/anonymous', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: anonId }),
      });
    } catch {
      // Anonymous mode still works privately on-device
    }
  }, [authMode, locale, resetSessionLocalData]);

  const pushCurrentStateToServer = useCallback(
    async (
      targetUserId: string,
      opts?: {
        nextResults?: LabResultEntry[];
        nextReminders?: ReminderItem[];
        nextAssessment?: { answers: AssessmentAnswers; result: AssessmentEvaluationResult };
        nextCycleTracker?: { cycleStartDate: string; habitLog: Record<string, string[]> };
        nextDoctorChecklist?: DoctorChecklistData;
        nextJournal?: HealthJournal;
      }
    ): Promise<boolean> => {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            results: opts?.nextResults ?? labResults,
            reminders: opts?.nextReminders ?? reminders,
            ...(opts?.nextAssessment
              ? {
                  assessment: {
                    answers: opts.nextAssessment.answers,
                    level: opts.nextAssessment.result.levelCode,
                    summaryFactors: opts.nextAssessment.result.factors,
                  },
                }
              : {}),
            cycleTracker: opts?.nextCycleTracker ?? { cycleStartDate, habitLog },
            doctorChecklist: opts?.nextDoctorChecklist ?? doctorChecklist,
            journal: opts?.nextJournal ?? healthJournalRef.current,
          }),
        });
        if (res.ok) {
          const timeLocale = locale === 'en' ? 'en-US' : 'id-ID';
          const timeNow = new Date().toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' });
          setLastSyncTime(timeNow);
          setSyncError(null);
          localStorage.setItem('sbs_last_sync', timeNow);
          return true;
        }
        const errMsg = await parseErrorMessage(
          res,
          locale === 'en' ? 'Failed to sync with server.' : 'Gagal menyinkronkan data ke server.'
        );
        setSyncError(errMsg);
        return false;
      } catch {
        setSyncError(
          locale === 'en'
            ? 'Network unreachable. Changes saved locally on device.'
            : 'Jaringan tidak terjangkau. Perubahan tersimpan terenkripsi di perangkat.'
        );
        return false;
      }
    },
    [labResults, reminders, cycleStartDate, habitLog, doctorChecklist, locale]
  );

  const loginAccount = useCallback(
    async (
      email: string,
      role: 'user' | 'nakes',
      name?: string,
      serverUserId?: string,
      options?: LoginOptions
    ) => {
      const mode: AuthMode = role === 'nakes' ? 'nakes' : 'account';
      const derivedName = name || email.split('@')[0];
      const derivedId = serverUserId || 'user-' + email.replace(/[^a-z0-9]/gi, '').toLowerCase();

      if (!options?.preserveLocalOnRegister) {
        await resetSessionLocalData();
      }

      setAuthMode(mode);
      setUserId(derivedId);
      setUserEmail(email);
      setDisplayName(derivedName);
      localStorage.setItem('sbs_auth_mode', mode);
      localStorage.setItem('sbs_user_id', derivedId);
      localStorage.setItem('sbs_user_email', email);
      localStorage.setItem('sbs_display_name', derivedName);

      if (options?.preserveLocalOnRegister) {
        await pushCurrentStateToServer(derivedId, {
          nextAssessment:
            assessmentResult && Object.keys(assessmentAnswers).length > 0
              ? { answers: assessmentAnswers, result: assessmentResult }
              : undefined,
        });
        for (const [k, val] of Object.entries(consents) as [keyof ConsentState, boolean][]) {
          fetch(`/api/consents/${derivedId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: k, granted: val }),
          }).catch(() => {});
        }
      } else {
        await hydrateAccountFromServer(locale);
      }
    },
    [
      assessmentAnswers,
      assessmentResult,
      consents,
      hydrateAccountFromServer,
      locale,
      pushCurrentStateToServer,
      resetSessionLocalData,
    ]
  );

  const logoutToWelcome = useCallback(() => {
    void resetSessionLocalData();
    const freshAnonId = 'anon-' + secureRandomCode(8).toLowerCase();
    setAuthMode('welcome');
    setUserId(freshAnonId);
    setUserEmail(null);
    setDisplayName(locale === 'en' ? 'Anonymous User' : 'Pengguna Anonim');
    localStorage.setItem('sbs_auth_mode', 'welcome');
    localStorage.setItem('sbs_user_id', freshAnonId);
    localStorage.removeItem('sbs_user_email');
    localStorage.removeItem('sbs_display_name');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, [locale, resetSessionLocalData]);

  const updateProfile = useCallback(
    async (
      newName: string,
      passwordUpdate?: { currentPassword?: string; newPassword?: string }
    ): Promise<ActionResult> => {
      try {
        const res = await fetch(`/api/auth/profile/${userId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: newName,
            ...(passwordUpdate?.newPassword
              ? {
                  currentPassword: passwordUpdate.currentPassword,
                  newPassword: passwordUpdate.newPassword,
                }
              : {}),
          }),
        });
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              locale === 'en' ? 'Failed to update profile.' : 'Gagal memperbarui profil.'
            ),
          };
        }
        const data = (await res.json()) as { display_name?: string };
        const updatedName = data.display_name || newName;
        setDisplayName(updatedName);
        localStorage.setItem('sbs_display_name', updatedName);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error:
            locale === 'en'
              ? 'Unable to reach authentication server.'
              : 'Tidak dapat terhubung ke server autentikasi.',
        };
      }
    },
    [userId, locale]
  );

  const syncCloudData = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    const ok = await pushCurrentStateToServer(userId, {
      nextAssessment:
        assessmentResult && Object.keys(assessmentAnswers).length > 0
          ? { answers: assessmentAnswers, result: assessmentResult }
          : undefined,
    });
    setIsSyncing(false);
    return ok;
  }, [userId, assessmentAnswers, assessmentResult, pushCurrentStateToServer]);

  const setLocale = useCallback(
    (loc: Locale) => {
      setLocaleState(loc);
      localStorage.setItem('sbs_locale', loc);

      if (displayName === 'Pengguna Anonim' && loc === 'en') {
        setDisplayName('Anonymous User');
      } else if (displayName === 'Anonymous User' && loc === 'id') {
        setDisplayName('Pengguna Anonim');
      } else if (displayName === 'Mode Anonim (Privat di Perangkat)' && loc === 'en') {
        setDisplayName('Anonymous Mode (Private On-Device)');
      } else if (displayName === 'Anonymous Mode (Private On-Device)' && loc === 'id') {
        setDisplayName('Mode Anonim (Privat di Perangkat)');
      }

      if (Object.keys(assessmentAnswers).length > 0) {
        const reevaluated = evaluateAssessment(assessmentAnswers, undefined, undefined, loc);
        const updatedResult: AssessmentEvaluationResult = {
          ...reevaluated,
          showEmotionalSupport: Boolean(
            assessmentResult?.showEmotionalSupport || reevaluated.showEmotionalSupport
          ),
          evaluatedAt: assessmentResult?.evaluatedAt || reevaluated.evaluatedAt,
        };
        setAssessmentResult(updatedResult);
        void saveEncryptedItem('assessment_result', updatedResult);
      }

      if (pairing) {
        const nextPairing = localizePairing(pairing, loc);
        setPairing(nextPairing);
        void saveEncryptedItem('pairing', nextPairing);
      }

      if (authMode === 'account' || authMode === 'nakes') {
        fetch(`/api/auth/profile/${userId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: loc }),
        }).catch(() => {});
      }
    },
    [assessmentAnswers, assessmentResult, authMode, displayName, localizePairing, pairing, userId]
  );

  const setTextScale = useCallback((scale: TextScale) => {
    setTextScaleState(scale);
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setDarkModeState(dark);
  }, []);

  /** Pembaruan jurnal kesehatan (riwayat Cek Awal, check-in, jalur perawatan) — terenkripsi lokal & tersinkron untuk Mode Akun. */
  const updateHealthJournal = useCallback(
    async (updater: (current: HealthJournal) => HealthJournal): Promise<HealthJournal> => {
      const next: HealthJournal = boundJournal({
        ...updater(healthJournalRef.current),
        updatedAt: new Date().toISOString(),
      });
      setHealthJournal(next);
      await saveEncryptedItem('health_journal', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextJournal: next });
      }
      return next;
    },
    [authMode, pushCurrentStateToServer, setHealthJournal, userId]
  );

  const updateConsent = useCallback(
    async (key: keyof ConsentState, granted: boolean) => {
      const next = { ...consents, [key]: granted };
      setConsents(next);
      await saveEncryptedItem('consents', next);
      // Saat riwayat privat diaktifkan, Cek Awal terakhir menjadi titik awal riwayat progres.
      if (
        key === 'store_results' &&
        granted &&
        assessmentResult &&
        Object.keys(assessmentAnswers).length > 0 &&
        healthJournalRef.current.assessmentHistory.length === 0
      ) {
        await updateHealthJournal((j) => ({
          ...j,
          assessmentHistory: appendAssessmentSnapshot(
            j.assessmentHistory,
            createAssessmentSnapshot(assessmentAnswers, assessmentResult)
          ),
        }));
      }
      if (authMode === 'account' || authMode === 'nakes') {
        try {
          await fetch(`/api/consents/${userId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, granted }),
          });
        } catch {
          // Local encrypted preference retained
        }
      }
    },
    [consents, authMode, userId, assessmentResult, assessmentAnswers, updateHealthJournal]
  );

  const saveAssessment = useCallback(
    async (answers: AssessmentAnswers, freeText?: string) => {
      const result = evaluateAssessment(answers, freeText, undefined, locale);
      setAssessmentAnswers(answers);
      setAssessmentResult(result);
      await saveEncryptedItem('assessment_answers', answers);
      await saveEncryptedItem('assessment_result', result);

      if (pairing && pairing.status === 'active') {
        const actor: 'a' | 'b' = pairing.user_b && userId === pairing.user_b ? 'b' : 'a';
        const nextSteps = pairing.plan_steps.map((s) =>
          s.step_key === 'cek_awal'
            ? actor === 'b'
              ? { ...s, status_b: 'done' as const }
              : { ...s, status_a: 'done' as const }
            : s
        );
        const updatedPairing = { ...pairing, plan_steps: nextSteps };
        setPairing(updatedPairing);
        await saveEncryptedItem('pairing', updatedPairing);
        fetch(`/api/pairings/${pairing.invite_code}/step`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey: 'cek_awal', actor, status: 'done' }),
        }).catch(() => {});
      }

      // Riwayat longitudinal privat hanya dicatat bila pengguna menyetujui penyimpanan hasil (default OFF).
      let nextJournal: HealthJournal | undefined;
      if (consents.store_results) {
        nextJournal = {
          ...healthJournalRef.current,
          assessmentHistory: appendAssessmentSnapshot(
            healthJournalRef.current.assessmentHistory,
            createAssessmentSnapshot(answers, result)
          ),
          updatedAt: new Date().toISOString(),
        };
        setHealthJournal(nextJournal);
        await saveEncryptedItem('health_journal', nextJournal);
      }

      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, {
          nextAssessment: { answers, result },
          ...(nextJournal ? { nextJournal } : {}),
        });
      }

      return result;
    },
    [pairing, locale, authMode, userId, pushCurrentStateToServer, consents.store_results, setHealthJournal]
  );

  const addLabResult = useCallback(
    async (entry: Omit<LabResultEntry, 'id' | 'createdAt'>, attachment?: LabAttachmentData | null) => {
      const id = 'lab-' + Date.now();
      const newEntry: LabResultEntry = {
        ...entry,
        id,
        createdAt: new Date().toISOString(),
      };
      if (attachment) {
        await saveEncryptedItem(`lab_attachment_${id}`, attachment);
      }
      const next = [...labResults, newEntry].sort(
        (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
      );
      setLabResults(next);
      await saveEncryptedItem('lab_results', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextResults: next });
      }
    },
    [labResults, authMode, userId, pushCurrentStateToServer]
  );

  const editLabResult = useCallback(
    async (
      id: string,
      updates: Partial<Omit<LabResultEntry, 'id' | 'createdAt'>>,
      attachment?: LabAttachmentData | null
    ) => {
      if (attachment) {
        await saveEncryptedItem(`lab_attachment_${id}`, attachment);
      }
      const next = labResults
        .map((r) => (r.id === id ? { ...r, ...updates } : r))
        .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
      setLabResults(next);
      await saveEncryptedItem('lab_results', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextResults: next });
      }
    },
    [labResults, authMode, userId, pushCurrentStateToServer]
  );

  const deleteLabResult = useCallback(
    async (id: string) => {
      const next = labResults.filter((r) => r.id !== id);
      setLabResults(next);
      await saveEncryptedItem('lab_results', next);
      await removeEncryptedItem(`lab_attachment_${id}`);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextResults: next });
      }
    },
    [labResults, authMode, userId, pushCurrentStateToServer]
  );

  const loadLabAttachment = useCallback(async (resultId: string): Promise<LabAttachmentData | null> => {
    return loadEncryptedItem<LabAttachmentData>(`lab_attachment_${resultId}`);
  }, []);

  const addReminder = useCallback(
    async (rem: Omit<ReminderItem, 'id' | 'completed'>) => {
      const newRem: ReminderItem = {
        ...rem,
        id: 'rem-' + Date.now(),
        completed: false,
      };
      const next = [newRem, ...reminders];
      setReminders(next);
      await saveEncryptedItem('reminders', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextReminders: next });
      }
    },
    [reminders, authMode, userId, pushCurrentStateToServer]
  );

  const toggleReminder = useCallback(
    async (id: string) => {
      const next = reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
      setReminders(next);
      await saveEncryptedItem('reminders', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextReminders: next });
      }
    },
    [reminders, authMode, userId, pushCurrentStateToServer]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const next = reminders.filter((r) => r.id !== id);
      setReminders(next);
      await saveEncryptedItem('reminders', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextReminders: next });
      }
    },
    [reminders, authMode, userId, pushCurrentStateToServer]
  );

  const createNewPairing = useCallback(
    async (aliasA?: string, aliasB?: string): Promise<ActionResult<PairingState>> => {
      const isEn = locale === 'en';
      const resolvedA =
        aliasA?.trim() ||
        (!displayName.includes('Anonim') && !displayName.includes('Anonymous')
          ? displayName
          : isEn
          ? 'Partner A'
          : 'Pasangan A');
      const resolvedB = aliasB?.trim() || (isEn ? 'Partner B' : 'Pasangan B');

      const hasSession = await ensureServerSession();
      if (!hasSession) {
        return {
          ok: false,
          error: isEn
            ? 'Unable to connect to server to generate an active partner code.'
            : 'Tidak dapat terhubung ke server untuk membuat kode pasangan aktif.',
        };
      }

      try {
        const res = await fetch('/api/pairings', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerAAlias: resolvedA,
            partnerBAlias: resolvedB,
          }),
        });
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              isEn ? 'Failed to create partner invite code.' : 'Gagal membuat kode undangan pasangan.'
            ),
          };
        }
        const serverPairing = (await res.json()) as PairingState;
        const localizedServerPairing = localizePairing(serverPairing, locale);
        setPairing(localizedServerPairing);
        await saveEncryptedItem('pairing', localizedServerPairing);
        return { ok: true, data: localizedServerPairing };
      } catch {
        return {
          ok: false,
          error: isEn
            ? 'Network error while creating partner invite code.'
            : 'Terjadi gangguan jaringan saat membuat kode undangan pasangan.',
        };
      }
    },
    [displayName, ensureServerSession, locale, localizePairing]
  );

  const joinPairing = useCallback(
    async (code: string, aliasB?: string): Promise<ActionResult<PairingState>> => {
      const isEn = locale === 'en';
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode.length < 4) {
        return {
          ok: false,
          error: isEn ? 'Enter a valid 6-character partner code.' : 'Masukkan kode pasangan yang valid.',
        };
      }

      const hasSession = await ensureServerSession();
      if (!hasSession) {
        return {
          ok: false,
          error: isEn
            ? 'Unable to connect to server to verify partner code.'
            : 'Tidak dapat terhubung ke server untuk memverifikasi kode pasangan.',
        };
      }

      try {
        const res = await fetch(`/api/pairings/${encodeURIComponent(cleanCode)}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerBAlias:
              aliasB?.trim() ||
              (!displayName.includes('Anonim') && !displayName.includes('Anonymous')
                ? displayName
                : undefined),
          }),
        });
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              isEn ? 'Partner code not found or expired.' : 'Kode pasangan tidak ditemukan atau telah kedaluwarsa.'
            ),
          };
        }
        const serverPairing = (await res.json()) as PairingState;
        const localizedServerPairing = localizePairing(serverPairing, locale);
        setPairing(localizedServerPairing);
        await saveEncryptedItem('pairing', localizedServerPairing);
        return { ok: true, data: localizedServerPairing };
      } catch {
        return {
          ok: false,
          error: isEn
            ? 'Network error while connecting to partner.'
            : 'Gangguan jaringan saat menautkan kode pasangan.',
        };
      }
    },
    [displayName, ensureServerSession, locale, localizePairing]
  );

  const refreshPairing = useCallback(async (): Promise<ActionResult<PairingState>> => {
    if (!pairing || pairing.status !== 'active') {
      return { ok: false, error: 'No active pairing.' };
    }
    try {
      const res = await fetch(`/api/pairings/${encodeURIComponent(pairing.invite_code)}`, {
        credentials: 'include',
      });
      if (res.status === 404 || res.status === 410) {
        const expiredOrRevoked: PairingState = { ...pairing, status: 'revoked' };
        setPairing(expiredOrRevoked);
        await saveEncryptedItem('pairing', expiredOrRevoked);
        return {
          ok: false,
          error: await parseErrorMessage(res, 'Pairing expired or revoked.'),
        };
      }
      if (!res.ok) {
        return {
          ok: false,
          error: await parseErrorMessage(res, 'Failed to refresh pairing.'),
        };
      }
      const serverPairing = (await res.json()) as PairingState;
      const localized = localizePairing(serverPairing, locale);
      setPairing(localized);
      await saveEncryptedItem('pairing', localized);
      return { ok: true, data: localized };
    } catch {
      return { ok: false, error: 'Network error while refreshing pairing.' };
    }
  }, [locale, localizePairing, pairing]);

  const updatePlanStep = useCallback(
    async (
      stepKey: string,
      actor: 'a' | 'b',
      status: 'not_started' | 'in_progress' | 'done'
    ): Promise<ActionResult> => {
      if (!pairing) return { ok: false, error: 'No active pairing.' };
      const previous = pairing;
      const nextSteps = pairing.plan_steps.map((s) => {
        if (s.step_key !== stepKey) return s;
        return actor === 'a' ? { ...s, status_a: status } : { ...s, status_b: status };
      });
      const nextPairing = { ...pairing, plan_steps: nextSteps };
      setPairing(nextPairing);

      try {
        const res = await fetch(`/api/pairings/${encodeURIComponent(pairing.invite_code)}/step`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey, actor, status }),
        });
        if (!res.ok) {
          setPairing(previous);
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              locale === 'en' ? 'Failed to update step status.' : 'Gagal memperbarui status tahapan.'
            ),
          };
        }
        await saveEncryptedItem('pairing', nextPairing);
        return { ok: true };
      } catch {
        setPairing(previous);
        return {
          ok: false,
          error: locale === 'en' ? 'Network error updating step.' : 'Gangguan jaringan saat memperbarui tahapan.',
        };
      }
    },
    [locale, pairing]
  );

  const updatePairingSharedItems = useCallback(
    async (updates: Partial<PairingState['shared_items']>): Promise<ActionResult> => {
      if (!pairing) return { ok: false, error: 'No active pairing.' };
      const previous = pairing;
      const nextShared = { ...pairing.shared_items, ...updates };
      const optimistic = { ...pairing, shared_items: nextShared };
      setPairing(optimistic);

      try {
        const res = await fetch(`/api/pairings/${encodeURIComponent(pairing.invite_code)}/shared`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          setPairing(previous);
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              locale === 'en' ? 'Permission denied or sync failed.' : 'Izin ditolak atau gagal menyimpan perubahan.'
            ),
          };
        }
        const serverPairing = (await res.json()) as PairingState;
        const localized = localizePairing(serverPairing, locale);
        setPairing(localized);
        await saveEncryptedItem('pairing', localized);
        return { ok: true };
      } catch {
        setPairing(previous);
        return {
          ok: false,
          error: locale === 'en' ? 'Network error saving partner settings.' : 'Gangguan jaringan saat menyimpan.',
        };
      }
    },
    [locale, localizePairing, pairing]
  );

  const updatePrepChecklist = useCallback(
    async (items: PrepChecklistItem[]): Promise<ActionResult> => {
      if (!pairing) return { ok: false, error: 'No active pairing.' };
      const previous = pairing;
      const optimistic = { ...pairing, prep_checklist: items };
      setPairing(optimistic);
      try {
        const res = await fetch(`/api/pairings/${encodeURIComponent(pairing.invite_code)}/prep`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) {
          setPairing(previous);
          return {
            ok: false,
            error: await parseErrorMessage(res, 'Failed to sync prep checklist.'),
          };
        }
        const serverPairing = (await res.json()) as PairingState;
        const localized = localizePairing(serverPairing, locale);
        setPairing(localized);
        await saveEncryptedItem('pairing', localized);
        return { ok: true };
      } catch {
        setPairing(previous);
        return { ok: false, error: 'Network error updating prep checklist.' };
      }
    },
    [locale, localizePairing, pairing]
  );

  const revokePairing = useCallback(async (): Promise<ActionResult> => {
    if (!pairing) return { ok: false };
    try {
      const res = await fetch(`/api/pairings/${encodeURIComponent(pairing.invite_code)}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        return {
          ok: false,
          error: await parseErrorMessage(res, 'Failed to revoke pairing.'),
        };
      }
      const revoked: PairingState = { ...pairing, status: 'revoked' };
      setPairing(revoked);
      await saveEncryptedItem('pairing', revoked);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error revoking pairing.' };
    }
  }, [pairing]);

  const createShareToken = useCallback(
    async (scope: ShareScope[], options?: { aiAllowed?: boolean }): Promise<ActionResult<ShareTokenState>> => {
      const isEn = locale === 'en';
      const hasSession = await ensureServerSession();
      if (!hasSession) {
        return {
          ok: false,
          error: isEn
            ? 'Unable to reach server to generate a verifiable 1-hour QR token.'
            : 'Tidak dapat terhubung ke server untuk membuat token QR 1 jam yang terverifikasi.',
        };
      }

      const ttcDurationLabels: Record<string, string> = isEn
        ? {
            under_6_months: 'Trying to conceive < 6 months',
            '6_to_12_months': '6 to 12 months trying to conceive',
            '12_to_24_months': '12 to 24 months trying to conceive',
            over_24_months: 'Over 24 months trying to conceive',
          }
        : {
            under_6_months: 'Kurang dari 6 bulan program hamil',
            '6_to_12_months': '6 sampai 12 bulan program hamil',
            '12_to_24_months': '12 sampai 24 bulan program hamil',
            over_24_months: 'Lebih dari 24 bulan program hamil',
          };

      const snapshot: ShareTokenState['snapshot'] = {
        patientAlias:
          displayName.includes('Anonim') || displayName.includes('Anonymous')
            ? isEn
              ? 'Patient (Anonymous Mode)'
              : 'Pasien (Mode Anonim)'
            : displayName,
      };
      if (scope.includes('history')) {
        const durationKey = typeof assessmentAnswers.ttc_duration === 'string' ? assessmentAnswers.ttc_duration : '';
        snapshot.programDuration =
          ttcDurationLabels[durationKey] ||
          (isEn ? 'TTC duration not specified yet' : 'Belum mengisi durasi program hamil');
        snapshot.assessmentLevel =
          assessmentResult?.levelLabel ||
          (isEn ? 'Self-Check not yet completed' : 'Belum menyelesaikan Cek Awal');
      }
      if (scope.includes('risk_factors')) {
        snapshot.reportedRiskFactors = assessmentResult
          ? assessmentResult.factors.length > 0
            ? assessmentResult.factors.map((f) => `${f.factorTitle} (${f.topic})`)
            : [
                isEn
                  ? 'No major contributing risk factors reported in Self-Check'
                  : 'Tidak ada faktor risiko utama yang dilaporkan pada Cek Awal',
              ]
          : [isEn ? 'Self-Check not yet completed' : 'Belum menyelesaikan Cek Awal'];
      }
      if (scope.includes('risk_factors') && assessmentResult && Object.keys(assessmentAnswers).length > 0) {
        const exp = explainAssessment(assessmentAnswers, locale);
        const loc = isEn ? 'en' : 'id';
        snapshot.riskExplanation = {
          headline: exp.headline,
          reasons: exp.reasons.map((r) => r.text),
          domains: exp.domains.map((d) => ({ title: d.title, influence: INFLUENCE_LABELS[loc][d.influence] })),
          factors: exp.factors.map((f) => ({
            title: f.title,
            influence: INFLUENCE_LABELS[loc][f.influence],
            changeability: CHANGEABILITY_LABELS[loc][f.changeability],
            decisive: f.isDecisive,
          })),
        };
      }
      if (scope.includes('care_pathway')) {
        const pathway = healthJournalRef.current.carePathway;
        const rec = assessmentResult
          ? recommendSpecialist(assessmentAnswers, assessmentResult.levelCode, locale)
          : null;
        const chosen = pathway.specialistKey || rec?.primary;
        snapshot.referral = {
          specialist: chosen
            ? isEn
              ? SPECIALISTS[chosen].name.en
              : SPECIALISTS[chosen].name.id
            : isEn
            ? 'Not chosen yet'
            : 'Belum dipilih',
          reasons: rec?.reasons ?? [],
          firstTests: (rec?.firstTests ?? []).map((t) => (isEn ? FIRST_TESTS[t].en : FIRST_TESTS[t].id)),
          route: pathway.route
            ? pathway.route === 'jkn'
              ? isEn
                ? 'JKN tiered referral (FKTP → hospital)'
                : 'Rujukan berjenjang JKN (FKTP → RS)'
              : isEn
              ? 'Private / self-referral'
              : 'Mandiri / swasta'
            : undefined,
          facility: pathway.facility?.name,
          appointmentAt: pathway.appointmentAt,
        };
      }
      if (scope.includes('progress')) {
        const journal = healthJournalRef.current;
        const loc = isEn ? 'en' : 'id';
        const levelLabels = getLevelLabels(loc);
        const lines: string[] = [];
        for (const snap of journal.assessmentHistory.slice(-4)) {
          lines.push(
            `${snap.takenAt.slice(0, 10)} — ${isEn ? 'Self-check' : 'Cek Awal'}: ${levelLabels[snap.levelCode]}`
          );
        }
        for (const def of NUMERIC_METRICS) {
          const trend = describeMetricTrend(journal.checkIns, def, loc);
          if (trend) lines.push(trend.text);
        }
        snapshot.progressSummary =
          lines.length > 0
            ? lines
            : [isEn ? 'No private progress history recorded yet.' : 'Belum ada riwayat progres privat yang tercatat.'];
      }
      if (scope.includes('lab_results')) {
        snapshot.labResults = labResults;
      }
      if (options?.aiAllowed) {
        snapshot.aiAllowed = true;
      }

      try {
        const res = await fetch('/api/share-tokens', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, snapshot }),
        });
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              isEn ? 'Failed to generate QR share token.' : 'Gagal membuat kode QR berbagi.'
            ),
          };
        }
        const data = (await res.json()) as { token_code: string; expires_at: string };
        const tokenObj: ShareTokenState = {
          token_code: data.token_code,
          scope,
          expires_at: data.expires_at,
          revoked: false,
          accessed_log: [],
          snapshot,
        };
        setShareToken(tokenObj);
        await saveEncryptedItem('share_token', tokenObj);
        return { ok: true, data: tokenObj };
      } catch {
        return {
          ok: false,
          error: isEn ? 'Network error creating QR token.' : 'Gangguan jaringan saat membuat token QR.',
        };
      }
    },
    [displayName, assessmentAnswers, assessmentResult, labResults, ensureServerSession, locale]
  );

  /** Mengambil rencana pasca-konsultasi yang ditulis dokter melalui kode QR, lalu menggabungkannya ke Jalur Perawatan. */
  const fetchClinicianCarePlans = useCallback(async (): Promise<ActionResult<number>> => {
    const isEn = locale === 'en';
    const hasSession = await ensureServerSession();
    if (!hasSession) {
      return {
        ok: false,
        error: isEn
          ? 'Unable to reach the server to check for your doctor’s care plan.'
          : 'Tidak dapat terhubung ke server untuk memeriksa rencana dari dokter.',
      };
    }
    try {
      const res = await fetch('/api/care-plans', { credentials: 'include' });
      if (!res.ok) {
        return {
          ok: false,
          error: await parseErrorMessage(
            res,
            isEn ? 'Failed to load care plans.' : 'Gagal memuat rencana perawatan.'
          ),
        };
      }
      const plans = (await res.json()) as ClinicianCarePlan[];
      const { pathway, importedCount } = importClinicianPlans(
        healthJournalRef.current.carePathway,
        Array.isArray(plans) ? plans : []
      );
      if (importedCount > 0) {
        await updateHealthJournal((j) => ({ ...j, carePathway: pathway }));
      }
      return { ok: true, data: importedCount };
    } catch {
      return {
        ok: false,
        error: isEn ? 'Network error loading care plans.' : 'Gangguan jaringan saat memuat rencana perawatan.',
      };
    }
  }, [ensureServerSession, locale, updateHealthJournal]);

  const refreshShareTokenAudit = useCallback(async (): Promise<ActionResult<ShareTokenState>> => {
    if (!shareToken) return { ok: false, error: 'No share token.' };
    try {
      const res = await fetch(`/api/share-tokens/${encodeURIComponent(shareToken.token_code)}/audit`, {
        credentials: 'include',
      });
      if (!res.ok) {
        return { ok: false, error: await parseErrorMessage(res, 'Failed to load audit log.') };
      }
      const data = (await res.json()) as {
        revoked: boolean;
        expires_at: string;
        accessed_log: AccessLogEntry[];
        care_plan_written_at?: string | null;
      };
      const updated: ShareTokenState = {
        ...shareToken,
        revoked: data.revoked,
        expires_at: data.expires_at,
        accessed_log: data.accessed_log,
        care_plan_written_at: data.care_plan_written_at ?? null,
      };
      setShareToken(updated);
      await saveEncryptedItem('share_token', updated);
      return { ok: true, data: updated };
    } catch {
      return { ok: false, error: 'Network error loading audit log.' };
    }
  }, [shareToken]);

  const revokeShareToken = useCallback(async (): Promise<ActionResult> => {
    if (!shareToken) return { ok: false };
    try {
      const res = await fetch(`/api/share-tokens/${encodeURIComponent(shareToken.token_code)}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        return {
          ok: false,
          error: await parseErrorMessage(res, 'Failed to revoke share token.'),
        };
      }
      const next = { ...shareToken, revoked: true };
      setShareToken(next);
      await saveEncryptedItem('share_token', next);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error revoking share token.' };
    }
  }, [shareToken]);

  const recordNakesAccess = useCallback(
    async (
      code: string,
      viewerName = locale === 'en' ? 'Healthcare Provider' : 'Tenaga Kesehatan'
    ): Promise<ActionResult<ShareTokenState>> => {
      const isEn = locale === 'en';
      try {
        const res = await fetch(
          `/api/share-tokens/${encodeURIComponent(code.trim().toUpperCase())}?viewer=${encodeURIComponent(
            viewerName
          )}`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              isEn
                ? 'Summary code not found, revoked by patient, or expired.'
                : 'Kode ringkasan tidak ditemukan, sudah dicabut pasien, atau kedaluwarsa.'
            ),
          };
        }
        const serverToken = (await res.json()) as ShareTokenState;
        return { ok: true, data: serverToken };
      } catch {
        return {
          ok: false,
          error: isEn
            ? 'Unable to connect to server to verify summary code.'
            : 'Tidak dapat terhubung ke server untuk memverifikasi kode ringkasan.',
        };
      }
    },
    [locale]
  );

  const refreshTickets = useCallback(async (): Promise<ActionResult<QuestionTicketItem[]>> => {
    if (authMode === 'welcome') return { ok: true, data: tickets };
    const hasSession = await ensureServerSession();
    if (!hasSession) {
      return { ok: false, error: 'Session unavailable.' };
    }
    try {
      const res = await fetch('/api/tickets', { credentials: 'include' });
      if (!res.ok) {
        return { ok: false, error: await parseErrorMessage(res, 'Failed to load question tickets.') };
      }
      const rows = (await res.json()) as QuestionTicketItem[];
      setTickets(rows);
      await saveEncryptedItem('tickets', rows);
      return { ok: true, data: rows };
    } catch {
      return { ok: false, error: 'Network error loading tickets.' };
    }
  }, [authMode, ensureServerSession, tickets]);

  const submitQuestionTicket = useCallback(
    async (category: string, text: string): Promise<ActionResult<QuestionTicketItem>> => {
      const isEn = locale === 'en';
      const hasSession = await ensureServerSession();
      if (!hasSession) {
        return {
          ok: false,
          error: isEn
            ? 'Unable to connect to server to send your question.'
            : 'Tidak dapat terhubung ke server untuk mengirim pertanyaan Anda.',
        };
      }
      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, text }),
        });
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              isEn ? 'Failed to submit question ticket.' : 'Gagal mengirim tiket pertanyaan.'
            ),
          };
        }
        const saved = (await res.json()) as QuestionTicketItem;
        const next = [saved, ...tickets];
        setTickets(next);
        await saveEncryptedItem('tickets', next);
        return { ok: true, data: saved };
      } catch {
        return {
          ok: false,
          error: isEn ? 'Network error sending ticket.' : 'Gangguan jaringan saat mengirim tiket.',
        };
      }
    },
    [ensureServerSession, locale, tickets]
  );

  const replyToTicket = useCallback(
    async (ticketId: string, replyText: string): Promise<ActionResult<QuestionTicketItem>> => {
      const isEn = locale === 'en';
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/reply`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyText }),
        });
        if (!res.ok) {
          return {
            ok: false,
            error: await parseErrorMessage(
              res,
              isEn ? 'Failed to publish clinical reply.' : 'Gagal mengirim jawaban klinis.'
            ),
          };
        }
        const updated = (await res.json()) as QuestionTicketItem;
        const next = tickets.map((tItem) => (tItem.id === ticketId ? updated : tItem));
        setTickets(next);
        await saveEncryptedItem('tickets', next);
        return { ok: true, data: updated };
      } catch {
        return {
          ok: false,
          error: isEn ? 'Network error sending reply.' : 'Gangguan jaringan saat membalas tiket.',
        };
      }
    },
    [tickets, locale]
  );

  const toggleDailyHabit = useCallback(
    async (dateStr: string, habitKey: string) => {
      const currentList = habitLog[dateStr] || [];
      const exists = currentList.includes(habitKey);
      const updatedList = exists
        ? currentList.filter((k) => k !== habitKey)
        : [...currentList, habitKey];
      const next = { ...habitLog, [dateStr]: updatedList };
      setHabitLog(next);
      await saveEncryptedItem('habit_log', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, {
          nextCycleTracker: { cycleStartDate, habitLog: next },
        });
      }
    },
    [authMode, cycleStartDate, habitLog, pushCurrentStateToServer, userId]
  );

  const setCycleStartDate = useCallback(
    async (dateStr: string) => {
      setCycleStartDateState(dateStr);
      await saveEncryptedItem('cycle_start_date', dateStr);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, {
          nextCycleTracker: { cycleStartDate: dateStr, habitLog },
        });
      }
    },
    [authMode, habitLog, pushCurrentStateToServer, userId]
  );

  const saveDoctorChecklist = useCallback(
    async (next: DoctorChecklistData) => {
      setDoctorChecklist(next);
      await saveEncryptedItem('doctor_checklist', next);
      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, { nextDoctorChecklist: next });
      }
    },
    [authMode, pushCurrentStateToServer, userId]
  );

  const importBackupData = useCallback(
    async (rawJson: string): Promise<ActionResult<ParsedBackupData['summary']>> => {
      const parsed = parseBackupJson(rawJson, locale);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      const data = parsed.data;

      let nextAssessmentOverride: { answers: AssessmentAnswers; result: AssessmentEvaluationResult } | undefined;
      if (data.consents) {
        const mergedConsents: ConsentState = { ...consents, ...data.consents };
        setConsents(mergedConsents);
        await saveEncryptedItem('consents', mergedConsents);
      }
      if (data.assessmentAnswers) {
        const evaluated = evaluateAssessment(data.assessmentAnswers, undefined, undefined, locale);
        setAssessmentAnswers(data.assessmentAnswers);
        setAssessmentResult(evaluated);
        await saveEncryptedItem('assessment_answers', data.assessmentAnswers);
        await saveEncryptedItem('assessment_result', evaluated);
        nextAssessmentOverride = { answers: data.assessmentAnswers, result: evaluated };
      }
      if (data.labResults) {
        setLabResults(data.labResults);
        await saveEncryptedItem('lab_results', data.labResults);
      }
      if (data.reminders) {
        setReminders(data.reminders);
        await saveEncryptedItem('reminders', data.reminders);
      }
      if (data.cycleStartDate) {
        setCycleStartDateState(data.cycleStartDate);
        await saveEncryptedItem('cycle_start_date', data.cycleStartDate);
      }
      if (data.habitLog) {
        setHabitLog(data.habitLog);
        await saveEncryptedItem('habit_log', data.habitLog);
      }
      if (data.doctorChecklist) {
        setDoctorChecklist(data.doctorChecklist);
        await saveEncryptedItem('doctor_checklist', data.doctorChecklist);
      }
      if (data.healthJournal) {
        setHealthJournal(data.healthJournal);
        await saveEncryptedItem('health_journal', data.healthJournal);
      }

      if (authMode === 'account' || authMode === 'nakes') {
        void pushCurrentStateToServer(userId, {
          ...(nextAssessmentOverride ? { nextAssessment: nextAssessmentOverride } : {}),
          ...(data.labResults ? { nextResults: data.labResults } : {}),
          ...(data.reminders ? { nextReminders: data.reminders } : {}),
          ...(data.cycleStartDate || data.habitLog
            ? {
                nextCycleTracker: {
                  cycleStartDate: data.cycleStartDate ?? cycleStartDate,
                  habitLog: data.habitLog ?? habitLog,
                },
              }
            : {}),
          ...(data.doctorChecklist ? { nextDoctorChecklist: data.doctorChecklist } : {}),
          ...(data.healthJournal ? { nextJournal: data.healthJournal } : {}),
        });
      }

      return { ok: true, data: data.summary };
    },
    [authMode, consents, cycleStartDate, habitLog, locale, pushCurrentStateToServer, setHealthJournal, userId]
  );

  const wipeAllData = useCallback(async () => {
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}/data`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // Tetap lanjutkan penghapusan lokal walaupun server tidak terhubung
    }
    await wipeAllLocalData();
    const freshAnonId = 'anon-' + secureRandomCode(8).toLowerCase();
    setAuthMode('welcome');
    setUserId(freshAnonId);
    setUserEmail(null);
    setDisplayName(locale === 'en' ? 'Anonymous User' : 'Pengguna Anonim');
    setConsents(DEFAULT_CONSENTS);
    setAssessmentAnswers({});
    setAssessmentResult(null);
    setLabResults([]);
    setReminders([]);
    setPairing(null);
    setShareToken(null);
    setTickets([]);
    setHabitLog({});
    setCycleStartDateState(new Date().toISOString().slice(0, 10));
    setDoctorChecklist(DEFAULT_DOCTOR_CHECKLIST);
    setHealthJournal(createEmptyJournal());
    setLastSyncTime(null);
    setSyncError(null);
  }, [userId, locale, setHealthJournal]);

  return (
    <AppContext.Provider
      value={{
        authMode,
        userId,
        userEmail,
        displayName,
        locale,
        textScale,
        darkMode,
        consents,
        assessmentAnswers,
        assessmentResult,
        labResults,
        reminders,
        pairing,
        shareToken,
        tickets,
        habitLog,
        cycleStartDate,
        doctorChecklist,
        healthJournal,
        lastSyncTime,
        syncError,
        isSyncing,
        startAnonymousMode,
        loginAccount,
        logoutToWelcome,
        updateProfile,
        syncCloudData,
        setLocale,
        setTextScale,
        setDarkMode,
        updateConsent,
        saveAssessment,
        addLabResult,
        editLabResult,
        deleteLabResult,
        loadLabAttachment,
        addReminder,
        toggleReminder,
        deleteReminder,
        updatePlanStep,
        updatePairingSharedItems,
        updatePrepChecklist,
        createNewPairing,
        joinPairing,
        refreshPairing,
        revokePairing,
        createShareToken,
        refreshShareTokenAudit,
        revokeShareToken,
        recordNakesAccess,
        refreshTickets,
        submitQuestionTicket,
        replyToTicket,
        toggleDailyHabit,
        setCycleStartDate,
        saveDoctorChecklist,
        updateHealthJournal,
        fetchClinicianCarePlans,
        importBackupData,
        wipeAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp harus digunakan di dalam AppProvider');
  }
  return ctx;
}
