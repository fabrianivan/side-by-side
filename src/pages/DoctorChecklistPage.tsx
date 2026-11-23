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
  Plus,
  Trash2,
  QrCode,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface QuestionTopic {
  id: string;
  categoryId: string;
  categoryEn: string;
  questionId: string;
  questionEn: string;
  contextNoteId: string;
  contextNoteEn: string;
  isCustom?: boolean;
}

export const DoctorChecklistPage: React.FC = () => {
  const { locale, assessmentAnswers, labResults, doctorChecklist, saveDoctorChecklist } = useApp();
  const navigate = useNavigate();
  const isEn = locale === 'en';

  // Otomatis memetakan konteks awal dari Cek Awal bila pengguna belum menyetel toggle secara manual.
  const hasAnyAssessment = Object.keys(assessmentAnswers).length > 0;
  const inferredProlonged =
    hasAnyAssessment
      ? ['6_to_12_months', '12_to_24_months', 'over_24_months'].includes(assessmentAnswers.ttc_duration)
      : true;
  const inferredHeat =
    hasAnyAssessment
      ? ['moderate_laptop_sitting', 'high_occupational_sauna'].includes(assessmentAnswers.heat_exposure)
      : true;
  const inferredVaricocele =
    hasAnyAssessment
      ? assessmentAnswers.reproductive_history === 'varicocele_or_infection' ||
        assessmentAnswers.physical_symptoms === 'frequent_pain_or_swelling'
      : false;
  const hasExternalHormone = assessmentAnswers.medications_supplements === 'testosterone_or_steroids';

  const hasProlongedDuration = doctorChecklist.context.hasProlongedDuration ?? inferredProlonged;
  const hasHeatExposure = doctorChecklist.context.hasHeatExposure ?? inferredHeat;
  const hasLabResult = doctorChecklist.context.hasLabResult ?? labResults.length > 0;
  const hasVaricoceleSuspicion = doctorChecklist.context.hasVaricoceleSuspicion ?? inferredVaricocele;
  const hasPartnerChecked = doctorChecklist.context.hasPartnerChecked ?? true;
  const selectedQuestions = doctorChecklist.selected;
  const customQuestions = doctorChecklist.customQuestions || [];

  const [newQuestionInput, setNewQuestionInput] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const updateContext = (key: string, value: boolean) => {
    void saveDoctorChecklist({
      ...doctorChecklist,
      context: { ...doctorChecklist.context, [key]: value },
    });
  };

  const getQuestions = (): QuestionTopic[] => {
    const list: QuestionTopic[] = [];

    list.push({
      id: 'q-physical-exam',
      categoryId: 'Pemeriksaan Fisik Testis',
      categoryEn: 'Physical Examination',
      questionId:
        'Apakah dokter bisa melakukan pemeriksaan fisik skrotum untuk mendeteksi tanda varikokel atau ukuran testis?',
      questionEn:
        'Could you perform a physical testicular exam to check for clinical varicocele, asymmetry, or tenderness?',
      contextNoteId:
        'Varikokel adalah pelebaran pembuluh darah vena testis yang merupakan penyebab terbanyak infertilitas pria yang bisa diperbaiki.',
      contextNoteEn:
        'Varicoceles represent dilated scrotal veins and are the most common correctable cause of male subfertility.',
    });

    if (hasVaricoceleSuspicion || hasProlongedDuration) {
      list.push({
        id: 'q-usg-doppler',
        categoryId: 'Pemeriksaan Fisik Testis',
        categoryEn: 'Physical Examination & Imaging',
        questionId:
          'Apakah saya memerlukan pemeriksaan USG Doppler skrotum untuk evaluasi aliran darah testis secara lebih akurat?',
        questionEn:
          'Would a scrotal Doppler ultrasound be indicated to accurately evaluate retrograde venous blood flow?',
        contextNoteId:
          'USG Doppler adalah standar baku emas untuk mengonfirmasi varikokel subklinis yang tidak teraba dengan tangan.',
        contextNoteEn:
          'Color Doppler ultrasound is the clinical gold standard for identifying subclinical varicoceles.',
      });
    }

    if (hasLabResult) {
      list.push({
        id: 'q-lab-repeat',
        categoryId: 'Analisis Semen & Laboratorium',
        categoryEn: 'Semen Analysis & Diagnostics',
        questionId:
          'Mengingat hasil analisis semen saya saat ini, apakah dokter menyarankan tes ulang 2–4 minggu lagi untuk konfirmasi variabilitas biologis?',
        questionEn:
          'Given my current lab result, would you recommend a repeat semen analysis in 2–4 weeks to account for biological variability?',
        contextNoteId:
          'Pedoman WHO menegaskan diagnosis infertilitas pria memerlukan minimal 2 kali uji sperma karena jumlah sel berfluktuasi.',
        contextNoteEn:
          'WHO guidelines advise at least two distinct semen analyses prior to making definitive clinical determinations.',
      });
      list.push({
        id: 'q-dfi-hormone',
        categoryId: 'Analisis Semen & Laboratorium',
        categoryEn: 'Hormonal & Genetic Screening',
        questionId:
          'Apakah diperlukan pemeriksaan profil hormon (FSH, LH, Testosteron Total) atau tes fragmentasi DNA sperma (DFI)?',
        questionEn:
          'Are endocrine profile labs (Total Testosterone, FSH, LH, Prolactin) or a Sperm DNA Fragmentation Index (DFI) appropriate?',
        contextNoteId:
          'Pemeriksaan hormon membantu membedakan apakah masalah ada di produksi otak (hipofisis) atau di pabrik testis langsung.',
        contextNoteEn:
          'Hormonal assays distinguish primary testicular failure from hypothalamic-pituitary dysregulation.',
      });
    } else {
      list.push({
        id: 'q-how-to-prep',
        categoryId: 'Analisis Semen & Laboratorium',
        categoryEn: 'Semen Analysis & Diagnostics',
        questionId:
          'Berapa hari masa pantang ejakulasi (abstinensia) yang paling ideal untuk saya sebelum tes analisis semen di laboratorium?',
        questionEn:
          'What is the optimal sexual abstinence window (2–7 days) recommended for my semen analysis test?',
        contextNoteId:
          'Standar WHO merekomendasikan 2 hingga 7 hari pantang (ideal 3–4 hari) untuk hasil konsentrasi dan motilitas paling akurat.',
        contextNoteEn:
          'The WHO standardized abstinence window is strictly 2 to 7 days (optimally 3–4 days).',
      });
    }

    if (hasHeatExposure) {
      list.push({
        id: 'q-heat-mitigation',
        categoryId: 'Gaya Hidup & Suhu Skrotum',
        categoryEn: 'Lifestyle & Thermal Environment',
        questionId:
          'Saya memiliki kebiasaan memangku laptop / sering duduk lama. Berapa lama pemulihan kualitas sperma setelah saya memperbaiki kebiasaan ini?',
        questionEn:
          'I frequently work with a laptop or sit for long hours. When would we expect sperm parameters to recover after modifying these habits?',
        contextNoteId:
          'Siklus spermatogenesis membutuhkan ~72 hari. Perbaikan kebiasaan umumnya mulai terlihat pada tes 2–3 bulan kemudian.',
        contextNoteEn:
          'Spermatogenesis requires ~72 days; observable quality improvements typically manifest 2.5–3 months post-intervention.',
      });
    }

    if (hasExternalHormone) {
      list.push({
        id: 'q-hormone-review',
        categoryId: 'Riwayat Obat & Hormon',
        categoryEn: 'Medication & Hormone Review',
        questionId:
          'Saya pernah/sedang menggunakan testosteron atau steroid dari luar. Bagaimana langkah aman di bawah pengawasan dokter agar produksi sperma alami bisa pulih?',
        questionEn:
          'I have used external testosterone or steroids. What is a safe, doctor-supervised plan to support recovery of natural sperm production?',
        contextNoteId:
          'Jangan menghentikan obat resep sendiri. Dokter andrologi dapat memantau hormon dan menyusun transisi yang aman.',
        contextNoteEn:
          'Never stop prescribed treatment on your own. An andrologist can monitor hormones and guide a safe transition.',
      });
    }

    list.push({
      id: 'q-supplements',
      categoryId: 'Gaya Hidup & Nutrisi',
      categoryEn: 'Lifestyle & Nutrition Guidance',
      questionId:
        'Perubahan pola makan, kebiasaan tidur, atau dukungan nutrisi apa yang menurut dokter paling tepat dan perlu (atau tidak perlu) untuk kondisi saya?',
      questionEn:
        'Which diet, sleep, or nutrition adjustments do you think are most helpful—or unnecessary—for my specific situation?',
      contextNoteId:
        'Bertanya langsung ke dokter membantu Anda fokus pada langkah yang terbukti relevan tanpa membeli produk bebas tanpa indikasi.',
      contextNoteEn:
        'Asking your physician directly helps focus on evidence-backed habits rather than unverified over-the-counter products.',
    });

    if (hasPartnerChecked) {
      list.push({
        id: 'q-couple-sync',
        categoryId: 'Rencana Bersama Pasangan',
        categoryEn: 'Couple Care Synchronization',
        questionId:
          'Bagaimana sinkronisasi rencana terapi saya dengan dokter kandungan istri saya agar waktu program hamil kami selaras?',
        questionEn:
          'How can we align my care plan with my partner’s gynecologist/fertility specialist to synchronize our conception window?',
        contextNoteId:
          'Penanganan bersama antara Androlog (suami) dan Obgyn (istri) melipatgandakan peluang keberhasilan program hamil.',
        contextNoteEn:
          'Dual-partner clinical synchronization significantly optimizes fertile-window timing and conception probability.',
      });
    }

    list.push({
      id: 'q-timeline-target',
      categoryId: 'Rencana Tindak Lanjut',
      categoryEn: 'Next Action & Milestones',
      questionId:
        'Kapan jadwal kontrol berikutnya yang dokter targetkan untuk mengevaluasi respons tubuh saya terhadap rencana ini?',
      questionEn:
        'What is our designated follow-up milestone date to objectively reassess treatment response?',
      contextNoteId:
        'Memiliki jadwal tindak lanjut yang jelas mengurangi kecemasan menanti tanpa kepastian.',
      contextNoteEn:
        'Having established milestones relieves anxiety and maintains structured forward momentum.',
    });

    for (const cq of customQuestions) {
      list.push({
        id: cq.id,
        categoryId: 'Pertanyaan Pribadi',
        categoryEn: 'Personal Question',
        questionId: cq.text,
        questionEn: cq.text,
        contextNoteId: 'Ditambahkan khusus oleh Anda untuk konsultasi dokter.',
        contextNoteEn: 'Added personally by you for your consultation.',
        isCustom: true,
      });
    }

    return list;
  };

  const questions = getQuestions();

  const toggleSelect = (id: string) => {
    const nextSelected = {
      ...selectedQuestions,
      [id]: selectedQuestions[id] === undefined ? false : !selectedQuestions[id],
    };
    void saveDoctorChecklist({
      ...doctorChecklist,
      selected: nextSelected,
    });
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQuestionInput.trim();
    if (trimmed.length < 3) return;
    const newItem = { id: 'custom-q-' + Date.now(), text: trimmed };
    void saveDoctorChecklist({
      ...doctorChecklist,
      customQuestions: [...customQuestions, newItem],
    });
    setNewQuestionInput('');
  };

  const handleDeleteCustomQuestion = (id: string) => {
    void saveDoctorChecklist({
      ...doctorChecklist,
      customQuestions: customQuestions.filter((q) => q.id !== id),
    });
  };

  const isChecked = (id: string) => selectedQuestions[id] !== false;

  const handleCopy = async () => {
    const activeList = questions.filter((q) => isChecked(q.id));
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'Side by Side';
    const lines = isEn
      ? [
          'Doctor Consultation Checklist — Side by Side:',
          '------------------------------------------------',
          ...activeList.map(
            (q, idx) =>
              `${idx + 1}. [${q.categoryEn}] ${q.questionEn}\n   (Clinical Context: ${q.contextNoteEn})`
          ),
          '',
          `Generated by Side by Side (${appOrigin})`,
        ]
      : [
          'Daftar Pertanyaan Siap Bawa untuk Konsultasi Dokter (Side by Side):',
          '------------------------------------------------',
          ...activeList.map(
            (q, idx) =>
              `${idx + 1}. [${q.categoryId}] ${q.questionId}\n   (Catatan: ${q.contextNoteId})`
          ),
          '',
          `Dibuat dengan Side by Side (${appOrigin})`,
        ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      // Clipboard fallback
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <section className="page-header">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2.5">
            <div className="badge badge-teal">
              <FileText className="w-3.5 h-3.5" />
              <span>{isEn ? 'Personalized Consultation Guide' : 'Panduan Konsultasi Siap Bawa'}</span>
            </div>
            <h1 className="page-title">
              {isEn ? 'Doctor Consultation Question Builder' : 'Daftar Pertanyaan untuk Dokter'}
            </h1>
            <p className="page-lead">
              {isEn
                ? 'Clinical appointments can feel brief and overwhelming. Check the questions that matter to your situation and bring this printed or on your phone.'
                : 'Konsultasi singkat di klinik atau puskesmas sering membuat kita lupa bertanya hal penting. Centang pertanyaan di bawah ini dan bawa saat bertemu dokter.'}
            </p>
          </div>

          <div className="no-print flex flex-wrap gap-2 shrink-0">
            <button type="button" onClick={handlePrint} className="btn btn-navy">
              <Printer className="w-4 h-4" />
              <span>{isEn ? 'Print / PDF' : 'Cetak / PDF'}</span>
            </button>
            <button type="button" onClick={handleCopy} className="btn btn-primary">
              {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? (isEn ? 'Copied!' : 'Tersalin!') : isEn ? 'Copy to Phone' : 'Salin ke HP'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Context Toggles */}
      <section className="no-print card p-5 space-y-3.5">
        <h2 className="eyebrow !text-brand-navy/60 dark:!text-white/60 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-coral" />
          <span>{isEn ? 'Tailor Questions to Your Situation:' : 'Sesuaikan dengan Situasi Anda:'}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-navy dark:text-white cursor-pointer hover:border-brand-teal/50 hover:bg-brand-teal-soft dark:hover:bg-white/5 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15 transition">
            <input
              type="checkbox"
              checked={hasProlongedDuration}
              onChange={(e) => updateContext('hasProlongedDuration', e.target.checked)}
              className="check"
            />
            <span>{isEn ? 'Trying to Conceive > 8–12 Mos' : 'Program Hamil > 8–12 Bulan'}</span>
          </label>

          <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-navy dark:text-white cursor-pointer hover:border-brand-teal/50 hover:bg-brand-teal-soft dark:hover:bg-white/5 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15 transition">
            <input
              type="checkbox"
              checked={hasHeatExposure}
              onChange={(e) => updateContext('hasHeatExposure', e.target.checked)}
              className="check"
            />
            <span>{isEn ? 'Heat Exposure / Prolonged Sitting' : 'Paparan Panas / Duduk Lama'}</span>
          </label>

          <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-navy dark:text-white cursor-pointer hover:border-brand-teal/50 hover:bg-brand-teal-soft dark:hover:bg-white/5 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15 transition">
            <input
              type="checkbox"
              checked={hasLabResult}
              onChange={(e) => updateContext('hasLabResult', e.target.checked)}
              className="check"
            />
            <span>{isEn ? 'Already Have Lab Results' : 'Sudah Ada Hasil Tes Lab'}</span>
          </label>

          <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-navy dark:text-white cursor-pointer hover:border-brand-teal/50 hover:bg-brand-teal-soft dark:hover:bg-white/5 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15 transition">
            <input
              type="checkbox"
              checked={hasVaricoceleSuspicion}
              onChange={(e) => updateContext('hasVaricoceleSuspicion', e.target.checked)}
              className="check"
            />
            <span>{isEn ? 'Suspected Varicocele / Discomfort' : 'Dugaan Keluhan Varikokel'}</span>
          </label>

          <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-navy dark:text-white cursor-pointer hover:border-brand-teal/50 hover:bg-brand-teal-soft dark:hover:bg-white/5 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15 transition">
            <input
              type="checkbox"
              checked={hasPartnerChecked}
              onChange={(e) => updateContext('hasPartnerChecked', e.target.checked)}
              className="check"
            />
            <span>{isEn ? 'Partner Already Evaluated by OBGYN' : 'Pasangan Sudah Periksa Lebih Dulu'}</span>
          </label>
        </div>
      </section>

      {/* Interactive Question List */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <h2 className="section-title flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-brand-teal shrink-0" />
            <span>
              {isEn
                ? `Questions Ready for Doctor (${questions.filter((q) => isChecked(q.id)).length} Selected)`
                : `Pertanyaan yang Siap Ditanyakan: (${questions.filter((q) => isChecked(q.id)).length} Terpilih)`}
            </span>
          </h2>
          <span className="no-print text-xs text-brand-navy/60 dark:text-white/60 shrink-0">
            {isEn ? 'Click any card to select/deselect' : 'Klik kartu untuk memilih / batalkan'}
          </span>
        </div>

        <form onSubmit={handleAddCustomQuestion} className="no-print flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newQuestionInput}
            onChange={(e) => setNewQuestionInput(e.target.value)}
            placeholder={
              isEn ? 'Add your own custom question for the doctor...' : 'Tambahkan pertanyaan pribadi Anda sendiri...'
            }
            className="field flex-1 text-xs"
          />
          <button type="submit" disabled={newQuestionInput.trim().length < 3} className="btn btn-secondary btn-sm shrink-0">
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Question' : 'Tambah Pertanyaan'}</span>
          </button>
        </form>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const checked = isChecked(q.id);
            return (
              <div
                key={q.id}
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onClick={() => toggleSelect(q.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleSelect(q.id);
                  }
                }}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition duration-150 flex items-start gap-3.5 ${
                  checked
                    ? 'border-brand-teal bg-brand-teal-light/30 dark:bg-brand-teal/15 shadow-xs'
                    : 'border-brand-navy/10 dark:border-white/10 bg-surface-muted/60 dark:bg-surface-dark opacity-70 hover:opacity-100 hover:border-brand-teal/50'
                }`}
              >
                <div aria-hidden="true" className="pt-0.5 shrink-0 text-brand-teal">
                  {checked ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5 text-brand-navy/30 dark:text-white/35" />
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xs font-bold uppercase tracking-wider px-2 py-1 rounded-md leading-tight bg-brand-navy/[0.08] dark:bg-white/10 text-brand-navy dark:text-white">
                        {isEn ? q.categoryEn : q.categoryId}
                      </span>
                      <span className="text-xs text-brand-navy/50 dark:text-white/50">#{idx + 1}</span>
                    </div>
                    {q.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomQuestion(q.id);
                        }}
                        aria-label={isEn ? 'Remove custom question' : 'Hapus pertanyaan pribadi'}
                        className="no-print text-status-urgent hover:underline p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm font-bold text-brand-navy dark:text-white leading-snug">
                    "{isEn ? q.questionEn : q.questionId}"
                  </p>

                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    💡 <em>{isEn ? 'Why this is clinically relevant:' : 'Mengapa relevan:'}</em>{' '}
                    {isEn ? q.contextNoteEn : q.contextNoteId}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="no-print pt-4 border-t border-brand-navy/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'Pair this with your temporary 1-hour QR Patient Summary for seamless clinical consultation.'
              : 'Bawa bersama Kode QR Ringkasan Pasien (1 Jam) untuk memudahkan dokter melihat data Anda.'}
          </p>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate(isEn ? '/share' : '/bagikan-nakes')}
              className="btn btn-secondary"
            >
              <QrCode className="w-4 h-4 text-brand-teal shrink-0" />
              <span>{isEn ? '1-Hour Doctor QR' : 'QR 1 Jam untuk Dokter'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(isEn ? '/facilities' : '/layanan')}
              className="btn btn-navy"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{isEn ? 'View Clinic & Doctor Directory' : 'Lihat Direktori Faskes & Dokter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
