import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  Users,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { assessmentRulesConfig } from '../config/schemas';
import { RENDRA_DEMO_ANSWERS, type AssessmentAnswers } from '../lib/assessment-engine';
import { useApp } from '../context/AppContext';

export const AssessmentPage: React.FC = () => {
  const {
    locale,
    assessmentAnswers,
    assessmentResult,
    saveAssessment,
  } = useApp();
  const isEn = locale === 'en';
  const navigate = useNavigate();

  const questions = assessmentRulesConfig.questions;
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [draftAnswers, setDraftAnswers] = useState<AssessmentAnswers>(() => ({
    ...assessmentAnswers,
  }));
  const [freeTextNote, setFreeTextNote] = useState<string>('');
  const [viewMode, setViewMode] = useState<'quiz' | 'result'>(() =>
    assessmentResult ? 'result' : 'quiz'
  );

  useEffect(() => {
    setDraftAnswers({ ...assessmentAnswers });
    setViewMode(assessmentResult ? 'result' : 'quiz');
    if (!assessmentResult && Object.keys(assessmentAnswers).length === 0) {
      setCurrentIndex(0);
      setFreeTextNote('');
    }
  }, [assessmentAnswers, assessmentResult]);

  // Kalkulator IMT Opsional untuk Pertanyaan 10 (bmi_category)
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');

  const currentQuestion = questions[currentIndex];
  const progressPct = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const handleSelectOption = async (value: string) => {
    const updated = { ...draftAnswers, [currentQuestion.id]: value };
    setDraftAnswers(updated);
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await saveAssessment(updated, freeTextNote);
      setViewMode('result');
    }
  };

  const handleSkip = async () => {
    const updated = { ...draftAnswers, [currentQuestion.id]: 'skipped' };
    setDraftAnswers(updated);
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await saveAssessment(updated, freeTextNote);
      setViewMode('result');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCalculateBmi = () => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (!w || !h || h <= 0) return;
    const bmi = w / (h * h);
    if (bmi >= 18.5 && bmi <= 24.9) {
      handleSelectOption('normal');
    } else if (bmi >= 30) {
      handleSelectOption('obese');
    } else {
      handleSelectOption('overweight_or_underweight');
    }
  };

  const handleFillRendraDemo = async () => {
    setDraftAnswers(RENDRA_DEMO_ANSWERS);
    await saveAssessment(RENDRA_DEMO_ANSWERS, '');
    setViewMode('result');
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setViewMode('quiz');
  };

  // TAMPILAN HASIL CEK AWAL
  if (viewMode === 'result' && assessmentResult) {
    const badgeColorStyles = {
      success: 'bg-status-success-bg dark:bg-status-success/15 text-[#1F7A50] dark:text-[#7BD9AC] border-status-success/30',
      warning: 'bg-status-warning-bg dark:bg-status-warning/15 text-brand-navy dark:text-[#F3C64D] border-status-warning/40',
      urgent: 'bg-status-urgent-bg dark:bg-status-urgent/15 text-[#B33834] dark:text-[#FF8A85] border-status-urgent/30',
    };

    return (
      <div className="space-y-6">
        {/* Banner Dukungan Emosional (Bila Terdeteksi Tekanan Emosional Berat) */}
        {assessmentResult.showEmotionalSupport && (
          <section
            role="alert"
            className="bg-brand-coral-light dark:bg-brand-coral/15 border-2 border-brand-coral rounded-card p-5 space-y-3 text-brand-navy dark:text-white"
          >
            <div className="flex items-start gap-3">
              <HeartHandshake className="w-6 h-6 text-brand-coral-dark dark:text-brand-coral shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h2 className="font-bold text-base">
                  {assessmentResult.emotionalSupportBanner.title}
                </h2>
                <p className="text-xs leading-relaxed">
                  {assessmentResult.emotionalSupportBanner.message}
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  {assessmentResult.emotionalSupportBanner.contacts.map((c) => (
                    <div
                      key={c.name}
                      className="px-3 py-1.5 rounded-btn bg-white dark:bg-surface-dark-card text-xs font-semibold border border-brand-coral/30"
                    >
                      {c.name}: <span className="text-brand-teal dark:text-[#7FDADB]">{c.contact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Kartu Ringkasan Tingkat Saran */}
        <section className="card p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="badge badge-teal">
              <ShieldCheck className="w-4 h-4" />
              {isEn
                ? 'Self-Check Summary (Encrypted Locally on Device)'
                : 'Hasil Cek Awal Mandiri (Tersimpan Terenkripsi di Perangkat)'}
            </span>
            <button
              type="button"
              onClick={handleRetake}
              className="text-xs font-semibold text-brand-navy/70 dark:text-white/70 hover:text-brand-teal flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {isEn ? 'Retake Questionnaire' : 'Ulangi Kuesioner'}
            </button>
          </div>

          <div
            className={`p-5 sm:p-6 rounded-card border-2 ${badgeColorStyles[assessmentResult.badgeColor]} space-y-2.5`}
          >
            <div className="text-xs font-bold uppercase tracking-wider opacity-80">
              {isEn ? 'Recommended Check-Up Window' : 'Tingkat Saran Pemeriksaan'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{assessmentResult.levelLabel}</h1>
            <p className="text-sm leading-relaxed">{assessmentResult.summary}</p>
          </div>

          {/* Disclaimer Singkat Wajib */}
          <div className="well px-4 py-3.5 flex items-center gap-2.5 text-xs font-semibold text-brand-navy/85 dark:text-white/85">
            <Info className="w-4 h-4 text-brand-teal shrink-0" />
            <span>{assessmentResult.disclaimer}</span>
          </div>

          {/* Faktor yang Memengaruhi & Penjelasan "Mengapa Ini Relevan" */}
          <div className="space-y-3 pt-2">
            <h2 className="section-title">
              Faktor yang Memengaruhi & Mengapa Ini Relevan
            </h2>

            {assessmentResult.factors.length === 0 ? (
              <div className="p-4 rounded-btn bg-surface-muted dark:bg-surface-dark text-xs text-brand-navy/80 dark:text-white/80">
                Tidak ditemukan faktor risiko khusus dari jawaban Anda. Tetap pertahankan pola tidur, olahraga rutin, dan komunikasi yang hangat bersama pasangan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assessmentResult.factors.map((f, idx) => (
                  <div
                    key={`${f.questionId}-${idx}`}
                    className="well p-4 sm:p-5 space-y-2"
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="badge badge-teal">
                        {f.topic}
                      </span>
                      <span className="font-bold text-sm leading-snug text-brand-navy dark:text-white">
                        {f.factorTitle}
                      </span>
                    </div>
                    <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
                      <strong>Mengapa ini relevan:</strong> {f.whyRelevant}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Langkah Kecil Berikutnya */}
          <div className="space-y-3 pt-2">
            <h2 className="section-title">
              Langkah Kecil Berikutnya
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assessmentResult.nextSteps.map((step, i) => (
                <li
                  key={i}
                  className="well p-4 flex items-start gap-2.5 text-sm leading-relaxed text-brand-navy/85 dark:text-white/85"
                >
                  <CheckCircle2 className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tombol Aksi Utama Sesuai Spesifikasi F2 */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-brand-navy/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate(isEn ? '/facilities' : '/layanan')}
              className="btn btn-primary btn-lg flex-1"
            >
              <MapPin className="w-4 h-4" />
              {isEn ? 'Find care clinics' : 'Cari layanan pemeriksaan'}
            </button>

            <button
              type="button"
              onClick={() => navigate(isEn ? '/couple' : '/berdua')}
              className="btn btn-coral btn-lg flex-1"
            >
              <Users className="w-4 h-4" />
              {isEn ? 'Invite partner' : 'Ajak pasangan'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // TAMPILAN KUESIONER (1 PERTANYAAN PER LAYAR — LAYOUT LEBAR 12 KOLOM DESKTOP)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-5">
        {/* Header Progress & Pintasan Demo */}
        <div className="card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="eyebrow">
                {isEn
                  ? `Self-Check Assessment • Question ${currentIndex + 1} of ${totalQuestions}`
                  : `Cek Awal Mandiri • Pertanyaan ${currentIndex + 1} dari ${totalQuestions}`}
              </span>
              <h1 className="text-base font-bold text-brand-navy dark:text-white">
                {isEn ? 'Topic:' : 'Topik:'} {currentQuestion.topic}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleFillRendraDemo}
              className="btn btn-coral-soft"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isEn ? 'Fill Rendra Demo (Instant Finish)' : 'Isi Contoh Rendra (Selesai Instan)'}
            </button>
          </div>

          {/* Progress Bar Halus */}
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={isEn ? `Questionnaire progress ${progressPct}%` : `Progres kuesioner ${progressPct}%`}
              className="progress-track"
            >
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="tabular text-xs font-bold text-brand-navy/70 dark:text-white/70 shrink-0 w-9 text-right">
              {progressPct}%
            </span>
          </div>
        </div>

        {/* Kartu Pertanyaan Aktif */}
        <section
          key={currentQuestion.id}
          className="card p-6 sm:p-8 space-y-6 transition-opacity duration-200"
        >
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold leading-snug text-brand-navy dark:text-white">
              {currentQuestion.question}
            </h2>
            <p className="text-xs sm:text-sm text-brand-navy/70 dark:text-white/70 leading-relaxed">
              {currentQuestion.helperText}
            </p>
          </div>

          {/* Kalkulator Cepat Berat/Tinggi Badan (Khusus Pertanyaan 10: bmi_category) */}
          {currentQuestion.id === 'bmi_category' && (
            <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10 space-y-3">
              <div className="text-xs font-bold text-brand-teal dark:text-[#7FDADB]">
                {isEn ? 'Optional: Quick Body Mass Index (BMI) Calculator' : 'Opsional: Hitung Cepat Indeks Massa Tubuh (IMT)'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end">
                <div>
                  <label htmlFor="bmi-weight" className="block text-2xs font-semibold mb-1">
                    {isEn ? 'Weight (kg)' : 'Berat Badan (kg)'}
                  </label>
                  <input
                    id="bmi-weight"
                    type="number"
                    placeholder={isEn ? 'e.g. 72' : 'Mis: 72'}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="field w-full"
                  />
                </div>
                <div>
                  <label htmlFor="bmi-height" className="block text-2xs font-semibold mb-1">
                    {isEn ? 'Height (cm)' : 'Tinggi Badan (cm)'}
                  </label>
                  <input
                    id="bmi-height"
                    type="number"
                    placeholder={isEn ? 'e.g. 170' : 'Mis: 170'}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="field w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCalculateBmi}
                  className="btn btn-navy"
                >
                  {isEn ? 'Use BMI' : 'Gunakan IMT'}
                </button>
              </div>
            </div>
          )}

          {/* Isian Catatan Bebas Opsional pada Pertanyaan Terakhir (Ditampilkan sebelum memilih jawaban agar tidak terlewat) */}
          {currentIndex === totalQuestions - 1 && (
            <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-2 border border-brand-navy/10 dark:border-white/10">
              <label htmlFor="free-text-feeling" className="block text-xs font-bold">
                {isEn
                  ? 'Personal Note or How You Are Feeling (Optional, Saved Strictly on This Device)'
                  : 'Catatan Pribadi atau Perasaan Anda Saat Ini (Opsional, Hanya Tersimpan di Perangkat)'}
              </label>
              <textarea
                id="free-text-feeling"
                rows={2}
                value={freeTextNote}
                onChange={(e) => setFreeTextNote(e.target.value)}
                placeholder={
                  isEn
                    ? 'Write anything weighing on your mind before choosing an option below...'
                    : 'Tuliskan bila ada hal yang mengganjal pikiran Anda sebelum memilih opsi di bawah...'
                }
                className="field w-full"
              />
            </div>
          )}

          {/* Pilihan Jawaban (Melebar 2 Kolom di Layar Lebar) */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            role="radiogroup"
            aria-label={currentQuestion.question}
          >
            {currentQuestion.options.map((opt) => {
              const isSelected = draftAnswers[currentQuestion.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectOption(opt.value)}
                  className={`touch-target w-full text-left px-4 py-3.5 rounded-2xl border-2 transition duration-150 flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-brand-teal bg-brand-teal-light/60 dark:bg-brand-teal/20 font-bold text-brand-navy dark:text-white shadow-xs'
                      : 'border-brand-navy/10 dark:border-white/10 hover:border-brand-teal/60 hover:bg-brand-teal-soft dark:hover:bg-white/5 bg-surface dark:bg-surface-dark text-brand-navy dark:text-white font-medium'
                  }`}
                >
                  <span className="text-sm leading-snug">{opt.label}</span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-brand-teal bg-brand-teal text-white' : 'border-brand-navy/30 dark:border-white/30'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigasi Bawah Pertanyaan: Tombol "Kembali" dan "Lewati" */}
          <div className="flex items-center justify-between pt-4 border-t border-brand-navy/10 dark:border-white/10">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentIndex === 0}
              className="btn btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Back' : 'Kembali'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="touch-target px-4 py-2.5 rounded-btn bg-surface-muted dark:bg-surface-dark text-brand-navy/80 dark:text-white/80 text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-navy/10 transition"
              >
                <span>{isEn ? 'Skip' : 'Lewati'}</span>
                <SkipForward className="w-4 h-4" />
              </button>

              {draftAnswers[currentQuestion.id] && (
                <button
                  type="button"
                  onClick={() => handleSelectOption(draftAnswers[currentQuestion.id])}
                  className="btn btn-primary"
                >
                  <span>
                    {currentIndex === totalQuestions - 1
                      ? isEn
                        ? 'View Results'
                        : 'Lihat Hasil'
                      : isEn
                      ? 'Continue'
                      : 'Lanjut'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-brand-navy/65 dark:text-white/65 flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-brand-teal" />
          <span>{assessmentRulesConfig.disclaimer}</span>
        </div>
      </div>

      {/* Panel Samping: Peta 12 Topik Pertanyaan & Jaminan Privasi */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="card p-5 space-y-3">
          <h3 className="eyebrow">
            {isEn ? '12 Self-Check Topics Map' : 'Peta 12 Topik Cek Awal'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = Boolean(draftAnswers[q.id]);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-2.5 py-2 rounded-btn text-left text-2xs font-semibold transition flex items-center gap-1.5 truncate ${
                    isCurrent
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : isAnswered
                      ? 'bg-brand-teal-light/70 dark:bg-brand-teal/20 text-brand-teal-dark dark:text-[#7FDADB]'
                      : 'bg-surface-muted dark:bg-surface-dark text-brand-navy/70 dark:text-white/70 hover:bg-brand-navy/10'
                  }`}
                >
                  <span className="font-bold shrink-0">{idx + 1}.</span>
                  <span className="truncate">{q.topic}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-brand-navy dark:text-white">
            <ShieldCheck className="w-4 h-4 text-brand-teal shrink-0" />
            <span>{isEn ? 'Full Privacy on Your Device' : 'Privasi Penuh di Perangkat Anda'}</span>
          </div>
          <p className="text-brand-navy/75 dark:text-white/75 leading-relaxed">
            {isEn
              ? 'All answers are evaluated and encrypted privately on this device. You can skip any question anytime.'
              : 'Seluruh jawaban Anda dihitung dan disimpan secara privat langsung di perangkat ini. Anda bebas melewati pertanyaan mana pun.'}
          </p>
        </div>
      </aside>
    </div>
  );
};
