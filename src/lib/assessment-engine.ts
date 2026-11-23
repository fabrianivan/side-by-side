import {
  assessmentRulesConfig,
  getLocalizedAssessmentConfig,
  type AssessmentLevelCode,
  type AssessmentRulesConfig,
} from '../config/schemas';
import { ASSESSMENT_RULES_EN, EN_DISTRESS_KEYWORDS } from '../config/localization-en';

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
  return (
    config.emotionalDistressKeywords.some((kw) => normalized.includes(kw.toLowerCase())) ||
    EN_DISTRESS_KEYWORDS.some((kw) => normalized.includes(kw))
  );
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
  config: AssessmentRulesConfig = assessmentRulesConfig,
  locale: 'id' | 'en' = 'id',
): AssessmentEvaluationResult {
  const effectiveConfig =
    locale === 'en' && config === assessmentRulesConfig
      ? getLocalizedAssessmentConfig('en')
      : config;
  let totalWeight = 0;
  let hasImmediateTrigger = false;
  let hasMandatory1To2Months = false;
  const factors: ContributingFactor[] = [];

  // 1. Hitung bobot dan kumpulkan faktor yang relevan (TANPA mengungkap data pasangan `partner_context`)
  for (const question of effectiveConfig.questions) {
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
  for (const trigger of effectiveConfig.rules.immediateTriggers) {
    const val = answers[trigger.questionId];
    if (val && trigger.optionValues.includes(val)) {
      hasImmediateTrigger = true;
      break;
    }
  }

  // 3. Periksa Aturan Wajib Minimal "Periksa dalam 1 sampai 2 bulan":
  //    - Lama program hamil > 12 bulan (12_to_24_months atau over_24_months)
  //    - ATAU lama program hamil > 6 bulan (6_to_12_months ke atas) bila usia pasangan perempuan >= 35 (over_35)
  for (const rule of effectiveConfig.rules.within1To2MonthsMandatoryRules) {
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
        factors.unshift(
          locale === 'en'
            ? {
                questionId: 'ttc_duration',
                topic: ASSESSMENT_RULES_EN.ttc6MoFactor.topic,
                factorTitle: ASSESSMENT_RULES_EN.ttc6MoFactor.factorTitle,
                whyRelevant: ASSESSMENT_RULES_EN.ttc6MoFactor.whyRelevant,
              }
            : {
                questionId: 'ttc_duration',
                topic: 'Durasi Program Hamil',
                factorTitle: 'Waktu evaluasi bersama yang optimal',
                whyRelevant:
                  'Berdasarkan rentang waktu program hamil saat ini, evaluasi dasar lebih awal membantu Anda dan pasangan merencanakan langkah dengan lebih tenang.',
              },
        );
      }
    }
  }

  // 4. Tentukan Tingkat Saran Akhir
  let levelCode: AssessmentLevelCode = 'routine';

  if (hasImmediateTrigger || totalWeight >= effectiveConfig.rules.scoreThresholds.immediate) {
    levelCode = 'immediate';
  } else if (
    hasMandatory1To2Months ||
    totalWeight >= effectiveConfig.rules.scoreThresholds.within_1_2_months
  ) {
    levelCode = 'within_1_2_months';
  } else {
    levelCode = 'routine';
  }

  const levelInfo = effectiveConfig.levels[levelCode];
  const showEmotionalSupport =
    detectEmotionalDistress(freeTextNotes, effectiveConfig) ||
    answers.sleep_and_stress === 'high_stress_insomnia';

  return {
    levelCode,
    levelLabel: levelInfo.label,
    badgeColor: levelInfo.badgeColor,
    summary: levelInfo.summary,
    nextSteps: levelInfo.nextSteps,
    factors,
    disclaimer: effectiveConfig.disclaimer,
    showEmotionalSupport,
    emotionalSupportBanner: effectiveConfig.emotionalSupportBanner,
    evaluatedAt: new Date().toISOString(),
  };
}
