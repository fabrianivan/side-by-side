import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Save,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

interface Preset {
  name: string;
  volume: number;
  concentration: number;
  totalMotility: number;
  progMotility: number;
  morphology: number;
  description: string;
}

export const SemenSimulatorPage: React.FC = () => {
  const { locale, addLabResult } = useApp();
  const t = getTranslations(locale);
  const navigate = useNavigate();
  const isEn = locale === 'en';

  // State parameter
  const [volume, setVolume] = useState<number>(2.4);
  const [concentration, setConcentration] = useState<number>(18.5);
  const [totalMotility, setTotalMotility] = useState<number>(45);
  const [progMotility, setProgMotility] = useState<number>(33);
  const [morphology, setMorphology] = useState<number>(4.5);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // WHO Manual 6th Edition (2021) lower reference limits
  const WHO_LIMITS = {
    volume: 1.4, // mL
    concentration: 16.0, // million/mL
    totalCount: 39.0, // million per ejaculate
    totalMotility: 42.0, // %
    progMotility: 30.0, // %
    morphology: 4.0, // %
  };

  // Calculations
  const totalCount = parseFloat((volume * concentration).toFixed(1));
  const tmsc = parseFloat(((volume * concentration * (progMotility / 100))).toFixed(1)); // Total Motile Sperm Count

  // Status checks
  const isVolumeOk = volume >= WHO_LIMITS.volume;
  const isConcOk = concentration >= WHO_LIMITS.concentration;
  const isTotalMotOk = totalMotility >= WHO_LIMITS.totalMotility;
  const isProgMotOk = progMotility >= WHO_LIMITS.progMotility;
  const isMorphOk = morphology >= WHO_LIMITS.morphology;

  // Plain clinical classifications
  const classifications: string[] = [];
  if (!isConcOk) {
    classifications.push(
      isEn
        ? 'Oligozoospermia (Sperm concentration below benchmark)'
        : 'Oligozoospermia (Konsentrasi di bawah rujukan)'
    );
  }
  if (!isProgMotOk) {
    classifications.push(
      isEn
        ? 'Asthenozoospermia (Progressive motility below benchmark)'
        : 'Asthenozoospermia (Motilitas progresif di bawah rujukan)'
    );
  }
  if (!isMorphOk) {
    classifications.push(
      isEn
        ? 'Teratozoospermia (Normal morphology below benchmark)'
        : 'Teratozoospermia (Morfologi normal di bawah rujukan)'
    );
  }
  const isAllNormal = classifications.length === 0 && isVolumeOk;

  const presets: Preset[] = [
    {
      name: isEn ? 'WHO Standard (Healthy Reference)' : 'Rujukan WHO (Rata-rata Normal)',
      volume: 2.5,
      concentration: 35.0,
      totalMotility: 55.0,
      progMotility: 42.0,
      morphology: 6.0,
      description: isEn
        ? 'Standard healthy parameters above the 5th percentile of the WHO 2021 manual.'
        : 'Gambaran parameter sehat di atas batas persentil ke-5 standar WHO 2021.',
    },
    {
      name: isEn ? 'Mild Fluctuation / Fatigue' : 'Fluktuasi Ringan / Kelelahan',
      volume: 1.8,
      concentration: 14.5,
      totalMotility: 40.0,
      progMotility: 28.0,
      morphology: 4.0,
      description: isEn
        ? 'Common when sleep deprived, experiencing work stress, or exposed to groin heat in recent weeks.'
        : 'Sering terjadi saat kurang tidur, stres kerja, atau paparan panas beberapa minggu terakhir.',
    },
    {
      name: isEn ? 'Physician Review Scenario' : 'Skenario Evaluasi Dokter',
      volume: 1.2,
      concentration: 9.0,
      totalMotility: 25.0,
      progMotility: 18.0,
      morphology: 2.5,
      description: isEn
        ? 'Ideal candidate for an andrology/urology consultation, testicular exam, or Doppler ultrasound.'
        : 'Kandidat ideal untuk konsultasi andrologi/urologi, pemeriksaan fisik varikokel, atau USG Doppler.',
    },
  ];

  const applyPreset = (p: Preset) => {
    setVolume(p.volume);
    setConcentration(p.concentration);
    setTotalMotility(p.totalMotility);
    setProgMotility(p.progMotility);
    setMorphology(p.morphology);
  };

  const handleSaveToMyResults = async () => {
    await addLabResult({
      testDate: new Date().toISOString().slice(0, 10),
      volume_ml: volume,
      concentration_m_per_ml: concentration,
      total_motility_pct: totalMotility,
      progressive_motility_pct: progMotility,
      morphology_normal_pct: morphology,
      notes: isEn
        ? `Saved from WHO 2021 Interactive Simulator (TMSC: ${tmsc} M).`
        : `Disimpan dari Simulator Edukasi WHO 2021 (TMSC: ${tmsc} juta).`,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopySummary = async () => {
    const text = isEn
      ? `Semen Analysis Simulation Summary (WHO 6th Ed. Standard):
- Volume: ${volume} mL (Benchmark ≥ 1.4 mL) [${isVolumeOk ? 'Normal' : 'Requires Review'}]
- Concentration: ${concentration} M/mL (Benchmark ≥ 16 M/mL) [${isConcOk ? 'Normal' : 'Requires Review'}]
- Total Sperm: ${totalCount} M per ejaculate (Benchmark ≥ 39 M)
- Progressive Motility: ${progMotility}% (Benchmark ≥ 30%) [${isProgMotOk ? 'Normal' : 'Requires Review'}]
- Total Motility: ${totalMotility}% (Benchmark ≥ 42%) [${isTotalMotOk ? 'Normal' : 'Requires Review'}]
- Normal Morphology: ${morphology}% (Benchmark ≥ 4%) [${isMorphOk ? 'Normal' : 'Requires Review'}]
- Total Motile Sperm Count (TMSC): ${tmsc} M
- Clinical Interpretation: ${isAllNormal ? 'Normozoospermia (All values within reference)' : classifications.join(', ')}

Note: A single test result varies naturally due to biological fluctuations. Always consult an andrologist or urologist.`
      : `Ringkasan Simulasi Analisis Semen (Acuan WHO Edisi ke-6):
- Volume: ${volume} mL (Rujukan ≥ 1,4 mL) [${isVolumeOk ? 'Normal' : 'Perlu Evaluasi'}]
- Konsentrasi: ${concentration} juta/mL (Rujukan ≥ 16 juta/mL) [${isConcOk ? 'Normal' : 'Perlu Evaluasi'}]
- Total Sperma: ${totalCount} juta per ejakulat (Rujukan ≥ 39 juta)
- Motilitas Progresif: ${progMotility}% (Rujukan ≥ 30%) [${isProgMotOk ? 'Normal' : 'Perlu Evaluasi'}]
- Motilitas Total: ${totalMotility}% (Rujukan ≥ 42%) [${isTotalMotOk ? 'Normal' : 'Perlu Evaluasi'}]
- Morfologi Normal: ${morphology}% (Rujukan ≥ 4%) [${isMorphOk ? 'Normal' : 'Perlu Evaluasi'}]
- Total Motile Sperm Count (TMSC): ${tmsc} juta
- Kesimpulan Awam: ${isAllNormal ? 'Normozoospermia (Semua parameter dalam rentang rujukan)' : classifications.join(', ')}

Catatan: Hasil satu kali tes bisa bervariasi karena fluktuasi biologis. Selalu diskusikan dengan dokter spesialis andrologi/urologi.`;

    await navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-7 border border-brand-navy/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-2.5 py-1 rounded-full">
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEn ? 'WHO 6th Edition (2021) Guidelines' : 'Standar WHO Edisi ke-6 (2021)'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
              {isEn ? 'WHO Semen Analysis Simulator & Calculator' : 'Simulator & Kalkulator Parameter Sperma'}
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">
              {isEn
                ? 'Adjust parameter sliders to understand how volume, concentration, motility, and morphology influence conception potential in an objective, stigma-free manner.'
                : 'Geser nilai untuk memahami bagaimana volume, konsentrasi, motilitas, dan morfologi memengaruhi potensi konsepsi secara awam dan objektif.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveToMyResults}
              disabled={savedSuccess}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-teal-dark transition disabled:opacity-75"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {savedSuccess
                  ? isEn ? 'Saved to My Results!' : 'Tersimpan ke Hasil Saya!'
                  : isEn ? 'Save to My Results' : 'Simpan ke Hasil Saya'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="touch-target px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-brand-navy dark:text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-navy/5 transition"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-brand-teal" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSummary ? (isEn ? 'Copied' : 'Tersalin') : (isEn ? 'Copy Summary' : 'Salin Teks')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Presets */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 dark:text-white/60 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-coral" />
          <span>{isEn ? 'Choose an Example Scenario:' : 'Pilih Skenario Contoh:'}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="p-3.5 rounded-btn text-left border border-brand-navy/10 hover:border-brand-teal hover:bg-brand-teal-light/20 transition space-y-1 bg-surface-muted/40 dark:bg-surface-dark"
            >
              <div className="font-bold text-xs text-brand-navy dark:text-white flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-[10px] text-brand-teal font-semibold">{isEn ? 'Apply' : 'Terapkan'}</span>
              </div>
              <p className="text-[11px] text-brand-navy/70 dark:text-white/70 line-clamp-2">
                {p.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Sliders Controls + Realtime Insight Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-6">
            <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-teal" />
              <span>{isEn ? 'Adjust Parameters' : 'Atur Nilai Parameter'}</span>
            </h2>

            {/* Slider 1: Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-volume" className="text-xs font-bold text-brand-navy dark:text-white">
                  {isEn ? 'Ejaculate Volume (mL)' : 'Volume Ejakulat (mL)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isVolumeOk ? 'bg-brand-teal-light text-brand-teal' : 'bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral'}`}>
                    {volume} mL {isVolumeOk ? '• Normal' : (isEn ? '• Below Benchmark' : '• Di Bawah Rujukan')}
                  </span>
                  <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    ({isEn ? 'Benchmark' : 'Rujukan'} ≥ {WHO_LIMITS.volume} mL)
                  </span>
                </div>
              </div>
              <input
                id="sim-volume"
                type="range"
                min="0.5"
                max="6.0"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
                {isEn
                  ? 'Seminal fluid produced by seminal vesicles and prostate. Values < 1.4 mL may result from short abstinence (< 2 days) or dehydration.'
                  : 'Cairan semen diproduksi oleh vesikula seminalis & prostat. Kurang dari 1,4 mL bisa karena masa pantang terlalu singkat (< 2 hari) atau dehidrasi.'}
              </p>
            </div>

            {/* Slider 2: Concentration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-conc" className="text-xs font-bold text-brand-navy dark:text-white">
                  {isEn ? 'Sperm Concentration (million cells/mL)' : 'Konsentrasi Sperma (juta sel/mL)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isConcOk ? 'bg-brand-teal-light text-brand-teal' : 'bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral'}`}>
                    {concentration} M/mL {isConcOk ? '• Normal' : (isEn ? '• Low' : '• Rendah')}
                  </span>
                  <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    ({isEn ? 'Benchmark' : 'Rujukan'} ≥ {WHO_LIMITS.concentration} M/mL)
                  </span>
                </div>
              </div>
              <input
                id="sim-conc"
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={concentration}
                onChange={(e) => setConcentration(parseFloat(e.target.value))}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
                {isEn
                  ? 'Density of sperm cells per milliliter. Influenced by testicular tissue, scrotal heat, and systemic testosterone.'
                  : 'Kepadatan sel sperma per mililiter. Dipengaruhi oleh fungsi testis, suhu skrotum, dan kadar hormon testosteron.'}
              </p>
            </div>

            {/* Slider 3: Progressive Motility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-prog" className="text-xs font-bold text-brand-navy dark:text-white">
                  {isEn ? 'Progressive Motility (%)' : 'Motilitas Progresif (%)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isProgMotOk ? 'bg-brand-teal-light text-brand-teal' : 'bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral'}`}>
                    {progMotility}% {isProgMotOk ? '• Normal' : (isEn ? '• Low' : '• Rendah')}
                  </span>
                  <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    ({isEn ? 'Benchmark' : 'Rujukan'} ≥ {WHO_LIMITS.progMotility}%)
                  </span>
                </div>
              </div>
              <input
                id="sim-prog"
                type="range"
                min="0"
                max="90"
                step="1"
                value={progMotility}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setProgMotility(val);
                  if (val > totalMotility) setTotalMotility(val);
                }}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
                {isEn
                  ? 'The percentage of sperm swimming forward in a straight line or large circles—the most vital factor for natural fertilization.'
                  : 'Kemampuan sperma berenang lurus ke depan menuju sel telur. Ini adalah penentu terpenting pembuahan alami.'}
              </p>
            </div>

            {/* Slider 4: Total Motility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-total-mot" className="text-xs font-bold text-brand-navy dark:text-white">
                  {isEn ? 'Total Motility (%)' : 'Motilitas Total (%)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isTotalMotOk ? 'bg-brand-teal-light text-brand-teal' : 'bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral'}`}>
                    {totalMotility}% {isTotalMotOk ? '• Normal' : (isEn ? '• Low' : '• Rendah')}
                  </span>
                  <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    ({isEn ? 'Benchmark' : 'Rujukan'} ≥ {WHO_LIMITS.totalMotility}%)
                  </span>
                </div>
              </div>
              <input
                id="sim-total-mot"
                type="range"
                min="0"
                max="95"
                step="1"
                value={totalMotility}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTotalMotility(val);
                  if (val < progMotility) setProgMotility(val);
                }}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
                {isEn
                  ? 'Total percentage of sperm displaying movement (both progressive and non-progressive).'
                  : 'Total persentase sperma yang bergerak (baik berenang maju maupun bergerak di tempat).'}
              </p>
            </div>

            {/* Slider 5: Normal Morphology */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-morph" className="text-xs font-bold text-brand-navy dark:text-white">
                  {isEn ? 'Normal Morphology / Strict Criteria (%)' : 'Morfologi Normal / Bentuk Utuh (%)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isMorphOk ? 'bg-brand-teal-light text-brand-teal' : 'bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral'}`}>
                    {morphology}% {isMorphOk ? '• Normal' : (isEn ? '• Low' : '• Rendah')}
                  </span>
                  <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    ({isEn ? 'Benchmark' : 'Rujukan'} ≥ {WHO_LIMITS.morphology}%)
                  </span>
                </div>
              </div>
              <input
                id="sim-morph"
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={morphology}
                onChange={(e) => setMorphology(parseFloat(e.target.value))}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
                {isEn
                  ? 'Kruger strict criteria: symmetric oval head and uncoiled tail. Only ≥ 4% normally formed sperm is required for standard fertility potential.'
                  : 'Kriteria ketat Kruger WHO: sperma dengan bentuk kepala oval simetris dan ekor lurus. Hanya butuh ≥ 4% normal untuk peluang pembuahan optimal.'}
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Insight Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-gradient-to-br from-brand-navy to-brand-navy-light text-white rounded-card shadow-soft p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-brand-teal-light">
                {isEn ? 'Key Clinical Metric' : 'Indikator Klinis Kunci'}
              </span>
              <span className="text-xs text-white/70">WHO 6th Ed. (2021)</span>
            </div>

            <div>
              <p className="text-xs text-white/70">
                {isEn ? 'Total Motile Sperm Count (TMSC):' : 'Total Sperma Bergerak Progresif (TMSC):'}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{tmsc}</span>
                <span className="text-sm font-semibold text-brand-teal-light">
                  {isEn ? 'Million / Ejaculate' : 'Juta Sel / Ejakulat'}
                </span>
              </div>
            </div>

            {/* TMSC Status */}
            <div className="p-3.5 rounded-btn bg-white/10 border border-white/15 text-xs space-y-1">
              <div className="font-bold text-brand-coral flex items-center gap-1.5">
                {tmsc >= 20 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                    <span className="text-white">
                      {isEn ? 'Optimal Natural Conception Potential (> 20 M)' : 'Peluang Konsepsi Alami Sangat Baik (> 20 M)'}
                    </span>
                  </>
                ) : tmsc >= 10 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                    <span className="text-white">
                      {isEn ? 'Good Natural Conception Potential (10–20 M)' : 'Peluang Konsepsi Alami Baik (10–20 M)'}
                    </span>
                  </>
                ) : tmsc >= 5 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-brand-coral" />
                    <span className="text-brand-coral">
                      {isEn ? 'Moderate Conception Potential (5–10 M)' : 'Peluang Alami Menengah (5–10 M)'}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-brand-coral" />
                    <span className="text-brand-coral">
                      {isEn ? 'Doctor Consultation Advised (< 5 M)' : 'Sangat Dianjurkan Diskusi dengan Dokter (< 5 M)'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-white/75 text-[11px] leading-relaxed">
                {isEn
                  ? 'TMSC multiplies Volume × Concentration × Progressive Motility to calculate the actual sperm population capable of reaching the fallopian tube.'
                  : 'TMSC menggabungkan Volume × Konsentrasi × Gerak Progresif untuk memprediksi jumlah sperma yang mampu mencapai tuba falopi.'}
              </p>
            </div>

            {/* Clinical Classification */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <p className="text-xs font-semibold text-white/80">
                {isEn ? 'Diagnostic Terminology:' : 'Interpretasi Istilah Medis:'}
              </p>
              <div className="p-3 rounded-btn bg-black/20 text-xs">
                {isAllNormal ? (
                  <div className="text-brand-teal-light font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                    <span>{isEn ? 'Normozoospermia (All Within Reference)' : 'Normozoospermia (Semua Normal)'}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-brand-coral font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>{classifications.join(' + ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reassuring Facts Card */}
          <div className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/5 space-y-3">
            <h3 className="text-xs font-bold text-brand-navy dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-brand-teal" />
              <span>{isEn ? 'Reassuring Clinical Facts' : 'Fakta Medis yang Menenangkan'}</span>
            </h3>
            <ul className="text-xs text-brand-navy/80 dark:text-white/80 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-1.5 shrink-0" />
                <span>
                  <strong>{isEn ? 'Not a Permanent Infertility Sentence:' : 'Bukan Vonis Mandul:'}</strong>{' '}
                  {isEn
                    ? 'Values below the 5th percentile do not mean natural conception is impossible. Many men with lower scores successfully conceive naturally.'
                    : 'Nilai di bawah rujukan tidak berarti Anda tidak bisa memiliki anak. Banyak pria dengan angka di bawah batas rujukan berhasil memiliki anak secara alami.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-1.5 shrink-0" />
                <span>
                  <strong>{isEn ? 'Natural Sperm Renewal:' : 'Fluktuasi Sperma:'}</strong>{' '}
                  {isEn
                    ? 'A fresh sperm generation matures every 64–74 days. Lifestyle habits (sleep, scrotal cooling, antioxidants) reflect on your next test.'
                    : 'Siklus sperma baru diproduksi setiap 64–74 hari. Perubahan gaya hidup (tidur, pendinginan testis, antioksidan) akan tercermin pada tes berikutnya.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-1.5 shrink-0" />
                <span>
                  <strong>{isEn ? 'Confirmation Test Needed:' : 'Perlu Tes Konfirmasi:'}</strong>{' '}
                  {isEn
                    ? 'Doctors always recommend a second test 2–4 weeks later before drawing clinical conclusions.'
                    : 'Dokter biasanya menyarankan tes ulang 2–4 minggu kemudian sebelum menarik kesimpulan klinis.'}
                </span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(isEn ? '/facilities' : '/layanan')}
                className="w-full py-2.5 px-3 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-navy-light transition"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-teal" />
                <span>{isEn ? 'Find Andrology & Urology Clinics' : 'Cari Klinik Andrologi & Urologi Terdekat'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
