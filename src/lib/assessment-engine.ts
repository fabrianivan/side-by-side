import {
  assessmentRulesConfig,
  type AssessmentLevelCode,
  type AssessmentRulesConfig,
} from '../config/schemas';

export type AssessmentAnswers = Record<string, string>;

export interface ContributingFactor {
  questionId: string;
  topic: string;
  factorTitle: string;
  whyRelevant: string;
}

export interface AssessmentEvaluationResult {
  levelCode: AssessmentLevelCode;
  levelLabel: string;
  badgeColor: 'success' | 'warning' | 'urgent';
  summary: string;
  nextSteps: string[];
  factors: ContributingFactor[];
  disclaimer: string;
  showEmotionalSupport: boolean;
  emotionalSupportBanner: AssessmentRulesConfig['emotionalSupportBanner'];
  evaluatedAt: string;
}

/**
 * Deteksi tanda tekanan emosional berat pada isian teks bebas sesuai syarat Keamanan & Etika.
 */
export function detectEmotionalDistress(
  freeText?: string,
  config: AssessmentRulesConfig = assessmentRulesConfig
): boolean {
  if (!freeText || !freeText.trim()) return false;
  const normalized = freeText.toLowerCase();
  return config.emotionalDistressKeywords.some((kw) => normalized.includes(kw.toLowerCase()));
}

/**
 * Mesin penilaian mandiri berbasis aturan (rule-based, mudah diaudit, tanpa klaim diagnosis).
 * Mematuhi aturan:
 * 1. Bila ada red-flag medis pada immediateTriggers atau total bobot >= 10 -> "immediate" ("Sebaiknya periksa segera")
 * 2. Bila lama program hamil > 12 bulan ATAU (> 6 bulan dan usia pasangan >= 35 tahun) ATAU bobot >= 5
 *    -> minimal "within_1_2_months" ("Sebaiknya periksa dalam 1 sampai 2 bulan"), TANPA mengungkap data pasangan di daftar faktor.
 * 3. Selain itu -> "routine" ("Pertimbangkan pemeriksaan rutin").
 */
export function evaluateAssessment(
  answers: AssessmentAnswers,
  freeTextNotes?: string,
  config: AssessmentRulesConfig = assessmentRulesConfig
): AssessmentEvaluationResult {
  let totalWeight = 0;
  let hasImmediateTrigger = false;
  let hasMandatory1To2Months = false;
  const factors: ContributingFactor[] = [];

  // 1. Hitung bobot dan kumpulkan faktor yang relevan (TANPA mengungkap data pasangan `partner_context`)
  for (const question of config.questions) {
    const selectedValue = answers[question.id];
    if (!selectedValue || selectedValue === 'unknown' || selectedValue === 'skipped') {
      continue;
    }

    const matchedOption = question.options.find((opt) => opt.value === selectedValue);
    if (!matchedOption) continue;

    // Jangan tambahkan bobot partner_context secara mandiri bila durasi < 6 bulan
    if (question.id === 'partner_context') {
      continue;
    }

    totalWeight += matchedOption.weight;

    // PRIVASI PASANGAN: Jangan pernah menampilkan partner_context di daftar faktor hasil
    if (matchedOption.factorTitle && matchedOption.whyRelevant) {
      factors.push({
        questionId: question.id,
        topic: question.topic,
        factorTitle: matchedOption.factorTitle,
        whyRelevant: matchedOption.whyRelevant,
      });
    }
  }

  // 2. Periksa Immediate Triggers (Red Flags Medis)
  for (const trigger of config.rules.immediateTriggers) {
    const val = answers[trigger.questionId];
    if (val && trigger.optionValues.includes(val)) {
      hasImmediateTrigger = true;
      break;
    }
  }

  // 3. Periksa Aturan Wajib Minimal "Periksa dalam 1 sampai 2 bulan":
  //    - Lama program hamil > 12 bulan (12_to_24_months atau over_24_months)
  //    - ATAU lama program hamil > 6 bulan (6_to_12_months ke atas) bila usia pasangan perempuan >= 35 (over_35)
  for (const rule of config.rules.within1To2MonthsMandatoryRules) {
    const allConditionsMet = Object.entries(rule.conditions).every(([qId, allowedValues]) => {
      const userAnswer = answers[qId];
      return Boolean(userAnswer && allowedValues.includes(userAnswer));
    });
    if (allConditionsMet) {
      hasMandatory1To2Months = true;
      // Bila dipicu oleh aturan waktu (>6 bulan & pasangan >=35), pastikan ada penjelasan umum tentang waktu tanpa menyebut usia pasangan
      if (
        rule.id === 'ttc_over_6_months_partner_35' &&
        !factors.some((f) => f.questionId === 'ttc_duration')
      ) {
        factors.unshift({
          questionId: 'ttc_duration',
          topic: 'Durasi Program Hamil',
          factorTitle: 'Waktu evaluasi bersama yang optimal',
          whyRelevant:
            'Berdasarkan rentang waktu program hamil saat ini, evaluasi dasar lebih awal membantu Anda dan pasangan merencanakan langkah dengan lebih tenang.',
        });
      }
    }
  }

  // 4. Tentukan Tingkat Saran Akhir
  let levelCode: AssessmentLevelCode = 'routine';

  if (hasImmediateTrigger || totalWeight >= config.rules.scoreThresholds.immediate) {
    levelCode = 'immediate';
  } else if (
    hasMandatory1To2Months ||
    totalWeight >= config.rules.scoreThresholds.within_1_2_months
  ) {
    levelCode = 'within_1_2_months';
  } else {
    levelCode = 'routine';
  }

  const levelInfo = config.levels[levelCode];
  const showEmotionalSupport =
    detectEmotionalDistress(freeTextNotes, config) ||
    answers.sleep_and_stress === 'high_stress_insomnia';

  return {
    levelCode,
    levelLabel: levelInfo.label,
    badgeColor: levelInfo.badgeColor,
    summary: levelInfo.summary,
    nextSteps: levelInfo.nextSteps,
    factors,
    disclaimer: config.disclaimer,
    showEmotionalSupport,
    emotionalSupportBanner: config.emotionalSupportBanner,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Jawaban skenario demo untuk Persona 1: Rendra (32 thn, karyawan swasta, 8 bulan promil).
 * Menghasilkan tingkat saran: "Sebaiknya periksa dalam 1 sampai 2 bulan".
 */
export const RENDRA_DEMO_ANSWERS: AssessmentAnswers = {
  ttc_duration: '6_to_12_months', // 8 bulan program hamil (bobot 2)
  partner_context: 'under_35', // Sari 30 tahun
  prior_pregnancy: 'never', // Belum pernah (bobot 1)
  reproductive_history: 'none', // Tidak ada riwayat operasi
  physical_symptoms: 'none', // Tidak ada keluhan nyeri
  smoking_habit: 'occasional_or_vape', // Kadang vape/rokok ringan (bobot 2)
  alcohol_habit: 'none',
  heat_exposure: 'moderate_laptop_sitting', // Karyawan swasta duduk lama & pangku laptop (bobot 2)
  physical_activity: 'sedentary', // Jarang olahraga (bobot 1)
  bmi_category: 'normal',
  medications_supplements: 'none_or_vitamins',
  sleep_and_stress: 'moderate_stress_lack_sleep', // Kadang tidur < 6 jam karena kerja (bobot 1)
};
