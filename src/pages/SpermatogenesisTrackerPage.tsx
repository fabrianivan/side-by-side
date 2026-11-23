import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  Bell,
  Check,
  CheckCircle2,
  Download,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { localDateString } from '../lib/care-pathway';
import { downloadIcsEvent } from '../lib/ics';

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
  const isEn = locale === 'en';

  const todayStr = localDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [reminderAdded, setReminderAdded] = useState<boolean>(false);

  // Cycle day calculations (calendar-day safe, no UTC drift)
  const startMs = new Date(`${cycleStartDate.slice(0, 10)}T00:00:00Z`).getTime();
  const currentMs = new Date(`${selectedDate.slice(0, 10)}T00:00:00Z`).getTime();
  const rawDay = Math.floor((currentMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  const diffDays = Math.max(1, Math.min(74, Number.isFinite(rawDay) ? rawDay : 1));
  const progressPct = Math.min(100, Math.round((diffDays / 74) * 100));
  const day74DateStr = new Date((Number.isFinite(startMs) ? startMs : Date.now()) + 73 * 86400_000)
    .toISOString()
    .slice(0, 10);

  // 7-day rolling window, current streak, and active days in cycle from encrypted habitLog
  const { last7Days, currentStreak, totalActiveDays } = useMemo(() => {
    const todayBase = new Date(`${todayStr}T00:00:00Z`).getTime();
    const days: Array<{ date: string; shortLabel: string; count: number }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const dt = new Date(todayBase - offset * 86400_000);
      const iso = dt.toISOString().slice(0, 10);
      const shortLabel = new Date(`${iso}T12:00:00`).toLocaleDateString(isEn ? 'en-GB' : 'id-ID', {
        weekday: 'short',
      });
      days.push({ date: iso, shortLabel, count: (habitLog[iso] || []).length });
    }

    let streak = 0;
    const todayHasAny = (habitLog[todayStr] || []).length > 0;
    for (let offset = todayHasAny ? 0 : 1; offset < 74; offset += 1) {
      const iso = new Date(todayBase - offset * 86400_000).toISOString().slice(0, 10);
      if ((habitLog[iso] || []).length > 0) {
        streak += 1;
      } else {
        break;
      }
    }

    const activeDays = Object.entries(habitLog).filter(
      ([d, items]) => d >= cycleStartDate && items.length > 0,
    ).length;

    return { last7Days: days, currentStreak: streak, totalActiveDays: activeDays };
  }, [cycleStartDate, habitLog, isEn, todayStr]);

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
          ? 'Priority: Whole foods rich in antioxidants—tomatoes, nuts, leafy greens, and water.'
          : 'Prioritas: Pangan utuh kaya antioksidan—tomat, kacang-kacangan, sayuran hijau, dan air putih.',
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
    const testDate = `${day74DateStr}T09:00`;
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

  const handleExportDay74Calendar = () => {
    downloadIcsEvent(
      {
        uid: `sbs-cycle-day74-${cycleStartDate}@side-by-side.app`,
        title: isEn
          ? 'Day 74 Spermatogenesis Evaluation & Semen Analysis'
          : 'Evaluasi Siklus Spermatogenesis Hari ke-74',
        start: `${day74DateStr}T09:00`,
        durationMinutes: 60,
        description: isEn
          ? 'Target end of your 74-day habit cycle from Side by Side. Plan 2–7 days of abstinence before a semen analysis.'
          : 'Target akhir siklus kebiasaan 74 hari dari Side by Side. Atur masa pantang 2–7 hari sebelum analisis semen.',
        alarmMinutesBefore: 48 * 60,
      },
      `side-by-side-day74-${day74DateStr}.ics`,
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <section className="page-header">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2.5">
            <div className="badge badge-teal">
              <Clock className="w-3.5 h-3.5" />
              <span>{isEn ? 'Male Biological Lifecycle (~72–74 Days)' : 'Siklus Biologis Tubuh Pria (~72–74 Hari)'}</span>
            </div>
            <h1 className="page-title">
              {isEn ? '72-Day Spermatogenesis Roadmap & Habit Tracker' : 'Pelacak Siklus Spermatogenesis & Kebiasaan Sehat'}
            </h1>
            <p className="page-lead">
              {isEn
                ? 'The male body requires approximately 72 to 74 days to regenerate and mature sperm cells. Positive habits cultivated today will reflect in your sperm 2 months from now.'
                : 'Tubuh pria membutuhkan waktu sekitar 72 hingga 74 hari untuk memproduksi sperma matang seutuhnya. Kebiasaan sehat hari ini membentuk sperma 2 bulan ke depan.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportDay74Calendar}
              className="btn btn-secondary"
            >
              <Download className="w-4 h-4 text-brand-teal" />
              <span>{isEn ? 'Day 74 (.ics)' : 'Kalender Hari-74 (.ics)'}</span>
            </button>
            <button
              type="button"
              onClick={handleScheduleTestReminder}
              disabled={reminderAdded}
              className="btn btn-navy"
            >
              {reminderAdded ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              <span>
                {reminderAdded
                  ? (isEn ? 'Reminder Scheduled!' : 'Pengingat Dijadwalkan!')
                  : (isEn ? 'Schedule Day 74 Test' : 'Jadwalkan Tes Hari ke-74')}
              </span>
            </button>
            {diffDays >= 74 && (
              <button
                type="button"
                onClick={() => void setCycleStartDate(todayStr)}
                className="btn btn-primary"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isEn ? 'Start New 74-Day Cycle' : 'Mulai Siklus 74 Hari Baru'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 72-Day Progress Card */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-navy-light text-white rounded-card shadow-soft-lg p-5 sm:p-8 space-y-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-brand-teal/30 blur-3xl"
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[#7FDADB]">
              {isEn ? `Phase ${currentPhase.number} of 4 • ${currentPhase.range}` : `Fase ${currentPhase.number} dari 4 • ${currentPhase.range}`}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1.5 text-white">
              {isEn ? `Day ${diffDays} of 74 Days (${progressPct}% Complete)` : `Hari ke-${diffDays} dari 74 Hari (${progressPct}% Selesai)`}
            </h2>
          </div>

          {/* Date Selector */}
          <div className="bg-white/[0.08] px-3 py-2.5 rounded-xl border border-white/10 text-xs flex items-center gap-2 self-start md:self-auto shrink-0">
            <Calendar className="w-4 h-4 text-brand-teal-light shrink-0" />
            <span className="text-white/80">{isEn ? 'Cycle Started:' : 'Mulai Siklus:'}</span>
            <input
              type="date"
              max={todayStr}
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
              aria-label={isEn ? 'Cycle start date' : 'Tanggal mulai siklus'}
              className="bg-brand-navy-deep px-2.5 py-1.5 rounded-lg border border-white/20 text-white text-xs font-bold [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="relative space-y-2.5">
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={isEn ? `Cycle progress ${progressPct}%` : `Progres siklus ${progressPct}%`}
            className="w-full bg-white/15 h-3 rounded-full overflow-hidden"
          >
            <div
              className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-brand-teal to-[#4FC6C8]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-2xs leading-snug text-white/70">
            <span>{isEn ? 'Day 1 (Habit Start)' : 'Hari 1 (Mulai Kebiasaan)'}</span>
            <span className="text-center">{isEn ? 'Day 36 (Meiosis Peak)' : 'Hari 36 (Fase Meiosis)'}</span>
            <span className="text-right">{isEn ? 'Day 74 (Matured & Test Evaluation)' : 'Hari 74 (Sperma Matang & Evaluasi)'}</span>
          </div>
        </div>

        {/* Active Phase Box */}
        <div className="relative p-4 sm:p-5 rounded-2xl bg-white/[0.08] border border-white/10 space-y-1.5 text-xs">
          <div className="font-bold text-sm text-[#FFA596] flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{currentPhase.name}</span>
          </div>
          <p className="text-white/90 leading-relaxed">{currentPhase.detail}</p>
          <p className="text-[#7FDADB] font-semibold pt-1">{currentPhase.focus}</p>
        </div>
      </section>

      {/* 4 Biological Milestones */}
      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-teal shrink-0" />
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
              aria-current={item.active ? 'step' : undefined}
              className={`p-4 sm:p-5 rounded-card border transition ${
                item.active
                  ? 'border-brand-teal bg-brand-teal-light/40 dark:bg-brand-teal/20 shadow-soft ring-4 ring-brand-teal/10'
                  : 'border-brand-navy/[0.07] dark:border-white/[0.08] bg-surface dark:bg-surface-dark-card'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className={`badge ${item.active ? 'bg-brand-teal-strong text-white' : 'badge-navy'}`}>
                  {isEn ? `Phase ${item.phase}` : `Fase ${item.phase}`}
                </span>
                <span className="text-2xs font-semibold text-brand-navy/60 dark:text-white/60">
                  {item.range}
                </span>
              </div>
              <h3 className="font-bold text-sm text-brand-navy dark:text-white mb-1">
                {item.title}
              </h3>
              <p className="text-2xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Daily Micro-Habits Checklist */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-teal shrink-0" />
              <span>{isEn ? 'Daily Micro-Habits Checklist' : 'Checklist Kebiasaan Harian'}</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Simple daily actions to safeguard sperm quality. Saved privately and encrypted on your device.'
                : 'Checklist sederhana untuk mendukung kualitas sperma setiap hari. Data tersimpan privat di perangkat Anda.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <label htmlFor="habit-date" className="text-brand-navy/60 dark:text-white/60 whitespace-nowrap">
              {isEn ? 'Select Date:' : 'Pilih Tanggal:'}
            </label>
            <input
              id="habit-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="field font-semibold"
            />
          </div>
        </div>

        {/* 7-Day Habit Consistency Strip & Cycle Summary */}
        <div
          className="well p-4 space-y-3"
          data-testid="habit-7day-strip"
          aria-label={isEn ? 'Last 7 days habit consistency' : 'Konsistensi kebiasaan 7 hari terakhir'}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-brand-navy dark:text-white">
              <Flame className="w-4 h-4 text-brand-coral shrink-0" />
              <span>
                {isEn
                  ? `Active streak: ${currentStreak} day(s) · ${totalActiveDays} active day(s) this cycle`
                  : `Runtutan aktif: ${currentStreak} hari · ${totalActiveDays} hari aktif di siklus ini`}
              </span>
            </div>
            <span className="tabular badge bg-brand-teal-strong text-white whitespace-nowrap">
              {isEn
                ? `${todayCheckedList.length} of ${HABIT_ITEMS.length} Complete (${selectedDate === todayStr ? 'Today' : selectedDate})`
                : `${todayCheckedList.length} dari ${HABIT_ITEMS.length} Selesai (${selectedDate === todayStr ? 'Hari Ini' : selectedDate})`}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {last7Days.map((day) => {
              const isSelected = day.date === selectedDate;
              const levelClass =
                day.count >= 4
                  ? 'bg-brand-teal-strong text-white border-brand-teal-strong'
                  : day.count >= 1
                  ? 'bg-brand-teal-light text-brand-teal-dark dark:bg-brand-teal/25 dark:text-[#7FDADB] border-brand-teal/40'
                  : 'bg-surface dark:bg-surface-dark text-brand-navy/60 dark:text-white/60 border-brand-navy/10 dark:border-white/10';
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  aria-pressed={isSelected}
                  className={`rounded-xl border px-1.5 py-2 text-center transition ${levelClass} ${
                    isSelected ? 'ring-2 ring-brand-navy dark:ring-white ring-offset-1 dark:ring-offset-surface-dark-card' : ''
                  }`}
                >
                  <div className="text-3xs font-bold uppercase opacity-80">{day.shortLabel}</div>
                  <div className="text-xs font-extrabold tabular mt-0.5">
                    {day.count}/{HABIT_ITEMS.length}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Habit List */}
        <div className="space-y-3">
          {HABIT_ITEMS.map((habit) => {
            const isChecked = todayCheckedList.includes(habit.key);
            return (
              <div
                key={habit.key}
                role="checkbox"
                aria-checked={isChecked}
                tabIndex={0}
                onClick={() => handleToggle(habit.key)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleToggle(habit.key);
                  }
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition duration-150 flex items-start gap-3.5 ${
                  isChecked
                    ? 'border-brand-teal bg-brand-teal-light/40 dark:bg-brand-teal/15 shadow-xs'
                    : 'border-brand-navy/15 dark:border-white/15 bg-surface dark:bg-surface-dark hover:border-brand-teal/60 hover:bg-brand-teal-soft dark:hover:bg-white/5'
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isChecked
                      ? 'bg-brand-teal text-white'
                      : 'border-2 border-brand-navy/30 dark:border-white/35 bg-white dark:bg-surface-dark'
                  }`}
                >
                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm font-bold ${
                        isChecked
                          ? 'text-brand-teal-dark dark:text-[#7FDADB]'
                          : 'text-brand-navy dark:text-white'
                      }`}
                    >
                      {isEn ? habit.titleEn : habit.titleId}
                    </h3>
                  </div>
                  <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
                    {isEn ? habit.subtitleEn : habit.subtitleId}
                  </p>
                  <p className="text-2xs leading-relaxed text-brand-teal-dark dark:text-[#7FDADB] font-semibold pt-0.5">
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
