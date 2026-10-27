import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  Bell,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

interface HabitItem {
  key: string;
  titleId: string;
  titleEn: string;
  subtitleId: string;
  subtitleEn: string;
  benefitId: string;
  benefitEn: string;
  category: 'temperature' | 'nutrition' | 'fitness' | 'sleep' | 'toxin';
}

const HABIT_ITEMS: HabitItem[] = [
  {
    key: 'cool_temp',
    titleId: 'Menjaga Suhu Skrotum Tetap Sejuk',
    titleEn: 'Keep Scrotal Temperature Cool',
    subtitleId: 'Tidak memangku laptop di paha, pilih celana dalam longgar/katun, hindari air panas.',
    subtitleEn: 'Avoid laptops on lap, wear loose breathable underwear, avoid hot baths or saunas.',
    benefitId: 'Suhu optimal testis adalah 2–4°C lebih dingin dari suhu tubuh normal.',
    benefitEn: 'Optimal testicular temperature is 2–4°C cooler than core body temperature.',
    category: 'temperature',
  },
  {
    key: 'hydration_antioxidant',
    titleId: 'Cukupi Hidrasi & Antioksidan Harian',
    titleEn: 'Daily Hydration & Antioxidant Nutrition',
    subtitleId: 'Minum 2 liter air, konsumsi buah tomat (likopen), kacang-kacangan (zinc), dan sayuran hijau.',
    subtitleEn: 'Drink 2L of water, consume tomatoes (lycopene), nuts/seeds (zinc), and leafy greens.',
    benefitId: 'Antioksidan melindungi membran sel sperma dari stres oksidatif dan kerusakan DNA.',
    benefitEn: 'Antioxidants protect the delicate sperm membrane from oxidative stress and DNA fragmentation.',
    category: 'nutrition',
  },
  {
    key: 'exercise',
    titleId: 'Aktivitas Fisik Moderat 30 Menit',
    titleEn: 'Moderate Physical Activity (30 Mins)',
    subtitleId: 'Jalan santai, jogging ringan, atau senam peregangan tubuh.',
    subtitleEn: 'Brisk walking, light jogging, or core stretching.',
    benefitId: 'Meningkatkan aliran darah dan menjaga sensitivitas insulin tanpa memicu panas berlebih di perineum.',
    benefitEn: 'Improves pelvic blood flow and insulin sensitivity without creating excess groin friction heat.',
    category: 'fitness',
  },
  {
    key: 'sleep_rest',
    titleId: 'Tidur Berkualitas 7–8 Jam Malam Hari',
    titleEn: 'Quality Restorative Sleep (7–8 Hours)',
    subtitleId: 'Hindari layar gadget 30 menit sebelum tidur, ruangan redup dan sejuk.',
    subtitleEn: 'Dim screens 30 mins before bed, maintain a cool, quiet sleeping environment.',
    benefitId: 'Puncak sintesis testosteron dan hormon reproduksi pria diproduksi selama fase tidur nyenyak (REM).',
    benefitEn: 'Peak nocturnal testosterone synthesis and LH secretion occur during restorative deep REM sleep.',
    category: 'sleep',
  },
  {
    key: 'no_smoke',
    titleId: 'Hindari Rokok, Vape, & Batasi Alkohol',
    titleEn: 'Avoid Smoking, Vaping, & Minimize Alcohol',
    subtitleId: 'Jauhkan diri dari asap rokok dan konsumsi alkohol berlebihan hari ini.',
    subtitleEn: 'Protect your bloodstream from cigarette smoke toxins and heavy alcohol intake.',
    benefitId: 'Mengurangi Sperm DNA Fragmentation Index (DFI) dan menjaga motilitas sperma.',
    benefitEn: 'Lowers Sperm DNA Fragmentation Index (DFI) and preserves progressive motility.',
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
  const isEn = locale === 'en';

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [reminderAdded, setReminderAdded] = useState<boolean>(false);

  // Cycle day calculations
  const startMs = new Date(cycleStartDate).getTime();
  const currentMs = new Date(selectedDate).getTime();
  const diffDays = Math.max(1, Math.min(74, Math.floor((currentMs - startMs) / (1000 * 60 * 60 * 24)) + 1));
  const progressPct = Math.min(100, Math.round((diffDays / 74) * 100));

  const getCurrentPhase = (day: number) => {
    if (day <= 18) {
      return {
        number: 1,
        name: isEn ? 'Phase 1: Spermatogonia Mitosis' : 'Fase 1: Mitosis (Spermatogonia)',
        range: isEn ? 'Days 1 – 18' : 'Hari 1 – 18',
        detail: isEn
          ? 'Stem cells divide and establish the initial genetic blueprint. Highly sensitive to scrotal heat and high fevers.'
          : 'Sel punca sperma membelah dan membentuk cetak biru genetik awal. Tahap ini sangat sensitif terhadap panas testis dan demam tinggi.',
        focus: isEn
          ? 'Priority: Keep scrotum cool and maintain daily hydration.'
          : 'Prioritas: Jaga skrotum tetap sejuk dan hidrasi optimal.',
      };
    }
    if (day <= 42) {
      return {
        number: 2,
        name: isEn ? 'Phase 2: Meiosis & DNA Packaging' : 'Fase 2: Meiosis (Pengemasan DNA)',
        range: isEn ? 'Days 19 – 42' : 'Hari 19 – 42',
        detail: isEn
          ? 'Chromosomes divide precisely in half. Antioxidants are critical in this phase to prevent single and double-strand DNA breaks.'
          : 'Materi genetik (kromosom) dibagi dua secara presisi. Antioksidan sangat krusial di tahap ini untuk mencegah kerusakan rantai DNA sperma.',
        focus: isEn
          ? 'Priority: Zinc, Selenium, Lycopene, and Vitamins C & E.'
          : 'Prioritas: Asupan Zinc, Selenium, Likopen, dan Vitamin C & E.',
      };
    }
    if (day <= 64) {
      return {
        number: 3,
        name: isEn ? 'Phase 3: Spermiogenesis & Flagellum Development' : 'Fase 3: Spermiogenesis (Ekor & Energi)',
        range: isEn ? 'Days 43 – 64' : 'Hari 43 – 64',
        detail: isEn
          ? 'Round spermatids transform into streamlined swimmers with acrosome caps and mitochondrial-powered motility tails.'
          : 'Sel bulat berubah menjadi bentuk sperma motil dengan kepala oval dan ekor cambuk bertenaga mitokondria untuk berenang maju.',
        focus: isEn
          ? 'Priority: 30 minutes of aerobic activity, stress moderation, and smoke avoidance.'
          : 'Prioritas: Olahraga moderat 30 menit, kurangi stres dan rokok.',
      };
    }
    return {
      number: 4,
      name: isEn ? 'Phase 4: Epididymal Transit & Test Readiness' : 'Fase 4: Pematangan Epididimis & Kesiapan Tes',
      range: isEn ? 'Days 65 – 74' : 'Hari 65 – 74',
      detail: isEn
        ? 'Fully formed sperm travel through the epididymis gaining forward motility, primed for ejaculation or lab analysis.'
        : 'Sperma matang berpindah ke saluran epididimis dan siap untuk ejakulasi atau uji analisis semen laboratorium.',
      focus: isEn
        ? 'Priority: Maintain 2–7 days of abstinence before laboratory collection.'
        : 'Prioritas: Masa pantang (abstinensia) 2–7 hari sebelum uji laboratorium.',
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
      title: isEn
        ? 'Day 74 Spermatogenesis Cycle Evaluation & Semen Analysis'
        : 'Evaluasi Hasil Analisis Semen Siklus 74 Hari',
      facilityName: isEn ? 'Preferred Laboratory / Clinic' : 'Laboratorium Klinik / Rumah Sakit Pilihan',
      remindAt: testDate,
      notes: isEn
        ? 'Your fresh sperm generation has matured. Ensure 2–7 days of abstinence prior to sample collection.'
        : 'Siklus sperma baru telah matang sempurna. Pastikan masa pantang 2–7 hari sebelum pengambilan sampel.',
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
              <span>{isEn ? 'Male Biological Lifecycle (~72–74 Days)' : 'Siklus Biologis Tubuh Pria (~72–74 Hari)'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
              {isEn ? '72-Day Spermatogenesis Roadmap & Habit Tracker' : 'Pelacak Siklus Spermatogenesis & Kebiasaan Sehat'}
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">
              {isEn
                ? 'The male body requires approximately 72 to 74 days to regenerate and mature sperm cells. Positive habits cultivated today will reflect in your sperm 2 months from now.'
                : 'Tubuh pria membutuhkan waktu sekitar 72 hingga 74 hari untuk memproduksi sperma matang seutuhnya. Kebiasaan sehat hari ini membentuk sperma 2 bulan ke depan.'}
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
              <span>
                {reminderAdded
                  ? (isEn ? 'Reminder Scheduled!' : 'Pengingat Dijadwalkan!')
                  : (isEn ? 'Schedule Day 74 Test' : 'Jadwalkan Tes Hari ke-74')}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 72-Day Progress Card */}
      <section className="bg-gradient-to-br from-brand-navy to-brand-navy-light text-white rounded-card shadow-soft-lg p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-teal text-white">
              {isEn ? `Phase ${currentPhase.number} of 4 • ${currentPhase.range}` : `Fase ${currentPhase.number} dari 4 • ${currentPhase.range}`}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mt-2 text-white">
              {isEn ? `Day ${diffDays} of 74 Days (${progressPct}% Complete)` : `Hari ke-${diffDays} dari 74 Hari (${progressPct}% Selesai)`}
            </h2>
          </div>

          {/* Date Selector */}
          <div className="bg-white/10 p-2.5 rounded-btn border border-white/15 text-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-teal-light" />
            <span className="text-white/80">{isEn ? 'Cycle Started:' : 'Mulai Siklus:'}</span>
            <input
              type="date"
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
              className="bg-brand-navy px-2 py-1 rounded border border-white/20 text-white text-xs font-bold"
            />
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
            <div
              className="bg-brand-teal h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-white/70">
            <span>{isEn ? 'Day 1 (Habit Start)' : 'Hari 1 (Mulai Kebiasaan)'}</span>
            <span>{isEn ? 'Day 36 (Meiosis Peak)' : 'Hari 36 (Fase Meiosis)'}</span>
            <span>{isEn ? 'Day 74 (Matured & Test Evaluation)' : 'Hari 74 (Sperma Matang & Evaluasi)'}</span>
          </div>
        </div>

        {/* Active Phase Box */}
        <div className="p-4 rounded-btn bg-white/10 border border-white/15 space-y-1.5 text-xs">
          <div className="font-bold text-brand-coral flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{currentPhase.name}</span>
          </div>
          <p className="text-white/90 leading-relaxed">{currentPhase.detail}</p>
          <p className="text-brand-teal-light font-semibold pt-1">{currentPhase.focus}</p>
        </div>
      </section>

      {/* 4 Biological Milestones */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-teal" />
          <span>{isEn ? 'Your Biological Sperm Development Journey' : 'Perjalanan Biologis Sperma Anda'}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              phase: 1,
              title: isEn ? 'Spermatogonia Mitosis' : 'Mitosis Spermatogonia',
              range: isEn ? 'Days 1–18' : 'Hari 1–18',
              active: diffDays <= 18,
              desc: isEn
                ? 'Initial stem cell division in the seminiferous tubules of the testes.'
                : 'Pembelahan sel punca awal di tubulus seminiferus testis.',
            },
            {
              phase: 2,
              title: isEn ? 'Meiosis & DNA Pack' : 'Meiosis & DNA Pack',
              range: isEn ? 'Days 19–42' : 'Hari 19–42',
              active: diffDays > 18 && diffDays <= 42,
              desc: isEn
                ? 'Chromosome halving & critical genetic protection by antioxidants.'
                : 'Pemisahan kromosom & perlindungan rantai genetik oleh antioksidan.',
            },
            {
              phase: 3,
              title: isEn ? 'Spermiogenesis & Tail' : 'Spermiogenesis & Ekor',
              range: isEn ? 'Days 43–64' : 'Hari 43–64',
              active: diffDays > 42 && diffDays <= 64,
              desc: isEn
                ? 'Acrosomal cap formation and mitochondrial motor packaging.'
                : 'Pembentukan struktur kepala akrosom dan mitokondria ekor penggerak.',
            },
            {
              phase: 4,
              title: isEn ? 'Epididymal Maturation' : 'Epididimis & Siap Tes',
              range: isEn ? 'Days 65–74' : 'Hari 65–74',
              active: diffDays > 64,
              desc: isEn
                ? 'Acquiring progressive forward motility and lab test readiness.'
                : 'Pematangan kemampuan berenang progresif dan kesiapan evaluasi.',
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
                  {isEn ? `Phase ${item.phase}` : `Fase ${item.phase}`}
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

      {/* Daily Micro-Habits Checklist */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-teal" />
              <span>{isEn ? 'Daily Micro-Habits Checklist' : 'Checklist Kebiasaan Harian'}</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Simple daily actions to safeguard sperm quality. Saved privately and encrypted on your device.'
                : 'Checklist sederhana untuk mendukung kualitas sperma setiap hari. Data tersimpan privat di perangkat Anda.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-brand-navy/60 dark:text-white/60">{isEn ? 'Select Date:' : 'Pilih Tanggal:'}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
            />
          </div>
        </div>

        {/* Adherence Score */}
        <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-navy dark:text-white">
            {isEn
              ? `Habits Completed (${selectedDate === todayStr ? 'Today' : selectedDate}):`
              : `Progress Kebiasaan (${selectedDate === todayStr ? 'Hari Ini' : selectedDate}):`}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-teal text-white">
            {isEn
              ? `${todayCheckedList.length} of ${HABIT_ITEMS.length} Complete`
              : `${todayCheckedList.length} dari ${HABIT_ITEMS.length} Selesai`}
          </span>
        </div>

        {/* Habit List */}
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
                      {isEn ? habit.titleEn : habit.titleId}
                    </h3>
                  </div>
                  <p className="text-[11px] text-brand-navy/75 dark:text-white/75 leading-relaxed">
                    {isEn ? habit.subtitleEn : habit.subtitleId}
                  </p>
                  <p className="text-[10px] text-brand-teal font-semibold pt-0.5">
                    💡 {isEn ? `Why this matters: ${habit.benefitEn}` : `Kenapa ini penting: ${habit.benefitId}`}
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
