import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Heart,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Bell,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

interface HabitItem {
  key: string;
  title: string;
  subtitle: string;
  benefit: string;
  category: 'temperature' | 'nutrition' | 'fitness' | 'sleep' | 'toxin';
}

const HABIT_ITEMS: HabitItem[] = [
  {
    key: 'cool_temp',
    title: 'Menjaga Suhu Skrotum Tetap Sejuk',
    subtitle: 'Tidak memangku laptop di paha, pilih celana dalam longgar/katun, hindari air panas.',
    benefit: 'Suhu optimal testis adalah 2–4°C lebih dingin dari suhu tubuh normal.',
    category: 'temperature',
  },
  {
    key: 'hydration_antioxidant',
    title: 'Cukupi Hidrasi & Antioksidan Harian',
    subtitle: 'Minum 2 liter air, konsumsi buah tomat (likopen), kacang-kacangan (zinc), dan sayuran hijau.',
    benefit: 'Antioksidan melindungi membran sel sperma dari stres oksidatif dan kerusakan DNA.',
    category: 'nutrition',
  },
  {
    key: 'exercise',
    title: 'Aktivitas Fisik Moderat 30 Menit',
    subtitle: 'Jalan santai, jogging ringan, atau senam peregangan tubuh.',
    benefit: 'Meningkatkan aliran darah dan menjaga sensitivitas insulin tanpa memicu panas berlebih di perineum.',
    category: 'fitness',
  },
  {
    key: 'sleep_rest',
    title: 'Tidur Berkualitas 7–8 Jam Malam Hari',
    subtitle: 'Hindari layar gadget 30 menit sebelum tidur, ruangan redup dan sejuk.',
    benefit: 'Puncak sintesis testosteron dan hormon reproduksi pria diproduksi selama fase tidur nyenyak (REM).',
    category: 'sleep',
  },
  {
    key: 'no_smoke',
    title: 'Hindari Rokok, Vape, & Batasi Alkohol',
    subtitle: 'Jauhkan diri dari asap rokok dan konsumsi alkohol berlebihan hari ini.',
    benefit: 'Mengurangi Sperm DNA Fragmentation Index (DFI) dan menjaga motilitas sperma.',
    category: 'toxin',
  },
];

