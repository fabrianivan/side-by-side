import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Layers,
  Lightbulb,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import type { AssessmentAnswers } from '../lib/assessment-engine';
import {
  CHANGEABILITY_LABELS,
  INFLUENCE_LABELS,
  explainAssessment,
  type ExplainedFactor,
  type InfluenceLevel,
  type LevelReason,
} from '../lib/risk-explainer';

const INFLUENCE_SEGMENTS: Record<InfluenceLevel, number> = { none: 0, low: 1, moderate: 2, high: 3 };

const INFLUENCE_FILL: Record<InfluenceLevel, string> = {
  none: 'bg-brand-navy/10 dark:bg-white/10',
  low: 'bg-status-success',
  moderate: 'bg-status-warning',
  high: 'bg-status-urgent',
};

const INFLUENCE_TEXT: Record<InfluenceLevel, string> = {
  none: 'text-brand-navy/60 dark:text-white/60',
  low: 'text-[#1F7A50] dark:text-[#7BD9AC]',
  moderate: 'text-[#8A6100] dark:text-[#F3C64D]',
  high: 'text-[#B33834] dark:text-[#FF8A85]',
};

/** Meter tiga segmen tanpa angka: kecil / sedang / besar. */
export const InfluenceMeter: React.FC<{ level: InfluenceLevel; label: string }> = ({ level, label }) => {
  const filled = INFLUENCE_SEGMENTS[level];
  return (
    <div className="flex items-center gap-2" role="img" aria-label={label}>
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((seg) => (
          <span
            key={seg}
            className={`h-2 w-7 rounded-full ${seg <= filled ? INFLUENCE_FILL[level] : 'bg-brand-navy/10 dark:bg-white/10'}`}
          />
        ))}
      </div>
      <span className={`text-2xs font-bold ${INFLUENCE_TEXT[level]}`}>{label}</span>
    </div>
  );
};

const ReasonIcon: React.FC<{ kind: LevelReason['kind'] }> = ({ kind }) => {
  if (kind === 'red_flag') return <AlertTriangle className="w-5 h-5 text-status-urgent shrink-0 mt-0.5" />;
  if (kind === 'time_rule') return <CalendarClock className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />;
  if (kind === 'combined') return <Layers className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />;
  return <CheckCircle2 className="w-5 h-5 text-status-success shrink-0 mt-0.5" />;
};

