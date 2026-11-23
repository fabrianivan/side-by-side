import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellPlus,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  HeartHandshake,
  History,
  LineChart,
  Lock,
  Minus,
  ShieldCheck,
  Stethoscope,
  Table2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/ui';
import { TrendChart } from '../components/TrendChart';
import { InfluenceMeter } from '../components/RiskBreakdown';
import { INFLUENCE_LABELS } from '../lib/risk-explainer';
import { RISK_DOMAINS } from '../config/risk-explanations';
import { localDateString, localDateTimeString } from '../lib/care-pathway';
import { detectEmotionalDistress } from '../lib/assessment-engine';
import { checkDistress, useAiStatus } from '../lib/ai-client';
import { getLocalizedAssessmentConfig } from '../config/schemas';
import {
  buildTimeline,
  CATEGORICAL_OPTIONS,
  checkInsToCsv,
  computeTmsc,
  describeMetricTrend,
  diffSnapshots,
  getLevelLabels,
  metricSeries,
  NUMERIC_METRICS,
  upsertCheckIn,
  type CheckInEntry,
  type Discomfort,
  type HeatExposure,
  type NumericMetricKey,
  type SexualWellbeing,
} from '../lib/health-journal';

const todayStr = () => localDateString();

const LEVEL_CHIP: Record<string, string> = {
  routine: 'badge-success',
  within_1_2_months: 'bg-status-warning-bg text-[#8A6100] dark:bg-status-warning/15 dark:text-[#F3C64D]',
  immediate: 'bg-status-urgent-bg text-[#B33834] dark:bg-status-urgent/15 dark:text-[#FF8A85]',
};

type DraftState = {
  date: string;
  sleepHours: string;
  stressLevel: string;
  activeDays: string;
  cigarettesPerDay: string;
  alcoholDrinksPerWeek: string;
  weightKg: string;
  heatExposure: '' | HeatExposure;
  discomfort: '' | Discomfort;
  sexualWellbeing: '' | SexualWellbeing;
  note: string;
};

function draftFromLatest(latest?: CheckInEntry): DraftState {
  const s = (v?: number) => (typeof v === 'number' ? String(v) : '');
  return {
    date: todayStr(),
    sleepHours: s(latest?.sleepHours),
    stressLevel: s(latest?.stressLevel),
    activeDays: s(latest?.activeDays),
    cigarettesPerDay: s(latest?.cigarettesPerDay),
    alcoholDrinksPerWeek: s(latest?.alcoholDrinksPerWeek),
    weightKg: s(latest?.weightKg),
    heatExposure: '',
    discomfort: '',
    sexualWellbeing: '',
    note: '',
  };
}

/** Ikon arah tren: berarti "membaik/perlu perhatian", bukan "naik/turun" (rokok yang turun = membaik). */
const DirectionIcon: React.FC<{ direction: string }> = ({ direction }) => {
  if (direction === 'better') return <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" aria-hidden="true" />;
  if (direction === 'worse') return <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" aria-hidden="true" />;
  return <Minus className="w-4 h-4 text-brand-navy/50 dark:text-white/50 shrink-0 mt-0.5" aria-hidden="true" />;
};

