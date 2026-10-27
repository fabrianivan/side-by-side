import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  loadEncryptedItem,
  saveEncryptedItem,
  wipeAllLocalData,
  hasSecurityPin,
  setSecurityPin,
  verifySecurityPin,
  clearSecurityPin,
} from '../lib/crypto-storage';
import {
  evaluateAssessment,
  RENDRA_DEMO_ANSWERS,
  type AssessmentAnswers,
  type AssessmentEvaluationResult,
} from '../lib/assessment-engine';
import type { Locale } from '../i18n';

export type AuthMode = 'welcome' | 'anonymous' | 'account' | 'nakes';
export type DemoPersona = 'rendra' | 'sari' | 'maya' | 'custom';
export type TextScale = 'normal' | 'lg' | 'xl';

export interface ConsentState {
  store_results: boolean;
  share_partner: boolean;
  share_nakes: boolean;
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

export interface PairingState {
  invite_code: string;
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
  plan_steps: PlanStepItem[];
}

export interface AccessLogEntry {
  accessed_at: string;
  viewer_name: string;
  viewer_role: string;
  action: string;
}

export interface ShareTokenState {
  token_code: string;
  scope: ('history' | 'risk_factors' | 'lab_results')[];
  expires_at: string;
  revoked: boolean;
  accessed_log: AccessLogEntry[];
  snapshot: {
    patientAlias: string;
    programDuration?: string;
    assessmentLevel?: string;
    reportedRiskFactors?: string[];
    labResults?: LabResultEntry[];
  };
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

interface AppContextValue {
  authMode: AuthMode;
  activePersona: DemoPersona;
  userId: string;
  userEmail: string | null;
  displayName: string;
  locale: Locale;
  textScale: TextScale;
  darkMode: boolean;
  discreetMode: boolean;
  hasPin: boolean;
  isLocked: boolean;
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
  lastSyncTime: string | null;
  isSyncing: boolean;

