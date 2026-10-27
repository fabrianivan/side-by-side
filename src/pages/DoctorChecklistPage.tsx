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
  Info,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

interface QuestionTopic {
  id: string;
  category: string;
  question: string;
  contextNote: string;
}

export const DoctorChecklistPage: React.FC = () => {
  const { locale, assessmentResult, labResults } = useApp();
  const t = getTranslations(locale);
  const navigate = useNavigate();

  // Konteks situasi pengguna (dipilih interaktif atau terisi otomatis)
  const [hasProlongedDuration, setHasProlongedDuration] = useState<boolean>(true);
  const [hasHeatExposure, setHasHeatExposure] = useState<boolean>(true);
  const [hasLabResult, setHasLabResult] = useState<boolean>(labResults.length > 0);
  const [hasVaricoceleSuspicion, setHasVaricoceleSuspicion] = useState<boolean>(false);
  const [hasPartnerChecked, setHasPartnerChecked] = useState<boolean>(true);

  // State checkbox pertanyaan yang dipilih
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Bangun daftar pertanyaan berdasarkan konteks
  const getQuestions = (): QuestionTopic[] => {
    const list: QuestionTopic[] = [];

    // Kategori 1: Anamnesis Dasar & Pemeriksaan Fisik
    list.push({
      id: 'q-physical-exam',
      category: 'Pemeriksaan Fisik Testis',
      question: 'Apakah dokter bisa melakukan pemeriksaan fisik skrotum untuk mendeteksi tanda varikokel atau ukuran testis?',
      contextNote: 'Varikokel adalah pelebaran pembuluh darah vena testis yang merupakan penyebab terbanyak infertilitas pria yang bisa diperbaiki.',
    });

    if (hasVaricoceleSuspicion || hasProlongedDuration) {
      list.push({
        id: 'q-usg-doppler',
        category: 'Pemeriksaan Fisik Testis',
        question: 'Apakah saya memerlukan pemeriksaan USG Doppler skrotum untuk evaluasi aliran darah testis secara lebih akurat?',
        contextNote: 'USG Doppler adalah standar baku emas untuk mengonfirmasi varikokel subklinis yang tidak teraba dengan tangan.',
      });
    }

    // Kategori 2: Analisis Semen & Lab
    if (hasLabResult) {
      list.push({
        id: 'q-lab-repeat',
        category: 'Analisis Semen & Laboratorium',
        question: 'Mengingat hasil analisis semen saya saat ini, apakah dokter menyarankan tes ulang 2–4 minggu lagi untuk konfirmasi variabilitas biologis?',
        contextNote: 'Pedoman WHO menegaskan diagnosis infertilitas pria memerlukan minimal 2 kali uji sperma karena jumlah sel berfluktuasi.',
      });
      list.push({
        id: 'q-dfi-hormone',
        category: 'Analisis Semen & Laboratorium',
        question: 'Apakah diperlukan pemeriksaan profil hormon (FSH, LH, Testosteron Total) atau tes fragmentasi DNA sperma (DFI)?',
        contextNote: 'Pemeriksaan hormon membantu membedakan apakah masalah ada di produksi otak (hipofisis) atau di pabrik testis langsung.',
      });
    } else {
      list.push({
        id: 'q-how-to-prep',
        category: 'Analisis Semen & Laboratorium',
        question: 'Berapa hari masa pantang ejakulasi (abstinensia) yang paling ideal untuk saya sebelum tes analisis semen di laboratorium?',
        contextNote: 'Standar WHO merekomendasikan 2 hingga 7 hari pantang (ideal 3–4 hari) untuk hasil konsentrasi dan motilitas paling akurat.',
      });
    }

    // Kategori 3: Gaya Hidup & Faktor Lingkungan
    if (hasHeatExposure) {
      list.push({
        id: 'q-heat-mitigation',
        category: 'Gaya Hidup & Suhu Skrotum',
        question: 'Saya memiliki kebiasaan memangku laptop / sering duduk lama. Berapa lama pemulihan kualitas sperma setelah saya memperbaiki kebiasaan ini?',
        contextNote: 'Siklus spermatogenesis membutuhkan ~72 hari. Perbaikan kebiasaan umumnya mulai terlihat pada tes 2–3 bulan kemudian.',
      });
    }

    list.push({
      id: 'q-supplements',
      category: 'Gaya Hidup & Suplemen',
      question: 'Apakah ada suplemen mikronutrien antioksidan (seperti Zinc, Selenium, CoQ10, Likopen) yang dokter rekomendasikan secara spesifik untuk kondisi saya?',
      contextNote: 'Dokter dapat meresepkan antioksidan yang sesuai dengan bukti klinis tanpa harus membeli suplemen mahal tanpa indikasi.',
    });

    // Kategori 4: Rencana Bersama Pasangan
    if (hasPartnerChecked) {
      list.push({
        id: 'q-couple-sync',
        category: 'Rencana Bersama Pasangan',
        question: 'Bagaimana sinkronisasi rencana terapi saya dengan dokter kandungan istri saya agar waktu program hamil kami selaras?',
        contextNote: 'Penanganan bersama antara Androlog (suami) dan Obgyn (istri) melipatgandakan peluang keberhasilan program hamil.',
      });
    }

    list.push({
      id: 'q-timeline-target',
      category: 'Rencana Tindak Lanjut',
      question: 'Kapan jadwal kontrol berikutnya yang dokter targetkan untuk mengevaluasi respons tubuh saya terhadap rencana ini?',
      contextNote: 'Memiliki jadwal tindak lanjut yang jelas mengurangi kecemasan menanti tanpa kepastian.',
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
    const lines = [
      'Daftar Pertanyaan Siap Bawa untuk Konsultasi Dokter (Side by Side):',
      '',
      ...activeList.map((q, idx) => `${idx + 1}. [${q.category}] ${q.question}\n   (Catatan: ${q.contextNote})`),
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
              <span>Panduan Konsultasi Siap Bawa</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
              Daftar Pertanyaan untuk Dokter
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">
              Konsultasi singkat di klinik atau puskesmas sering membuat kita lupa bertanya hal penting. Centang pertanyaan di bawah ini dan bawa saat bertemu dokter.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-navy-light transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-teal-dark transition"
            >
              {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? 'Tersalin!' : 'Salin ke HP'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Situasi & Konteks Pengguna */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 dark:text-white/60 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-coral" />
          <span>Sesuaikan dengan Situasi Anda:</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasProlongedDuration}
              onChange={(e) => setHasProlongedDuration(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>Program Hamil &gt; 8–12 Bulan</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasHeatExposure}
              onChange={(e) => setHasHeatExposure(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>Paparan Panas / Duduk Lama</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasLabResult}
              onChange={(e) => setHasLabResult(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>Sudah Ada Hasil Tes Lab</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasVaricoceleSuspicion}
              onChange={(e) => setHasVaricoceleSuspicion(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>Dugaan Keluhan Varikokel</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-btn border border-brand-navy/10 text-xs font-medium cursor-pointer hover:bg-brand-teal-light/20 transition">
            <input
              type="checkbox"
              checked={hasPartnerChecked}
              onChange={(e) => setHasPartnerChecked(e.target.checked)}
              className="accent-brand-teal w-4 h-4"
            />
            <span>Pasangan Sudah Periksa Lebih Dulu</span>
          </label>
        </div>
      </section>

      {/* Daftar Pertanyaan Interaktif */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-brand-teal" />
            <span>Pertanyaan yang Siap Ditanyakan: ({questions.filter((q) => isChecked(q.id)).length} Terpilih)</span>
          </h2>
          <span className="text-xs text-brand-navy/60 dark:text-white/60">
            Klik kartu untuk memilih / batalkan
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
                      {q.category}
                    </span>
                    <span className="text-xs text-brand-navy/50 dark:text-white/50">#{idx + 1}</span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-brand-navy dark:text-white leading-snug">
                    "{q.question}"
                  </p>

                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 leading-relaxed pt-0.5">
                    💡 <em>Mengapa relevan:</em> {q.contextNote}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-brand-navy/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-brand-navy/70 dark:text-white/70">
            Bawa bersama <strong>Kode QR Ringkasan Pasien (1 Jam)</strong> untuk memudahkan dokter melihat data Anda.
          </p>
          <button
            type="button"
            onClick={() => navigate('/layanan')}
            className="touch-target px-4 py-2 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-navy-light transition"
          >
            <MapPin className="w-3.5 h-3.5 text-brand-teal" />
            <span>Lihat Direktori Faskes & Dokter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
