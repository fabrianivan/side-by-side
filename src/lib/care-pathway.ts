/**
 * Jalur Rujukan Spesialis Terhubung (Connected Specialist Referral Pathway).
 *
 * Satu alur berkesinambungan: Cek Awal → spesialis yang tepat → pilih layanan →
 * jadwal & persiapan → konsultasi → rencana perawatan pasca-konsultasi.
 * Mendukung jalur JKN berjenjang (FKTP → rujukan → FKRTL) maupun jalur mandiri/swasta.
 *
 * Tidak ada diagnosis atau saran obat. Rekomendasi hanya menunjukkan JENIS tenaga kesehatan
 * yang paling relevan untuk ditemui berdasarkan jawaban, beserta alasannya dalam bahasa awam.
 */
import type { AssessmentLevelCode } from '../config/schemas';
import type { AssessmentAnswers } from './assessment-engine';

type Locale = 'id' | 'en';
interface Bi {
  id: string;
  en: string;
}
const pick = (t: Bi, locale: Locale) => (locale === 'en' ? t.en : t.id);

export type SpecialistKey = 'gp' | 'andrology' | 'urology' | 'lab' | 'fertility_clinic' | 'counselling';
export type FacilityServiceTag = 'Andrologi' | 'Urologi' | 'Laboratorium';

export interface SpecialistDef {
  key: SpecialistKey;
  name: Bi;
  shortName: Bi;
  whatTheyDo: Bi;
  serviceTag: FacilityServiceTag | null;
}

export const SPECIALISTS: Record<SpecialistKey, SpecialistDef> = {
  gp: {
    key: 'gp',
    name: { id: 'Dokter umum di Puskesmas / klinik pratama (FKTP)', en: 'GP at a Puskesmas or primary clinic (FKTP)' },
    shortName: { id: 'Dokter umum (FKTP)', en: 'GP (primary care)' },
    whatTheyDo: {
      id: 'Pemeriksaan awal, permintaan analisis semen dasar, dan surat rujukan JKN bila perlu ke spesialis.',
      en: 'A first check, a basic semen analysis request, and a JKN referral to a specialist if needed.',
    },
    serviceTag: null,
  },
  andrology: {
    key: 'andrology',
    name: { id: 'Dokter Spesialis Andrologi (Sp.And)', en: 'Andrologist (Sp.And) — male fertility specialist' },
    shortName: { id: 'Spesialis Andrologi', en: 'Andrologist' },
    whatTheyDo: {
      id: 'Evaluasi kesuburan pria menyeluruh: wawancara, pemeriksaan fisik, analisis semen, dan tes hormon bila perlu.',
      en: 'A full male-fertility evaluation: history, physical exam, semen analysis and hormone tests if needed.',
    },
    serviceTag: 'Andrologi',
  },
  urology: {
    key: 'urology',
    name: { id: 'Dokter Spesialis Urologi (Sp.U)', en: 'Urologist (Sp.U)' },
    shortName: { id: 'Spesialis Urologi', en: 'Urologist' },
    whatTheyDo: {
      id: 'Menangani kondisi fisik di saluran kemih dan reproduksi, seperti varikokel, benjolan, nyeri, atau riwayat operasi.',
      en: 'Treats physical conditions of the urinary and reproductive tract, such as varicocele, lumps, pain or past surgery.',
    },
    serviceTag: 'Urologi',
  },
  lab: {
    key: 'lab',
    name: { id: 'Laboratorium analisis semen', en: 'Semen analysis laboratory' },
    shortName: { id: 'Lab analisis semen', en: 'Semen analysis lab' },
    whatTheyDo: {
      id: 'Memeriksa sampel semen sesuai standar WHO 2021. Banyak laboratorium menerima pemeriksaan ini tanpa rujukan dokter.',
      en: 'Tests a semen sample to WHO 2021 standards. Many labs accept this test without a doctor’s referral.',
    },
    serviceTag: 'Laboratorium',
  },
  fertility_clinic: {
    key: 'fertility_clinic',
    name: { id: 'Klinik fertilitas pasangan (andrologi + Sp.OG)', en: 'Couples fertility clinic (andrology + OB-GYN)' },
    shortName: { id: 'Klinik fertilitas', en: 'Fertility clinic' },
    whatTheyDo: {
      id: 'Mengevaluasi kedua pasangan secara paralel sehingga tidak ada yang menunggu giliran.',
      en: 'Evaluates both partners in parallel so neither has to wait for the other.',
    },
    serviceTag: 'Andrologi',
  },
  counselling: {
    key: 'counselling',
    name: { id: 'Psikolog atau konselor', en: 'Psychologist or counsellor' },
    shortName: { id: 'Konselor', en: 'Counsellor' },
    whatTheyDo: {
      id: 'Dukungan untuk stres, kecemasan, dan komunikasi pasangan selama program hamil.',
      en: 'Support for stress, anxiety and couple communication while trying to conceive.',
    },
    serviceTag: null,
  },
};

