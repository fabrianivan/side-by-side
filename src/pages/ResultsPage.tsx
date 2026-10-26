import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
            Tindak Lanjut Hasil Analisis Semen & Tren
          </h1>
          <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75">
            Sumber acuan: <strong>{semenReferenceConfig.source}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {labResults.length === 0 && (
            <button
              type="button"
              onClick={() => loadRendraDemoScenario()}
              className="touch-target px-3.5 py-2.5 rounded-btn bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral text-xs font-bold flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Muat 2 Contoh Hasil Rendra
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-teal-dark transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showAddForm ? 'Tutup Formulir' : 'Input Hasil Baru'}</span>
          </button>
        </div>
      </section>

      {/* Disclaimer Wajib di Halaman Tindak Lanjut Hasil */}
      <div className="p-4 rounded-card bg-brand-teal-light/60 dark:bg-brand-teal/20 border border-brand-teal/30 flex items-center gap-3 text-xs sm:text-sm font-semibold text-brand-navy dark:text-white">
        <Info className="w-5 h-5 text-brand-teal shrink-0" />
        <span>
          {semenReferenceConfig.disclaimer} Aplikasi ini tidak memberikan diagnosis medis maupun saran obat, dosis, atau suplemen.
        </span>
      </div>

      {/* Formulir Input Manual Hasil Analisis Semen */}
      {showAddForm && (
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-teal/40 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">
              Input Manual Hasil Analisis Semen
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Salin angka dari lembar hasil laboratorium Anda. Data dienkripsi di perangkat Anda.
            </p>
          </div>

          <form onSubmit={handleSubmitLab} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="lab-date" className="block text-xs font-bold mb-1">
                  Tanggal Tes Laboratorium
                </label>
                <input
                  id="lab-date"
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              <div>
                <label htmlFor="lab-volume" className="block text-xs font-bold mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              <div>
                <label htmlFor="lab-conc" className="block text-xs font-bold mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              <div>
                <label htmlFor="lab-mot-total" className="block text-xs font-bold mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              <div>
                <label htmlFor="lab-mot-prog" className="block text-xs font-bold mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              <div>
                <label htmlFor="lab-morph" className="block text-xs font-bold mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lab-notes" className="block text-xs font-bold mb-1">
                  Catatan Pribadi (Masa pantang, kondisi tubuh, dll.)
                </label>
                <input
                  id="lab-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mis: Masa pantang 3 hari, kondisi sehat"
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              <div>
                <label htmlFor="lab-photo" className="block text-xs font-bold mb-1">
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
                className="touch-target px-4 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="touch-target px-5 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold"
              >
                Simpan Hasil Terenkripsi
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tampilan Kosong (Empty State Sesuai Microcopy) */}
      {labResults.length === 0 ? (
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-8 text-center space-y-4 border border-brand-navy/5">
          <div className="w-12 h-12 rounded-full bg-brand-teal-light text-brand-teal flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">
            “{t.emptyStates.results}”
          </h2>
          <p className="text-xs sm:text-sm text-brand-navy/70 dark:text-white/70 max-w-md mx-auto">
            Jika Anda sudah pernah menjalani analisis semen, masukkan angkanya untuk membaca penjelasan bahasa awam sesuai acuan WHO 2021.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="touch-target px-5 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold"
            >
              Input Hasil Analisis Semen
            </button>
            <button
              type="button"
              onClick={() => loadRendraDemoScenario()}
              className="touch-target px-5 py-2.5 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/15 text-xs font-bold"
            >
              Lihat Contoh Hasil & Grafik Tren Rendra
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Penjelasan Parameter dalam Bahasa Awam (Membandingkan dengan Rentang Rujukan WHO 2021) */}
          {latestResult && (
            <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-teal">
                    Hasil Terbaru • Tanggal Tes: {latestResult.testDate}
                  </span>
                  <h2 className="text-lg font-bold text-brand-navy dark:text-white">
                    Penjelasan Istilah dalam Bahasa Awam (Acuan WHO Edisi ke-6)
                  </h2>
                </div>

                {hasValueOutsideReference && (
                  <button
                    type="button"
                    onClick={() => navigate('/layanan')}
                    className="touch-target px-4 py-2.5 rounded-btn bg-brand-coral text-white text-xs font-bold flex items-center gap-1.5 shadow-soft"
                  >
                    <MapPin className="w-4 h-4" />
                    Cari dokter spesialis
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
                      className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm text-brand-navy dark:text-white">
                          {param.label}
                        </h3>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isAtOrAboveRef
                              ? 'bg-status-success-bg text-status-success'
                              : 'bg-status-warning-bg text-brand-navy'
                          }`}
                        >
                          {userVal} {param.unit} (Rujukan WHO ≥ {param.lowerReferenceLimit}{' '}
                          {param.unit})
                        </span>
                      </div>

                      <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
                        {param.plainExplanation}
                      </p>

                      {!isAtOrAboveRef && (
                        <div className="p-2.5 rounded-btn bg-status-warning-bg/70 text-brand-navy text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
                          <span>{param.belowRangeNote}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs font-semibold text-brand-teal pt-1">
                * {semenReferenceConfig.disclaimer}
              </div>
            </section>
          )}

          {/* Grafik Tren Sederhana (Tampil Bila Ada Lebih dari Satu Hasil) */}
          {labResults.length > 1 && (
            <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-brand-navy dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-teal" />
                    <span>Grafik Tren Antar Pemeriksaan ({labResults.length} Riwayat Tes)</span>
                  </h2>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70">
                    Perbandingan perubahan parameter analisis semen Anda dari waktu ke waktu.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    key: 'concentration_m_per_ml' as const,
                    label: 'Konsentrasi (juta/mL)',
                    ref: 16,
                    maxScale: 40,
                  },
                  {
                    key: 'total_motility_pct' as const,
                    label: 'Motilitas Total (%)',
                    ref: 42,
                    maxScale: 80,
                  },
                  {
                    key: 'morphology_normal_pct' as const,
                    label: 'Morfologi Normal (%)',
                    ref: 4,
                    maxScale: 10,
                  },
                ].map((metric) => (
                  <div
                    key={metric.key}
                    className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{metric.label}</span>
                      <span className="text-brand-teal">Batas WHO: ≥ {metric.ref}</span>
                    </div>

                    {/* Visualisasi Grafik Garis SVG dengan Garis Rujukan Putus-Putus WHO */}
                    <div className="bg-surface dark:bg-surface-dark-card rounded-btn p-2.5 border border-brand-navy/5">
                      <svg
                        viewBox="0 0 220 75"
                        className="w-full h-20 overflow-visible"
                        role="img"
                        aria-label={`Grafik tren ${metric.label}`}
                      >
                        {/* Garis Batas Rujukan Bawah WHO */}
                        {(() => {
                          const refY = 65 - Math.min(55, (metric.ref / metric.maxScale) * 55);
                          return (
                            <>
                              <line
                                x1={15}
                                y1={refY}
                                x2={205}
                                y2={refY}
                                stroke="#0F8B8D"
                                strokeDasharray="4 3"
                                strokeWidth="1.5"
                              />
                              <text
                                x={205}
                                y={refY - 3}
                                textAnchor="end"
                                fontSize="8"
                                fill="#0F8B8D"
                                fontWeight="bold"
                              >
                                Rujukan WHO ({metric.ref})
                              </text>
                            </>
                          );
                        })()}

                        {/* Polyline Tren Nilai Pasien */}
                        {(() => {
                          const pts = labResults.map((entry, idx) => {
                            const x =
                              labResults.length === 1
                                ? 110
                                : 25 + (idx / (labResults.length - 1)) * 170;
                            const val = entry[metric.key];
                            const y = 65 - Math.min(55, (val / metric.maxScale) * 55);
                            return { x, y, val, date: entry.testDate };
                          });
                          const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="#FF7A66"
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
                                    r="4"
                                    fill={p.val >= metric.ref ? '#2E9E6B' : '#E0A100'}
                                    stroke="#FFFFFF"
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x={p.x}
                                    y={p.y - 7}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="bold"
                                    fill="#1B2A41"
                                  >
                                    {p.val}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    <div className="space-y-2">
                      {labResults.map((entry, idx) => {
                        const val = entry[metric.key];
                        const widthPct = Math.min(100, Math.round((val / metric.maxScale) * 100));
                        const meetsRef = val >= metric.ref;
                        return (
                          <div key={entry.id} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span>
                                Tes #{idx + 1} ({entry.testDate})
                              </span>
                              <span className={meetsRef ? 'text-status-success font-bold' : 'text-status-warning font-bold'}>
                                {val}
                              </span>
                            </div>
                            <div className="w-full bg-surface dark:bg-surface-dark-card h-3 rounded-full overflow-hidden">
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
                ))}
              </div>

              {/* Daftar Riwayat Tabel Ringkas */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70">
                  Daftar Riwayat Tersimpan
                </h3>
                {labResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-brand-navy dark:text-white">
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
                      className="text-status-urgent hover:underline flex items-center gap-1 self-end sm:self-center"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-brand-navy dark:text-white">
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
                className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark space-y-1"
              >
                <div className="font-bold text-xs text-brand-teal">{rec.title}</div>
                <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/layanan')}
            className="touch-target w-full py-3 px-4 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-navy-light transition"
          >
            <MapPin className="w-4 h-4" />
            Cari dokter spesialis (Andrologi / Urologi)
          </button>
        </section>

        {/* Pengingat Kontrol */}
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-coral" />
              <span>Pengingat Kontrol & Evaluasi</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Jadwalkan pengingat kontrol dokter atau pemeriksaan ulang Anda.
            </p>
          </div>

          <form onSubmit={handleCreateFollowUpReminder} className="space-y-3">
            <div>
              <label htmlFor="followup-title" className="block text-xs font-semibold mb-1">
                Agenda Pengingat
              </label>
              <input
                id="followup-title"
                type="text"
                required
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                aria-label="Waktu pengingat kontrol"
                required
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
              />
              <button
                type="submit"
                className="touch-target px-4 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold"
              >
                Tambah
              </button>
            </div>
          </form>

          <div className="space-y-2 pt-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3 rounded-btn bg-surface-muted dark:bg-surface-dark flex items-start justify-between gap-2 text-xs"
              >
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rem.completed}
                    onChange={() => toggleReminder(rem.id)}
                    className="w-4 h-4 accent-brand-teal mt-0.5"
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
                    <div className="text-[11px] text-brand-navy/60 dark:text-white/60">
                      {rem.remindAt.replace('T', ' ')}
                    </div>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => deleteReminder(rem.id)}
                  className="text-brand-navy/50 hover:text-status-urgent"
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
