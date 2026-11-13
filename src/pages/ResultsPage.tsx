import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  PlusCircle,
  Paperclip,
  Info,
  TrendingUp,
  MapPin,
  Calendar,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Sliders,
  Clock,
  FileText,
} from 'lucide-react';
import { semenReferenceConfig } from '../config/schemas';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

export const ResultsPage: React.FC = () => {
  const {
    locale,
    labResults,
    reminders,
    addLabResult,
    deleteLabResult,
    addReminder,
    toggleReminder,
    deleteReminder,
    loadRendraDemoScenario,
  } = useApp();

  const t = getTranslations(locale);
  const isEn = locale === 'en';
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [testDate, setTestDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [volumeMl, setVolumeMl] = useState<string>('2.4');
  const [concentration, setConcentration] = useState<string>('18.5');
  const [totalMotility, setTotalMotility] = useState<string>('45');
  const [progressiveMotility, setProgressiveMotility] = useState<string>('33');
  const [morphology, setMorphology] = useState<string>('4.5');
  const [notes, setNotes] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');

  // Form Pengingat Kontrol Baru
  const [newReminderTitle, setNewReminderTitle] = useState<string>(
    'Kontrol Evaluasi Hasil Analisis Semen (Siklus 74 Hari)'
  );
  const [newReminderDate, setNewReminderDate] = useState<string>(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(`${file.name} (Lampiran Pribadi Lokal — Tidak Diproses Otomatis)`);
    }
  };

  const handleSubmitLab = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLabResult({
      testDate,
      volume_ml: parseFloat(volumeMl) || 0,
      concentration_m_per_ml: parseFloat(concentration) || 0,
      total_motility_pct: parseFloat(totalMotility) || 0,
      progressive_motility_pct: parseFloat(progressiveMotility) || 0,
      morphology_normal_pct: parseFloat(morphology) || 0,
      notes: notes.trim() || undefined,
      attachmentName: attachmentName || undefined,
    });
    setShowAddForm(false);
    setNotes('');
    setAttachmentName('');
  };

  const handleCreateFollowUpReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    await addReminder({
      type: 'follow_up',
      title: newReminderTitle,
      remindAt: newReminderDate,
      notes: 'Bawa riwayat hasil analisis semen untuk didiskusikan bersama dokter.',
    });
  };

  const latestResult = labResults.length > 0 ? labResults[labResults.length - 1] : null;

  // Periksa apakah ada nilai pada hasil terbaru yang berada di bawah batas rujukan bawah WHO 2021
  const hasValueOutsideReference = latestResult
    ? semenReferenceConfig.parameters.some((param) => {
        const val = latestResult[param.key];
        return typeof val === 'number' && val < param.lowerReferenceLimit;
      })
    : false;

  return (
    <div className="space-y-6">
      {/* Header Hasil Saya */}
      <section className="page-header flex flex-col gap-4">
        <div className="space-y-2.5">
          <h1 className="page-title">
            {isEn ? 'Semen Analysis Follow-Up & Trends' : 'Tindak Lanjut Hasil Analisis Semen & Tren'}
          </h1>
          <p className="page-lead">
            {isEn ? 'Reference source:' : 'Sumber acuan:'} <strong>{semenReferenceConfig.source}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={isEn ? '/semen-calculator' : '/simulator'}
            className="btn btn-secondary"
          >
            <Sliders className="w-4 h-4 text-brand-teal" />
            <span>{isEn ? 'WHO Simulator' : 'Simulator WHO'}</span>
          </Link>
          <Link
            to={isEn ? '/cycle-tracker' : '/siklus-72-hari'}
            className="btn btn-secondary"
          >
            <Clock className="w-4 h-4 text-brand-teal" />
            <span>{isEn ? '72-Day Cycle' : 'Siklus 72 Hari'}</span>
          </Link>
          <Link
            to={isEn ? '/doctor-checklist' : '/checklist-dokter'}
            className="btn btn-secondary"
          >
            <FileText className="w-4 h-4 text-brand-teal" />
            <span>{isEn ? 'Dr. Checklist' : 'Tanya Dokter'}</span>
          </Link>
          {labResults.length === 0 && (
            <button
              type="button"
              onClick={() => loadRendraDemoScenario()}
              className="btn btn-coral-soft"
            >
              <Sparkles className="w-4 h-4" />
              {isEn ? 'Load 2 Sample Rendra Results' : 'Muat 2 Contoh Hasil Rendra'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {showAddForm
                ? isEn
                  ? 'Close Form'
                  : 'Tutup Formulir'
                : isEn
                ? 'Log New Lab Result'
                : 'Input Hasil Baru'}
            </span>
          </button>
        </div>
      </section>

      {/* Disclaimer Wajib di Halaman Tindak Lanjut Hasil */}
      <div className="px-4 py-3.5 rounded-2xl bg-brand-teal-light/60 dark:bg-brand-teal/15 border border-brand-teal/25 flex items-start gap-3 text-xs leading-relaxed font-semibold text-brand-navy dark:text-white">
        <Info className="w-5 h-5 text-brand-teal shrink-0" />
        <span>
          {isEn
            ? `${t.disclaimer.results} This app does not provide medical diagnoses or recommend medications, dosages, or supplements.`
            : `${semenReferenceConfig.disclaimer} Aplikasi ini tidak memberikan diagnosis medis maupun saran obat, dosis, atau suplemen.`}
        </span>
      </div>

      {/* Formulir Input Manual Hasil Analisis Semen */}
      {showAddForm && (
        <section className="card p-6 border-brand-teal/40 space-y-5">
          <div>
            <h2 className="section-title">
              Input Manual Hasil Analisis Semen
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Salin angka dari lembar hasil laboratorium Anda. Data dienkripsi di perangkat Anda.
            </p>
          </div>

          <form onSubmit={handleSubmitLab} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="lab-date" className="field-label">
                  Tanggal Tes Laboratorium
                </label>
                <input
                  id="lab-date"
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="field w-full"
                />
              </div>

              <div>
                <label htmlFor="lab-volume" className="field-label">
                  Volume Ejakulat (mL) • Rujukan ≥ 1,4 mL
                </label>
                <input
                  id="lab-volume"
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(e.target.value)}
                  placeholder="Contoh: 2.4"
                  className="field w-full"
                />
              </div>

              <div>
                <label htmlFor="lab-conc" className="field-label">
                  Konsentrasi (juta/mL) • Rujukan ≥ 16 juta/mL
                </label>
                <input
                  id="lab-conc"
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  placeholder="Contoh: 18.5"
                  className="field w-full"
                />
              </div>

              <div>
                <label htmlFor="lab-mot-total" className="field-label">
                  Motilitas Total (%) • Rujukan ≥ 42%
                </label>
                <input
                  id="lab-mot-total"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={totalMotility}
                  onChange={(e) => setTotalMotility(e.target.value)}
                  placeholder="Contoh: 45"
                  className="field w-full"
                />
              </div>

              <div>
                <label htmlFor="lab-mot-prog" className="field-label">
                  Motilitas Progresif (%) • Rujukan ≥ 30%
                </label>
                <input
                  id="lab-mot-prog"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={progressiveMotility}
                  onChange={(e) => setProgressiveMotility(e.target.value)}
                  placeholder="Contoh: 33"
                  className="field w-full"
                />
              </div>

              <div>
                <label htmlFor="lab-morph" className="field-label">
                  Morfologi Normal (%) • Rujukan ≥ 4%
                </label>
                <input
                  id="lab-morph"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={morphology}
                  onChange={(e) => setMorphology(e.target.value)}
                  placeholder="Contoh: 4.5"
                  className="field w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lab-notes" className="field-label">
                  Catatan Pribadi (Masa pantang, kondisi tubuh, dll.)
                </label>
                <input
                  id="lab-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mis: Masa pantang 3 hari, kondisi sehat"
                  className="field w-full"
                />
              </div>

              <div>
                <label htmlFor="lab-photo" className="field-label">
                  Lampiran Foto Lembar Lab Pribadi (Opsional, Tidak Diproses Otomatis)
                </label>
                <label
                  htmlFor="lab-photo"
                  className="w-full px-3.5 py-2.5 rounded-btn border border-dashed border-brand-navy/30 text-xs flex items-center gap-2 cursor-pointer bg-surface-muted dark:bg-surface-dark"
                >
                  <Paperclip className="w-4 h-4 text-brand-teal shrink-0" />
                  <span className="truncate">
                    {attachmentName || 'Pilih foto/berkas sebagai arsip pribadi di perangkat'}
                  </span>
                </label>
                <input
                  id="lab-photo"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Simpan Hasil Terenkripsi
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tampilan Kosong (Empty State Sesuai Microcopy) */}
      {labResults.length === 0 ? (
        <section className="card px-6 py-10 sm:py-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-teal-light dark:bg-brand-teal/20 text-brand-teal flex items-center justify-center mx-auto">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="section-title">
            “{t.emptyStates.results}”
          </h2>
          <p className="text-xs sm:text-sm text-brand-navy/70 dark:text-white/70 max-w-md mx-auto">
            {isEn
              ? 'If you have completed a semen analysis, enter your numbers to read plain-language explanations based on WHO 2021 reference limits.'
              : 'Jika Anda sudah pernah menjalani analisis semen, masukkan angkanya untuk membaca penjelasan bahasa awam sesuai acuan WHO 2021.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              {isEn ? 'Log Semen Analysis Result' : 'Input Hasil Analisis Semen'}
            </button>
            <button
              type="button"
              onClick={() => loadRendraDemoScenario()}
              className="btn btn-secondary"
            >
              {isEn ? 'View Rendra Sample Results & Trend' : 'Lihat Contoh Hasil & Grafik Tren Rendra'}
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Penjelasan Parameter dalam Bahasa Awam (Membandingkan dengan Rentang Rujukan WHO 2021) */}
          {latestResult && (
            <section className="card p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="eyebrow">
                    {isEn ? `Latest Result • Test Date: ${latestResult.testDate}` : `Hasil Terbaru • Tanggal Tes: ${latestResult.testDate}`}
                  </span>
                  <h2 className="section-title">
                    {isEn
                      ? 'Plain-Language Explanation (WHO 6th Edition Reference)'
                      : 'Penjelasan Istilah dalam Bahasa Awam (Acuan WHO Edisi ke-6)'}
                  </h2>
                </div>

                {hasValueOutsideReference && (
                  <button
                    type="button"
                    onClick={() => navigate(isEn ? '/facilities' : '/layanan')}
                    className="btn btn-coral"
                  >
                    <MapPin className="w-4 h-4" />
                    {isEn ? 'Find specialist doctor' : 'Cari dokter spesialis'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {semenReferenceConfig.parameters.map((param) => {
                  const userVal = latestResult[param.key];
                  const isAtOrAboveRef = userVal >= param.lowerReferenceLimit;
                  return (
                    <div
                      key={param.key}
                      className="well p-4 sm:p-5 space-y-3"
                    >
                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-brand-navy dark:text-white">
                          {param.label}
                        </h3>
                        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                          <div className="tabular text-3xl font-extrabold leading-none text-brand-navy dark:text-white">
                            {userVal}
                            <span className="ml-1.5 text-xs font-semibold tracking-normal text-brand-navy/60 dark:text-white/60">
                              {param.unit}
                            </span>
                          </div>
                          <span
                            className={`badge ${
                              isAtOrAboveRef
                                ? 'badge-success'
                                : 'bg-status-warning-bg text-[#7A5600] dark:bg-status-warning/20 dark:text-[#F3C64D]'
                            }`}
                          >
                            {isEn ? 'WHO Ref' : 'Rujukan WHO'} ≥ {param.lowerReferenceLimit} {param.unit}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
                        {param.plainExplanation}
                      </p>

                      {!isAtOrAboveRef && (
                        <div className="p-3 rounded-xl bg-status-warning-bg dark:bg-status-warning/15 text-brand-navy dark:text-[#F3C64D] text-xs leading-relaxed flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-[#B07E00] dark:text-[#F3C64D] shrink-0 mt-0.5" />
                          <span>{param.belowRangeNote}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs font-semibold text-brand-teal-dark dark:text-[#7FDADB]">
                * {semenReferenceConfig.disclaimer}
              </div>
            </section>
          )}

          {/* Grafik Tren Sederhana (Tampil Bila Ada Lebih dari Satu Hasil) */}
          {labResults.length > 1 && (
            <section className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="section-title flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-teal shrink-0" />
                    <span>
                      {isEn
                        ? `Trend Chart Across Tests (${labResults.length} Records)`
                        : `Grafik Tren Antar Pemeriksaan (${labResults.length} Riwayat Tes)`}
                    </span>
                  </h2>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70">
                    {isEn
                      ? 'Compare changes across your semen analysis parameters over time.'
                      : 'Perbandingan perubahan parameter analisis semen Anda dari waktu ke waktu.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  {
                    key: 'concentration_m_per_ml' as const,
                    label: isEn ? 'Concentration (M/mL)' : 'Konsentrasi (juta/mL)',
                    ref: 16,
                    maxScale: 40,
                  },
                  {
                    key: 'total_motility_pct' as const,
                    label: isEn ? 'Total Motility (%)' : 'Motilitas Total (%)',
                    ref: 42,
                    maxScale: 80,
                  },
                  {
                    key: 'morphology_normal_pct' as const,
                    label: isEn ? 'Normal Morphology (%)' : 'Morfologi Normal (%)',
                    ref: 4,
                    maxScale: 10,
                  },
                ].map((metric) => {
                  const effectiveMax = Math.max(
                    metric.maxScale,
                    metric.ref * 1.25,
                    ...labResults.map((entry) => entry[metric.key] * 1.15)
                  );
                  return (
                  <div
                    key={metric.key}
                    className="well p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold">
                      <span className="text-brand-navy dark:text-white">{metric.label}</span>
                      <span className="badge badge-teal shrink-0">
                        {isEn ? 'WHO Limit:' : 'Batas WHO:'} ≥ {metric.ref}
                      </span>
                    </div>

                    {/* Visualisasi Grafik Garis SVG dengan Garis Rujukan Putus-Putus WHO */}
                    <div className="bg-surface dark:bg-surface-dark-card rounded-xl px-2 pt-3 pb-2 border border-brand-navy/5 dark:border-white/10">
                      <svg
                        viewBox="0 0 220 96"
                        className="w-full h-32 overflow-visible text-brand-navy dark:text-white"
                        role="img"
                        aria-label={`Grafik tren ${metric.label}. Garis putus-putus: rujukan WHO ${metric.ref}.`}
                      >
                        <defs>
                          <linearGradient id={`trend-fill-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0F8B8D" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#0F8B8D" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Garis dasar */}
                        <line x1={12} y1={80} x2={208} y2={80} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />

                        {/* Garis Batas Rujukan Bawah WHO */}
                        {(() => {
                          const refY = 80 - Math.min(62, (metric.ref / effectiveMax) * 62);
                          return (
                            <line
                              x1={12}
                              y1={refY}
                              x2={208}
                              y2={refY}
                              stroke="currentColor"
                              strokeOpacity="0.45"
                              strokeDasharray="4 3"
                              strokeWidth="1.25"
                            />
                          );
                        })()}

                        {/* Polyline Tren Nilai Pasien */}
                        {(() => {
                          const pts = labResults.map((entry, idx) => {
                            const x =
                              labResults.length === 1
                                ? 110
                                : 28 + (idx / (labResults.length - 1)) * 164;
                            const val = entry[metric.key];
                            const y = 80 - Math.min(62, (val / effectiveMax) * 62);
                            return { x, y, val, date: entry.testDate };
                          });
                          const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
                          const areaPoints = `${pts[0].x},80 ${polyPoints} ${pts[pts.length - 1].x},80`;
                          return (
                            <>
                              <polygon points={areaPoints} fill={`url(#trend-fill-${metric.key})`} />
                              <polyline
                                fill="none"
                                stroke="#0F8B8D"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={polyPoints}
                              />
                              {pts.map((p, i) => (
                                <g key={i}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="4.5"
                                    fill={p.val >= metric.ref ? '#2E9E6B' : '#E0A100'}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={p.x}
                                    y={p.y - 9}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="bold"
                                    fill="currentColor"
                                  >
                                    {p.val}
                                  </text>
                                  <text
                                    x={p.x}
                                    y={92}
                                    textAnchor="middle"
                                    fontSize="7.5"
                                    fontWeight="600"
                                    fill="currentColor"
                                    fillOpacity="0.6"
                                  >
                                    {isEn ? `Test #${i + 1}` : `Tes #${i + 1}`}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>

                      {/* Legenda */}
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-3xs font-semibold text-brand-navy/65 dark:text-white/65">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-4 h-0.5 rounded-full bg-brand-teal" aria-hidden="true" />
                          {isEn ? 'Your result' : 'Hasil Anda'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-4 border-t-2 border-dashed border-brand-navy/45 dark:border-white/50"
                            aria-hidden="true"
                          />
                          {isEn ? `WHO Limit (${metric.ref})` : `Rujukan WHO (${metric.ref})`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {labResults.map((entry, idx) => {
                        const val = entry[metric.key];
                        const widthPct = Math.min(100, Math.round((val / effectiveMax) * 100));
                        const meetsRef = val >= metric.ref;
                        return (
                          <div key={entry.id} className="space-y-1">
                            <div className="tabular flex justify-between text-2xs font-semibold text-brand-navy/80 dark:text-white/80">
                              <span>
                                {isEn ? `Test #${idx + 1}` : `Tes #${idx + 1}`} ({entry.testDate})
                              </span>
                              <span className={meetsRef ? 'text-[#1F7A50] dark:text-[#7BD9AC] font-bold' : 'text-[#946A00] dark:text-[#F3C64D] font-bold'}>
                                {val}
                              </span>
                            </div>
                            <div className="w-full bg-brand-navy/[0.08] dark:bg-white/10 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  meetsRef ? 'bg-status-success' : 'bg-status-warning'
                                }`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Daftar Riwayat Tabel Ringkas */}
              <div className="space-y-2.5 pt-1">
                <h3 className="eyebrow !text-brand-navy/60 dark:!text-white/60">
                  Daftar Riwayat Tersimpan
                </h3>
                {labResults.map((item) => (
                  <div
                    key={item.id}
                    className="well p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1 leading-relaxed">
                      <div className="tabular font-bold text-brand-navy dark:text-white">
                        Tanggal Tes: {item.testDate} • Vol: {item.volume_ml} mL | Konsentrasi:{' '}
                        {item.concentration_m_per_ml} jt/mL | Motilitas: {item.total_motility_pct}% | Morfologi:{' '}
                        {item.morphology_normal_pct}%
                      </div>
                      {item.notes && (
                        <div className="text-brand-navy/70 dark:text-white/70">{item.notes}</div>
                      )}
                      {item.attachmentName && (
                        <div className="text-brand-teal font-medium">📎 {item.attachmentName}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteLabResult(item.id)}
                      aria-label={`Hapus hasil tanggal ${item.testDate}`}
                      className="btn btn-ghost btn-sm !text-[#C9423E] dark:!text-[#FF8A85] self-end sm:self-center shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Rencana Tindak Lanjut: Saran Perubahan Gaya Hidup Umum (Tanpa Saran Obat/Suplemen) & Pengingat Kontrol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="section-title">
              Saran Perubahan Gaya Hidup Umum (Siklus 74 Hari)
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Panduan kebiasaan harian non-farmakologis (tanpa saran obat, dosis, atau suplemen).
            </p>
          </div>

          <div className="space-y-2.5">
            {semenReferenceConfig.lifestyleRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="well p-4 space-y-1"
              >
                <div className="font-bold text-sm text-brand-teal-dark dark:text-[#7FDADB]">{rec.title}</div>
                <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/layanan')}
            className="btn btn-navy w-full"
          >
            <MapPin className="w-4 h-4" />
            Cari dokter spesialis (Andrologi / Urologi)
          </button>
        </section>

        {/* Pengingat Kontrol */}
        <section className="card p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="section-title flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-coral shrink-0" />
              <span>Pengingat Kontrol & Evaluasi</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Jadwalkan pengingat kontrol dokter atau pemeriksaan ulang Anda.
            </p>
          </div>

          <form onSubmit={handleCreateFollowUpReminder} className="space-y-3">
            <div>
              <label htmlFor="followup-title" className="field-label">
                Agenda Pengingat
              </label>
              <input
                id="followup-title"
                type="text"
                required
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                className="field w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="datetime-local"
                aria-label="Waktu pengingat kontrol"
                required
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
                className="field flex-1"
              />
              <button
                type="submit"
                className="btn btn-primary"
              >
                Tambah
              </button>
            </div>
          </form>

          <div className="space-y-2 pt-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="well p-3.5 flex items-start justify-between gap-2 text-xs"
              >
                <label className="flex items-start gap-3 cursor-pointer leading-relaxed">
                  <input
                    type="checkbox"
                    checked={rem.completed}
                    onChange={() => toggleReminder(rem.id)}
                    className="check mt-0.5"
                  />
                  <div>
                    <div
                      className={`font-bold ${
                        rem.completed ? 'line-through opacity-60' : 'text-brand-navy dark:text-white'
                      }`}
                    >
                      {rem.title}
                    </div>
                    {rem.facilityName && (
                      <div className="text-brand-teal font-medium">{rem.facilityName}</div>
                    )}
                    <div className="text-2xs text-brand-navy/60 dark:text-white/60">
                      {rem.remindAt.replace('T', ' ')}
                    </div>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => deleteReminder(rem.id)}
                  className="p-1.5 -m-1 rounded-lg text-brand-navy/50 dark:text-white/50 hover:text-status-urgent hover:bg-status-urgent-bg dark:hover:bg-status-urgent/15 transition shrink-0"
                  aria-label="Hapus pengingat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
