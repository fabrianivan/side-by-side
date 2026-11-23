import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellPlus,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Download,
  FileText,
  HeartPulse,
  Inbox,
  LineChart,
  ListChecks,
  Lock,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Route as RouteIcon,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/ui';
import { getLocalizedFacilities, type LocalizedSeedFacility } from '../config/seed-facilities';
import {
  buildSuggestedCarePlan,
  computePathwayStages,
  CONSULT_OUTCOMES,
  describePlanItem,
  FIRST_TESTS,
  getRouteSteps,
  lifestyleFocusFromAnswers,
  localDateString,
  localDateTimeString,
  mergeCarePlanItems,
  ORDERED_TESTS,
  PATHWAY_STAGES,
  PREP_ITEMS,
  recommendSpecialist,
  SPECIALISTS,
  type CarePathwayState,
  type CarePlanItem,
  type CareRoute,
  type ConsultationLog,
  type ConsultOutcomeKey,
  type PathwayStageKey,
  type SpecialistKey,
  type StageStatus,
} from '../lib/care-pathway';
import { explainAssessment, INFLUENCE_LABELS, CHANGEABILITY_LABELS } from '../lib/risk-explainer';
import { describeMetricTrend, NUMERIC_METRICS } from '../lib/health-journal';
import { downloadIcsEvent } from '../lib/ics';
import { AiPlanExplainer } from '../components/AiPlanExplainer';

const todayStr = () => localDateString();

const STATUS_STYLES: Record<StageStatus, string> = {
  done: 'bg-status-success text-white',
  current: 'bg-brand-teal-strong text-white ring-4 ring-brand-teal/20',
  upcoming: 'bg-brand-navy/10 text-brand-navy/60 dark:bg-white/10 dark:text-white/60',
};