export type FirstTestKey = 'semen_analysis' | 'physical_exam' | 'scrotal_ultrasound' | 'hormone_panel';
export const FIRST_TESTS: Record<FirstTestKey, Bi> = {
  semen_analysis: { id: 'Analisis semen (pantang 2–7 hari sebelumnya)', en: 'Semen analysis (2–7 days abstinence beforehand)' },
  physical_exam: { id: 'Pemeriksaan fisik oleh dokter', en: 'Physical examination by the doctor' },
  scrotal_ultrasound: { id: 'Kemungkinan USG skrotum', en: 'Possibly a scrotal ultrasound' },
  hormone_panel: { id: 'Kemungkinan tes hormon darah', en: 'Possibly a hormone blood test' },
};

export interface SpecialistRecommendation {
  primary: SpecialistKey;
  supporting: SpecialistKey[];
  reasons: string[];
  firstTests: FirstTestKey[];
  timeframe: string;
  emergencyNote?: string;
}

const TIMEFRAMES: Record<AssessmentLevelCode, Bi> = {
  immediate: {
    id: 'Sesegera mungkin—idealnya dalam beberapa minggu ke depan.',
    en: 'As soon as you can—ideally within the next few weeks.',
  },
  within_1_2_months: { id: 'Dalam 1 sampai 2 bulan ke depan.', en: 'Within the next 1 to 2 months.' },
  routine: {
    id: 'Kapan pun Anda siap—pemeriksaan dasar bermanfaat sebagai titik awal.',
    en: 'Whenever you feel ready—a baseline check is a useful starting point.',
  },
};