export const SpermatogenesisTrackerPage: React.FC = () => {
  const {
    locale,
    habitLog,
    cycleStartDate,
    toggleDailyHabit,
    setCycleStartDate,
    addReminder,
  } = useApp();
  const t = getTranslations(locale);
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [reminderAdded, setReminderAdded] = useState<boolean>(false);

  // Kalkulasi hari siklus
  const startMs = new Date(cycleStartDate).getTime();
  const currentMs = new Date(selectedDate).getTime();
  const diffDays = Math.max(1, Math.min(74, Math.floor((currentMs - startMs) / (1000 * 60 * 60 * 24)) + 1));
  const progressPct = Math.min(100, Math.round((diffDays / 74) * 100));

  // Tentukan fase biologis saat ini
  const getCurrentPhase = (day: number) => {
    if (day <= 18) {
      return {
        number: 1,
        name: 'Fase Mitosis (Spermatogonia)',
        range: 'Hari 1 – 18',
        detail:
          'Sel punca sperma membelah dan membentuk cetak biru genetik awal. Tahap ini sangat sensitif terhadap panas testis dan demam tinggi.',
        focus: 'Prioritas: Jaga skrotum tetap sejuk dan hidrasi optimal.',
      };
    }
    if (day <= 42) {
      return {
        number: 2,
        name: 'Fase Meiosis (Pengemasan DNA)',
        range: 'Hari 19 – 42',
        detail:
          'Materi genetik (kromosom) dibagi dua secara presisi. Antioksidan sangat krusial di tahap ini untuk mencegah kerusakan rantai DNA sperma.',
        focus: 'Prioritas: Asupan Zinc, Selenium, Likopen, dan Vitamin C & E.',
      };
    }
    if (day <= 64) {
      return {
        number: 3,
        name: 'Fase Spermiogenesis (Pembentukan Ekor & Energi)',
        range: 'Hari 43 – 64',
        detail:
          'Sel bulat berubah menjadi bentuk sperma motil dengan kepala oval dan ekor cambuk bertenaga mitokondria untuk berenang maju.',
        focus: 'Prioritas: Olahraga moderat 30 menit, kurangi stres dan rokok.',
      };
    }
    return {
      number: 4,
      name: 'Fase Pematangan Epididimis & Kesiapan Tes',
      range: 'Hari 65 – 74',
      detail:
        'Sperma matang berpindah ke saluran epididimis dan siap untuk ejakulasi atau uji analisis semen laboratorium.',
      focus: 'Prioritas: Masa pantang (abstinensia) 2–7 hari sebelum uji laboratorium.',
    };
  };

  const currentPhase = getCurrentPhase(diffDays);
  const todayCheckedList = habitLog[selectedDate] || [];

  const handleToggle = async (key: string) => {
    await toggleDailyHabit(selectedDate, key);
  };

  const handleScheduleTestReminder = async () => {
    const testDate = new Date(startMs + 74 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    await addReminder({
      type: 'semen_analysis',
      title: 'Evaluasi Hasil Analisis Semen Siklus 74 Hari',
      facilityName: 'Laboratorium Klinik / Rumah Sakit Pilihan',
      remindAt: testDate,
      notes: 'Siklus sperma baru telah matang sempurna. Pastikan masa pantang 2–7 hari sebelum pengambilan sampel.',
    });
    setReminderAdded(true);
    setTimeout(() => setReminderAdded(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-7 border border-brand-navy/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              <span>Siklus Biologis Tubuh Pria (~72–74 Hari)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
              Pelacak Siklus Spermatogenesis & Kebiasaan Sehat
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">
              Tubuh pria membutuhkan waktu sekitar 72 hingga 74 hari untuk memproduksi sperma matang seutuhnya. Kebiasaan sehat hari ini membentuk sperma 2 bulan ke depan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleScheduleTestReminder}
              disabled={reminderAdded}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:bg-brand-navy-light transition disabled:opacity-75"
            >
              {reminderAdded ? <Check className="w-4 h-4 text-brand-teal" /> : <Bell className="w-4 h-4" />}
              <span>{reminderAdded ? 'Pengingat Dijadwalkan!' : 'Jadwalkan Tes Hari ke-74'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Progress Siklus 72 Hari Card */}
      <section className="bg-gradient-to-br from-brand-navy to-brand-navy-light text-white rounded-card shadow-soft-lg p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-teal text-white">
              Fase {currentPhase.number} dari 4 • {currentPhase.range}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mt-2 text-white">
              Hari ke-{diffDays} dari 74 Hari ({progressPct}% Selesai)
            </h2>
          </div>

          {/* Pengatur Tanggal Mulai */}
          <div className="bg-white/10 p-2.5 rounded-btn border border-white/15 text-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-teal-light" />
            <span className="text-white/80">Mulai Siklus:</span>
            <input
              type="date"
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
              className="bg-brand-navy px-2 py-1 rounded border border-white/20 text-white text-xs font-bold"
            />
          </div>
        </div>

        {/* Progress Bar Visual */}
        <div className="space-y-2">
          <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
            <div
              className="bg-brand-teal h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-white/70">
            <span>Hari 1 (Mulai Kebiasaan)</span>
            <span>Hari 36 (Fase Meiosis)</span>
            <span>Hari 74 (Sperma Matang & Evaluasi)</span>
          </div>
        </div>

        {/* Kotak Info Fase Aktif */}
        <div className="p-4 rounded-btn bg-white/10 border border-white/15 space-y-1.5 text-xs">
          <div className="font-bold text-brand-coral flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{currentPhase.name}</span>
          </div>
          <p className="text-white/90 leading-relaxed">{currentPhase.detail}</p>
          <p className="text-brand-teal-light font-semibold pt-1">{currentPhase.focus}</p>
        </div>
      </section>

      {/* 4 Tahapan Milestone Spermatogenesis */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-teal" />
          <span>Perjalanan Biologis Sperma Anda</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              phase: 1,
              title: 'Mitosis Spermatogonia',
              range: 'Hari 1–18',
              active: diffDays <= 18,
              desc: 'Pembelahan sel punca awal di tubulus seminiferus testis.',
            },
            {
              phase: 2,
              title: 'Meiosis & DNA Pack',
              range: 'Hari 19–42',
              active: diffDays > 18 && diffDays <= 42,
              desc: 'Pemisahan kromosom & perlindungan rantai genetik oleh antioksidan.',
            },
            {
              phase: 3,
              title: 'Spermiogenesis & Ekor',
              range: 'Hari 43–64',
              active: diffDays > 42 && diffDays <= 64,
              desc: 'Pembentukan struktur kepala akrosom dan mitokondria ekor penggerak.',
            },
            {
              phase: 4,
              title: 'Epididimis & Siap Tes',
              range: 'Hari 65–74',
              active: diffDays > 64,
              desc: 'Pematangan kemampuan berenang progresif dan kesiapan evaluasi.',
            },
          ].map((item) => (
            <div
              key={item.phase}
              className={`p-4 rounded-card border transition ${
                item.active
                  ? 'border-brand-teal bg-brand-teal-light/20 dark:bg-brand-teal/20 shadow-soft'
                  : 'border-brand-navy/10 bg-surface dark:bg-surface-dark-card opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.active ? 'bg-brand-teal text-white' : 'bg-brand-navy/10 text-brand-navy dark:text-white'}`}>
                  Fase {item.phase}
                </span>
                <span className="text-[11px] font-semibold text-brand-navy/60 dark:text-white/60">
                  {item.range}
                </span>
              </div>
              <h3 className="font-bold text-xs text-brand-navy dark:text-white mb-1">
                {item.title}
              </h3>
              <p className="text-[11px] text-brand-navy/70 dark:text-white/70 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist Kebiasaan Harian (Daily Micro-Habits) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-teal" />
              <span>Checklist Kebiasaan Harian</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Checklist sederhana untuk mendukung kualitas sperma setiap hari. Data tersimpan privat di perangkat Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-brand-navy/60 dark:text-white/60">Pilih Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
            />
          </div>
        </div>

        {/* Skor Kepatuhan Hari Ini */}
        <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-navy dark:text-white">
            Progress Kebiasaan ({selectedDate === todayStr ? 'Hari Ini' : selectedDate}):
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-teal text-white">
            {todayCheckedList.length} dari {HABIT_ITEMS.length} Selesai
          </span>
        </div>

        {/* Daftar Habit Cards */}
        <div className="space-y-3">
          {HABIT_ITEMS.map((habit) => {
            const isChecked = todayCheckedList.includes(habit.key);
            return (
              <div
                key={habit.key}
                onClick={() => handleToggle(habit.key)}
                className={`p-4 rounded-btn border cursor-pointer transition flex items-start gap-3.5 ${
                  isChecked
                    ? 'border-brand-teal bg-brand-teal-light/25 dark:bg-brand-teal/15 shadow-sm'
                    : 'border-brand-navy/15 bg-white dark:bg-surface-dark-card hover:border-brand-teal/50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isChecked
                      ? 'bg-brand-teal text-white'
                      : 'border-2 border-brand-navy/30 bg-white'
                  }`}
                >
                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-xs font-bold ${
                        isChecked
                          ? 'text-brand-teal line-through opacity-90'
                          : 'text-brand-navy dark:text-white'
                      }`}
                    >
                      {habit.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-brand-navy/75 dark:text-white/75 leading-relaxed">
                    {habit.subtitle}
                  </p>
                  <p className="text-[10px] text-brand-teal font-semibold pt-0.5">
                    💡 Kenapa ini penting: {habit.benefit}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
