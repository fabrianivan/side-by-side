import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Printer,
  Copy,
  Check,
  CheckSquare,
  Square,
  Stethoscope,
  Sparkles,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

interface QuestionTopic {
  id: string;
  categoryId: string;
  categoryEn: string;
  questionId: string;
  questionEn: string;
  contextNoteId: string;
  contextNoteEn: string;
}

export const DoctorChecklistPage: React.FC = () => {
  const { locale, labResults } = useApp();
  const t = getTranslations(locale);
  const navigate = useNavigate();
  const isEn = locale === 'en';

  // Context toggles
  const [hasProlongedDuration, setHasProlongedDuration] = useState<boolean>(true);
  const [hasHeatExposure, setHasHeatExposure] = useState<boolean>(true);
  const [hasLabResult, setHasLabResult] = useState<boolean>(labResults.length > 0);
  const [hasVaricoceleSuspicion, setHasVaricoceleSuspicion] = useState<boolean>(false);
  const [hasPartnerChecked, setHasPartnerChecked] = useState<boolean>(true);

  // Checkbox selections
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const getQuestions = (): QuestionTopic[] => {
    const list: QuestionTopic[] = [];

    // Category 1: Physical Exam
    list.push({
      id: 'q-physical-exam',
      categoryId: 'Pemeriksaan Fisik Testis',
      categoryEn: 'Physical Examination',
      questionId: 'Apakah dokter bisa melakukan pemeriksaan fisik skrotum untuk mendeteksi tanda varikokel atau ukuran testis?',
      questionEn: 'Could you perform a physical testicular exam to check for clinical varicocele, asymmetry, or tenderness?',
      contextNoteId: 'Varikokel adalah pelebaran pembuluh darah vena testis yang merupakan penyebab terbanyak infertilitas pria yang bisa diperbaiki.',
      contextNoteEn: 'Varicoceles represent dilated scrotal veins and are the most common correctable cause of male subfertility.',
    });

    if (hasVaricoceleSuspicion || hasProlongedDuration) {
      list.push({
        id: 'q-usg-doppler',
        categoryId: 'Pemeriksaan Fisik Testis',
        categoryEn: 'Physical Examination & Imaging',
        questionId: 'Apakah saya memerlukan pemeriksaan USG Doppler skrotum untuk evaluasi aliran darah testis secara lebih akurat?',
        questionEn: 'Would a scrotal Doppler ultrasound be indicated to accurately evaluate retrograde venous blood flow?',
        contextNoteId: 'USG Doppler adalah standar baku emas untuk mengonfirmasi varikokel subklinis yang tidak teraba dengan tangan.',
        contextNoteEn: 'Color Doppler ultrasound is the clinical gold standard for identifying subclinical varicoceles.',
      });
    }

    // Category 2: Semen Analysis & Lab
    if (hasLabResult) {
      list.push({
        id: 'q-lab-repeat',
        categoryId: 'Analisis Semen & Laboratorium',
        categoryEn: 'Semen Analysis & Diagnostics',
        questionId: 'Mengingat hasil analisis semen saya saat ini, apakah dokter menyarankan tes ulang 2–4 minggu lagi untuk konfirmasi variabilitas biologis?',
        questionEn: 'Given my current lab result, would you recommend a repeat semen analysis in 2–4 weeks to account for biological variability?',
        contextNoteId: 'Pedoman WHO menegaskan diagnosis infertilitas pria memerlukan minimal 2 kali uji sperma karena jumlah sel berfluktuasi.',
        contextNoteEn: 'WHO guidelines advise at least two distinct semen analyses prior to making definitive clinical determinations.',
      });
      list.push({
        id: 'q-dfi-hormone',
        categoryId: 'Analisis Semen & Laboratorium',
        categoryEn: 'Hormonal & Genetic Screening',
        questionId: 'Apakah diperlukan pemeriksaan profil hormon (FSH, LH, Testosteron Total) atau tes fragmentasi DNA sperma (DFI)?',
        questionEn: 'Are endocrine profile labs (Total Testosterone, FSH, LH, Prolactin) or a Sperm DNA Fragmentation Index (DFI) appropriate?',
        contextNoteId: 'Pemeriksaan hormon membantu membedakan apakah masalah ada di produksi otak (hipofisis) atau di pabrik testis langsung.',
        contextNoteEn: 'Hormonal assays distinguish primary testicular failure from hypothalamic-pituitary dysregulation.',
      });
    } else {
      list.push({
        id: 'q-how-to-prep',
        categoryId: 'Analisis Semen & Laboratorium',
        categoryEn: 'Semen Analysis & Diagnostics',
        questionId: 'Berapa hari masa pantang ejakulasi (abstinensia) yang paling ideal untuk saya sebelum tes analisis semen di laboratorium?',
        questionEn: 'What is the optimal sexual abstinence window (2–7 days) recommended for my semen analysis test?',
        contextNoteId: 'Standar WHO merekomendasikan 2 hingga 7 hari pantang (ideal 3–4 hari) untuk hasil konsentrasi dan motilitas paling akurat.',
        contextNoteEn: 'The WHO standardized abstinence window is strictly 2 to 7 days (optimally 3–4 days).',
      });
    }

    // Category 3: Lifestyle & Heat
    if (hasHeatExposure) {
      list.push({
        id: 'q-heat-mitigation',
        categoryId: 'Gaya Hidup & Suhu Skrotum',
        categoryEn: 'Lifestyle & Thermal Environment',
        questionId: 'Saya memiliki kebiasaan memangku laptop / sering duduk lama. Berapa lama pemulihan kualitas sperma setelah saya memperbaiki kebiasaan ini?',
        questionEn: 'I frequently work with a laptop or sit for long hours. When would we expect sperm parameters to recover after modifying these habits?',
        contextNoteId: 'Siklus spermatogenesis membutuhkan ~72 hari. Perbaikan kebiasaan umumnya mulai terlihat pada tes 2–3 bulan kemudian.',
        contextNoteEn: 'Spermatogenesis requires ~72 days; observable quality improvements typically manifest 2.5–3 months post-intervention.',
      });
    }

    list.push({
      id: 'q-supplements',
      categoryId: 'Gaya Hidup & Suplemen',
      categoryEn: 'Lifestyle & Evidence-Based Supplements',
      questionId: 'Apakah ada suplemen mikronutrien antioksidan (seperti Zinc, Selenium, CoQ10, Likopen) yang dokter rekomendasikan secara spesifik untuk kondisi saya?',
      questionEn: 'Are there specific evidence-based antioxidant supplements (CoQ10, Zinc, Selenium, L-Carnitine, Lycopene) indicated for me?',
      contextNoteId: 'Dokter dapat meresepkan antioksidan yang sesuai dengan bukti klinis tanpa harus membeli suplemen mahal tanpa indikasi.',
      contextNoteEn: 'Targeted physician guidance ensures evidence-backed antioxidant supplementation tailored to your specific oxidative profile.',
    });

    // Category 4: Couple Coordination
    if (hasPartnerChecked) {
      list.push({
        id: 'q-couple-sync',
        categoryId: 'Rencana Bersama Pasangan',
        categoryEn: 'Couple Care Synchronization',
        questionId: 'Bagaimana sinkronisasi rencana terapi saya dengan dokter kandungan istri saya agar waktu program hamil kami selaras?',
        questionEn: 'How can we align my care plan with my partner’s gynecologist/fertility specialist to synchronize our conception window?',
        contextNoteId: 'Penanganan bersama antara Androlog (suami) dan Obgyn (istri) melipatgandakan peluang keberhasilan program hamil.',
        contextNoteEn: 'Dual-partner clinical synchronization significantly optimizes fertile-window timing and conception probability.',
      });
    }

    list.push({
      id: 'q-timeline-target',
      categoryId: 'Rencana Tindak Lanjut',
      categoryEn: 'Next Action & Milestones',
      questionId: 'Kapan jadwal kontrol berikutnya yang dokter targetkan untuk mengevaluasi respons tubuh saya terhadap rencana ini?',
      questionEn: 'What is our designated follow-up milestone date to objectively reassess treatment response?',
      contextNoteId: 'Memiliki jadwal tindak lanjut yang jelas mengurangi kecemasan menanti tanpa kepastian.',
      contextNoteEn: 'Having established milestones relieves anxiety and maintains structured forward momentum.',
    });

    return list;
  };

  const questions = getQuestions();

  const toggleSelect = (id: string) => {
    setSelectedQuestions((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isChecked = (id: string) => selectedQuestions[id] !== false; // Default checked

  const handleCopy = async () => {
    const activeList = questions.filter((q) => isChecked(q.id));
    const lines = isEn
      ? [
          'Doctor Consultation Checklist — Side by Side:',
          '------------------------------------------------',
          ...activeList.map(
            (q, idx) => `${idx + 1}. [${q.categoryEn}] ${q.questionEn}\n   (Clinical Context: ${q.contextNoteEn})`
          ),
          '',
          'App: Side by Side (https://side-by-side-omega.vercel.app)',
        ]
      : [
          'Daftar Pertanyaan Siap Bawa untuk Konsultasi Dokter (Side by Side):',
          '------------------------------------------------',
          ...activeList.map(
            (q, idx) => `${idx + 1}. [${q.categoryId}] ${q.questionId}\n   (Catatan: ${q.contextNoteId})`
          ),
          '',
          'Aplikasi: Side by Side (https://side-by-side-omega.vercel.app)',
        ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-7 border border-brand-navy/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-2.5 py-1 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              <span>{isEn ? 'Personalized Consultation Guide' : 'Panduan Konsultasi Siap Bawa'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
              {isEn ? 'Doctor Consultation Question Builder' : 'Daftar Pertanyaan untuk Dokter'}
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">
              {isEn
                ? 'Clinical appointments can feel brief and overwhelming. Check the questions that matter to your situation and bring this printed or on your phone.'
                : 'Konsultasi singkat di klinik atau puskesmas sering membuat kita lupa bertanya hal penting. Centang pertanyaan di bawah ini dan bawa saat bertemu dokter.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-navy-light transition"
            >
              <Printer className="w-4 h-4" />
              <span>{isEn ? 'Print / PDF' : 'Cetak / PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-teal-dark transition"
            >
              {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? (isEn ? 'Copied!' : 'Tersalin!') : (isEn ? 'Copy to Phone' : 'Salin ke HP')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Context Toggles */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 dark:text-white/60 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-coral" />
          <span>{isEn ? 'Tailor Questions to Your Situation:' : 'Sesuaikan dengan Situasi Anda:'}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasProlongedDuration}
              onChange={(e) => setHasProlongedDuration(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>{isEn ? 'Trying to Conceive > 8–12 Mos' : 'Program Hamil > 8–12 Bulan'}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasHeatExposure}
              onChange={(e) => setHasHeatExposure(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>{isEn ? 'Heat Exposure / Prolonged Sitting' : 'Paparan Panas / Duduk Lama'}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasLabResult}
              onChange={(e) => setHasLabResult(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>{isEn ? 'Already Have Lab Results' : 'Sudah Ada Hasil Tes Lab'}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasVaricoceleSuspicion}
              onChange={(e) => setHasVaricoceleSuspicion(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>{isEn ? 'Suspected Varicocele / Discomfort' : 'Dugaan Keluhan Varikokel'}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasPartnerChecked}
              onChange={(e) => setHasPartnerChecked(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>{isEn ? 'Partner Already Evaluated by OBGYN' : 'Pasangan Sudah Periksa Lebih Dulu'}</span>
          </label>
        </div>
      </section>

      {/* Interactive Question List */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-brand-teal" />
            <span>
              {isEn
                ? `Questions Ready for Doctor (${questions.filter((q) => isChecked(q.id)).length} Selected)`
                : `Pertanyaan yang Siap Ditanyakan: (${questions.filter((q) => isChecked(q.id)).length} Terpilih)`}
            </span>
          </h2>
          <span className="text-xs text-brand-navy/60 dark:text-white/60">
            {isEn ? 'Click any card to select/deselect' : 'Klik kartu untuk memilih / batalkan'}
          </span>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const checked = isChecked(q.id);
            return (
              <div
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`p-4 rounded-btn border cursor-pointer transition flex items-start gap-3.5 ${
                  checked
                    ? 'border-brand-teal bg-brand-teal-light/20 dark:bg-brand-teal/15 shadow-sm'
                    : 'border-brand-navy/10 bg-surface-muted/40 dark:bg-surface-dark opacity-60'
                }`}
              >
                <div className="pt-0.5 shrink-0 text-brand-teal">
                  {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-brand-navy/30" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-navy/10 dark:bg-white/10 text-brand-navy dark:text-white">
                      {isEn ? q.categoryEn : q.categoryId}
                    </span>
                    <span className="text-xs text-brand-navy/50 dark:text-white/50">#{idx + 1}</span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-brand-navy dark:text-white leading-snug">
                    "{isEn ? q.questionEn : q.questionId}"
                  </p>

                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 leading-relaxed pt-0.5">
                    💡 <em>{isEn ? 'Why this is clinically relevant:' : 'Mengapa relevan:'}</em>{' '}
                    {isEn ? q.contextNoteEn : q.contextNoteId}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-brand-navy/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'Pair this with your temporary 1-hour QR Patient Summary for seamless clinical consultation.'
              : 'Bawa bersama Kode QR Ringkasan Pasien (1 Jam) untuk memudahkan dokter melihat data Anda.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(isEn ? '/facilities' : '/layanan')}
            className="touch-target px-4 py-2 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-navy-light transition"
          >
            <MapPin className="w-3.5 h-3.5 text-brand-teal" />
            <span>{isEn ? 'View Clinic & Doctor Directory' : 'Lihat Direktori Faskes & Dokter'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