/** Memilih jenis tenaga kesehatan yang paling relevan berdasarkan jawaban Cek Awal. */
export function recommendSpecialist(
  answers: AssessmentAnswers,
  levelCode: AssessmentLevelCode,
  locale: Locale,
): SpecialistRecommendation {
  const r: Array<Bi> = [];
  let primary: SpecialistKey;
  const supporting = new Set<SpecialistKey>();
  const tests = new Set<FirstTestKey>(['semen_analysis']);

  const ttcLong = ['12_to_24_months', 'over_24_months'].includes(answers.ttc_duration);
  const sharedTimelineRule =
    ['6_to_12_months', '12_to_24_months', 'over_24_months'].includes(answers.ttc_duration) &&
    answers.partner_context === 'over_35';

  if (answers.physical_symptoms === 'frequent_pain_or_swelling') {
    primary = 'urology';
    tests.add('physical_exam');
    tests.add('scrotal_ultrasound');
    r.push({
      id: 'Anda melaporkan nyeri, benjolan, atau bengkak. Dokter urologi memeriksa perubahan fisik di testis dan lipat paha secara langsung.',
      en: 'You reported pain, a lump or swelling. A urologist examines physical changes in the testicles and groin directly.',
    });
  } else if (answers.reproductive_history === 'undescended_testis_or_surgery') {
    primary = 'urology';
    tests.add('physical_exam');
    r.push({
      id: 'Riwayat testis tidak turun atau operasi testis paling tepat ditinjau oleh dokter urologi.',
      en: 'A history of an undescended testicle or testicular surgery is best reviewed by a urologist.',
    });
  } else if (answers.reproductive_history === 'varicocele_or_infection') {
    primary = 'andrology';
    supporting.add('urology');
    tests.add('physical_exam');
    r.push({
      id: 'Varikokel atau riwayat infeksi umumnya dievaluasi oleh dokter andrologi; dokter urologi dilibatkan bila tindakan dipertimbangkan.',
      en: 'Varicocele or past infections are usually evaluated by an andrologist, with a urologist involved if a procedure is considered.',
    });
  } else if (answers.medications_supplements === 'testosterone_or_steroids') {
    primary = 'andrology';
    tests.add('hormone_panel');
    r.push({
      id: 'Testosteron atau steroid dari luar dapat menghentikan sementara produksi sperma. Dokter andrologi dapat menyusun rencana yang aman.',
      en: 'Testosterone or steroids taken from outside can pause sperm production. An andrologist can plan a safe way forward.',
    });
  } else if (ttcLong || sharedTimelineRule) {
    primary = 'andrology';
    supporting.add('fertility_clinic');
    supporting.add('lab');
    r.push(
      ttcLong
        ? {
            id: 'Setelah 12 bulan atau lebih mencoba, spesialis kesuburan pria dapat melakukan evaluasi lengkap sementara pasangan diperiksa secara paralel.',
            en: 'After 12 months or more of trying, a male-fertility specialist can do a full evaluation while your partner is checked in parallel.',
          }
        : {
            id: 'Rentang waktu program hamil bersama menyarankan evaluasi lebih awal oleh spesialis kesuburan pria, paralel dengan pasangan.',
            en: 'Your shared timeline suggests an earlier evaluation by a male-fertility specialist, in parallel with your partner.',
          },
    );
  } else if (levelCode === 'routine') {
    primary = 'gp';
    supporting.add('lab');
    r.push({
      id: 'Tidak ada tanda yang mendesak. Bila ingin titik awal, dokter umum atau analisis semen di laboratorium adalah langkah sederhana.',
      en: 'No urgent signs. If you would like a baseline, a GP or a lab semen analysis is a simple start.',
    });
  } else {
    primary = 'gp';
    supporting.add('lab');
    supporting.add('andrology');
    r.push({
      id: 'Hasil Anda berasal dari gabungan faktor sehari-hari. Dokter umum dapat memulai dengan analisis semen dasar dan merujuk bila perlu—ini juga pintu masuk jalur JKN.',
      en: 'Your result comes from several everyday factors combined. A GP can start with a basic semen analysis and refer you if needed—this is also the JKN entry point.',
    });
  }

  if (answers.medications_supplements === 'testosterone_or_steroids' && primary !== 'andrology') {
    supporting.add('andrology');
    tests.add('hormone_panel');
  }
  if (answers.reproductive_history === 'hernia_or_minor') {
    supporting.add('urology');
    r.push({
      id: 'Riwayat tindakan di lipat paha dapat ikut ditinjau oleh dokter urologi bila dokter pertama menganggap perlu.',
      en: 'Your groin procedure history can also be reviewed by a urologist if the first doctor thinks it is needed.',
    });
  }
  if ((ttcLong || sharedTimelineRule) && primary !== 'andrology') supporting.add('fertility_clinic');
  if (answers.sleep_and_stress === 'high_stress_insomnia') {
    supporting.add('counselling');
    r.push({
      id: 'Stres berat dan sulit tidur layak mendapat dukungan tersendiri—konseling dapat membantu Anda berdua.',
      en: 'Heavy stress and poor sleep deserve support of their own—counselling can help you both.',
    });
  }
  supporting.delete(primary);

  return {
    primary,
    supporting: Array.from(supporting),
    reasons: r.map((x) => pick(x, locale)),
    firstTests: Array.from(tests),
    timeframe: pick(TIMEFRAMES[levelCode], locale),
    emergencyNote:
      answers.physical_symptoms === 'frequent_pain_or_swelling'
        ? pick(
            {
              id: 'Nyeri hebat yang muncul tiba-tiba di testis adalah kondisi darurat—langsung ke IGD, jangan menunggu jadwal.',
              en: 'Sudden, severe testicular pain is an emergency—go straight to the emergency department, do not wait for an appointment.',
            },
            locale,
          )
        : undefined,
  };
}

export type CareRoute = 'jkn' | 'private';