function formatDate(d: string | undefined, isEn: boolean, withTime = false): string {
  if (!d) return '';
  const date = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleString(isEn ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

const StageShell: React.FC<{
  index: number;
  stageKey: PathwayStageKey;
  status: StageStatus;
  title: string;
  description: string;
  isEn: boolean;
  hidden?: boolean;
  children: React.ReactNode;
}> = ({ index, stageKey, status, title, description, isEn, hidden, children }) => (
  <section
    id={`stage-${stageKey}`}
    aria-labelledby={`stage-${stageKey}-title`}
    className={`card p-5 sm:p-6 space-y-4 scroll-mt-24 ${status === 'current' ? 'border-brand-teal/60 ring-4 ring-brand-teal/10' : ''} ${hidden ? 'no-print' : ''}`}
  >
    <div className="flex items-start gap-3">
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${STATUS_STYLES[status]}`}
        aria-hidden="true"
      >
        {status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`stage-${stageKey}-title`} className="section-title">
            {title}
          </h2>
          <span
            className={`badge ${status === 'done' ? 'badge-success' : status === 'current' ? 'badge-teal' : 'badge-navy'}`}
          >
            {status === 'done'
              ? isEn
                ? 'Done'
                : 'Selesai'
              : status === 'current'
              ? isEn
                ? 'Next step'
                : 'Langkah berikutnya'
              : isEn
              ? 'Coming up'
              : 'Berikutnya'}
          </span>
        </div>
        <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="sm:pl-12 space-y-4">{children}</div>
  </section>
);

export const CarePathwayPage: React.FC = () => {
  const {
    locale,
    authMode,
    userId,
    displayName,
    assessmentAnswers,
    assessmentResult,
    labResults,
    pairing,
    doctorChecklist,
    healthJournal,
    updateHealthJournal,
    addReminder,
    updatePlanStep,
    fetchClinicianCarePlans,
  } = useApp();
  const isEn = locale === 'en';
  const loc: 'id' | 'en' = isEn ? 'en' : 'id';
  const navigate = useNavigate();
  const location = useLocation();
  const pathway = healthJournal.carePathway;

  const recommendation = useMemo(
    () => (assessmentResult ? recommendSpecialist(assessmentAnswers, assessmentResult.levelCode, loc) : null),
    [assessmentAnswers, assessmentResult, loc],
  );
  const explanation = useMemo(
    () => (assessmentResult ? explainAssessment(assessmentAnswers, loc) : null),
    [assessmentAnswers, assessmentResult, loc],
  );
  const stages = computePathwayStages(pathway, Boolean(assessmentResult));
  const statusOf = (k: PathwayStageKey) => stages.find((s) => s.key === k)?.status ?? 'upcoming';
  const doneCount = stages.filter((s) => s.status === 'done').length;

  const chosenSpecialist: SpecialistKey = pathway.specialistKey ?? recommendation?.primary ?? 'gp';
  const route: CareRoute = pathway.route ?? 'jkn';
  const [specialistDraft, setSpecialistDraft] = useState<SpecialistKey | null>(null);
  const activeSpecialistChoice = specialistDraft ?? chosenSpecialist;

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flash, setFlash] = useState<string>('');
  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(''), 4000);
  };

  const savePathway = (patch: Partial<CarePathwayState> | ((p: CarePathwayState) => CarePathwayState)) =>
    updateHealthJournal((j) => ({
      ...j,
      carePathway: typeof patch === 'function' ? patch(j.carePathway) : { ...j.carePathway, ...patch },
    }));

  const syncCouplePlan = (stepKey: string, status: 'in_progress' | 'done') => {
    if (!pairing || pairing.status !== 'active') return;
    const actor: 'a' | 'b' = pairing.user_b && userId === pairing.user_b ? 'b' : 'a';
    void updatePlanStep(stepKey, actor, status).catch(() => undefined);
  };

  /* ---------- Fasilitas yang sesuai (dari database /api/facilities dengan fallback kurasi lokal) ---------- */
  const [facilities, setFacilities] = useState<LocalizedSeedFacility[]>(() => getLocalizedFacilities(loc));
  useEffect(() => {
    setFacilities(getLocalizedFacilities(loc));
    const controller = new AbortController();
    fetch(`/api/facilities?locale=${loc}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
        const rows = (await res.json()) as LocalizedSeedFacility[];
        if (Array.isArray(rows) && rows.length > 0) {
          setFacilities(rows);
        }
      })
      .catch(() => {
        // Gunakan direktori terkurasi lokal saat offline
      });
    return () => controller.abort();
  }, [loc]);
  const availableCities = useMemo(
    () => Array.from(new Set(facilities.map((f) => f.city))).sort(),
    [facilities],
  );
  const matchingFacilities = useMemo(() => {
    const spec = SPECIALISTS[chosenSpecialist];
    return facilities
      .filter((f) => {
        if (route === 'jkn' && !f.accepts_jkn) return false;
        if (chosenSpecialist === 'gp' || chosenSpecialist === 'counselling') {
          return f.type === 'Puskesmas' || f.type === 'Klinik';
        }
        return spec.serviceTag ? f.services.includes(spec.serviceTag) : true;
      })
      .sort((a, b) => b.friendliness_score - a.friendliness_score);
  }, [facilities, chosenSpecialist, route]);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const visibleFacilities = matchingFacilities
    .filter((f) => cityFilter === 'all' || f.city === cityFilter)
    .slice(0, 4);

  const chooseFacility = async (f: LocalizedSeedFacility) => {
    await savePathway({
      facility: { id: f.id, name: f.name, city: f.city, type: f.displayType, acceptsJkn: f.accepts_jkn },
      route,
      specialistKey: pathway.specialistKey ?? chosenSpecialist,
    });
    syncCouplePlan('pilih_layanan', 'done');
    showFlash(isEn ? `${f.name} added to your pathway.` : `${f.name} ditambahkan ke jalur Anda.`);
  };

  /* ---------- Jadwal ---------- */
  const [appointmentDraft, setAppointmentDraft] = useState<string>(
    () => pathway.appointmentAt || localDateTimeString(new Date(Date.now() + 7 * 864e5)),
  );
  useEffect(() => {
    if (pathway.appointmentAt) {
      setAppointmentDraft(pathway.appointmentAt);
    }
  }, [pathway.appointmentAt]);

  // Gulir ke tahap tertentu bila datang dari tautan #stage-consult dsb.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);
  const saveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDraft) return;
    await savePathway({ appointmentAt: appointmentDraft });
    await addReminder({
      type: recommendation?.firstTests.includes('semen_analysis') ? 'semen_analysis' : 'initial_checkup',
      title: isEn
        ? `Visit: ${SPECIALISTS[chosenSpecialist].shortName.en}`
        : `Kunjungan: ${SPECIALISTS[chosenSpecialist].shortName.id}`,
      facilityName: pathway.facility?.name,
      remindAt: appointmentDraft,
      notes: isEn
        ? 'Bring your Referral Summary. For a semen analysis, plan 2–7 days of abstinence beforehand.'
        : 'Bawa Ringkasan Rujukan. Untuk analisis semen, atur masa pantang 2–7 hari sebelumnya.',
    });
    syncCouplePlan('jadwalkan', 'done');
    showFlash(isEn ? 'Visit date saved and reminder created.' : 'Tanggal kunjungan tersimpan dan pengingat dibuat.');
  };

  /* ---------- Konsultasi ---------- */
  const [consultDate, setConsultDate] = useState<string>(todayStr());
  const [consultType, setConsultType] = useState<SpecialistKey | ''>('');
  const [consultFacility, setConsultFacility] = useState<string>('');
  const [consultOutcomes, setConsultOutcomes] = useState<ConsultOutcomeKey[]>([]);
  const [consultAdvice, setConsultAdvice] = useState<string>('');
  const [consultNext, setConsultNext] = useState<string>('');
  const [showConsultForm, setShowConsultForm] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string>('');

  const toggleOutcome = (k: ConsultOutcomeKey) =>
    setConsultOutcomes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const saveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    const consult: ConsultationLog = {
      id: `visit-${Date.now()}`,
      date: consultDate || todayStr(),
      clinicianType: (consultType || chosenSpecialist) as SpecialistKey,
      facilityName: (consultFacility || pathway.facility?.name || '').slice(0, 200) || undefined,
      outcomes: consultOutcomes,
      advice: consultAdvice.trim().slice(0, 1500) || undefined,
      nextVisitDate: consultNext || undefined,
      source: 'self',
    };
    const suggestions = buildSuggestedCarePlan(consult, lifestyleFocusFromAnswers(assessmentAnswers));
    await savePathway((p) => ({
      ...p,
      consultations: [...p.consultations, consult].sort((a, b) => a.date.localeCompare(b.date)),
      carePlan: mergeCarePlanItems(p.carePlan, suggestions),
    }));
    if (consult.nextVisitDate) {
      await addReminder({
        type: 'follow_up',
        title: isEn ? 'Follow-up visit' : 'Kunjungan kontrol',
        facilityName: consult.facilityName,
        remindAt: `${consult.nextVisitDate}T09:00`,
      });
    }
    syncCouplePlan('periksa', 'done');
    syncCouplePlan('tindak_lanjut', 'in_progress');
    setShowConsultForm(false);
    setConsultOutcomes([]);
    setConsultAdvice('');
    setConsultNext('');
    showFlash(
      isEn
        ? 'Visit logged. Your after-care plan has been updated below.'
        : 'Kunjungan dicatat. Rencana perawatan lanjutan Anda diperbarui di bawah.',
    );
  };

  const handleImportPlans = async () => {
    setImportBusy(true);
    setImportMsg('');
    const res = await fetchClinicianCarePlans();
    setImportBusy(false);
    if (!res.ok) {
      setImportMsg(res.error || (isEn ? 'Could not check for plans.' : 'Gagal memeriksa rencana.'));
      return;
    }
    if ((res.data ?? 0) > 0) {
      syncCouplePlan('periksa', 'done');
      syncCouplePlan('tindak_lanjut', 'in_progress');
      setImportMsg(
        isEn
          ? `Imported ${res.data} care plan(s) from your doctor.`
          : `${res.data} rencana perawatan dari dokter berhasil diimpor.`,
      );
    } else {
      setImportMsg(
        isEn
          ? 'No new plan yet. Your doctor can write one from your 1-hour QR summary within 24 hours of the code being created.'
          : 'Belum ada rencana baru. Dokter dapat menuliskannya dari ringkasan QR 1 jam Anda, paling lambat 24 jam setelah kode dibuat.',
      );
    }
  };

  /* ---------- Rencana lanjutan ---------- */
  const [customItem, setCustomItem] = useState('');
  const [customDue, setCustomDue] = useState('');
  const toggleItem = (id: string) =>
    savePathway((p) => {
      const carePlan = p.carePlan.map((i) =>
        i.id === id ? { ...i, done: !i.done, doneAt: !i.done ? new Date().toISOString() : undefined } : i,
      );
      if (carePlan.length > 0 && carePlan.every((i) => i.done)) syncCouplePlan('tindak_lanjut', 'done');
      return { ...p, carePlan };
    });
  const removeItem = (id: string) => savePathway((p) => ({ ...p, carePlan: p.carePlan.filter((i) => i.id !== id) }));
  const addCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = customItem.trim();
    if (text.length < 3) return;
    const item: CarePlanItem = {
      id: `self-${Date.now()}`,
      title: text.slice(0, 200),
      dueDate: customDue || undefined,
      done: false,
      source: 'self',
    };
    await savePathway((p) => ({ ...p, carePlan: [...p.carePlan, item] }));
    setCustomItem('');
    setCustomDue('');
  };
  const addStarterPlan = async () => {
    const items = buildSuggestedCarePlan(
      { date: todayStr(), outcomes: [], nextVisitDate: undefined },
      lifestyleFocusFromAnswers(assessmentAnswers),
    );
    await savePathway((p) => ({ ...p, carePlan: mergeCarePlanItems(p.carePlan, items) }));
  };
  const remindItem = async (item: CarePlanItem) => {
    const when = item.dueDate ? `${item.dueDate}T09:00` : localDateTimeString(new Date(Date.now() + 7 * 864e5));
    const type: 'semen_analysis' | 'follow_up' | 'lifestyle' =
      item.key === 'do_semen_analysis' || item.key === 'repeat_semen_analysis'
        ? 'semen_analysis'
        : item.key === 'habit_plan' || item.key === 'monthly_checkin'
        ? 'lifestyle'
        : 'follow_up';
    await addReminder({ type, title: describePlanItem(item, loc).slice(0, 200), remindAt: when });
    showFlash(isEn ? 'Reminder added.' : 'Pengingat ditambahkan.');
  };

  const sortedPlan = [...pathway.carePlan].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  });

  /* ---------- Ringkasan rujukan (untuk dokter) ---------- */
  const trendLines = NUMERIC_METRICS.map((def) => describeMetricTrend(healthJournal.checkIns, def, loc))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => t.text);
  const latestLab = labResults.length > 0 ? labResults[labResults.length - 1] : null;
  const patientAlias =
    displayName.includes('Anonim') || displayName.includes('Anonymous')
      ? isEn
        ? 'Patient (anonymous)'
        : 'Pasien (anonim)'
      : displayName;

  const levelLabel = assessmentResult?.levelLabel;
  const prepItems = PREP_ITEMS.filter(
    (p) => !p.onlyIfSemen || (recommendation?.firstTests.includes('semen_analysis') ?? true),
  );

  return (
    <div className="space-y-6">
      <div className={summaryOpen ? 'no-print' : ''}>
        <PageHeader
          eyebrow={isEn ? 'Self-check → specialist → after-care' : 'Cek Awal → spesialis → perawatan lanjutan'}
          icon={RouteIcon}
          title={isEn ? 'My Care Pathway' : 'Jalur Perawatan Saya'}
          description={
            isEn
              ? 'One connected path from your self-check to the right specialist and the care that follows. You decide what to share and when.'
              : 'Satu jalur terhubung dari Cek Awal ke spesialis yang tepat hingga perawatan sesudahnya. Anda yang menentukan apa yang dibagikan dan kapan.'
          }
          actions={
            <button type="button" className="btn btn-secondary" onClick={() => setSummaryOpen(true)}>
              <FileText className="w-4 h-4 text-brand-teal" />
              {isEn ? 'Referral Summary' : 'Ringkasan Rujukan'}
            </button>
          }
        >
          {/* Ringkasan progres jalur */}
          <nav aria-label={isEn ? 'Pathway stages' : 'Tahapan jalur'} className="card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-brand-navy dark:text-white">
                {isEn ? `${doneCount} of 6 stages done` : `${doneCount} dari 6 tahap selesai`}
              </span>
              <span className="text-2xs text-brand-navy/65 dark:text-white/65 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-brand-teal" />
                {authMode === 'account'
                  ? isEn
                    ? 'Encrypted on this device and synced encrypted to your account'
                    : 'Terenkripsi di perangkat & tersinkron terenkripsi ke akun Anda'
                  : isEn
                  ? 'Encrypted on this device only'
                  : 'Terenkripsi hanya di perangkat ini'}
              </span>
            </div>
            <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PATHWAY_STAGES.map((st, i) => {
                const status = statusOf(st.key);
                return (
                  <li key={st.key}>
                    <a
                      href={`#stage-${st.key}`}
                      className="flex flex-col items-center gap-1.5 text-center rounded-xl p-2 hover:bg-brand-teal/5"
                      aria-current={status === 'current' ? 'step' : undefined}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-2xs font-extrabold ${STATUS_STYLES[status]}`}
                      >
                        {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </span>
                      <span className="text-3xs sm:text-2xs font-semibold leading-tight text-brand-navy/80 dark:text-white/80">
                        {isEn ? st.title.en : st.title.id}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </PageHeader>
      </div>

      {flash && (
        <div
          role="status"
          className="no-print p-3.5 rounded-xl bg-status-success-bg dark:bg-status-success/15 text-[#1F7A50] dark:text-[#7BD9AC] text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {flash}
        </div>
      )}

      {/* ===== Ringkasan Rujukan yang bisa dicetak ===== */}
      {summaryOpen && (
        <section
          aria-labelledby="referral-summary-title"
          className="card p-5 sm:p-7 space-y-4 border-brand-teal/50"
          data-testid="referral-summary"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">{isEn ? 'For your doctor' : 'Untuk dokter Anda'}</span>
              <h2 id="referral-summary-title" className="text-xl font-extrabold text-brand-navy dark:text-white">
                {isEn ? 'Referral Summary — Side by Side' : 'Ringkasan Rujukan — Side by Side'}
              </h2>
              <p className="text-2xs text-brand-navy/65 dark:text-white/65">
                {patientAlias} · {isEn ? 'Prepared' : 'Disusun'} {formatDate(new Date().toISOString(), isEn)}
              </p>
            </div>
            <div className="no-print flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> {isEn ? 'Print / Save PDF' : 'Cetak / Simpan PDF'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSummaryOpen(false)}
                aria-label={isEn ? 'Close summary' : 'Tutup ringkasan'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-brand-navy/90 dark:text-white/90">
            <div className="well p-4 space-y-1.5">
              <h3 className="font-bold text-sm">{isEn ? 'Self-check result' : 'Hasil Cek Awal'}</h3>
              {explanation ? (
                <>
                  <p className="font-semibold">{levelLabel}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {explanation.reasons.map((r, i) => (
                      <li key={i}>{r.text}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{isEn ? 'Self-check not completed yet.' : 'Cek Awal belum diisi.'}</p>
              )}
            </div>
            <div className="well p-4 space-y-1.5">
              <h3 className="font-bold text-sm">{isEn ? 'Requested specialist' : 'Spesialis yang dituju'}</h3>
              <p className="font-semibold">{isEn ? SPECIALISTS[chosenSpecialist].name.en : SPECIALISTS[chosenSpecialist].name.id}</p>
              {recommendation && (
                <ul className="list-disc pl-4 space-y-1">
                  {recommendation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {explanation && explanation.factors.length > 0 && (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-left text-xs border-collapse min-w-[30rem]">
                <thead>
                  <tr className="border-b border-brand-navy/15 dark:border-white/15 text-2xs text-brand-navy/65 dark:text-white/65">
                    <th className="py-2 pr-3">{isEn ? 'Reported factor' : 'Faktor yang dilaporkan'}</th>
                    <th className="py-2 pr-3">{isEn ? 'Influence' : 'Pengaruh'}</th>
                    <th className="py-2">{isEn ? 'Type' : 'Jenis'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
                  {explanation.factors.map((f) => (
                    <tr key={f.questionId}>
                      <td className="py-2 pr-3 font-semibold">
                        {f.title}
                        {f.isDecisive ? ` (${isEn ? 'decisive' : 'penentu'})` : ''}
                      </td>
                      <td className="py-2 pr-3">{INFLUENCE_LABELS[loc][f.influence]}</td>
                      <td className="py-2">{CHANGEABILITY_LABELS[loc][f.changeability]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-brand-navy/90 dark:text-white/90">
            <div className="well p-4 space-y-1.5">
              <h3 className="font-bold text-sm">{isEn ? 'Latest semen analysis' : 'Analisis semen terakhir'}</h3>
              {latestLab ? (
                <p>
                  {latestLab.testDate}: {latestLab.volume_ml} mL · {latestLab.concentration_m_per_ml}{' '}
                  {isEn ? 'M/mL' : 'jt/mL'} · {isEn ? 'total motility' : 'motilitas total'} {latestLab.total_motility_pct}% ·{' '}
                  {isEn ? 'progressive' : 'progresif'} {latestLab.progressive_motility_pct}% · {isEn ? 'morphology' : 'morfologi'}{' '}
                  {latestLab.morphology_normal_pct}%
                </p>
              ) : (
                <p>{isEn ? 'None recorded yet.' : 'Belum ada.'}</p>
              )}
            </div>
            <div className="well p-4 space-y-1.5">
              <h3 className="font-bold text-sm">{isEn ? 'Recent trends (self-reported)' : 'Tren terbaru (dilaporkan sendiri)'}</h3>
              {trendLines.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1">
                  {trendLines.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p>{isEn ? 'No check-ins recorded yet.' : 'Belum ada check-in.'}</p>
              )}
            </div>
          </div>

          {doctorChecklist.customQuestions.length > 0 && (
            <div className="well p-4 text-xs space-y-1.5">
              <h3 className="font-bold text-sm">{isEn ? 'My questions' : 'Pertanyaan saya'}</h3>
              <ol className="list-decimal pl-4 space-y-1">
                {doctorChecklist.customQuestions.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-2xs text-brand-navy/60 dark:text-white/60">
            {isEn
              ? 'Self-reported information prepared with Side by Side. Not a diagnosis; for the clinician’s assessment.'
              : 'Informasi dilaporkan sendiri, disusun dengan Side by Side. Bukan diagnosis; untuk penilaian dokter.'}
          </p>
        </section>
      )}

      {/* ===== 1. Cek Awal ===== */}
      <StageShell
        index={1}
        stageKey="self_check"
        status={statusOf('self_check')}
        title={isEn ? PATHWAY_STAGES[0].title.en : PATHWAY_STAGES[0].title.id}
        description={isEn ? PATHWAY_STAGES[0].description.en : PATHWAY_STAGES[0].description.id}
        isEn={isEn}
        hidden={summaryOpen}
      >
        {assessmentResult && explanation ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-brand-navy dark:text-white">{assessmentResult.levelLabel}</div>
              <p className="text-xs text-brand-navy/75 dark:text-white/75">{explanation.reasons[0]?.text}</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary shrink-0"
              onClick={() => navigate(isEn ? '/assessment' : '/cek-awal')}
            >
              {isEn ? 'See full breakdown' : 'Lihat rincian lengkap'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-brand-navy/75 dark:text-white/75">
              {isEn
                ? 'Answer 12 short questions privately (under 3 minutes) so we can suggest the right specialist.'
                : 'Jawab 12 pertanyaan singkat secara privat (kurang dari 3 menit) agar kami bisa menyarankan spesialis yang tepat.'}
            </p>
            <button
              type="button"
              className="btn btn-primary shrink-0"
              onClick={() => navigate(isEn ? '/assessment' : '/cek-awal')}
            >
              <ClipboardCheck className="w-4 h-4" />
              {isEn ? 'Start self-check' : 'Mulai Cek Awal'}
            </button>
          </div>
        )}
      </StageShell>

      {/* ===== 2. Siapa yang ditemui ===== */}
      <StageShell
        index={2}
        stageKey="match"
        status={statusOf('match')}
        title={isEn ? PATHWAY_STAGES[1].title.en : PATHWAY_STAGES[1].title.id}
        description={isEn ? PATHWAY_STAGES[1].description.en : PATHWAY_STAGES[1].description.id}
        isEn={isEn}
        hidden={summaryOpen}
      >
        {recommendation?.emergencyNote && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-status-urgent-bg dark:bg-status-urgent/15 text-[#B33834] dark:text-[#FF8A85] text-xs font-bold flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {recommendation.emergencyNote}
          </div>
        )}
        <div className="well p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Stethoscope className="w-6 h-6 text-brand-teal shrink-0" />
            <div className="space-y-1">
              <div className="eyebrow">
                {recommendation
                  ? isEn
                    ? 'Suggested from your self-check'
                    : 'Disarankan dari Cek Awal Anda'
                  : isEn
                  ? 'Default starting point'
                  : 'Titik awal umum'}
              </div>
              <div className="font-extrabold text-base text-brand-navy dark:text-white" data-testid="recommended-specialist">
                {isEn ? SPECIALISTS[recommendation?.primary ?? 'gp'].name.en : SPECIALISTS[recommendation?.primary ?? 'gp'].name.id}
              </div>
              <p className="text-xs text-brand-navy/75 dark:text-white/75">
                {isEn
                  ? SPECIALISTS[recommendation?.primary ?? 'gp'].whatTheyDo.en
                  : SPECIALISTS[recommendation?.primary ?? 'gp'].whatTheyDo.id}
              </p>
            </div>
          </div>
          {recommendation && (
            <>
              <div className="text-xs space-y-1.5 text-brand-navy/85 dark:text-white/85">
                <strong>{isEn ? 'Why this specialist:' : 'Mengapa spesialis ini:'}</strong>
                <ul className="list-disc pl-5 space-y-1">
                  {recommendation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <strong className="text-brand-navy dark:text-white">{isEn ? 'When:' : 'Kapan:'}</strong>{' '}
                  <span className="text-brand-navy/80 dark:text-white/80">{recommendation.timeframe}</span>
                </div>
                <div>
                  <strong className="text-brand-navy dark:text-white">{isEn ? 'Likely first steps:' : 'Kemungkinan langkah awal:'}</strong>{' '}
                  <span className="text-brand-navy/80 dark:text-white/80">
                    {recommendation.firstTests.map((t) => (isEn ? FIRST_TESTS[t].en : FIRST_TESTS[t].id)).join('; ')}
                  </span>
                </div>
              </div>
              {recommendation.supporting.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                  <span className="font-semibold text-brand-navy/70 dark:text-white/70">
                    {isEn ? 'May also involve:' : 'Mungkin juga melibatkan:'}
                  </span>
                  {recommendation.supporting.map((k) => (
                    <span key={k} className="badge badge-navy">
                      {isEn ? SPECIALISTS[k].shortName.en : SPECIALISTS[k].shortName.id}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="field-label">
            {isEn ? 'Who would you like to start with?' : 'Dengan siapa Anda ingin memulai?'}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(SPECIALISTS) as SpecialistKey[]).map((k) => (
              <label
                key={k}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs ${
                  activeSpecialistChoice === k
                    ? 'border-brand-teal bg-brand-teal-light/50 dark:bg-brand-teal/15'
                    : 'border-brand-navy/10 dark:border-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="specialist-choice"
                  className="mt-0.5"
                  checked={activeSpecialistChoice === k}
                  onChange={() => setSpecialistDraft(k)}
                />
                <span>
                  <span className="font-bold text-brand-navy dark:text-white">
                    {isEn ? SPECIALISTS[k].shortName.en : SPECIALISTS[k].shortName.id}
                  </span>
                  {recommendation?.primary === k && (
                    <span className="ml-1.5 badge badge-teal">{isEn ? 'Suggested' : 'Disarankan'}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              await savePathway({ specialistKey: activeSpecialistChoice });
              setSpecialistDraft(null);
              showFlash(
                isEn
                  ? `Pathway set: start with ${SPECIALISTS[activeSpecialistChoice].shortName.en}.`
                  : `Jalur ditetapkan: mulai dengan ${SPECIALISTS[activeSpecialistChoice].shortName.id}.`,
              );
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {pathway.specialistKey
              ? isEn
                ? 'Update my choice'
                : 'Perbarui pilihan'
              : isEn
              ? 'Confirm and continue'
              : 'Konfirmasi dan lanjutkan'}
          </button>
        </fieldset>
      </StageShell>

      {/* ===== 3. Pilih layanan ===== */}
      <StageShell
        index={3}
        stageKey="choose_care"
        status={statusOf('choose_care')}
        title={isEn ? PATHWAY_STAGES[2].title.en : PATHWAY_STAGES[2].title.id}
        description={isEn ? PATHWAY_STAGES[2].description.en : PATHWAY_STAGES[2].description.id}
        isEn={isEn}
        hidden={summaryOpen}
      >
        <div role="radiogroup" aria-label={isEn ? 'Care route' : 'Jalur layanan'} className="grid grid-cols-2 gap-2 max-w-md">
          {(['jkn', 'private'] as CareRoute[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={route === r}
              onClick={() => savePathway({ route: r })}
              className={`btn ${route === r ? 'btn-navy' : 'btn-secondary'}`}
            >
              {r === 'jkn' ? (isEn ? 'JKN referral route' : 'Jalur rujukan JKN') : isEn ? 'Private / self-pay' : 'Mandiri / swasta'}
            </button>
          ))}
        </div>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85">
          {getRouteSteps(route, chosenSpecialist, loc).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {pathway.facility && (
          <div className="p-4 rounded-2xl border-2 border-status-success/40 bg-status-success-bg/60 dark:bg-status-success/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-5 h-5 text-status-success shrink-0" />
              <div>
                <div className="text-2xs font-bold uppercase tracking-wide text-[#1F7A50] dark:text-[#7BD9AC]">
                  {isEn ? 'Chosen facility' : 'Fasilitas pilihan'}
                </div>
                <div className="text-sm font-bold text-brand-navy dark:text-white">{pathway.facility.name}</div>
                <div className="text-2xs text-brand-navy/70 dark:text-white/70">
                  {pathway.facility.type} · {pathway.facility.city}
                  {pathway.facility.acceptsJkn ? ' · JKN' : ''}
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => savePathway({ facility: undefined })}>
              {isEn ? 'Change' : 'Ganti'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-brand-navy dark:text-white">
            {isEn ? 'Matching men-friendly facilities' : 'Fasilitas ramah pria yang sesuai'}
          </h3>
          <select
            aria-label={isEn ? 'City' : 'Kota'}
            className="field"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="all">{isEn ? 'All cities' : 'Semua kota'}</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {visibleFacilities.length === 0 ? (
          <p className="text-xs text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'No curated facility matches this filter yet. Try the other route or browse all facilities.'
              : 'Belum ada fasilitas terkurasi yang sesuai filter ini. Coba jalur lain atau lihat semua fasilitas.'}
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleFacilities.map((f) => (
              <li key={f.id} className="well p-4 space-y-2">
                <div className="text-sm font-bold leading-snug text-brand-navy dark:text-white">{f.name}</div>
                <div className="flex flex-wrap gap-1.5 text-2xs">
                  <span className="badge badge-navy">{f.displayType}</span>
                  <span className="badge badge-navy">
                    <MapPin className="w-3 h-3" />
                    {f.city}
                  </span>
                  {f.accepts_jkn && <span className="badge badge-success">JKN</span>}
                  <span className="badge badge-teal">
                    {isEn ? 'Men-friendly' : 'Ramah pria'} {f.friendliness_score.toFixed(1)}/5
                  </span>
                </div>
                <div className="text-2xs text-brand-navy/70 dark:text-white/70">
                  Rp {f.price_min.toLocaleString('id-ID')} – Rp {f.price_max.toLocaleString('id-ID')} · {f.hours}
                </div>
                <button
                  type="button"
                  className={`btn btn-sm w-full ${pathway.facility?.id === f.id ? 'btn-soft' : 'btn-primary'}`}
                  onClick={() => chooseFacility(f)}
                  disabled={pathway.facility?.id === f.id}
                >
                  {pathway.facility?.id === f.id
                    ? isEn
                      ? 'Chosen'
                      : 'Terpilih'
                    : isEn
                    ? 'Choose for my pathway'
                    : 'Pilih untuk jalur saya'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            navigate(
              `${isEn ? '/facilities' : '/layanan'}?from=pathway${
                SPECIALISTS[chosenSpecialist].serviceTag ? `&service=${SPECIALISTS[chosenSpecialist].serviceTag}` : ''
              }`,
            )
          }
        >
          {isEn ? 'Browse all facilities with filters & map' : 'Lihat semua fasilitas dengan filter & peta'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </StageShell>

      {/* ===== 4. Jadwal & persiapan ===== */}
      <StageShell
        index={4}
        stageKey="book_prepare"
        status={statusOf('book_prepare')}
        title={isEn ? PATHWAY_STAGES[3].title.en : PATHWAY_STAGES[3].title.id}
        description={isEn ? PATHWAY_STAGES[3].description.en : PATHWAY_STAGES[3].description.id}
        isEn={isEn}
        hidden={summaryOpen}
      >
        <form onSubmit={saveAppointment} className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="flex-1">
            <label htmlFor="pathway-appointment" className="field-label">
              {isEn ? 'Planned visit date & time' : 'Rencana tanggal & jam kunjungan'}
            </label>
            <input
              id="pathway-appointment"
              type="datetime-local"
              className="field w-full"
              value={appointmentDraft}
              onChange={(e) => setAppointmentDraft(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <BellPlus className="w-4 h-4" />
            {pathway.appointmentAt
              ? isEn
                ? 'Update date'
                : 'Perbarui tanggal'
              : isEn
              ? 'Save date & remind me'
              : 'Simpan & ingatkan saya'}
          </button>
        </form>
        {pathway.appointmentAt && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[#1F7A50] dark:text-[#7BD9AC] flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 shrink-0" />
              <span>
                {isEn ? 'Booked for' : 'Dijadwalkan'} {formatDate(pathway.appointmentAt, isEn, true)}
                {pathway.facility ? ` · ${pathway.facility.name}` : ''}
              </span>
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                downloadIcsEvent(
                  {
                    title: isEn
                      ? `Visit: ${SPECIALISTS[chosenSpecialist].shortName.en}`
                      : `Kunjungan: ${SPECIALISTS[chosenSpecialist].shortName.id}`,
                    start: pathway.appointmentAt!,
                    durationMinutes: 60,
                    location: pathway.facility?.name,
                    description: isEn
                      ? 'Bring your Referral Summary from Side by Side. For a semen analysis, plan 2–7 days of abstinence beforehand.'
                      : 'Bawa Ringkasan Rujukan dari Side by Side. Untuk analisis semen, atur masa pantang 2–7 hari sebelumnya.',
                    alarmMinutesBefore: 24 * 60,
                  },
                  `side-by-side-visit-${pathway.appointmentAt!.slice(0, 10)}.ics`,
                )
              }
            >
              <Download className="w-3.5 h-3.5 text-brand-teal" />
              {isEn ? 'Add to Calendar (.ics)' : 'Simpan ke Kalender (.ics)'}
            </button>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-brand-navy dark:text-white">
            {isEn ? 'Preparation checklist' : 'Daftar persiapan'}
          </legend>
          {prepItems.map((item) => (
            <label key={item.key} className="flex items-start gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="check mt-0.5"
                checked={Boolean(pathway.prepDone[item.key])}
                onChange={(e) => savePathway({ prepDone: { ...pathway.prepDone, [item.key]: e.target.checked } })}
              />
              <span className="text-brand-navy/85 dark:text-white/85">{isEn ? item.label.en : item.label.id}</span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setSummaryOpen(true)}>
            <FileText className="w-4 h-4 text-brand-teal" />
            {isEn ? 'Open Referral Summary' : 'Buka Ringkasan Rujukan'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isEn ? '/doctor-checklist' : '/checklist-dokter')}
          >
            <ListChecks className="w-4 h-4 text-brand-teal" />
            {isEn ? 'Prepare doctor questions' : 'Siapkan pertanyaan dokter'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`${isEn ? '/share' : '/bagikan-nakes'}?preset=pathway`)}
          >
            <QrCode className="w-4 h-4 text-brand-teal" />
            {isEn ? 'Share with doctor (1-hour QR)' : 'Bagikan ke dokter (QR 1 jam)'}
          </button>
        </div>
      </StageShell>

      {/* ===== 5. Konsultasi ===== */}
      <StageShell
        index={5}
        stageKey="consult"
        status={statusOf('consult')}
        title={isEn ? PATHWAY_STAGES[4].title.en : PATHWAY_STAGES[4].title.id}
        description={isEn ? PATHWAY_STAGES[4].description.en : PATHWAY_STAGES[4].description.id}
        isEn={isEn}
        hidden={summaryOpen}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="well p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-brand-navy dark:text-white">
              <Inbox className="w-4 h-4 text-brand-teal" />
              {isEn ? 'Care plan from your doctor' : 'Rencana dari dokter Anda'}
            </div>
            <p className="text-xs text-brand-navy/75 dark:text-white/75">
              {isEn
                ? 'If your doctor opened your 1-hour QR summary, they can send a post-visit plan straight into this pathway.'
                : 'Bila dokter membuka ringkasan QR 1 jam Anda, dokter dapat mengirim rencana pasca-kunjungan langsung ke jalur ini.'}
            </p>
            <button type="button" className="btn btn-soft btn-sm" onClick={handleImportPlans} disabled={importBusy}>
              {importBusy ? (isEn ? 'Checking…' : 'Memeriksa…') : isEn ? 'Check for my doctor’s plan' : 'Periksa rencana dari dokter'}
            </button>
            {importMsg && (
              <p role="status" className="text-2xs font-semibold text-brand-navy/80 dark:text-white/80">
                {importMsg}
              </p>
            )}
          </div>
          <div className="well p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-brand-navy dark:text-white">
              <UserRound className="w-4 h-4 text-brand-teal" />
              {isEn ? 'Log the visit yourself' : 'Catat kunjungan sendiri'}
            </div>
            <p className="text-xs text-brand-navy/75 dark:text-white/75">
              {isEn
                ? 'Note what happened and what the doctor asked for. We turn it into an after-care plan with reminders.'
                : 'Catat apa yang terjadi dan apa yang diminta dokter. Kami mengubahnya menjadi rencana lanjutan lengkap dengan pengingat.'}
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowConsultForm((v) => !v)}>
              <Plus className="w-4 h-4" />
              {isEn ? 'Log a visit' : 'Catat kunjungan'}
            </button>
          </div>
        </div>

        {showConsultForm && (
          <form onSubmit={saveConsultation} className="well p-4 sm:p-5 space-y-3" aria-label={isEn ? 'Log a visit' : 'Catat kunjungan'}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="consult-date" className="field-label">
                  {isEn ? 'Visit date' : 'Tanggal kunjungan'}
                </label>
                <input
                  id="consult-date"
                  type="date"
                  className="field w-full"
                  value={consultDate}
                  max={todayStr()}
                  onChange={(e) => setConsultDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="consult-type" className="field-label">
                  {isEn ? 'Who did you see?' : 'Siapa yang Anda temui?'}
                </label>
                <select
                  id="consult-type"
                  className="field w-full"
                  value={consultType || chosenSpecialist}
                  onChange={(e) => setConsultType(e.target.value as SpecialistKey)}
                >
                  {(Object.keys(SPECIALISTS) as SpecialistKey[]).map((k) => (
                    <option key={k} value={k}>
                      {isEn ? SPECIALISTS[k].shortName.en : SPECIALISTS[k].shortName.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="consult-facility" className="field-label">
                  {isEn ? 'Where (optional)' : 'Di mana (opsional)'}
                </label>
                <input
                  id="consult-facility"
                  className="field w-full"
                  maxLength={200}
                  value={consultFacility}
                  placeholder={pathway.facility?.name || ''}
                  onChange={(e) => setConsultFacility(e.target.value)}
                />
              </div>
            </div>
            <fieldset>
              <legend className="field-label">{isEn ? 'What happened?' : 'Apa yang terjadi?'}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {(Object.keys(CONSULT_OUTCOMES) as ConsultOutcomeKey[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="check"
                      checked={consultOutcomes.includes(k)}
                      onChange={() => toggleOutcome(k)}
                    />
                    {isEn ? CONSULT_OUTCOMES[k].en : CONSULT_OUTCOMES[k].id}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="consult-advice" className="field-label">
                  {isEn ? 'Doctor’s advice in your own words (optional)' : 'Saran dokter dengan kata-kata Anda (opsional)'}
                </label>
                <textarea
                  id="consult-advice"
                  className="field w-full min-h-[5rem]"
                  maxLength={1500}
                  value={consultAdvice}
                  onChange={(e) => setConsultAdvice(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="consult-next" className="field-label">
                  {isEn ? 'Next visit (optional)' : 'Kontrol berikutnya (opsional)'}
                </label>
                <input
                  id="consult-next"
                  type="date"
                  className="field w-full"
                  min={todayStr()}
                  value={consultNext}
                  onChange={(e) => setConsultNext(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConsultForm(false)}>
                {isEn ? 'Cancel' : 'Batal'}
              </button>
              <button type="submit" className="btn btn-primary flex-1">
                {isEn ? 'Save visit & build after-care plan' : 'Simpan kunjungan & susun rencana lanjutan'}
              </button>
            </div>
          </form>
        )}

        {pathway.consultations.length > 0 && (
          <ul className="space-y-2.5">
            {[...pathway.consultations].reverse().map((c) => (
              <li key={c.id} className="well p-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-brand-navy dark:text-white">{formatDate(c.date, isEn)}</span>
                  <span className="badge badge-navy">
                    {isEn ? SPECIALISTS[c.clinicianType].shortName.en : SPECIALISTS[c.clinicianType].shortName.id}
                  </span>
                  {c.source === 'clinician' && (
                    <span className="badge badge-teal">
                      <Stethoscope className="w-3 h-3" />
                      {isEn ? 'Written by your doctor' : 'Ditulis oleh dokter Anda'}
                    </span>
                  )}
                </div>
                {(c.facilityName || c.clinicianName) && (
                  <div className="text-brand-navy/70 dark:text-white/70">
                    {[c.clinicianName, c.facilityName].filter(Boolean).join(' · ')}
                  </div>
                )}
                {c.outcomes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.outcomes.map((o) => (
                      <span key={o} className="badge badge-success">
                        {isEn ? CONSULT_OUTCOMES[o]?.en ?? o : CONSULT_OUTCOMES[o]?.id ?? o}
                      </span>
                    ))}
                  </div>
                )}
                {c.orderedTests && c.orderedTests.length > 0 && (
                  <div className="text-brand-navy/80 dark:text-white/80">
                    <strong>{isEn ? 'Tests requested:' : 'Tes yang diminta:'}</strong>{' '}
                    {c.orderedTests.map((t) => (isEn ? ORDERED_TESTS[t].en : ORDERED_TESTS[t].id)).join(', ')}
                  </div>
                )}
                {c.advice && (
                  <p className="leading-relaxed text-brand-navy/85 dark:text-white/85 whitespace-pre-wrap">“{c.advice}”</p>
                )}
                {c.nextVisitDate && (
                  <div className="font-semibold text-brand-navy dark:text-white">
                    {isEn ? 'Next visit:' : 'Kontrol berikutnya:'} {formatDate(c.nextVisitDate, isEn)}
                  </div>
                )}
                {(c.source === 'clinician' || c.advice || (c.orderedTests && c.orderedTests.length > 0)) && (
                  <AiPlanExplainer consult={c} locale={loc} />
                )}
              </li>
            ))}
          </ul>
        )}
      </StageShell>

      {/* ===== 6. Perawatan lanjutan ===== */}
      <StageShell
        index={6}
        stageKey="after_care"
        status={statusOf('after_care')}
        title={isEn ? PATHWAY_STAGES[5].title.en : PATHWAY_STAGES[5].title.id}
        description={isEn ? PATHWAY_STAGES[5].description.en : PATHWAY_STAGES[5].description.id}
        isEn={isEn}
        hidden={summaryOpen}
      >
        {sortedPlan.length === 0 ? (
          <div className="well p-4 space-y-2 text-xs text-brand-navy/80 dark:text-white/80">
            <p>
              {isEn
                ? 'Your after-care plan appears here after you log a visit or receive your doctor’s plan. You can also start with general steps now.'
                : 'Rencana perawatan lanjutan muncul di sini setelah Anda mencatat kunjungan atau menerima rencana dari dokter. Anda juga bisa mulai dengan langkah umum sekarang.'}
            </p>
            <button type="button" className="btn btn-soft btn-sm" onClick={addStarterPlan}>
              <Plus className="w-4 h-4" />
              {isEn ? 'Add general steps' : 'Tambahkan langkah umum'}
            </button>
          </div>
        ) : (
          <ul className="space-y-2" aria-label={isEn ? 'After-care plan' : 'Rencana perawatan lanjutan'}>
            {sortedPlan.map((item) => {
              const overdue = !item.done && item.dueDate && item.dueDate < todayStr();
              return (
                <li key={item.id} className="well p-3.5 flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.done}
                    aria-label={describePlanItem(item, loc)}
                    onClick={() => toggleItem(item.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-status-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-brand-navy/40 dark:text-white/40" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div
                      className={`text-xs font-semibold leading-snug ${
                        item.done ? 'line-through text-brand-navy/50 dark:text-white/50' : 'text-brand-navy dark:text-white'
                      }`}
                    >
                      {describePlanItem(item, loc)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                      {item.dueDate && (
                        <span className={overdue ? 'font-bold text-[#B33834] dark:text-[#FF8A85]' : 'text-brand-navy/65 dark:text-white/65'}>
                          {isEn ? 'By' : 'Target'} {formatDate(item.dueDate, isEn)}
                        </span>
                      )}
                      {item.source === 'clinician' && (
                        <span className="badge badge-teal">{isEn ? 'From your doctor' : 'Dari dokter'}</span>
                      )}
                    </div>
                  </div>
                  {!item.done && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm shrink-0"
                      onClick={() => remindItem(item)}
                      aria-label={isEn ? 'Remind me' : 'Ingatkan saya'}
                    >
                      <BellPlus className="w-4 h-4" />
                    </button>
                  )}
                  {item.source === 'self' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm shrink-0"
                      onClick={() => removeItem(item.id)}
                      aria-label={isEn ? 'Remove step' : 'Hapus langkah'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={addCustomItem} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="custom-plan-item" className="sr-only">
            {isEn ? 'Add your own step' : 'Tambah langkah sendiri'}
          </label>
          <input
            id="custom-plan-item"
            className="field flex-1"
            maxLength={200}
            placeholder={isEn ? 'Add your own step…' : 'Tambah langkah sendiri…'}
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
          />
          <input
            type="date"
            className="field"
            aria-label={isEn ? 'Target date' : 'Tanggal target'}
            value={customDue}
            onChange={(e) => setCustomDue(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            <Plus className="w-4 h-4" /> {isEn ? 'Add' : 'Tambah'}
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button type="button" className="btn btn-soft" onClick={() => navigate(isEn ? '/progress' : '/progres')}>
            <LineChart className="w-4 h-4" /> {isEn ? 'Health check-in & trends' : 'Check-in & tren kesehatan'}
          </button>
          <button type="button" className="btn btn-soft" onClick={() => navigate(isEn ? '/cycle-tracker' : '/siklus-72-hari')}>
            <HeartPulse className="w-4 h-4" /> {isEn ? '74-day habit tracker' : 'Pelacak kebiasaan 74 hari'}
          </button>
          <button type="button" className="btn btn-soft" onClick={() => navigate(isEn ? '/results' : '/hasil')}>
            <Download className="w-4 h-4" /> {isEn ? 'Enter lab results' : 'Masukkan hasil lab'}
          </button>
        </div>
      </StageShell>
    </div>
  );
};

export default CarePathwayPage;