  // Actions
  startAnonymousMode: () => Promise<void>;
  loginAccount: (email: string, role: 'user' | 'nakes', name?: string) => Promise<void>;
  logoutToWelcome: () => void;
  updateProfile: (name: string, newPassword?: string) => Promise<boolean>;
  syncCloudData: () => Promise<boolean>;
  setLocale: (loc: Locale) => void;
  setTextScale: (scale: TextScale) => void;
  setDarkMode: (dark: boolean) => void;
  setDiscreetMode: (discreet: boolean) => void;
  setupPin: (pin: string) => Promise<void>;
  removePin: () => void;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<boolean>;
  updateConsent: (key: keyof ConsentState, granted: boolean) => Promise<void>;
  saveAssessment: (answers: AssessmentAnswers, freeText?: string) => Promise<AssessmentEvaluationResult>;
  addLabResult: (entry: Omit<LabResultEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteLabResult: (id: string) => Promise<void>;
  addReminder: (rem: Omit<ReminderItem, 'id' | 'completed'>) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updatePlanStep: (stepKey: string, actor: 'a' | 'b', status: 'not_started' | 'in_progress' | 'done') => Promise<void>;
  updatePairingSharedItems: (updates: Partial<PairingState['shared_items']>) => Promise<void>;
  createNewPairing: (aliasA?: string, aliasB?: string) => Promise<void>;
  revokePairing: () => Promise<void>;
  createShareToken: (scope: ('history' | 'risk_factors' | 'lab_results')[]) => Promise<ShareTokenState>;
  revokeShareToken: () => Promise<void>;
  recordNakesAccess: (code: string, viewerName?: string) => Promise<ShareTokenState | null>;
  submitQuestionTicket: (category: string, text: string) => Promise<void>;
  replyToTicket: (ticketId: string, replyText: string, repliedBy?: string) => Promise<void>;
  toggleDailyHabit: (dateStr: string, habitKey: string) => Promise<void>;
  setCycleStartDate: (dateStr: string) => Promise<void>;
  loadRendraDemoScenario: () => Promise<void>;
  switchDemoPersona: (persona: DemoPersona) => Promise<void>;
  wipeAllData: () => Promise<void>;
}

const DEFAULT_CONSENTS: ConsentState = {
  store_results: false,
  share_partner: false,
  share_nakes: false,
};

const DEFAULT_PLAN_STEPS: PlanStepItem[] = [
  { step_key: 'cek_awal', step_order: 1, title: 'Cek Awal Mandiri', status_a: 'not_started', status_b: 'not_started' },
  { step_key: 'pilih_layanan', step_order: 2, title: 'Pilih Layanan Pemeriksaan', status_a: 'not_started', status_b: 'not_started' },
  { step_key: 'jadwalkan', step_order: 3, title: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)', status_a: 'not_started', status_b: 'not_started' },
  { step_key: 'periksa', step_order: 4, title: 'Kunjungan Pemeriksaan', status_a: 'not_started', status_b: 'not_started' },
  { step_key: 'pahami_hasil', step_order: 5, title: 'Pahami Hasil Bersama', status_a: 'not_started', status_b: 'not_started' },
  { step_key: 'tindak_lanjut', step_order: 6, title: 'Rencana Tindak Lanjut Dokter', status_a: 'not_started', status_b: 'not_started' },
];

const RENDRA_SAMPLE_LABS: LabResultEntry[] = [
  {
    id: 'lab-rendra-1',
    testDate: '2026-08-10',
    volume_ml: 2.1,
    concentration_m_per_ml: 14.5,
    total_motility_pct: 39,
    progressive_motility_pct: 28,
    morphology_normal_pct: 4.0,
    notes: 'Pemeriksaan perdana di lab klinik (sempat sering pangku laptop & tidur < 6 jam).',
    attachmentName: 'Hasil_Lab_Agustus_2026.jpg (Tersimpan Lokal)',
    createdAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'lab-rendra-2',
    testDate: '2026-10-18',
    volume_ml: 2.4,
    concentration_m_per_ml: 18.5,
    total_motility_pct: 45,
    progressive_motility_pct: 33,
    morphology_normal_pct: 4.5,
    notes: 'Pemeriksaan kedua setelah 2 bulan rutin jalan pagi, tidur 7 jam, dan tidak memangku laptop.',
    attachmentName: 'Hasil_Lab_Oktober_2026.jpg (Tersimpan Lokal)',
    createdAt: '2026-10-18T10:00:00.000Z',
  },
];

const INITIAL_TICKETS: QuestionTicketItem[] = [
  {
    id: 'ticket-demo-1',
    category: 'Persiapan Tes & JKN',
    text: 'Dok, saya sudah 8 bulan promil bersama istri. Kalau mau analisis semen atau periksa di RS rujukan JKN, apakah saya bisa minta pengantar dari dokter umum Puskesmas dulu?',
    status: 'dijawab',
    reply_text:
      'Halo, terima kasih sudah berani bertanya. Ya, Anda sangat disarankan berkonsultasi ke dokter umum di Puskesmas/FKTP terlebih dahulu. Dokter akan melakukan wawancara medis dan pemeriksaan fisik dasar (misalnya mengecek ada tidaknya keluhan varikokel) untuk menentukan alur rujukan yang tepat.',
    replied_by: 'dr. Maya (Dokter Umum Puskesmas)',
    created_at: '2026-10-20T08:30:00.000Z',
  },
];

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    return (localStorage.getItem('sbs_auth_mode') as AuthMode) || 'welcome';
  });
  const [activePersona, setActivePersona] = useState<DemoPersona>('custom');
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('sbs_user_id') || 'anon-' + Math.random().toString(36).substring(2, 9);
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('sbs_user_email'));
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem('sbs_display_name') || 'Pengguna Anonim');
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem('sbs_locale') as Locale) || 'id');
  const [textScale, setTextScaleState] = useState<TextScale>(() => (localStorage.getItem('sbs_text_scale') as TextScale) || 'normal');
  const [darkMode, setDarkModeState] = useState<boolean>(() => localStorage.getItem('sbs_dark_mode') === 'true');
  const [discreetMode, setDiscreetModeState] = useState<boolean>(() => localStorage.getItem('sbs_discreet_mode') === 'true');
  const [hasPin, setHasPin] = useState<boolean>(() => hasSecurityPin());
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const [consents, setConsents] = useState<ConsentState>(DEFAULT_CONSENTS);
  const [assessmentAnswers, setAssessmentAnswers] = useState<AssessmentAnswers>({});
  const [assessmentResult, setAssessmentResult] = useState<AssessmentEvaluationResult | null>(null);
  const [labResults, setLabResults] = useState<LabResultEntry[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [shareToken, setShareToken] = useState<ShareTokenState | null>(null);
  const [tickets, setTickets] = useState<QuestionTicketItem[]>(INITIAL_TICKETS);
  const [habitLog, setHabitLog] = useState<Record<string, string[]>>({});
  const [cycleStartDate, setCycleStartDateState] = useState<string>(() =>
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('sbs_last_sync'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Muat data terenkripsi dari IndexedDB saat inisialisasi
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const savedConsents = await loadEncryptedItem<ConsentState>('consents');
      const savedAnswers = await loadEncryptedItem<AssessmentAnswers>('assessment_answers');
      const savedResult = await loadEncryptedItem<AssessmentEvaluationResult>('assessment_result');
      const savedLabs = await loadEncryptedItem<LabResultEntry[]>('lab_results');
      const savedReminders = await loadEncryptedItem<ReminderItem[]>('reminders');
      const savedPairing = await loadEncryptedItem<PairingState>('pairing');
      const savedShare = await loadEncryptedItem<ShareTokenState>('share_token');
      const savedTickets = await loadEncryptedItem<QuestionTicketItem[]>('tickets');
      const savedHabits = await loadEncryptedItem<Record<string, string[]>>('habit_log');
      const savedCycleDate = await loadEncryptedItem<string>('cycle_start_date');

      if (!mounted) return;
      if (savedConsents) setConsents(savedConsents);
      if (savedAnswers) setAssessmentAnswers(savedAnswers);
      if (savedResult) setAssessmentResult(savedResult);
      if (savedLabs) setLabResults(savedLabs);
      if (savedReminders) setReminders(savedReminders);
      if (savedPairing) setPairing(savedPairing);
      if (savedShare) setShareToken(savedShare);
      if (savedTickets && savedTickets.length > 0) setTickets(savedTickets);
      if (savedHabits) setHabitLog(savedHabits);
      if (savedCycleDate) setCycleStartDateState(savedCycleDate);
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  // Set judul dokumen dan ikon standar Side by Side
  useEffect(() => {
    document.title = 'Side by Side — Better together.';
    const faviconEl = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (faviconEl) faviconEl.href = '/logo-icon.png';
  }, []);

  // Sinkronkan ukuran teks dan mode gelap pada elemen <html>
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

  const startAnonymousMode = useCallback(async () => {
    const anonId = 'anon-' + Math.random().toString(36).substring(2, 9);
    setAuthMode('anonymous');
    setActivePersona('custom');
    setUserId(anonId);
    setUserEmail(null);
    setDisplayName('Mode Anonim (Privat di Perangkat)');
    localStorage.setItem('sbs_auth_mode', 'anonymous');
    localStorage.setItem('sbs_user_id', anonId);
    localStorage.removeItem('sbs_user_email');
    localStorage.setItem('sbs_display_name', 'Mode Anonim (Privat di Perangkat)');
    // Pastikan semua persetujuan default OFF
    setConsents(DEFAULT_CONSENTS);
    await saveEncryptedItem('consents', DEFAULT_CONSENTS);
  }, []);

  /**
   * Muat Skenario Demo Lengkap (Rendra, 32 thn, 8 bln promil bersama Sari, dr. Maya di Puskesmas).
   */
  const loadRendraDemoScenario = useCallback(async () => {
    const evalResult = evaluateAssessment(RENDRA_DEMO_ANSWERS);
    setAssessmentAnswers(RENDRA_DEMO_ANSWERS);
    setAssessmentResult(evalResult);
    setLabResults(RENDRA_SAMPLE_LABS);

    const demoReminders: ReminderItem[] = [
      {
        id: 'rem-rendra-1',
        type: 'semen_analysis',
        title: 'Pemeriksaan Analisis Semen & Konsultasi (Masa Pantang 3–4 Hari)',
        facilityName: 'RSUPN Dr. Cipto Mangunkusumo (Poli Urologi-Andrologi)',
        remindAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        notes: 'Mulai masa pantang (abstinensia) 3 hari sebelum jadwal tes. Bawa rujukan JKN & daftar pertanyaan dokter.',
        completed: false,
      },
      {
        id: 'rem-rendra-2',
        type: 'follow_up',
        title: 'Evaluasi Ulang Gaya Hidup (Siklus 74 Hari)',
        facilityName: 'Puskesmas Kecamatan Tebet (dr. Maya)',
        remindAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        notes: 'Diskusi hasil tren perbaikan konsentrasi & motilitas bersama dr. Maya.',
        completed: false,
      },
    ];
    setReminders(demoReminders);

    const demoPairing: PairingState = {
      invite_code: 'BERSAMA24',
      partner_a_alias: 'Rendra (Suami)',
      partner_b_alias: 'Sari (Istri)',
      status: 'active',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      shared_items: {
        shareAssessmentAnswers: false,
        shareAssessmentLevel: false,
        shareLabSummary: false,
        noteFromA: 'Aku mau kita cek bareng, bukan karena ada yang salah, tapi biar kita tahu langkah terbaik.',
        noteFromB: 'Terima kasih sudah mau melangkah bareng. Kita jalani pelan-pelan ya.',
      },
      plan_steps: [
        { step_key: 'cek_awal', step_order: 1, title: 'Cek Awal Mandiri', status_a: 'done', status_b: 'done' },
        { step_key: 'pilih_layanan', step_order: 2, title: 'Pilih Layanan Pemeriksaan', status_a: 'done', status_b: 'done' },
        { step_key: 'jadwalkan', step_order: 3, title: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)', status_a: 'in_progress', status_b: 'done' },
        { step_key: 'periksa', step_order: 4, title: 'Kunjungan Pemeriksaan', status_a: 'done', status_b: 'done' },
        { step_key: 'pahami_hasil', step_order: 5, title: 'Pahami Hasil Bersama', status_a: 'in_progress', status_b: 'in_progress' },
        { step_key: 'tindak_lanjut', step_order: 6, title: 'Rencana Tindak Lanjut Dokter', status_a: 'not_started', status_b: 'not_started' },
      ],
    };
    setPairing(demoPairing);

    const demoShare: ShareTokenState = {
      token_code: 'MAYA-RENDRA-1H',
      scope: ['history', 'risk_factors', 'lab_results'],
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      revoked: false,
      accessed_log: [
        {
          accessed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          viewer_name: 'dr. Maya (Puskesmas Kecamatan Tebet)',
          viewer_role: 'nakes',
          action: 'Melihat ringkasan pasien via Kode QR',
        },
      ],
      snapshot: {
        patientAlias: 'Rendra (32 thn)',
        programDuration: '8 bulan program hamil bersama istri (Sari, 30 thn)',
        assessmentLevel: evalResult.levelLabel,
        reportedRiskFactors: evalResult.factors.map((f) => `${f.factorTitle} (${f.topic})`),
        labResults: RENDRA_SAMPLE_LABS,
      },
    };
    setShareToken(demoShare);

    const demoConsents: ConsentState = {
      store_results: true,
      share_partner: true,
      share_nakes: true,
    };
    setConsents(demoConsents);

    const demoHabits: Record<string, string[]> = {
      [new Date().toISOString().slice(0, 10)]: ['cool_temp', 'hydration_antioxidant', 'sleep_rest'],
      [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)]: ['cool_temp', 'exercise', 'sleep_rest', 'no_smoke'],
      [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)]: ['cool_temp', 'hydration_antioxidant', 'exercise', 'sleep_rest'],
    };
    const demoCycleDate = new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setHabitLog(demoHabits);
    setCycleStartDateState(demoCycleDate);

    await saveEncryptedItem('consents', demoConsents);
    await saveEncryptedItem('assessment_answers', RENDRA_DEMO_ANSWERS);
    await saveEncryptedItem('assessment_result', evalResult);
    await saveEncryptedItem('lab_results', RENDRA_SAMPLE_LABS);
    await saveEncryptedItem('reminders', demoReminders);
    await saveEncryptedItem('pairing', demoPairing);
    await saveEncryptedItem('share_token', demoShare);
    await saveEncryptedItem('habit_log', demoHabits);
    await saveEncryptedItem('cycle_start_date', demoCycleDate);
  }, []);

  const switchDemoPersona = useCallback(
    async (persona: DemoPersona) => {
      setActivePersona(persona);
      await loadRendraDemoScenario();

      if (persona === 'rendra') {
        setAuthMode('account');
        setUserId('user-rendra-demo');
        setUserEmail('rendra@demo.id');
        setDisplayName('Rendra (Suami)');
        localStorage.setItem('sbs_auth_mode', 'account');
        localStorage.setItem('sbs_user_id', 'user-rendra-demo');
        localStorage.setItem('sbs_user_email', 'rendra@demo.id');
        localStorage.setItem('sbs_display_name', 'Rendra (Suami)');
      } else if (persona === 'sari') {
        setAuthMode('account');
        setUserId('user-sari-demo');
        setUserEmail('sari@demo.id');
        setDisplayName('Sari (Istri)');
        localStorage.setItem('sbs_auth_mode', 'account');
        localStorage.setItem('sbs_user_id', 'user-sari-demo');
        localStorage.setItem('sbs_user_email', 'sari@demo.id');
        localStorage.setItem('sbs_display_name', 'Sari (Istri)');
      } else if (persona === 'maya') {
        setAuthMode('nakes');
        setUserId('user-drmaya-demo');
        setUserEmail('maya@puskesmas.id');
        setDisplayName('dr. Maya (Dokter Puskesmas)');
        localStorage.setItem('sbs_auth_mode', 'nakes');
        localStorage.setItem('sbs_user_id', 'user-drmaya-demo');
        localStorage.setItem('sbs_user_email', 'maya@puskesmas.id');
        localStorage.setItem('sbs_display_name', 'dr. Maya (Dokter Puskesmas)');
      }
    },
    [loadRendraDemoScenario]
  );

  const loginAccount = useCallback(async (email: string, role: 'user' | 'nakes', name?: string) => {
    const lower = email.toLowerCase();
    if (lower.includes('rendra')) {
      await switchDemoPersona('rendra');
      return;
    }
    if (lower.includes('sari')) {
      await switchDemoPersona('sari');
      return;
    }
    if (lower.includes('maya')) {
      await switchDemoPersona('maya');
      return;
    }

    const mode: AuthMode = role === 'nakes' ? 'nakes' : 'account';
    const derivedName = name || email.split('@')[0];
    const derivedId = 'user-' + email.replace(/[^a-z0-9]/gi, '').toLowerCase();
    setAuthMode(mode);
    setActivePersona('custom');
    setUserId(derivedId);
    setUserEmail(email);
    setDisplayName(derivedName);
    localStorage.setItem('sbs_auth_mode', mode);
    localStorage.setItem('sbs_user_id', derivedId);
    localStorage.setItem('sbs_user_email', email);
    localStorage.setItem('sbs_display_name', derivedName);
  }, [switchDemoPersona]);

  const logoutToWelcome = useCallback(() => {
    setAuthMode('welcome');
    setActivePersona('custom');
    localStorage.setItem('sbs_auth_mode', 'welcome');
  }, []);

  const updateProfile = useCallback(
    async (newName: string, newPassword?: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/auth/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: newName, newPassword }),
        });
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.display_name);
          localStorage.setItem('sbs_display_name', data.display_name);
          return true;
        }
      } catch {
        // Fallback offline
      }
      setDisplayName(newName);
      localStorage.setItem('sbs_display_name', newName);
      return true;
    },
    [userId]
  );

  const syncCloudData = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          results: labResults,
          reminders,
        }),
      });
      if (res.ok) {
        const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeNow);
        localStorage.setItem('sbs_last_sync', timeNow);
        setIsSyncing(false);
        return true;
      }
    } catch {
      // offline safe
    }
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastSyncTime(timeNow);
    localStorage.setItem('sbs_last_sync', timeNow);
    setIsSyncing(false);
    return true;
  }, [userId, labResults, reminders]);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem('sbs_locale', loc);
  }, []);

  const setTextScale = useCallback((scale: TextScale) => {
    setTextScaleState(scale);
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setDarkModeState(dark);
  }, []);

  const setDiscreetMode = useCallback((discreet: boolean) => {
    setDiscreetModeState(discreet);
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    await setSecurityPin(pin);
    setHasPin(true);
  }, []);

  const removePin = useCallback(() => {
    clearSecurityPin();
    setHasPin(false);
    setIsLocked(false);
  }, []);

  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(async (pin: string) => {
    const ok = await verifySecurityPin(pin);
    if (ok) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const updateConsent = useCallback(
    async (key: keyof ConsentState, granted: boolean) => {
      const next = { ...consents, [key]: granted };
      setConsents(next);
      await saveEncryptedItem('consents', next);
      if (authMode === 'account') {
        try {
          await fetch(`/api/consents/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, granted }),
          });
        } catch {
          // Offline-safe
        }
      }
    },
    [consents, authMode, userId]
  );

  const saveAssessment = useCallback(
    async (answers: AssessmentAnswers, freeText?: string) => {
      const result = evaluateAssessment(answers, freeText);
      setAssessmentAnswers(answers);
      setAssessmentResult(result);
      // Di Mode Anonim maupun Akun, simpan terenkripsi AES-GCM di IndexedDB
      await saveEncryptedItem('assessment_answers', answers);
      await saveEncryptedItem('assessment_result', result);

      // Tandai langkah 'cek_awal' selesai bila ada pairing aktif
      if (pairing && pairing.status === 'active') {
        const nextSteps = pairing.plan_steps.map((s) =>
          s.step_key === 'cek_awal' ? { ...s, status_a: 'done' as const } : s
        );
        const updatedPairing = { ...pairing, plan_steps: nextSteps };
        setPairing(updatedPairing);
        await saveEncryptedItem('pairing', updatedPairing);
      }

      return result;
    },
    [pairing]
  );

  const addLabResult = useCallback(
    async (entry: Omit<LabResultEntry, 'id' | 'createdAt'>) => {
      const newEntry: LabResultEntry = {
        ...entry,
        id: 'lab-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const next = [...labResults, newEntry].sort(
        (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
      );
      setLabResults(next);
      await saveEncryptedItem('lab_results', next);
    },
    [labResults]
  );

  const deleteLabResult = useCallback(
    async (id: string) => {
      const next = labResults.filter((r) => r.id !== id);
      setLabResults(next);
      await saveEncryptedItem('lab_results', next);
    },
    [labResults]
  );

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
    },
    [reminders]
  );

  const toggleReminder = useCallback(
    async (id: string) => {
      const next = reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
      setReminders(next);
      await saveEncryptedItem('reminders', next);
    },
    [reminders]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const next = reminders.filter((r) => r.id !== id);
      setReminders(next);
      await saveEncryptedItem('reminders', next);
    },
    [reminders]
  );

  const createNewPairing = useCallback(
    async (aliasA = 'Rendra (Suami)', aliasB = 'Sari (Istri)') => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '24';
      const newPairing: PairingState = {
        invite_code: code,
        partner_a_alias: aliasA,
        partner_b_alias: aliasB,
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        shared_items: {
          shareAssessmentAnswers: false,
          shareAssessmentLevel: false,
          shareLabSummary: false,
          noteFromA: 'Aku mau kita cek bareng, bukan karena ada yang salah, tapi biar kita tahu langkah terbaik.',
          noteFromB: 'Terima kasih sudah mau melangkah bareng. Kita jalani pelan-pelan ya.',
        },
        plan_steps: DEFAULT_PLAN_STEPS.map((s) =>
          s.step_key === 'cek_awal' && assessmentResult
            ? { ...s, status_a: 'done' }
            : s
        ),
      };
      setPairing(newPairing);
      await saveEncryptedItem('pairing', newPairing);
    },
    [assessmentResult]
  );

  const updatePlanStep = useCallback(
    async (stepKey: string, actor: 'a' | 'b', status: 'not_started' | 'in_progress' | 'done') => {
      if (!pairing) return;
      const nextSteps = pairing.plan_steps.map((s) => {
        if (s.step_key !== stepKey) return s;
        return actor === 'a' ? { ...s, status_a: status } : { ...s, status_b: status };
      });
      const nextPairing = { ...pairing, plan_steps: nextSteps };
      setPairing(nextPairing);
      await saveEncryptedItem('pairing', nextPairing);
      try {
        await fetch(`/api/pairings/${pairing.invite_code}/step`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey, actor, status }),
        });
      } catch {
        // Offline-safe
      }
    },
    [pairing]
  );

  const updatePairingSharedItems = useCallback(
    async (updates: Partial<PairingState['shared_items']>) => {
      if (!pairing) return;
      const nextShared = { ...pairing.shared_items, ...updates };
      const nextPairing = { ...pairing, shared_items: nextShared };
      setPairing(nextPairing);
      await saveEncryptedItem('pairing', nextPairing);
    },
    [pairing]
  );

  const revokePairing = useCallback(async () => {
    if (!pairing) return;
    const revoked: PairingState = { ...pairing, status: 'revoked' };
    setPairing(revoked);
    await saveEncryptedItem('pairing', revoked);
    try {
      await fetch(`/api/pairings/${pairing.invite_code}/revoke`, { method: 'POST' });
    } catch {
      // Offline-safe
    }
  }, [pairing]);

  const createShareToken = useCallback(
    async (scope: ('history' | 'risk_factors' | 'lab_results')[]) => {
      const code = 'MAYA-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-1H';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const snapshot: ShareTokenState['snapshot'] = {
        patientAlias: displayName.includes('Anonim') ? 'Pasien (Mode Anonim)' : displayName,
      };
      if (scope.includes('history')) {
        snapshot.programDuration =
          assessmentAnswers.ttc_duration === '6_to_12_months'
            ? '6 sampai 12 bulan (8 bulan program hamil bersama istri)'
            : assessmentAnswers.ttc_duration === '12_to_24_months'
            ? 'Lebih dari 12 bulan'
            : 'Sedang dalam program hamil bersama pasangan';
        snapshot.assessmentLevel =
          assessmentResult?.levelLabel || 'Sebaiknya periksa dalam 1 sampai 2 bulan';
      }
      if (scope.includes('risk_factors')) {
        snapshot.reportedRiskFactors =
          assessmentResult && assessmentResult.factors.length > 0
            ? assessmentResult.factors.map((f) => `${f.factorTitle} (${f.topic})`)
            : [
                'Durasi program hamil 6–12 bulan (8 bulan)',
                'Paparan panas: memangku laptop & duduk > 6 jam/hari',
                'Kebiasaan merokok ringan/vape',
              ];
      }
      if (scope.includes('lab_results')) {
        snapshot.labResults = labResults;
      }

      const tokenObj: ShareTokenState = {
        token_code: code,
        scope,
        expires_at: expiresAt,
        revoked: false,
        accessed_log: [],
        snapshot,
      };

      try {
        const res = await fetch('/api/share-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, scope, snapshot }),
        });
        if (res.ok) {
          const data = await res.json();
          tokenObj.token_code = data.token_code;
          tokenObj.expires_at = data.expires_at;
        }
      } catch {
        // Gunakan token lokal bila server offline
      }

      setShareToken(tokenObj);
      await saveEncryptedItem('share_token', tokenObj);
      return tokenObj;
    },
    [displayName, assessmentAnswers, assessmentResult, labResults, userId]
  );

  const revokeShareToken = useCallback(async () => {
    if (!shareToken) return;
    const next = { ...shareToken, revoked: true };
    setShareToken(next);
    await saveEncryptedItem('share_token', next);
    try {
      await fetch(`/api/share-tokens/${shareToken.token_code}/revoke`, { method: 'POST' });
    } catch {
      // Offline-safe
    }
  }, [shareToken]);

  const recordNakesAccess = useCallback(
    async (code: string, viewerName = 'dr. Maya (Dokter Umum Puskesmas)'): Promise<ShareTokenState | null> => {
      // Coba ambil dari server terlebih dahulu
      try {
        const res = await fetch(
          `/api/share-tokens/${encodeURIComponent(code)}?viewer=${encodeURIComponent(viewerName)}`
        );
        if (res.ok) {
          const serverToken = (await res.json()) as ShareTokenState;
          if (shareToken && shareToken.token_code.toUpperCase() === code.toUpperCase()) {
            setShareToken(serverToken);
            await saveEncryptedItem('share_token', serverToken);
          }
          return serverToken;
        }
      } catch {
        // Fallback ke state lokal
      }

      if (shareToken && shareToken.token_code.toUpperCase() === code.toUpperCase()) {
        if (shareToken.revoked || new Date(shareToken.expires_at).getTime() < Date.now()) {
          return null;
        }
        const newLog: AccessLogEntry = {
          accessed_at: new Date().toISOString(),
          viewer_name: viewerName,
          viewer_role: 'nakes',
          action: 'Membuka Ringkasan Pasien via Kode/QR',
        };
        const updated: ShareTokenState = {
          ...shareToken,
          accessed_log: [newLog, ...shareToken.accessed_log],
        };
        setShareToken(updated);
        await saveEncryptedItem('share_token', updated);
        return updated;
      }
      return null;
    },
    [shareToken]
  );

  const submitQuestionTicket = useCallback(
    async (category: string, text: string) => {
      const newTicket: QuestionTicketItem = {
        id: 'ticket-' + Date.now(),
        category,
        text,
        status: 'terkirim',
        created_at: new Date().toISOString(),
      };
      const next = [newTicket, ...tickets];
      setTickets(next);
      await saveEncryptedItem('tickets', next);
      try {
        await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonToken: userId, category, text }),
        });
      } catch {
        // Offline-safe
      }
    },
    [tickets, userId]
  );

  const replyToTicket = useCallback(
    async (ticketId: string, replyText: string, repliedBy = 'dr. Maya (Dokter Umum Puskesmas)') => {
      const next = tickets.map((t) =>
        t.id === ticketId
          ? { ...t, status: 'dijawab' as const, reply_text: replyText, replied_by: repliedBy }
          : t
      );
      setTickets(next);
      await saveEncryptedItem('tickets', next);
      try {
        await fetch(`/api/tickets/${ticketId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyText, repliedBy }),
        });
      } catch {
        // Offline-safe
      }
    },
    [tickets]
  );

  const toggleDailyHabit = useCallback(
    async (dateStr: string, habitKey: string) => {
      setHabitLog((prev) => {
        const currentList = prev[dateStr] || [];
        const exists = currentList.includes(habitKey);
        const updatedList = exists
          ? currentList.filter((k) => k !== habitKey)
          : [...currentList, habitKey];
        const next = { ...prev, [dateStr]: updatedList };
        saveEncryptedItem('habit_log', next);
        return next;
      });
    },
    []
  );

  const setCycleStartDate = useCallback(async (dateStr: string) => {
    setCycleStartDateState(dateStr);
    await saveEncryptedItem('cycle_start_date', dateStr);
  }, []);

  const wipeAllData = useCallback(async () => {
    try {
      await fetch(`/api/users/${userId}/data`, { method: 'DELETE' });
    } catch {
      // Tetap lanjutkan penghapusan lokal walaupun server tidak terhubung
    }
    await wipeAllLocalData();
    setAuthMode('welcome');
    setActivePersona('custom');
    setUserEmail(null);
    setDisplayName('Pengguna Anonim');
    setConsents(DEFAULT_CONSENTS);
    setAssessmentAnswers({});
    setAssessmentResult(null);
    setLabResults([]);
    setReminders([]);
    setPairing(null);
    setShareToken(null);
    setTickets(INITIAL_TICKETS);
    setHabitLog({});
    setCycleStartDateState(new Date().toISOString().slice(0, 10));
    setDiscreetModeState(false);
    setHasPin(false);
    setIsLocked(false);
  }, [userId]);

  return (
    <AppContext.Provider
      value={{
        authMode,
        activePersona,
        userId,
        userEmail,
        displayName,
        locale,
        textScale,
        darkMode,
        discreetMode,
        hasPin,
        isLocked,
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
        lastSyncTime,
        isSyncing,
        startAnonymousMode,
        loginAccount,
        logoutToWelcome,
        updateProfile,
        syncCloudData,
        setLocale,
        setTextScale,
        setDarkMode,
        setDiscreetMode,
        setupPin,
        removePin,
        lockApp,
        unlockApp,
        updateConsent,
        saveAssessment,
        addLabResult,
        deleteLabResult,
        addReminder,
        toggleReminder,
        deleteReminder,
        updatePlanStep,
        updatePairingSharedItems,
        createNewPairing,
        revokePairing,
        createShareToken,
        revokeShareToken,
        recordNakesAccess,
        submitQuestionTicket,
        replyToTicket,
        toggleDailyHabit,
        setCycleStartDate,
        loadRendraDemoScenario,
        switchDemoPersona,
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