export function getRouteSteps(route: CareRoute, specialist: SpecialistKey, locale: Locale): string[] {
  const sp = pick(SPECIALISTS[specialist].shortName, locale);
  if (route === 'jkn') {
    const steps: Bi[] = [
      {
        id: 'Datangi FKTP tempat Anda terdaftar (Puskesmas atau klinik pratama) dengan KTP dan kartu JKN.',
        en: 'Visit the FKTP where you are registered (Puskesmas or primary clinic) with your KTP and JKN card.',
      },
      specialist === 'gp'
        ? {
            id: 'Tunjukkan Ringkasan Rujukan dari aplikasi ini kepada dokter umum dan diskusikan pemeriksaan dasar.',
            en: 'Show the Referral Summary from this app to the GP and discuss a basic check-up.',
          }
        : {
            id: `Tunjukkan Ringkasan Rujukan kepada dokter umum dan minta surat rujukan ke ${sp}.`,
            en: `Show the Referral Summary to the GP and ask for a referral letter to a ${sp}.`,
          },
      {
        id: 'Daftar di rumah sakit yang tertera di surat rujukan. Surat rujukan FKTP umumnya berlaku 90 hari.',
        en: 'Register at the hospital named on the referral. FKTP referral letters are usually valid for 90 days.',
      },
      {
        id: 'Catatan: JKN umumnya tidak menanggung layanan khusus kesuburan, tetapi pemeriksaan untuk keluhan medis (nyeri, bengkak, varikokel) dapat melalui jalur ini. Pastikan cakupan di fasilitas.',
        en: 'Note: JKN generally does not cover fertility-specific services, but examinations for medical complaints (pain, swelling, varicocele) can follow this route. Confirm coverage at the facility.',
      },
    ];
    return steps.map((s) => pick(s, locale));
  }
  const steps: Bi[] = [
    {
      id: `Pilih klinik atau rumah sakit dengan layanan ${sp} di bawah ini.`,
      en: `Choose a clinic or hospital offering a ${sp} below.`,
    },
    {
      id: 'Hubungi untuk membuat janji. Tanyakan estimasi biaya dan, untuk analisis semen, instruksi masa pantang (umumnya 2–7 hari).',
      en: 'Call or message to book. Ask about the cost and, for a semen analysis, the abstinence instructions (usually 2–7 days).',
    },
    {
      id: 'Bawa Ringkasan Rujukan dan daftar pertanyaan Anda, atau bagikan lewat QR 1 jam saat konsultasi.',
      en: 'Bring your Referral Summary and question list, or share them by 1-hour QR during the visit.',
    },
  ];
  if (specialist === 'lab' || specialist === 'gp') {
    steps.splice(1, 0, {
      id: 'Banyak laboratorium menerima analisis semen tanpa rujukan dokter—cara cepat untuk mendapat data awal.',
      en: 'Many labs accept a semen analysis without a doctor’s referral—a quick way to get a baseline.',
    });
  }
  return steps.map((s) => pick(s, locale));
}

/* ------------------------------------------------------------------ */
/* Status jalur & data pathway                                         */
/* ------------------------------------------------------------------ */

export type PathwayStageKey = 'self_check' | 'match' | 'choose_care' | 'book_prepare' | 'consult' | 'after_care';

export const PATHWAY_STAGES: Array<{ key: PathwayStageKey; title: Bi; description: Bi }> = [
  {
    key: 'self_check',
    title: { id: 'Cek Awal', en: 'Self-check' },
    description: { id: 'Pahami hasil Anda dengan bahasa sederhana.', en: 'Understand your result in plain words.' },
  },
  {
    key: 'match',
    title: { id: 'Siapa yang ditemui', en: 'Who to see' },
    description: { id: 'Jenis dokter yang paling tepat dan alasannya.', en: 'The right type of doctor and why.' },
  },
  {
    key: 'choose_care',
    title: { id: 'Pilih layanan', en: 'Choose care' },
    description: { id: 'Fasilitas yang sesuai, jalur JKN atau mandiri.', en: 'A matching facility, JKN or private route.' },
  },
  {
    key: 'book_prepare',
    title: { id: 'Jadwal & persiapan', en: 'Book & prepare' },
    description: { id: 'Tanggal kunjungan, persiapan, dan ringkasan untuk dokter.', en: 'Visit date, preparation, and a summary for the doctor.' },
  },
  {
    key: 'consult',
    title: { id: 'Konsultasi', en: 'Consultation' },
    description: { id: 'Catat hasil kunjungan atau terima rencana dari dokter.', en: 'Log the visit or receive your doctor’s plan.' },
  },
  {
    key: 'after_care',
    title: { id: 'Perawatan lanjutan', en: 'After-care' },
    description: { id: 'Tes lanjutan, kebiasaan, dan kontrol berikutnya.', en: 'Follow-up tests, habits, and the next visit.' },
  },
];