export const ProgressPage: React.FC = () => {
  const { locale, authMode, consents, updateConsent, healthJournal, updateHealthJournal, labResults, addReminder, assessmentResult } =
    useApp();
  const isEn = locale === 'en';
  const loc: 'id' | 'en' = isEn ? 'en' : 'id';
  const navigate = useNavigate();
  const historyEnabled = consents.store_results;
  const aiStatus = useAiStatus();
  const { checkIns, assessmentHistory } = healthJournal;
  const levelLabels = useMemo(() => getLevelLabels(loc), [loc]);
  const supportBanner = useMemo(() => getLocalizedAssessmentConfig(loc).emotionalSupportBanner, [loc]);

  const [draft, setDraft] = useState<DraftState>(() => draftFromLatest(checkIns[checkIns.length - 1]));
  const draftDirtyRef = useRef(false);
  const updateDraft = (updater: (d: DraftState) => DraftState) => {
    draftDirtyRef.current = true;
    setDraft(updater);
  };
  useEffect(() => {
    if (!draftDirtyRef.current && checkIns.length > 0) {
      setDraft(draftFromLatest(checkIns[checkIns.length - 1]));
    }
  }, [checkIns]);
  const [formMsg, setFormMsg] = useState<string>('');
  const [postSaveFlags, setPostSaveFlags] = useState<{ distress: boolean; discomfort: boolean; sexual: boolean }>({
    distress: false,
    discomfort: false,
    sexual: false,
  });
  const [tableView, setTableView] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trends = useMemo(
    () =>
      NUMERIC_METRICS.map((def) => ({ def, trend: describeMetricTrend(checkIns, def, loc) })).filter(
        (x): x is { def: (typeof NUMERIC_METRICS)[number]; trend: NonNullable<ReturnType<typeof describeMetricTrend>> } =>
          Boolean(x.trend),
      ),
    [checkIns, loc],
  );
  const timeline = useMemo(
    () => buildTimeline(healthJournal, labResults, levelLabels, loc).slice(0, 12),
    [healthJournal, labResults, levelLabels, loc],
  );

  const numOrUndef = (v: string, min: number, max: number): number | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v.replace(',', '.'));
    if (!Number.isFinite(n)) return undefined;
    return Math.min(max, Math.max(min, n));
  };

  const handleSaveCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyEnabled) return;
    const entry: CheckInEntry = {
      id: `ci-${Date.now()}`,
      date: draft.date || todayStr(),
      sleepHours: numOrUndef(draft.sleepHours, 0, 14),
      stressLevel: numOrUndef(draft.stressLevel, 1, 5),
      activeDays: numOrUndef(draft.activeDays, 0, 7),
      cigarettesPerDay: numOrUndef(draft.cigarettesPerDay, 0, 60),
      alcoholDrinksPerWeek: numOrUndef(draft.alcoholDrinksPerWeek, 0, 50),
      weightKg: numOrUndef(draft.weightKg, 30, 250),
      heatExposure: draft.heatExposure || undefined,
      discomfort: draft.discomfort || undefined,
      sexualWellbeing: draft.sexualWellbeing || undefined,
      note: draft.note.trim().slice(0, 500) || undefined,
      createdAt: new Date().toISOString(),
    };
    if (entry.stressLevel !== undefined) entry.stressLevel = Math.round(entry.stressLevel);
    if (entry.activeDays !== undefined) entry.activeDays = Math.round(entry.activeDays);
    const hasAnyValue = Object.entries(entry).some(
      ([k, v]) => !['id', 'date', 'createdAt'].includes(k) && v !== undefined,
    );
    if (!hasAnyValue) {
      setFormMsg(isEn ? 'Fill in at least one item.' : 'Isi minimal satu bagian.');
      return;
    }
    await updateHealthJournal((j) => ({ ...j, checkIns: upsertCheckIn(j.checkIns, entry) }));
    const keywordDistress = detectEmotionalDistress(entry.note) || entry.stressLevel === 5;
    setPostSaveFlags({
      distress: keywordDistress,
      discomfort: entry.discomfort === 'significant',
      sexual: entry.sexualWellbeing === 'significant_concerns',
    });
    // Deteksi AI (opt-in) melengkapi kata kunci: menangkap ungkapan tekanan yang tidak ada di daftar.
    if (!keywordDistress && entry.note && consents.ai_assist && aiStatus.enabled) {
      void checkDistress(entry.note, loc).then((r) => {
        if (r.showSupport) setPostSaveFlags((f) => ({ ...f, distress: true }));
      });
    }
    setFormMsg(
      isEn
        ? 'Check-in saved privately. Your trends below are updated.'
        : 'Check-in tersimpan secara privat. Tren di bawah sudah diperbarui.',
    );
    setDraft((d) => ({ ...d, note: '', heatExposure: '', discomfort: '', sexualWellbeing: '' }));
  };

  const handleExportCsv = () => {
    const blob = new Blob([checkInsToCsv(checkIns)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `side-by-side-checkins-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteHistory = async () => {
    await updateHealthJournal((j) => ({ ...j, checkIns: [], assessmentHistory: [] }));
    setConfirmDelete(false);
  };

  const remindMonthly = async () => {
    await addReminder({
      type: 'lifestyle',
      title: isEn ? 'Monthly private health check-in' : 'Check-in kesehatan privat bulanan',
      remindAt: localDateTimeString(new Date(Date.now() + 30 * 864e5)),
      notes: isEn ? 'Takes about 30 seconds in My Progress.' : 'Sekitar 30 detik di Progres Saya.',
    });
    setFormMsg(isEn ? 'Monthly reminder added.' : 'Pengingat bulanan ditambahkan.');
  };

  const latestSnapshot = assessmentHistory[assessmentHistory.length - 1];
  const previousSnapshot = assessmentHistory[assessmentHistory.length - 2];
  const latestChanges = latestSnapshot && previousSnapshot ? diffSnapshots(previousSnapshot, latestSnapshot, loc) : [];

  const tmscSeries = useMemo(
    () =>
      [...labResults]
        .sort((a, b) => a.testDate.localeCompare(b.testDate))
        .map((r) => ({ date: r.testDate, value: computeTmsc(r) })),
    [labResults],
  );
  const fmtDate = (d: string) =>
    new Date(d.length <= 10 ? `${d}T00:00:00` : d).toLocaleDateString(isEn ? 'en-GB' : 'id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const numericField = (key: NumericMetricKey) => {
    const def = NUMERIC_METRICS.find((m) => m.key === key)!;
    return (
      <div key={key}>
        <label htmlFor={`ci-${key}`} className="field-label">
          {isEn ? def.label.en : def.label.id}{' '}
          <span className="font-normal text-brand-navy/55 dark:text-white/55">({isEn ? def.unit.en : def.unit.id})</span>
        </label>
        <input
          id={`ci-${key}`}
          type="number"
          inputMode="decimal"
          min={def.min}
          max={def.max}
          step={def.step}
          className="field w-full"
          value={draft[key]}
          onChange={(e) => updateDraft((d) => ({ ...d, [key]: e.target.value }))}
          disabled={!historyEnabled}
        />
      </div>
    );
  };

  const categoricalField = <K extends 'heatExposure' | 'discomfort' | 'sexualWellbeing'>(key: K) => {
    const meta = CATEGORICAL_OPTIONS[key];
    return (
      <div key={key}>
        <label htmlFor={`ci-${key}`} className="field-label">
          {isEn ? meta.label.en : meta.label.id}
        </label>
        <select
          id={`ci-${key}`}
          className="field w-full"
          value={draft[key]}
          onChange={(e) => updateDraft((d) => ({ ...d, [key]: e.target.value }))}
          disabled={!historyEnabled}
        >
          <option value="">{isEn ? '— skip —' : '— lewati —'}</option>
          {Object.entries(meta.options).map(([value, label]) => (
            <option key={value} value={value}>
              {isEn ? (label as { en: string }).en : (label as { id: string }).id}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isEn ? 'Private · encrypted · only you can see it' : 'Privat · terenkripsi · hanya Anda yang melihat'}
        icon={Lock}
        title={isEn ? 'My Progress' : 'Progres Saya'}
        description={
          isEn
            ? 'Track your reproductive health over time—self-checks, quick monthly check-ins, and lab results—in one private timeline. Sperm take about 74 days to mature, so look for change over months, not days.'
            : 'Pantau kesehatan reproduksi Anda dari waktu ke waktu—Cek Awal, check-in bulanan singkat, dan hasil lab—dalam satu linimasa privat. Sel sperma butuh sekitar 74 hari untuk matang, jadi lihat perubahan dalam hitungan bulan, bukan hari.'
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={remindMonthly} disabled={!historyEnabled}>
              <BellPlus className="w-4 h-4 text-brand-teal" />
              {isEn ? 'Monthly reminder' : 'Pengingat bulanan'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExportCsv} disabled={checkIns.length === 0}>
              <Download className="w-4 h-4 text-brand-teal" />
              CSV
            </button>
          </>
        }
      />

      {/* Persetujuan riwayat privat (default OFF) */}
      {!historyEnabled && (
        <section className="card p-5 sm:p-6 border-brand-teal/50 space-y-3" aria-labelledby="history-consent-title">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-brand-teal shrink-0" />
            <div className="space-y-1.5">
              <h2 id="history-consent-title" className="section-title">
                {isEn ? 'Private history is off' : 'Riwayat privat sedang nonaktif'}
              </h2>
              <p className="text-xs leading-relaxed text-brand-navy/80 dark:text-white/80">
                {isEn
                  ? 'To compare over time we need to keep past self-checks and check-ins. They are encrypted on this device (AES-GCM 256)'
                  : 'Untuk membandingkan dari waktu ke waktu, kami perlu menyimpan Cek Awal dan check-in sebelumnya. Data dienkripsi di perangkat ini (AES-GCM 256)'}
                {authMode === 'account'
                  ? isEn
                    ? ' and synced encrypted at rest to your account.'
                    : ' dan disinkron terenkripsi ke akun Anda.'
                  : isEn
                  ? ' and never leave it in Anonymous Mode.'
                  : ' dan tidak pernah meninggalkan perangkat dalam Mode Anonim.'}{' '}
                {isEn
                  ? 'You can turn this off or delete everything at any time.'
                  : 'Anda dapat menonaktifkan atau menghapus semuanya kapan saja.'}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => updateConsent('store_results', true)}>
            <Lock className="w-4 h-4" />
            {isEn ? 'Turn on private history' : 'Aktifkan riwayat privat'}
          </button>
        </section>
      )}

      {/* Ringkasan perubahan */}
      <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="since-title">
        <h2 id="since-title" className="section-title flex items-center gap-2">
          <LineChart className="w-5 h-5 text-brand-teal" />
          {isEn ? 'What has changed' : 'Apa yang sudah berubah'}
        </h2>
        {trends.length === 0 && assessmentHistory.length < 2 ? (
          <p className="text-xs text-brand-navy/75 dark:text-white/75">
            {isEn
              ? 'Your trends appear here after your first check-ins. One check-in a month is enough.'
              : 'Tren Anda muncul di sini setelah check-in pertama. Satu check-in per bulan sudah cukup.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {latestSnapshot && previousSnapshot && (
              <li className="well p-3.5 flex items-start gap-2.5 text-xs leading-relaxed">
                <ClipboardCheck className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                <span>
                  {isEn ? 'Self-check: ' : 'Cek Awal: '}
                  <strong>{levelLabels[previousSnapshot.levelCode]}</strong> ({fmtDate(previousSnapshot.takenAt)}) →{' '}
                  <strong>{levelLabels[latestSnapshot.levelCode]}</strong> ({fmtDate(latestSnapshot.takenAt)})
                  {latestChanges.filter((c) => c.direction === 'better').length > 0 &&
                    (isEn
                      ? `. Improved: ${latestChanges.filter((c) => c.direction === 'better').map((c) => c.topic).join(', ')}.`
                      : `. Membaik: ${latestChanges.filter((c) => c.direction === 'better').map((c) => c.topic).join(', ')}.`)}
                </span>
              </li>
            )}
            {trends.map(({ def, trend }) => (
              <li key={def.key} className="well p-3.5 flex items-start gap-2.5 text-xs leading-relaxed">
                <DirectionIcon direction={trend.direction} />
                <span>{trend.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Check-in cepat */}
      <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="checkin-title">
        <div className="space-y-1">
          <h2 id="checkin-title" className="section-title flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-teal" />
            {isEn ? 'Quick health check-in (about 30 seconds)' : 'Check-in kesehatan cepat (sekitar 30 detik)'}
          </h2>
          <p className="text-xs text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'Think about the past few weeks. Every field is optional—skip anything you prefer not to record.'
              : 'Pikirkan beberapa minggu terakhir. Semua isian opsional—lewati apa pun yang tidak ingin dicatat.'}
          </p>
        </div>
        <form onSubmit={handleSaveCheckIn} className="space-y-4" aria-label={isEn ? 'Health check-in' : 'Check-in kesehatan'}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="ci-date" className="field-label">
                {isEn ? 'Date' : 'Tanggal'}
              </label>
              <input
                id="ci-date"
                type="date"
                max={todayStr()}
                className="field w-full"
                value={draft.date}
                onChange={(e) => updateDraft((d) => ({ ...d, date: e.target.value }))}
                disabled={!historyEnabled}
                required
              />
            </div>
            {numericField('sleepHours')}
            {numericField('stressLevel')}
            {numericField('activeDays')}
            {numericField('cigarettesPerDay')}
            {numericField('alcoholDrinksPerWeek')}
            {numericField('weightKg')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {categoricalField('heatExposure')}
            {categoricalField('discomfort')}
            {categoricalField('sexualWellbeing')}
          </div>
          <div>
            <label htmlFor="ci-note" className="field-label">
              {isEn ? 'Anything else on your mind? (optional, private)' : 'Ada hal lain yang dipikirkan? (opsional, privat)'}
            </label>
            <textarea
              id="ci-note"
              className="field w-full min-h-[4rem]"
              maxLength={500}
              value={draft.note}
              onChange={(e) => updateDraft((d) => ({ ...d, note: e.target.value }))}
              disabled={!historyEnabled}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={!historyEnabled}>
              <CheckCircle2 className="w-4 h-4" />
              {isEn ? 'Save check-in' : 'Simpan check-in'}
            </button>
            {formMsg && (
              <span role="status" className="text-xs font-semibold text-[#1F7A50] dark:text-[#7BD9AC]">
                {formMsg}
              </span>
            )}
          </div>
        </form>

        {postSaveFlags.distress && (
          <div
            role="alert"
            className="bg-brand-coral-light dark:bg-brand-coral/15 border-2 border-brand-coral rounded-card p-4 space-y-2 text-brand-navy dark:text-white"
          >
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="w-5 h-5 text-brand-coral-dark dark:text-brand-coral shrink-0" />
              <div className="space-y-1.5">
                <p className="font-bold text-sm">{supportBanner.title}</p>
                <p className="text-xs leading-relaxed">{supportBanner.message}</p>
                <div className="flex flex-wrap gap-2">
                  {supportBanner.contacts.map((c) => (
                    <span key={c.name} className="px-2.5 py-1 rounded-btn bg-white dark:bg-surface-dark-card text-2xs font-semibold border border-brand-coral/30">
                      {c.name}: {c.contact}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {postSaveFlags.discomfort && (
          <div role="alert" className="p-3.5 rounded-xl bg-status-urgent-bg dark:bg-status-urgent/15 text-[#B33834] dark:text-[#FF8A85] text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isEn
                ? 'Pain, a lump or swelling is worth a doctor’s check soon. Sudden, severe testicular pain is an emergency—go to the nearest emergency department.'
                : 'Nyeri, benjolan, atau bengkak layak segera diperiksa dokter. Nyeri hebat mendadak di testis adalah kondisi darurat—segera ke IGD terdekat.'}{' '}
              <button type="button" className="underline" onClick={() => navigate(isEn ? '/care-pathway' : '/jalur-perawatan')}>
                {isEn ? 'Open my care pathway' : 'Buka jalur perawatan'}
              </button>
            </span>
          </div>
        )}
        {postSaveFlags.sexual && (
          <div role="status" className="p-3.5 rounded-xl bg-brand-teal-light/60 dark:bg-brand-teal/15 text-xs flex items-start gap-2">
            <Stethoscope className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <span>
              {isEn
                ? 'Erection or ejaculation concerns are common and treatable. Consider adding them to your doctor questions—doctors hear this every day.'
                : 'Kekhawatiran soal ereksi atau ejakulasi umum dan dapat ditangani. Pertimbangkan menambahkannya ke daftar pertanyaan dokter—dokter mendengarnya setiap hari.'}{' '}
              <button type="button" className="underline font-semibold" onClick={() => navigate(isEn ? '/doctor-checklist' : '/checklist-dokter')}>
                {isEn ? 'Doctor checklist' : 'Daftar tanya dokter'}
              </button>
            </span>
          </div>
        )}
      </section>

      {/* Grafik per metrik */}
      {checkIns.length > 0 && (
        <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="charts-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="charts-title" className="section-title flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-teal" />
              {isEn ? 'Your check-in trends' : 'Tren check-in Anda'}
            </h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTableView((v) => !v)} aria-pressed={tableView}>
              <Table2 className="w-4 h-4" />
              {tableView ? (isEn ? 'Show charts' : 'Tampilkan grafik') : isEn ? 'Show as table' : 'Tampilkan sebagai tabel'}
            </button>
          </div>
          {tableView ? (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-left text-xs border-collapse min-w-[40rem]">
                <thead>
                  <tr className="border-b border-brand-navy/15 dark:border-white/15 text-2xs text-brand-navy/65 dark:text-white/65">
                    <th className="py-2 pr-3">{isEn ? 'Date' : 'Tanggal'}</th>
                    {NUMERIC_METRICS.map((m) => (
                      <th key={m.key} className="py-2 pr-3">
                        {isEn ? m.label.en : m.label.id}
                      </th>
                    ))}
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
                  {[...checkIns].reverse().map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3 font-semibold whitespace-nowrap">{fmtDate(c.date)}</td>
                      {NUMERIC_METRICS.map((m) => (
                        <td key={m.key} className="py-2 pr-3 tabular">
                          {typeof c[m.key] === 'number' ? c[m.key] : '—'}
                        </td>
                      ))}
                      <td className="py-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          aria-label={isEn ? `Delete check-in ${c.date}` : `Hapus check-in ${c.date}`}
                          onClick={() => updateHealthJournal((j) => ({ ...j, checkIns: j.checkIns.filter((x) => x.id !== c.id) }))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {NUMERIC_METRICS.map((def) => {
                const series = metricSeries(checkIns, def.key);
                if (series.length === 0) return null;
                const t = trends.find((x) => x.def.key === def.key)?.trend;
                const label = isEn ? def.label.en : def.label.id;
                return (
                  <figure key={def.key} className="well p-4 space-y-2">
                    <figcaption className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-brand-navy dark:text-white">{label}</span>
                      <span className="text-2xs text-brand-navy/60 dark:text-white/60">{isEn ? def.unit.en : def.unit.id}</span>
                    </figcaption>
                    <TrendChart
                      points={series}
                      min={def.min === 30 ? Math.min(...series.map((s) => s.value)) - 2 : def.min}
                      max={def.key === 'weightKg' ? Math.max(...series.map((s) => s.value)) + 2 : Math.min(def.max, Math.max(def.target?.max ?? 0, ...series.map((s) => s.value)) + 1)}
                      target={def.target}
                      ariaLabel={t?.text || label}
                      locale={loc}
                    />
                    {def.targetLabel && (
                      <p className="text-2xs text-brand-navy/60 dark:text-white/60">{isEn ? def.targetLabel.en : def.targetLabel.id}</p>
                    )}
                  </figure>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Riwayat Cek Awal */}
      <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="selfcheck-history-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="selfcheck-history-title" className="section-title flex items-center gap-2">
            <History className="w-5 h-5 text-brand-teal" />
            {isEn ? 'Self-check history' : 'Riwayat Cek Awal'}
          </h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(isEn ? '/assessment' : '/cek-awal')}>
            {assessmentResult ? (isEn ? 'Re-take self-check' : 'Ulangi Cek Awal') : isEn ? 'Start self-check' : 'Mulai Cek Awal'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {assessmentHistory.length === 0 ? (
          <p className="text-xs text-brand-navy/75 dark:text-white/75">
            {historyEnabled
              ? isEn
                ? 'Each completed self-check will be saved here so you can see what changed. Re-taking it every ~3 months matches one sperm cycle.'
                : 'Setiap Cek Awal yang selesai akan tersimpan di sini agar Anda bisa melihat perubahannya. Mengulang setiap ±3 bulan sesuai satu siklus sperma.'
              : isEn
              ? 'Turn on private history to keep your self-checks over time.'
              : 'Aktifkan riwayat privat untuk menyimpan Cek Awal dari waktu ke waktu.'}
          </p>
        ) : (
          <ol className="space-y-3">
            {[...assessmentHistory].reverse().map((snap, idx, arr) => {
              const prev = arr[idx + 1];
              const changes = prev ? diffSnapshots(prev, snap, loc) : [];
              return (
                <li key={snap.id} className="well p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-brand-navy dark:text-white">{fmtDate(snap.takenAt)}</span>
                    <span className={`badge ${LEVEL_CHIP[snap.levelCode]}`}>{levelLabels[snap.levelCode]}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['medical', 'timing', 'lifestyle'] as const).map((d) => (
                      <div key={d} className="space-y-1">
                        <div className="text-2xs font-semibold text-brand-navy/70 dark:text-white/70">
                          {isEn ? RISK_DOMAINS[d].title.en : RISK_DOMAINS[d].title.id}
                        </div>
                        <InfluenceMeter level={snap.domainInfluence[d]} label={INFLUENCE_LABELS[loc][snap.domainInfluence[d]]} />
                      </div>
                    ))}
                  </div>
                  {changes.length > 0 && (
                    <ul className="space-y-1 text-2xs leading-relaxed text-brand-navy/80 dark:text-white/80">
                      {changes.map((c) => (
                        <li key={c.questionId} className="flex items-start gap-1.5">
                          <DirectionIcon direction={c.direction} />
                          <span>
                            <strong>{c.topic}:</strong> {c.from} → {c.to}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Tren hasil lab */}
      <section className="card p-5 sm:p-6 space-y-3" aria-labelledby="lab-trend-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="lab-trend-title" className="section-title">
            {isEn ? 'Semen analysis over time' : 'Analisis semen dari waktu ke waktu'}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(isEn ? '/results' : '/hasil')}>
            {isEn ? 'Open My Results' : 'Buka Hasil Saya'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {tmscSeries.length === 0 ? (
          <p className="text-xs text-brand-navy/75 dark:text-white/75">{isEn ? 'No lab results recorded yet. That is okay—start whenever you feel ready.' : 'Belum ada hasil lab. Tidak apa-apa, mulai kapan pun Anda siap.'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <figure className="well p-4">
              <figcaption className="text-xs font-bold text-brand-navy dark:text-white mb-1">
                {isEn ? 'Total motile sperm count, TMSC (million)' : 'Total sperma bergerak progresif, TMSC (juta)'}
              </figcaption>
              <TrendChart
                points={tmscSeries}
                min={0}
                max={Math.max(25, ...tmscSeries.map((t) => t.value)) * 1.1}
                referenceLine={{ value: 20, label: isEn ? '~20 M (natural conception reference)' : '~20 jt (acuan konsepsi alami)' }}
                ariaLabel={
                  isEn
                    ? `TMSC across ${tmscSeries.length} tests, latest ${tmscSeries[tmscSeries.length - 1].value} million`
                    : `TMSC dari ${tmscSeries.length} tes, terakhir ${tmscSeries[tmscSeries.length - 1].value} juta`
                }
                formatValue={(v) => v.toFixed(0)}
                locale={loc}
              />
            </figure>
            <p className="text-xs leading-relaxed text-brand-navy/80 dark:text-white/80">
              {isEn
                ? 'A single result can vary a lot from one sample to the next. Doctors usually look at two or more tests a few weeks apart before drawing conclusions.'
                : 'Satu hasil bisa sangat berbeda dari sampel ke sampel. Dokter biasanya melihat dua tes atau lebih dengan jarak beberapa minggu sebelum menarik kesimpulan.'}
            </p>
          </div>
        )}
      </section>

      {/* Linimasa terpadu */}
      {timeline.length > 0 && (
        <section className="card p-5 sm:p-6 space-y-3" aria-labelledby="timeline-title">
          <h2 id="timeline-title" className="section-title">
            {isEn ? 'Recent timeline' : 'Linimasa terbaru'}
          </h2>
          <ol className="relative border-l-2 border-brand-teal/25 ml-2 space-y-3">
            {timeline.map((ev) => (
              <li key={`${ev.kind}-${ev.id}`} className="pl-4 relative">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-brand-teal" aria-hidden="true" />
                <div className="text-2xs text-brand-navy/60 dark:text-white/60">{fmtDate(ev.date)}</div>
                <div className="text-xs font-semibold text-brand-navy dark:text-white">{ev.title}</div>
                {ev.detail && <div className="text-2xs text-brand-navy/75 dark:text-white/75">{ev.detail}</div>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Kendali privasi */}
      <section className="card p-5 sm:p-6 space-y-3" aria-labelledby="privacy-controls-title">
        <h2 id="privacy-controls-title" className="section-title flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-teal" />
          {isEn ? 'Your history, your control' : 'Riwayat Anda, kendali Anda'}
        </h2>
        <ul className="text-xs leading-relaxed text-brand-navy/80 dark:text-white/80 list-disc pl-5 space-y-1">
          <li>
            {isEn
              ? 'Stored encrypted on this device with AES-GCM 256. In Account Mode it is synced encrypted at rest (AES-256-GCM).'
              : 'Tersimpan terenkripsi di perangkat ini dengan AES-GCM 256. Dalam Mode Akun disinkron terenkripsi at rest (AES-256-GCM).'}
          </li>
          <li>
            {isEn
              ? 'Never shared with your partner. A doctor only sees a trend summary if you include “My progress” in a 1-hour QR.'
              : 'Tidak pernah dibagikan ke pasangan. Dokter hanya melihat ringkasan tren bila Anda menyertakan “Progres saya” dalam QR 1 jam.'}
          </li>
          <li>
            {isEn
              ? 'Partner details from the self-check are never stored in your history.'
              : 'Detail pasangan dari Cek Awal tidak pernah disimpan di riwayat Anda.'}
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          {historyEnabled && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateConsent('store_results', false)}>
              {isEn ? 'Stop recording new history' : 'Berhenti mencatat riwayat baru'}
            </button>
          )}
          {!confirmDelete ? (
            <button
              type="button"
              className="btn btn-coral-soft btn-sm"
              onClick={() => setConfirmDelete(true)}
              disabled={checkIns.length === 0 && assessmentHistory.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              {isEn ? 'Delete my progress history' : 'Hapus riwayat progres saya'}
            </button>
          ) : (
            <div role="alertdialog" aria-label={isEn ? 'Confirm delete' : 'Konfirmasi hapus'} className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#B33834] dark:text-[#FF8A85]">
                {isEn
                  ? 'Delete all check-ins and self-check history? This cannot be undone.'
                  : 'Hapus semua check-in dan riwayat Cek Awal? Tindakan ini tidak dapat dibatalkan.'}
              </span>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteHistory}>
                {isEn ? 'Yes, delete' : 'Ya, hapus'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>
                {isEn ? 'Cancel' : 'Batal'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProgressPage;
