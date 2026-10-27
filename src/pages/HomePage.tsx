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

export const HomePage: React.FC = () => {
  const {
    authMode,
    displayName,
    locale,
    discreetMode,
    assessmentResult,
    labResults,
    reminders,
    pairing,
    startAnonymousMode,
    switchDemoPersona,
  } = useApp();

  const t = getTranslations(locale);
  const navigate = useNavigate();

  // Tentukan "Satu Langkah Kecil Berikutnya" secara dinamis
  const getNextStepCard = () => {
    if (!assessmentResult) {
      return {
        badge: 'Langkah 1 dari 4',
        title: discreetMode ? 'Mulai Kuesioner Kebiasaan Harian' : 'Mulai Cek Awal Mandiri (< 3 Menit)',
        description:
          'Jawab 12 pertanyaan singkat secara privat tanpa akun untuk mengetahui apakah dan kapan Anda sebaiknya berkonsultasi ke dokter.',
        ctaText: t.cta.startAssessment,
        to: '/cek-awal',
      };
    }
    if (!pairing || pairing.status !== 'active') {
      return {
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
        badge: 'Langkah 3 dari 4',
        title: 'Pilih Layanan Pemeriksaan Ramah Pria',
        description:
          'Lihat panduan persiapan analisis semen (masa pantang 2–7 hari), estimasi biaya, info JKN, dan buat daftar pertanyaan untuk dokter.',
        ctaText: t.cta.findFacility,
        to: '/layanan',
      };
    }
    return {
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
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {authMode === 'welcome'
                  ? 'Siap Digunakan Tanpa Akun'
                  : `${displayName} • Data Terenkripsi AES-GCM`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
              {discreetMode ? 'Ringkasan Kesejahteraan Harian' : t.brand.welcomeGreeting}
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">
              {discreetMode
                ? 'Pantau jadwal, kebiasaan sehat, dan catatan harian Anda dengan tenang.'
                : 'Setiap langkah kecil membawa kejelasan bagi Anda dan pasangan. Pilih langkah yang paling nyaman hari ini.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {authMode === 'welcome' && (
              <button
                type="button"
                onClick={() => startAnonymousMode()}
                className="touch-target px-4 py-2.5 rounded-btn bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition"
              >
                Aktifkan Mode Anonim
              </button>
            )}
            <button
              type="button"
              onClick={() => switchDemoPersona('rendra')}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral text-xs font-bold flex items-center gap-1.5 hover:bg-brand-coral/25 transition"
            >
              <Sparkles className="w-4 h-4" />
              Isi Skenario Rendra
            </button>
          </div>
        </div>
      </section>

      {/* Kartu Utama: "Langkah Berikutnya" (Prinsip #5: Satu langkah kecil berikutnya) */}
      <section
        aria-labelledby="next-step-heading"
        className="bg-gradient-to-br from-brand-navy to-brand-navy-light text-white rounded-card shadow-soft-lg p-6 sm:p-7 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-teal text-white">
            Langkah Berikutnya • {nextStep.badge}
          </span>
          {assessmentResult && (
            <span className="text-xs text-white/80 font-medium">
              Saran Cek Awal: <strong className="text-brand-coral">{assessmentResult.levelLabel}</strong>
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h2 id="next-step-heading" className="text-xl sm:text-2xl font-bold">
            {nextStep.title}
          </h2>
          <p className="text-sm text-white/85 leading-relaxed max-w-4xl">
            {nextStep.description}
          </p>
        </div>

        <div className="pt-1 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(nextStep.to)}
            className="touch-target px-6 py-3 rounded-btn bg-brand-coral text-white font-bold text-sm shadow-soft hover:bg-brand-coral-dark transition flex items-center gap-2"
          >
            <span>{nextStep.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!assessmentResult && (
            <button
              type="button"
              onClick={() => navigate('/welcome')}
              className="touch-target px-4 py-3 rounded-btn bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
            >
              Lihat Pengaturan Privasi
            </button>
          )}
        </div>
      </section>

      {/* Progres Rencana Kita & Pengingat Mendatang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kartu Progres Rencana */}
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 space-y-3 border border-brand-navy/5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-teal" />
              <span>Progres Rencana Kita</span>
            </h2>
            <Link to="/berdua" className="text-xs font-bold text-brand-teal hover:underline">
              Lihat Detail →
            </Link>
          </div>

          <div className="w-full bg-surface-muted dark:bg-surface-dark h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-teal h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((completedStepsCount / 6) * 100))}%` }}
            />
          </div>

          <p className="text-xs text-brand-navy/75 dark:text-white/75">
            {pairing && pairing.status === 'active' ? (
              <>
                Terhubung bersama <strong>{pairing.partner_b_alias}</strong> (Kode:{' '}
                <code className="font-bold text-brand-teal">{pairing.invite_code}</code>).{' '}
                {completedStepsCount} dari 6 tahapan selesai.
              </>
            ) : (
              'Belum menautkan pasangan. Anda bisa mengundang pasangan kapan pun Anda siap tanpa membuka data pribadi.'
            )}
          </p>

          {pairing?.shared_items.noteFromB && (
            <div className="p-3 rounded-btn bg-brand-teal-light/60 dark:bg-brand-teal/20 text-xs text-brand-navy dark:text-white">
              <span className="font-bold text-brand-teal">Pesan Semangat Pasangan: </span>“
              {pairing.shared_items.noteFromB}”
            </div>
          )}
        </section>

        {/* Kartu Pengingat Pemeriksaan */}
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 space-y-3 border border-brand-navy/5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-coral" />
              <span>Jadwal & Pengingat</span>
            </h2>
            <Link to="/hasil" className="text-xs font-bold text-brand-teal hover:underline">
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
                  className="p-2.5 rounded-btn bg-surface-muted dark:bg-surface-dark text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-brand-navy dark:text-white">{rem.title}</div>
                    {rem.facilityName && (
                      <div className="text-brand-teal font-medium">{rem.facilityName}</div>
                    )}
                    <div className="text-brand-navy/60 dark:text-white/60 mt-0.5">
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy/60 dark:text-white/60 mb-3">
          Pintasan Layanan & Panduan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Link
            to="/cek-awal"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/5 hover:border-brand-teal transition flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-btn bg-brand-teal-light text-brand-teal flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Cek Awal Mandiri</h3>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-1">
                12 pertanyaan privat berbasis aturan medis untuk memetakan langkah pertama.
              </p>
            </div>
          </Link>

          <Link
            to="/layanan"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/5 hover:border-brand-teal transition flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-btn bg-brand-coral-light text-brand-coral-dark flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Cari Layanan & Panduan Tes</h3>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-1">
                16 direktori klinik/RS ramah pria, filter JKN, & pembuat daftar pertanyaan dokter.
              </p>
            </div>
          </Link>

          <Link
            to="/berdua"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/5 hover:border-brand-teal transition flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-btn bg-brand-teal-light text-brand-teal flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Mode Berdua (Rencana Kita)</h3>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-1">
                Templat pesan "Ajak dengan lembut" & checklist bersama tanpa buka data pribadi.
              </p>
            </div>
          </Link>

          <Link
            to="/hasil"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/5 hover:border-brand-teal transition flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-btn bg-status-success-bg text-status-success flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Hasil Saya & Grafik Tren</h3>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-1">
                Catat hasil analisis semen, pahami istilah rujukan WHO 2021, dan pantau tren.
              </p>
            </div>
          </Link>

          <Link
            to="/pustaka"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/5 hover:border-brand-teal transition flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-btn bg-status-warning-bg text-status-warning flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pustaka Edukasi & Tanya Nakes</h3>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-1">
                12 artikel pendek terkurasi, mitos vs fakta, FAQ, dan tiket tanya nakes anonim.
              </p>
            </div>
          </Link>

          <Link
            to="/bagikan-nakes"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/5 hover:border-brand-teal transition flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-btn bg-brand-teal-light text-brand-teal flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Berbagi ke Nakes (QR 1 Jam)</h3>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-1">
                Bagikan ringkasan yang Anda setujui ke dokter & lihat catatan akses transparan.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Bagian Khusus: Alat Interaktif & Edukasi Klinis Lengkap */}
      <section aria-label="Alat Interaktif Khusus" className="bg-gradient-to-br from-brand-navy/5 via-brand-teal/5 to-brand-coral/5 p-6 rounded-card border border-brand-teal/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-teal text-white">
              Edukasi Klinis Terpadu
            </span>
            <h2 className="text-base sm:text-lg font-bold text-brand-navy dark:text-white mt-1">
              Alat Interaktif & Pelacak Mandiri
            </h2>
          </div>
          <p className="text-xs text-brand-navy/70 dark:text-white/70 max-w-md">
            Dirancang berdasarkan pedoman resmi WHO 2021 dan panduan klinis andrologi untuk memberikan pemahaman menyeluruh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/simulator"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/10 hover:border-brand-teal hover:shadow-soft-lg transition space-y-2 group"
          >
            <div className="w-10 h-10 rounded-btn bg-brand-teal-light text-brand-teal flex items-center justify-center group-hover:scale-105 transition">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white group-hover:text-brand-teal transition">
              Simulator Sperma WHO (2021)
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              Kalkulator slider interaktif untuk volume, konsentrasi, motilitas, morfologi, dan skor potensi konsepsi alami (TMSC).
            </p>
            <div className="text-xs font-bold text-brand-teal flex items-center gap-1 pt-1">
              <span>Buka Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/siklus-72-hari"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/10 hover:border-brand-teal hover:shadow-soft-lg transition space-y-2 group"
          >
            <div className="w-10 h-10 rounded-btn bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral flex items-center justify-center group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white group-hover:text-brand-coral transition">
              Siklus Biologis 72 Hari & Kebiasaan
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              Pelajari 4 fase pematangan sperma dari sel punca hingga siap tes lab, dilengkapi checklist kebiasaan protektif harian.
            </p>
            <div className="text-xs font-bold text-brand-coral-dark dark:text-brand-coral flex items-center gap-1 pt-1">
              <span>Buka Pelacak Siklus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/checklist-dokter"
            className="bg-surface dark:bg-surface-dark-card p-5 rounded-card shadow-soft border border-brand-navy/10 hover:border-brand-teal hover:shadow-soft-lg transition space-y-2 group"
          >
            <div className="w-10 h-10 rounded-btn bg-brand-navy/10 dark:bg-white/10 text-brand-navy dark:text-white flex items-center justify-center group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white group-hover:text-brand-teal transition">
              Daftar Pertanyaan untuk Dokter
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
              Generator pertanyaan konsultasi dokter andrologi/urologi sesuai kondisi Anda, siap dicetak atau disalin ke HP.
            </p>
            <div className="text-xs font-bold text-brand-navy dark:text-white flex items-center gap-1 pt-1">
              <span>Buat Checklist Dokter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};