export type ConsultOutcomeKey =
  | 'physical_exam'
  | 'semen_analysis_ordered'
  | 'hormone_test_ordered'
  | 'ultrasound_ordered'
  | 'partner_evaluation'
  | 'referred_specialist'
  | 'lifestyle_advice'
  | 'follow_up_scheduled';

export const CONSULT_OUTCOMES: Record<ConsultOutcomeKey, Bi> = {
  physical_exam: { id: 'Pemeriksaan fisik', en: 'Physical examination' },
  semen_analysis_ordered: { id: 'Analisis semen diminta', en: 'Semen analysis requested' },
  hormone_test_ordered: { id: 'Tes hormon darah diminta', en: 'Hormone blood test requested' },
  ultrasound_ordered: { id: 'USG skrotum diminta', en: 'Scrotal ultrasound requested' },
  partner_evaluation: { id: 'Pasangan disarankan ikut diperiksa', en: 'Partner evaluation advised' },
  referred_specialist: { id: 'Dirujuk ke spesialis lain', en: 'Referred to another specialist' },
  lifestyle_advice: { id: 'Saran perubahan gaya hidup', en: 'Lifestyle changes advised' },
  follow_up_scheduled: { id: 'Kontrol lanjutan dijadwalkan', en: 'Follow-up visit scheduled' },
};

export type OrderedTestKey =
  | 'repeat_semen_analysis'
  | 'hormone_panel'
  | 'scrotal_ultrasound'
  | 'infection_screening'
  | 'genetic_testing'
  | 'partner_evaluation';

export const ORDERED_TESTS: Record<OrderedTestKey, Bi> = {
  repeat_semen_analysis: { id: 'Analisis semen ulang', en: 'Repeat semen analysis' },
  hormone_panel: { id: 'Panel hormon (FSH, LH, testosteron)', en: 'Hormone panel (FSH, LH, testosterone)' },
  scrotal_ultrasound: { id: 'USG skrotum', en: 'Scrotal ultrasound' },
  infection_screening: { id: 'Skrining infeksi', en: 'Infection screening' },
  genetic_testing: { id: 'Pemeriksaan genetik', en: 'Genetic testing' },
  partner_evaluation: { id: 'Evaluasi kesuburan pasangan', en: 'Partner fertility evaluation' },
};

export type LifestyleFocusKey = 'smoking' | 'alcohol' | 'heat' | 'activity' | 'weight' | 'sleep_stress';

export const LIFESTYLE_FOCUS: Record<LifestyleFocusKey, Bi> = {
  smoking: { id: 'berhenti merokok/vape', en: 'stopping smoking/vaping' },
  alcohol: { id: 'mengurangi alkohol', en: 'cutting down alcohol' },
  heat: { id: 'menghindari panas berlebih', en: 'avoiding excess heat' },
  activity: { id: 'aktivitas fisik teratur', en: 'regular physical activity' },
  weight: { id: 'berat badan sehat', en: 'a healthy weight' },
  sleep_stress: { id: 'tidur cukup & kelola stres', en: 'sleep and stress' },
};

const QUESTION_TO_FOCUS: Record<string, LifestyleFocusKey> = {
  smoking_habit: 'smoking',
  alcohol_habit: 'alcohol',
  heat_exposure: 'heat',
  physical_activity: 'activity',
  bmi_category: 'weight',
  sleep_and_stress: 'sleep_stress',
};

const BEST_LIFESTYLE_VALUES = new Set([
  'never_or_quit',
  'none',
  'social_occasional',
  'rarely',
  'active_moderate',
  'normal',
  'good_rest',
  'unknown',
  'skipped',
]);

export function lifestyleFocusFromAnswers(answers: AssessmentAnswers): LifestyleFocusKey[] {
  return Object.entries(QUESTION_TO_FOCUS)
    .filter(([qId]) => answers[qId] && !BEST_LIFESTYLE_VALUES.has(answers[qId]))
    .map(([, focus]) => focus);
}

export type CarePlanKey =
  | 'do_semen_analysis'
  | 'repeat_semen_analysis'
  | 'hormone_panel'
  | 'scrotal_ultrasound'
  | 'infection_screening'
  | 'genetic_testing'
  | 'partner_evaluation'
  | 'enter_results'
  | 'habit_plan'
  | 'follow_up_visit'
  | 'monthly_checkin'
  | 'retake_self_check'
  | 'specialist_referral';

