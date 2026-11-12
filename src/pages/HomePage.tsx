import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardCheck,
  MapPin,
  Users,
  Activity,
  BookOpen,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
  Sliders,
  FileText,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';
import { PageHeader } from '../components/ui';

export const HomePage: React.FC = () => {
  const {
    authMode,
    displayName,
    locale,
    assessmentResult,
    labResults,
    reminders,
    pairing,
    startAnonymousMode,
    switchDemoPersona,
  } = useApp();

  const t = getTranslations(locale);
  const navigate = useNavigate();
  const isEn = locale === 'en';

  // Tentukan "Satu Langkah Kecil Berikutnya" secara dinamis
  const getNextStepCard = () => {
    if (!assessmentResult) {
      return {
        step: 1,
        badge: 'Langkah 1 dari 4',
        title: isEn ? 'Start Self-Check (< 3 Min)' : 'Mulai Cek Awal Mandiri (< 3 Menit)',
        description:
          'Jawab 12 pertanyaan singkat secara privat tanpa akun untuk mengetahui apakah dan kapan Anda sebaiknya berkonsultasi ke dokter.',
        ctaText: t.cta.startAssessment,
        to: '/cek-awal',
      };
    }
    if (!pairing || pairing.status !== 'active') {
      return {
        step: 2,
        badge: 'Langkah 2 dari 4',
        title: 'Susun Rencana Bersama Pasangan',
        description:
          'Bagikan jadwal dan daftar langkah persiapan bersama pasangan lewat Mode Berdua—tanpa membuka jawaban kuesioner pribadi Anda.',
        ctaText: 'Buka Rencana Kita',
        to: '/berdua',
      };
    }
    if (labResults.length === 0) {
      return {
        step: 3,
        badge: 'Langkah 3 dari 4',
        title: 'Pilih Layanan Pemeriksaan Ramah Pria',
        description:
          'Lihat panduan persiapan analisis semen (masa pantang 2–7 hari), estimasi biaya, info JKN, dan buat daftar pertanyaan untuk dokter.',
        ctaText: t.cta.findFacility,
        to: '/layanan',
      };
    }
    return {
      step: 4,
      badge: 'Langkah 4 dari 4',
      title: 'Siapkan Ringkasan untuk Konsultasi Dokter',
      description:
        'Anda sudah memiliki hasil Cek Awal dan catatan laboratorium. Buat kode QR sementara (berlaku 1 jam) untuk ditunjukkan ke dokter saat konsultasi.',
      ctaText: 'Bagikan Ringkasan ke Nakes',
      to: '/bagikan-nakes',
    };
  };

  const nextStep = getNextStepCard();
  const completedStepsCount = pairing
    ? pairing.plan_steps.filter((s) => s.status_a === 'done').length
    : assessmentResult
    ? 1
    : 0;

  return (
    <div className="space-y-6">
      {/* Banner Sambutan Hangat */}
      <PageHeader
        eyebrow={
          authMode === 'welcome'
            ? (isEn ? 'Ready Without Account' : 'Siap Digunakan Tanpa Akun')
            : displayName
        }
        icon={ShieldCheck}
        title={t.brand.welcomeGreeting}
        description={
          isEn
            ? 'Every small step brings clarity for you and your partner. Choose the step that feels right today.'
            : 'Setiap langkah kecil membawa kejelasan bagi Anda dan pasangan. Pilih langkah yang paling nyaman hari ini.'
        }
        actions={
          <>
            {authMode === 'welcome' && (
              <button
                type="button"
                onClick={() => startAnonymousMode()}
                className="btn btn-navy"
              >
                Aktifkan Mode Anonim
              </button>
            )}
            <button
              type="button"
              onClick={() => switchDemoPersona('rendra')}
              className="btn btn-coral-soft"
            >
              <Sparkles className="w-4 h-4" />
              Isi Skenario Rendra
            </button>
          </>
        }
      />

      {/* Kartu Utama: "Langkah Berikutnya" (Prinsip #5: Satu langkah kecil berikutnya) */}
      <section
        aria-labelledby="next-step-heading"
        className="relative overflow-hidden bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-navy-light text-white rounded-card shadow-soft-lg p-6 sm:p-8"
      >
        {/* Aksen dekoratif lembut */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-brand-teal/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-24 w-56 h-56 rounded-full bg-brand-coral/20 blur-3xl"
        />

        <div className="relative space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[#7FDADB]">
                Langkah Berikutnya • {nextStep.badge}
              </span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 rounded-full ${
                      n <= nextStep.step ? 'w-5 bg-[#4FC6C8]' : 'w-2.5 bg-white/20'
                    }`}
                  />
                ))}
              </span>
            </div>
            {assessmentResult && (
              <span className="self-start sm:self-auto rounded-xl bg-white/10 px-3 py-1.5 text-2xs leading-snug text-white/85 font-medium">
                Saran Cek Awal: <strong className="text-[#FFA596]">{assessmentResult.levelLabel}</strong>
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <h2 id="next-step-heading" className="text-2xl sm:text-3xl font-extrabold">
              {nextStep.title}
            </h2>
            <p className="text-sm text-white/80 leading-relaxed max-w-2xl">
              {nextStep.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(nextStep.to)}
              className="btn btn-coral btn-lg"
            >
              <span>{nextStep.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!assessmentResult && (
              <button
                type="button"
                onClick={() => navigate('/welcome')}
                className="btn btn-lg bg-white/10 hover:bg-white/20 text-white"
              >
                Lihat Pengaturan Privasi
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Progres Rencana Kita & Pengingat Mendatang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kartu Progres Rencana */}
        <section className="card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title flex items-center gap-2.5">
              <span className="icon-tile w-9 h-9 rounded-xl bg-brand-teal-light text-brand-teal dark:bg-brand-teal/20">
                <Users className="w-[18px] h-[18px]" />
              </span>
              <span>Progres Rencana Kita</span>
            </h2>
            <Link to="/berdua" className="text-xs font-bold text-brand-teal hover:underline underline-offset-4 shrink-0">
              Lihat Detail →
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.round((completedStepsCount / 6) * 100))}%` }}
              />
            </div>
            <span className="tabular text-xs font-bold text-brand-navy dark:text-white shrink-0">
              {completedStepsCount}/6
            </span>
          </div>

          <p className="text-xs leading-relaxed text-brand-navy/75 dark:text-white/75">
            {pairing && pairing.status === 'active' ? (
              <>
                Terhubung bersama <strong>{pairing.partner_b_alias}</strong> (Kode Tautan:{' '}
                <span className="font-mono font-bold text-brand-teal bg-brand-teal/15 px-2 py-0.5 rounded-md border border-brand-teal/25 tracking-wide">
                  {pairing.invite_code}
                </span>
                ). {completedStepsCount} dari 6 tahapan selesai.
              </>
            ) : (
              'Belum menautkan pasangan. Anda bisa mengundang pasangan kapan pun Anda siap tanpa membuka data pribadi.'
            )}
          </p>

          {pairing?.shared_items.noteFromB && (
            <div className="p-3.5 rounded-2xl bg-brand-teal-light/60 dark:bg-brand-teal/20 text-xs leading-relaxed text-brand-navy dark:text-white">
              <span className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">Pesan Semangat Pasangan: </span>“
              {pairing.shared_items.noteFromB}”
            </div>
          )}
        </section>

        {/* Kartu Pengingat Pemeriksaan */}
        <section className="card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title flex items-center gap-2.5">
              <span className="icon-tile w-9 h-9 rounded-xl bg-brand-coral-light text-brand-coral-dark dark:bg-brand-coral/20 dark:text-brand-coral">
                <Calendar className="w-[18px] h-[18px]" />
              </span>
              <span>Jadwal & Pengingat</span>
            </h2>
            <Link to="/hasil" className="text-xs font-bold text-brand-teal hover:underline underline-offset-4 shrink-0">
              Kelola →
            </Link>
          </div>

          {reminders.length === 0 ? (
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              Belum ada pengingat terjadwal. Anda dapat membuat pengingat pemeriksaan (termasuk masa pantang 2–7 hari) dari halaman Cari Layanan atau Hasil Saya.
            </p>
          ) : (
            <ul className="space-y-2">
              {reminders.slice(0, 2).map((rem) => (
                <li
                  key={rem.id}
                  className="well px-3.5 py-3 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-brand-navy dark:text-white">{rem.title}</div>
                    {rem.facilityName && (
                      <div className="text-brand-teal font-medium">{rem.facilityName}</div>
                    )}
                    <div className="tabular text-brand-navy/60 dark:text-white/60 mt-0.5">
                      Jadwal: {rem.remindAt.replace('T', ' ')}
                    </div>
                  </div>
                  {rem.completed && <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Pintasan Fitur Utama */}
      <section aria-label="Pintasan Fitur">
        <h2 className="eyebrow !text-brand-navy/55 dark:!text-white/55 mb-3">
          Pintasan Layanan & Panduan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Link
            to="/cek-awal"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div className="icon-tile bg-brand-teal-light text-brand-teal dark:bg-brand-teal/20">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white">Cek Awal Mandiri</h3>
              <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70 mt-1">
                12 pertanyaan privat berbasis aturan medis untuk memetakan langkah pertama.
              </p>
            </div>
          </Link>

          <Link
            to="/layanan"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div className="icon-tile bg-brand-coral-light text-brand-coral-dark dark:bg-brand-coral/20 dark:text-brand-coral">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white">Cari Layanan & Panduan Tes</h3>
              <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70 mt-1">
                16 direktori klinik/RS ramah pria, filter JKN, & pembuat daftar pertanyaan dokter.
              </p>
            </div>
          </Link>

          <Link
            to="/berdua"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div className="icon-tile bg-brand-teal-light text-brand-teal dark:bg-brand-teal/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white">Mode Berdua (Rencana Kita)</h3>
              <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70 mt-1">
                Templat pesan "Ajak dengan lembut" & checklist bersama tanpa buka data pribadi.
              </p>
            </div>
          </Link>

          <Link
            to="/hasil"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div className="icon-tile bg-status-success-bg text-status-success dark:bg-status-success/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white">Hasil Saya & Grafik Tren</h3>
              <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70 mt-1">
                Catat hasil analisis semen, pahami istilah rujukan WHO 2021, dan pantau tren.
              </p>
            </div>
          </Link>

          <Link
            to="/pustaka"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div className="icon-tile bg-status-warning-bg text-[#B07E00] dark:bg-status-warning/20 dark:text-status-warning">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white">Pustaka Edukasi & Tanya Nakes</h3>
              <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70 mt-1">
                12 artikel pendek terkurasi, mitos vs fakta, FAQ, dan tiket tanya nakes anonim.
              </p>
            </div>
          </Link>

          <Link
            to="/bagikan-nakes"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div className="icon-tile bg-brand-teal-light text-brand-teal dark:bg-brand-teal/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white">Berbagi ke Nakes (QR 1 Jam)</h3>
              <p className="text-xs leading-relaxed text-brand-navy/70 dark:text-white/70 mt-1">
                Bagikan ringkasan yang Anda setujui ke dokter & lihat catatan akses transparan.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Bagian Khusus: Alat Interaktif & Edukasi Klinis Lengkap */}
      <section aria-label="Alat Interaktif Khusus" className="bg-gradient-to-br from-brand-teal/[0.07] via-surface/40 to-brand-coral/[0.07] dark:via-transparent p-5 sm:p-6 rounded-card border border-brand-teal/15 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="eyebrow">
              {isEn ? 'Integrated Clinical Education' : 'Edukasi Klinis Terpadu'}
            </span>
            <h2 className="section-title mt-1">
              {isEn ? 'Interactive Tools & Biological Trackers' : 'Alat Interaktif & Pelacak Mandiri'}
            </h2>
          </div>
          <p className="text-xs text-brand-navy/70 dark:text-white/70 max-w-md">
            {isEn
              ? 'Calibrated against WHO 2021 manual standards and andrology guidelines for objective, stigma-free understanding.'
              : 'Dirancang berdasarkan pedoman resmi WHO 2021 dan panduan klinis andrologi untuk memberikan pemahaman menyeluruh.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to={isEn ? '/semen-calculator' : '/simulator'}
            className="card card-interactive p-5 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-teal-light dark:bg-brand-teal/20 text-brand-teal flex items-center justify-center group-hover:scale-105 transition">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white group-hover:text-brand-teal transition">
              {isEn ? 'WHO Semen Analysis Simulator' : 'Simulator Sperma WHO (2021)'}
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              {isEn
                ? 'Interactive parameter sliders for volume, concentration, motility, morphology, and Total Motile Sperm Count (TMSC).'
                : 'Kalkulator slider interaktif untuk volume, konsentrasi, motilitas, morfologi, dan skor potensi konsepsi alami (TMSC).'}
            </p>
            <div className="text-xs font-bold text-brand-teal flex items-center gap-1 pt-1">
              <span>{isEn ? 'Open Simulator' : 'Buka Simulator'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to={isEn ? '/cycle-tracker' : '/siklus-72-hari'}
            className="card card-interactive p-5 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral flex items-center justify-center group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white group-hover:text-brand-coral transition">
              {isEn ? '72-Day Biological Cycle & Habits' : 'Siklus Biologis 72 Hari & Kebiasaan'}
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              {isEn
                ? 'Explore the 4 biological phases from spermatogonia stem cells to lab readiness, with a daily protective habits checklist.'
                : 'Pelajari 4 fase pematangan sperma dari sel punca hingga siap tes lab, dilengkapi checklist kebiasaan protektif harian.'}
            </p>
            <div className="text-xs font-bold text-brand-coral-dark dark:text-brand-coral flex items-center gap-1 pt-1">
              <span>{isEn ? 'Open Cycle Tracker' : 'Buka Pelacak Siklus'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to={isEn ? '/doctor-checklist' : '/checklist-dokter'}
            className="card card-interactive p-5 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-navy/10 dark:bg-white/10 text-brand-navy dark:text-white flex items-center justify-center group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white group-hover:text-brand-teal transition">
              {isEn ? 'Doctor Consultation Questions' : 'Daftar Pertanyaan untuk Dokter'}
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              {isEn
                ? 'Dynamic question builder tailored to your clinical situation, ready to print or copy to your smartphone.'
                : 'Generator pertanyaan konsultasi dokter andrologi/urologi sesuai kondisi Anda, siap dicetak atau disalin ke HP.'}
            </p>
            <div className="text-xs font-bold text-brand-navy dark:text-white flex items-center gap-1 pt-1">
              <span>{isEn ? 'Build Doctor Checklist' : 'Buat Checklist Dokter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};