const FactorCard: React.FC<{ factor: ExplainedFactor; isEn: boolean; defaultOpen: boolean }> = ({
  factor,
  isEn,
  defaultOpen,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const locale = isEn ? 'en' : 'id';
  const panelId = `factor-panel-${factor.questionId}`;
  return (
    <li className="well">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 sm:p-5 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-navy">{factor.topic}</span>
            {factor.isDecisive && (
              <span className="badge badge-coral">
                <ShieldAlert className="w-3.5 h-3.5" />
                {isEn ? 'Key reason for your result' : 'Alasan utama hasil Anda'}
              </span>
            )}
          </div>
          <div className="font-bold text-sm leading-snug text-brand-navy dark:text-white">{factor.title}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <InfluenceMeter level={factor.influence} label={INFLUENCE_LABELS[locale][factor.influence]} />
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-brand-navy/70 dark:text-white/70">
              {factor.changeability === 'changeable' ? (
                <Wrench className="w-3.5 h-3.5 text-brand-teal" />
              ) : factor.changeability === 'medical' ? (
                <Stethoscope className="w-3.5 h-3.5 text-brand-teal" />
              ) : (
                <CalendarClock className="w-3.5 h-3.5 text-brand-teal" />
              )}
              {CHANGEABILITY_LABELS[locale][factor.changeability]}
            </span>
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`w-5 h-5 shrink-0 text-brand-navy/50 dark:text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={panelId} className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2.5 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85">
          <p>
            <strong>{isEn ? 'Your answer:' : 'Jawaban Anda:'}</strong> {factor.answerLabel}
          </p>
          {factor.whyItMatters && (
            <p>
              <strong>{isEn ? 'Why it matters:' : 'Mengapa ini relevan:'}</strong> {factor.whyItMatters}
            </p>
          )}
          {factor.whatYouCanDo && (
            <p className="p-3 rounded-xl bg-brand-teal-light/60 dark:bg-brand-teal/15">
              <strong>{isEn ? 'What you can do:' : 'Yang bisa Anda lakukan:'}</strong> {factor.whatYouCanDo}
            </p>
          )}
          {factor.safetyNote && (
            <p
              role="note"
              className="p-3 rounded-xl bg-status-urgent-bg dark:bg-status-urgent/15 text-[#B33834] dark:text-[#FF8A85] font-semibold"
            >
              {factor.safetyNote}
            </p>
          )}
        </div>
      )}
    </li>
  );
};

/**
 * Rincian risiko yang dapat dijelaskan (Explainable Risk Breakdown).
 * Menggantikan "satu label" dengan penjelasan: alasan penentu, pengaruh per kelompok,
 * rincian per faktor, hal yang sudah baik, dan apa yang bisa mengubah hasil.
 */
export const RiskBreakdown: React.FC<{ answers: AssessmentAnswers; locale: 'id' | 'en' }> = ({ answers, locale }) => {
  const isEn = locale === 'en';
  const explanation = useMemo(() => explainAssessment(answers, locale), [answers, locale]);
  const [showAll, setShowAll] = useState(false);
  const visibleFactors = showAll ? explanation.factors : explanation.factors.slice(0, 4);

  return (
    <div className="space-y-5" data-testid="risk-breakdown">
      {/* 1. Mengapa hasil ini */}
      <section aria-labelledby="why-result-title" className="space-y-3">
        <h2 id="why-result-title" className="section-title flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-brand-teal" />
          {explanation.headline}
        </h2>
        <ul className="space-y-2.5">
          {explanation.reasons.map((r, i) => (
            <li key={i} className="well p-4 flex items-start gap-3 text-sm leading-relaxed text-brand-navy/90 dark:text-white/90">
              <ReasonIcon kind={r.kind} />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Pengaruh per kelompok — tanpa angka skor */}
      <section aria-labelledby="domain-title" className="space-y-3">
        <div className="space-y-1">
          <h2 id="domain-title" className="section-title">
            {isEn ? 'Your answers at a glance' : 'Gambaran jawaban Anda'}
          </h2>
          <p className="text-xs text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'We show how much each area influences your result in words—not a score—because a number can feel more certain than a questionnaire really is.'
              : 'Kami menampilkan seberapa besar pengaruh tiap kelompok dengan kata-kata—bukan skor—karena angka bisa terasa lebih pasti daripada yang sebenarnya bisa disimpulkan dari kuesioner.'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {explanation.domains.map((d) => (
            <div key={d.key} className="well p-4 space-y-2.5">
              <div className="font-bold text-sm text-brand-navy dark:text-white">{d.title}</div>
              <InfluenceMeter level={d.influence} label={INFLUENCE_LABELS[locale][d.influence]} />
              <p className="text-2xs leading-relaxed text-brand-navy/70 dark:text-white/70">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Rincian per faktor */}
      <section aria-labelledby="factor-detail-title" className="space-y-3">
        <h2 id="factor-detail-title" className="section-title flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-brand-teal" />
          {isEn ? 'Factor by factor, in plain words' : 'Faktor demi faktor, dengan bahasa sederhana'}
        </h2>
        {explanation.factors.length === 0 ? (
          <div className="p-4 rounded-btn bg-surface-muted dark:bg-surface-dark text-xs text-brand-navy/80 dark:text-white/80">
            {isEn
              ? 'No specific risk factors were identified from your answers. Continue maintaining healthy sleep, regular moderate exercise, and warm communication with your partner.'
              : 'Tidak ditemukan faktor risiko khusus dari jawaban Anda. Tetap pertahankan pola tidur, olahraga rutin, dan komunikasi yang hangat bersama pasangan.'}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {visibleFactors.map((f, idx) => (
                <FactorCard key={f.questionId} factor={f} isEn={isEn} defaultOpen={idx < 2} />
              ))}
            </ul>
            {explanation.factors.length > 4 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>
                {showAll
                  ? isEn
                    ? 'Show fewer factors'
                    : 'Tampilkan lebih sedikit'
                  : isEn
                  ? `Show all ${explanation.factors.length} factors`
                  : `Tampilkan semua ${explanation.factors.length} faktor`}
              </button>
            )}
          </>
        )}
      </section>

      {/* 4. Yang sudah baik & 5. Apa yang bisa mengubah hasil */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section aria-labelledby="strengths-title" className="well p-4 sm:p-5 space-y-2.5">
          <h3 id="strengths-title" className="font-bold text-sm flex items-center gap-2 text-brand-navy dark:text-white">
            <Sparkles className="w-4 h-4 text-status-success" />
            {isEn ? 'What is already working for you' : 'Yang sudah berjalan baik'}
          </h3>
          {explanation.strengths.length > 0 ? (
            <ul className="space-y-1.5 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85">
              {explanation.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Every small change counts. The factor list above shows where to start.'
                : 'Setiap perubahan kecil berarti. Daftar faktor di atas menunjukkan dari mana memulai.'}
            </p>
          )}
        </section>

        <section
          aria-labelledby="what-change-title"
          className="p-4 sm:p-5 rounded-2xl border-2 border-brand-teal/30 bg-brand-teal-light/40 dark:bg-brand-teal/10 space-y-2.5"
        >
          <h3 id="what-change-title" className="font-bold text-sm flex items-center gap-2 text-brand-navy dark:text-white">
            <TrendingDown className="w-4 h-4 text-brand-teal" />
            {isEn ? 'What could change your result' : 'Apa yang bisa mengubah hasil Anda'}
          </h3>
          <p className="text-xs leading-relaxed text-brand-navy/90 dark:text-white/90">{explanation.whatCouldChange.text}</p>
        </section>
      </div>

      {/* 6. Kelengkapan jawaban */}
      <p className="text-2xs text-brand-navy/65 dark:text-white/65">
        {isEn
          ? `Based on ${explanation.answeredCount} of ${explanation.totalCount} answers.`
          : `Berdasarkan ${explanation.answeredCount} dari ${explanation.totalCount} jawaban.`}{' '}
        {explanation.unanswered.length > 0 &&
          (isEn
            ? `Not answered: ${explanation.unanswered.join(', ')}. That is okay—answering them later gives a fuller picture.`
            : `Belum dijawab: ${explanation.unanswered.join(', ')}. Tidak apa-apa—menjawabnya nanti memberi gambaran lebih utuh.`)}
      </p>
    </div>
  );
};