export interface CarePlanItem {
  id: string;
  key?: CarePlanKey;
  focus?: LifestyleFocusKey[];
  specialist?: SpecialistKey;
  title?: string;
  dueDate?: string;
  done: boolean;
  doneAt?: string;
  source: 'suggested' | 'clinician' | 'self';
}

export interface ConsultationLog {
  id: string;
  date: string;
  clinicianType: SpecialistKey;
  facilityName?: string;
  clinicianName?: string;
  outcomes: ConsultOutcomeKey[];
  orderedTests?: OrderedTestKey[];
  lifestyleFocus?: LifestyleFocusKey[];
  referralTo?: SpecialistKey;
  advice?: string;
  nextVisitDate?: string;
  source: 'self' | 'clinician';
}

export interface CarePathwayState {
  specialistKey?: SpecialistKey;
  route?: CareRoute;
  facility?: { id: string; name: string; city?: string; type?: string; acceptsJkn?: boolean };
  appointmentAt?: string;
  prepDone: Record<string, boolean>;
  consultations: ConsultationLog[];
  carePlan: CarePlanItem[];
  importedPlanIds: string[];
}

export function createEmptyCarePathway(): CarePathwayState {
  return { prepDone: {}, consultations: [], carePlan: [], importedPlanIds: [] };
}

export type StageStatus = 'done' | 'current' | 'upcoming';

export function computePathwayStages(
  pathway: CarePathwayState,
  hasAssessment: boolean,
): Array<{ key: PathwayStageKey; status: StageStatus }> {
  const doneMap: Record<PathwayStageKey, boolean> = {
    self_check: hasAssessment,
    match: Boolean(pathway.specialistKey),
    choose_care: Boolean(pathway.facility),
    book_prepare: Boolean(pathway.appointmentAt),
    consult: pathway.consultations.length > 0,
    after_care: pathway.carePlan.length > 0 && pathway.carePlan.every((i) => i.done),
  };
  let currentAssigned = false;
  return PATHWAY_STAGES.map(({ key }) => {
    if (doneMap[key]) return { key, status: 'done' as const };
    if (!currentAssigned) {
      currentAssigned = true;
      return { key, status: 'current' as const };
    }
    return { key, status: 'upcoming' as const };
  });
}

const PLAN_TITLES: Record<CarePlanKey, Bi> = {
  do_semen_analysis: { id: 'Lakukan analisis semen (pantang 2–7 hari sebelumnya)', en: 'Do the semen analysis (2–7 days abstinence beforehand)' },
  repeat_semen_analysis: {
    id: 'Analisis semen ulang setelah satu siklus sperma (±3 bulan)',
    en: 'Repeat the semen analysis after one sperm cycle (~3 months)',
  },
  hormone_panel: { id: 'Lakukan tes hormon darah yang diminta dokter', en: 'Do the hormone blood test your doctor requested' },
  scrotal_ultrasound: { id: 'Lakukan USG skrotum yang diminta dokter', en: 'Do the scrotal ultrasound your doctor requested' },
  infection_screening: { id: 'Lakukan skrining infeksi yang diminta dokter', en: 'Do the infection screening your doctor requested' },
  genetic_testing: { id: 'Diskusikan jadwal pemeriksaan genetik', en: 'Arrange the genetic testing discussed' },
  partner_evaluation: { id: 'Pasangan menjadwalkan evaluasi kesuburannya sendiri', en: 'Partner books her own fertility evaluation' },
  enter_results: { id: 'Masukkan hasil lab ke Hasil Saya untuk dipantau', en: 'Enter lab results in My Results to track them' },
  habit_plan: { id: 'Ikuti rencana kebiasaan 74 hari', en: 'Follow the 74-day habit plan' },
  follow_up_visit: { id: 'Kunjungan kontrol berikutnya', en: 'Next follow-up visit' },
  monthly_checkin: { id: 'Isi check-in kesehatan bulanan', en: 'Do a monthly health check-in' },
  retake_self_check: { id: 'Ulangi Cek Awal untuk melihat perubahan', en: 'Re-take the self-check to see what changed' },
  specialist_referral: { id: 'Jadwalkan rujukan ke spesialis', en: 'Book the specialist referral' },
};

export function describePlanItem(item: CarePlanItem, locale: Locale): string {
  if (!item.key) return item.title || '';
  const base = pick(PLAN_TITLES[item.key], locale);
  if (item.key === 'habit_plan' && item.focus && item.focus.length > 0) {
    const list = item.focus.map((f) => pick(LIFESTYLE_FOCUS[f], locale)).join(', ');
    return `${base}: ${list}`;
  }
  if (item.key === 'specialist_referral' && item.specialist) {
    return `${base}: ${pick(SPECIALISTS[item.specialist].shortName, locale)}`;
  }
  return base;
}

function addDays(base: string, days: number): string {
  // Aritmetika kalender murni (UTC) agar tidak bergeser satu hari di zona waktu WIB/WITA/WIT.
  const d = new Date(`${base.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tanggal lokal perangkat (YYYY-MM-DD), bukan tanggal UTC. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Nilai untuk <input type="datetime-local"> dalam waktu lokal perangkat. */
export function localDateTimeString(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${localDateString(date)}T${hh}:${mm}`;
}

let planIdCounter = 0;
function planId(prefix: string): string {
  planIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${planIdCounter}`;
}

/** Menyusun saran rencana perawatan pasca-konsultasi dari hasil kunjungan. */
export function buildSuggestedCarePlan(
  consult: Pick<ConsultationLog, 'date' | 'outcomes' | 'orderedTests' | 'lifestyleFocus' | 'referralTo' | 'nextVisitDate'>,
  fallbackFocus: LifestyleFocusKey[],
  source: CarePlanItem['source'] = 'suggested',
): CarePlanItem[] {
  const base = consult.date || localDateString();
  const items: CarePlanItem[] = [];
  const add = (key: CarePlanKey, dueInDays?: number, extra: Partial<CarePlanItem> = {}) =>
    items.push({
      id: planId('plan'),
      key,
      dueDate: dueInDays !== undefined ? addDays(base, dueInDays) : undefined,
      done: false,
      source,
      ...extra,
    });

  const tests = new Set<OrderedTestKey>(consult.orderedTests || []);
  if (consult.outcomes.includes('semen_analysis_ordered') && !tests.has('repeat_semen_analysis')) add('do_semen_analysis', 14);
  if (tests.has('repeat_semen_analysis')) add('repeat_semen_analysis', 90);
  if (consult.outcomes.includes('hormone_test_ordered') || tests.has('hormone_panel')) add('hormone_panel', 14);
  if (consult.outcomes.includes('ultrasound_ordered') || tests.has('scrotal_ultrasound')) add('scrotal_ultrasound', 14);
  if (tests.has('infection_screening')) add('infection_screening', 14);
  if (tests.has('genetic_testing')) add('genetic_testing', 30);
  if (consult.outcomes.includes('partner_evaluation') || tests.has('partner_evaluation')) add('partner_evaluation', 30);
  if (consult.referralTo) add('specialist_referral', 14, { specialist: consult.referralTo });
  // Langkah umum dari aplikasi tetap berlabel "suggested" walau rencana berasal dari dokter (tidak diatribusikan ke dokter).
  if (items.some((i) => ['do_semen_analysis', 'repeat_semen_analysis', 'hormone_panel'].includes(i.key || ''))) {
    add('enter_results', 21, { source: 'suggested' });
  }
  const focus = consult.lifestyleFocus && consult.lifestyleFocus.length > 0 ? consult.lifestyleFocus : fallbackFocus;
  if (focus.length > 0 || consult.outcomes.includes('lifestyle_advice')) {
    add('habit_plan', 74, { focus });
  }
  if (consult.nextVisitDate) {
    items.push({ id: planId('plan'), key: 'follow_up_visit', dueDate: consult.nextVisitDate, done: false, source });
  }
  add('monthly_checkin', 30, { source: 'suggested' });
  add('retake_self_check', 90, { source: 'suggested' });
  return items;
}

/** Menggabungkan item rencana tanpa menduplikasi langkah yang masih terbuka. */
export function mergeCarePlanItems(existing: CarePlanItem[], incoming: CarePlanItem[]): CarePlanItem[] {
  const openKeys = new Set(
    existing
      .filter((i) => !i.done && i.key)
      .map((i) => `${i.key}|${i.specialist || ''}|${i.key === 'follow_up_visit' ? i.dueDate : ''}`),
  );
  const merged = [...existing];
  for (const item of incoming) {
    const sig = `${item.key}|${item.specialist || ''}|${item.key === 'follow_up_visit' ? item.dueDate : ''}`;
    if (item.key && openKeys.has(sig)) {
      // Rencana dari dokter memperbarui item yang sama (mis. fokus kebiasaan)
      if (item.source === 'clinician') {
        const idx = merged.findIndex(
          (m) => !m.done && `${m.key}|${m.specialist || ''}|${m.key === 'follow_up_visit' ? m.dueDate : ''}` === sig,
        );
        if (idx >= 0) merged[idx] = { ...merged[idx], focus: item.focus ?? merged[idx].focus, source: 'clinician' };
      }
      continue;
    }
    openKeys.add(sig);
    merged.push(item);
  }
  return merged;
}

export interface ClinicianCarePlan {
  tokenCode: string;
  writtenAt: string;
  clinicianName: string;
  specialty: SpecialistKey;
  visitDate: string;
  summaryForPatient: string;
  orderedTests: OrderedTestKey[];
  lifestyleFocus: LifestyleFocusKey[];
  referralTo?: SpecialistKey;
  nextFollowUpDate?: string;
}

/** Mengimpor rencana pasca-konsultasi yang ditulis dokter (via QR) ke jalur pasien. */
export function importClinicianPlans(
  pathway: CarePathwayState,
  plans: ClinicianCarePlan[],
): { pathway: CarePathwayState; importedCount: number } {
  let next = { ...pathway };
  let importedCount = 0;
  for (const plan of plans) {
    const planKey = `${plan.tokenCode}@${plan.writtenAt}`;
    if (next.importedPlanIds.includes(planKey)) continue;
    const outcomes: ConsultOutcomeKey[] = [];
    if (plan.orderedTests.includes('repeat_semen_analysis')) outcomes.push('semen_analysis_ordered');
    if (plan.orderedTests.includes('hormone_panel')) outcomes.push('hormone_test_ordered');
    if (plan.orderedTests.includes('scrotal_ultrasound')) outcomes.push('ultrasound_ordered');
    if (plan.orderedTests.includes('partner_evaluation')) outcomes.push('partner_evaluation');
    if (plan.referralTo) outcomes.push('referred_specialist');
    if (plan.lifestyleFocus.length > 0) outcomes.push('lifestyle_advice');
    if (plan.nextFollowUpDate) outcomes.push('follow_up_scheduled');

    const consult: ConsultationLog = {
      id: `cp-${plan.tokenCode}-${new Date(plan.writtenAt).getTime() || 0}`,
      date: plan.visitDate,
      clinicianType: plan.specialty,
      clinicianName: plan.clinicianName,
      outcomes,
      orderedTests: plan.orderedTests,
      lifestyleFocus: plan.lifestyleFocus,
      referralTo: plan.referralTo,
      advice: plan.summaryForPatient,
      nextVisitDate: plan.nextFollowUpDate,
      source: 'clinician',
    };
    const items = buildSuggestedCarePlan(consult, [], 'clinician');
    next = {
      ...next,
      consultations: [...next.consultations, consult].sort((a, b) => a.date.localeCompare(b.date)),
      carePlan: mergeCarePlanItems(next.carePlan, items),
      importedPlanIds: [...next.importedPlanIds, planKey],
    };
    importedCount += 1;
  }
  return { pathway: next, importedCount };
}

export const PREP_ITEMS: Array<{ key: string; label: Bi; onlyIfSemen?: boolean }> = [
  {
    key: 'abstinence',
    label: {
      id: 'Atur masa pantang 2–7 hari sebelum analisis semen',
      en: 'Plan 2–7 days of abstinence before the semen analysis',
    },
    onlyIfSemen: true,
  },
  {
    key: 'documents',
    label: {
      id: 'Siapkan KTP, kartu JKN/asuransi, dan surat rujukan (bila jalur JKN)',
      en: 'Bring your KTP, JKN/insurance card, and referral letter (for the JKN route)',
    },
  },
  {
    key: 'questions',
    label: { id: 'Susun daftar pertanyaan untuk dokter', en: 'Prepare your list of questions for the doctor' },
  },
  {
    key: 'summary',
    label: {
      id: 'Siapkan Ringkasan Rujukan (cetak atau QR 1 jam)',
      en: 'Have your Referral Summary ready (printed or 1-hour QR)',
    },
  },
  {
    key: 'partner',
    label: { id: 'Ceritakan rencana kunjungan kepada pasangan', en: 'Tell your partner about the visit plan' },
  },
];
