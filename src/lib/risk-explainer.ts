/**
 * Penjelas risiko berbahasa awam (Explainable Risk Breakdown).
 *
 * Mengubah jawaban Cek Awal menjadi penjelasan yang bisa dipahami tanpa angka skor:
 *  - MENGAPA tingkat saran ini muncul (alasan penentu vs. gabungan faktor kecil)
 *  - SEBERAPA BESAR pengaruh tiap faktor (kecil / sedang / besar — bukan angka)
 *  - APA yang bisa diubah sendiri vs. yang perlu dokter vs. yang bergantung waktu
 *  - APA yang sudah berjalan baik, dan APA yang bisa mengubah hasil berikutnya
 *
 * Turns self-check answers into a plain-language breakdown with no numeric score.
 * Partner privacy: `partner_context` is NEVER surfaced in any output string.
 */
import {
  assessmentRulesConfig,
  getLocalizedAssessmentConfig,
  type AssessmentLevelCode,
  type AssessmentRulesConfig,
} from '../config/schemas';
import {
  QUESTION_EXPLANATIONS,
  RISK_DOMAINS,
  TIMING_RULE_TEXT,
  type Changeability,
  type RiskDomainKey,
} from '../config/risk-explanations';
import { evaluateAssessment, type AssessmentAnswers } from './assessment-engine';

export type InfluenceLevel = 'none' | 'low' | 'moderate' | 'high';
type Locale = 'id' | 'en';

export interface ExplainedFactor {
  questionId: string;
  topic: string;
  title: string;
  answerLabel: string;
  influence: Exclude<InfluenceLevel, 'none'>;
  isRedFlag: boolean;
  isDecisive: boolean;
  changeability: Changeability;
  domain: RiskDomainKey;
  whyItMatters: string;
  whatYouCanDo?: string;
  safetyNote?: string;
}

export interface DomainSummary {
  key: RiskDomainKey;
  title: string;
  description: string;
  influence: InfluenceLevel;
  factorCount: number;
}

export interface LevelReason {
  kind: 'red_flag' | 'time_rule' | 'combined' | 'clear';
  text: string;
}

export interface RiskExplanation {
  levelCode: AssessmentLevelCode;
  levelLabel: string;
  headline: string;
  reasons: LevelReason[];
  domains: DomainSummary[];
  factors: ExplainedFactor[];
  strengths: string[];
  unanswered: string[];
  answeredCount: number;
  totalCount: number;
  whatCouldChange: {
    text: string;
    canImproveWithHabits: boolean;
    improvedLevelLabel?: string;
  };
}

const HIDDEN_QUESTION_IDS = new Set(['partner_context']);
const LEVEL_RANK: Record<AssessmentLevelCode, number> = { routine: 0, within_1_2_months: 1, immediate: 2 };
const INFLUENCE_RANK: Record<InfluenceLevel, number> = { none: 0, low: 1, moderate: 2, high: 3 };
const DOMAIN_ORDER: RiskDomainKey[] = ['medical', 'timing', 'lifestyle'];

export const INFLUENCE_LABELS: Record<Locale, Record<InfluenceLevel, string>> = {
  id: { none: 'Tidak berpengaruh', low: 'Pengaruh kecil', moderate: 'Pengaruh sedang', high: 'Pengaruh besar' },
  en: { none: 'No influence', low: 'Small influence', moderate: 'Some influence', high: 'Strong influence' },
};

export const CHANGEABILITY_LABELS: Record<Locale, Record<Changeability, string>> = {
  id: { changeable: 'Bisa Anda ubah', medical: 'Perlu diperiksa dokter', time: 'Bergantung waktu' },
  en: { changeable: 'You can change this', medical: 'Needs a doctor to check', time: 'Depends on time' },
};

function isAnswered(value: string | undefined): value is string {
  return Boolean(value) && value !== 'unknown' && value !== 'skipped';
}

export function influenceForWeight(weight: number): Exclude<InfluenceLevel, 'none'> {
  if (weight >= 5) return 'high';
  if (weight >= 2) return 'moderate';
  return 'low';
}

/** Pengaruh gabungan kebiasaan dihitung dari akumulasi, bukan nilai tunggal. */
function lifestyleInfluence(totalWeight: number): InfluenceLevel {
  if (totalWeight <= 0) return 'none';
  if (totalWeight <= 2) return 'low';
  if (totalWeight <= 5) return 'moderate';
  return 'high';
}

function joinList(items: string[], locale: Locale): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const conj = locale === 'en' ? 'and' : 'dan';
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** Jawaban terbaik (bobot 0) untuk setiap pertanyaan kebiasaan — dipakai untuk skenario "bagaimana jika". */
function bestLifestyleAnswers(answers: AssessmentAnswers, config: AssessmentRulesConfig): AssessmentAnswers {
  const next: AssessmentAnswers = { ...answers };
  for (const q of config.questions) {
    const meta = QUESTION_EXPLANATIONS[q.id];
    if (!meta || meta.changeability !== 'changeable') continue;
    if (!isAnswered(answers[q.id])) continue;
    const best = q.options.find((o) => o.weight === 0 && o.value !== 'unknown');
    if (best) next[q.id] = best.value;
  }
  return next;
}

export function explainAssessment(
  answers: AssessmentAnswers,
  locale: Locale = 'id',
  config: AssessmentRulesConfig = assessmentRulesConfig,
): RiskExplanation {
  const isEn = locale === 'en';
  const localized = config === assessmentRulesConfig ? getLocalizedAssessmentConfig(locale) : config;
  const evaluation = evaluateAssessment(answers, undefined, config, locale);
  const levelCode = evaluation.levelCode;
  const levelLabel = localized.levels[levelCode].label;

  const redFlagQuestionIds = new Set<string>();
  for (const trigger of config.rules.immediateTriggers) {
    const val = answers[trigger.questionId];
    if (val && trigger.optionValues.includes(val)) redFlagQuestionIds.add(trigger.questionId);
  }
  const matchedTimeRules = config.rules.within1To2MonthsMandatoryRules.filter((rule) =>
    Object.entries(rule.conditions).every(([qId, allowed]) => {
      const v = answers[qId];
      return Boolean(v && allowed.includes(v));
    }),
  );

  const factors: ExplainedFactor[] = [];
  const strengths: string[] = [];
  const unanswered: string[] = [];
  let answeredCount = 0;
  let totalCount = 0;
  let lifestyleWeight = 0;

  for (const q of localized.questions) {
    if (HIDDEN_QUESTION_IDS.has(q.id)) continue;
    totalCount += 1;
    const value = answers[q.id];
    if (!isAnswered(value)) {
      unanswered.push(q.topic);
      continue;
    }
    answeredCount += 1;
    const option = q.options.find((o) => o.value === value);
    if (!option) continue;
    const meta = QUESTION_EXPLANATIONS[q.id];
    const optMeta = meta?.options[value];

    if (option.weight <= 0) {
      if (optMeta?.goodNews) strengths.push(isEn ? optMeta.goodNews.en : optMeta.goodNews.id);
      continue;
    }

    const domain: RiskDomainKey = meta?.domain ?? 'lifestyle';
    if (domain === 'lifestyle') lifestyleWeight += option.weight;

    const action = optMeta?.action ? (isEn ? optMeta.action.en : optMeta.action.id) : undefined;
    const hasRuleExplanation = Boolean(option.whyRelevant);
    const isRedFlag = redFlagQuestionIds.has(q.id);
    const isTimeDecisive = q.id === 'ttc_duration' && matchedTimeRules.length > 0;

    factors.push({
      questionId: q.id,
      topic: q.topic,
      title:
        option.factorTitle ||
        (optMeta?.title ? (isEn ? optMeta.title.en : optMeta.title.id) : option.label),
      answerLabel: option.label,
      influence: influenceForWeight(option.weight),
      isRedFlag,
      isDecisive: isRedFlag || isTimeDecisive,
      changeability: meta?.changeability ?? 'changeable',
      domain,
      whyItMatters: hasRuleExplanation ? (option.whyRelevant as string) : action ?? '',
      whatYouCanDo: hasRuleExplanation ? action : undefined,
      safetyNote: optMeta?.safetyNote ? (isEn ? optMeta.safetyNote.en : optMeta.safetyNote.id) : undefined,
    });
  }

  factors.sort((a, b) => {
    if (a.isDecisive !== b.isDecisive) return a.isDecisive ? -1 : 1;
    if (INFLUENCE_RANK[a.influence] !== INFLUENCE_RANK[b.influence]) {
      return INFLUENCE_RANK[b.influence] - INFLUENCE_RANK[a.influence];
    }
    return DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain);
  });

  // Ringkasan per kelompok faktor (tanpa angka)
  const domains: DomainSummary[] = DOMAIN_ORDER.map((key) => {
    const inDomain = factors.filter((f) => f.domain === key);
    const influence: InfluenceLevel =
      key === 'lifestyle'
        ? lifestyleInfluence(lifestyleWeight)
        : inDomain.reduce<InfluenceLevel>(
            (acc, f) => (INFLUENCE_RANK[f.influence] > INFLUENCE_RANK[acc] ? f.influence : acc),
            'none',
          );
    return {
      key,
      title: isEn ? RISK_DOMAINS[key].title.en : RISK_DOMAINS[key].title.id,
      description: isEn ? RISK_DOMAINS[key].description.en : RISK_DOMAINS[key].description.id,
      influence,
      factorCount: inDomain.length,
    };
  });

  // Alasan penentu tingkat saran
  const reasons: LevelReason[] = [];
  for (const f of factors.filter((x) => x.isRedFlag)) {
    reasons.push({
      kind: 'red_flag',
      text: isEn
        ? `${f.title}: on its own, this is a reason to see a doctor soon.`
        : `${f.title}: faktor ini saja sudah menjadi alasan untuk segera menemui dokter.`,
    });
  }
  const ttcIsRedFlag = redFlagQuestionIds.has('ttc_duration');
  if (!ttcIsRedFlag) {
    // Bila dua aturan waktu terpenuhi, cukup tampilkan satu (aturan > 12 bulan lebih jelas bagi pengguna).
    const rule =
      matchedTimeRules.find((r) => r.id === 'ttc_over_12_months') ?? matchedTimeRules[0];
    const text = rule ? TIMING_RULE_TEXT[rule.id] : undefined;
    if (text) reasons.push({ kind: 'time_rule', text: isEn ? text.en : text.id });
  }

  const contributingTitles = factors.map((f) => lowerFirst(f.title));
  // Aturan waktu menetapkan batas bawah (1–2 bulan); bila hasil naik menjadi "segera" tanpa tanda bahaya,
  // jelaskan bahwa akumulasi faktor lainlah yang menaikkannya.
  const hasRedFlag = reasons.some((r) => r.kind === 'red_flag');
  const hasTimeRule = reasons.some((r) => r.kind === 'time_rule');
  if (hasTimeRule && !hasRedFlag && levelCode === 'immediate') {
    const others = factors.filter((f) => f.questionId !== 'ttc_duration').map((f) => lowerFirst(f.title));
    reasons.push({
      kind: 'combined',
      text: isEn
        ? `On top of that, other factors add up (${joinList(others.slice(0, 4), locale)}), which moves the advice to seeing a doctor soon.`
        : `Selain itu, faktor lain ikut menambah (${joinList(others.slice(0, 4), locale)}), sehingga saran naik menjadi segera menemui dokter.`,
    });
  }
  if (reasons.length === 0) {
    if (levelCode === 'routine') {
      reasons.push({
        kind: 'clear',
        text:
          factors.length > 0
            ? isEn
              ? `No warning signs or time-based reasons were found. The factors you noted (${joinList(contributingTitles.slice(0, 3), locale)}) are mild on their own.`
              : `Tidak ditemukan tanda peringatan maupun alasan terkait waktu. Faktor yang Anda sebutkan (${joinList(contributingTitles.slice(0, 3), locale)}) tergolong ringan.`
            : isEn
            ? 'No warning signs, no time-based reasons, and no notable habits were found in your answers.'
            : 'Tidak ditemukan tanda peringatan, alasan terkait waktu, maupun kebiasaan yang perlu diperhatikan dari jawaban Anda.',
      });
    } else {
      const top = contributingTitles.slice(0, 4);
      reasons.push({
        kind: 'combined',
        text:
          levelCode === 'immediate'
            ? isEn
              ? `Several factors add up: ${joinList(top, locale)}. Together they are a reason to see a doctor soon, even though none is a warning sign by itself.`
              : `Beberapa faktor saling menambah: ${joinList(top, locale)}. Bersama-sama, faktor ini menjadi alasan untuk segera menemui dokter, walau tidak ada yang merupakan tanda bahaya bila berdiri sendiri.`
            : isEn
            ? `Several factors add up: ${joinList(top, locale)}. None is alarming alone, but together they make an earlier check-up worthwhile.`
            : `Beberapa faktor saling menambah: ${joinList(top, locale)}. Tidak ada yang mengkhawatirkan bila berdiri sendiri, tetapi bersama-sama membuat pemeriksaan lebih awal bermanfaat.`,
      });
    }
  }

  // Skenario "apa yang bisa mengubah hasil"
  const changeable = factors.filter((f) => f.changeability === 'changeable');
  const changeableTitles = changeable.map((f) => lowerFirst(f.title));
  const decisiveDomains = Array.from(new Set(factors.filter((f) => f.isDecisive).map((f) => f.domain)));
  const nonHabitDomains = decisiveDomains.length
    ? decisiveDomains
    : Array.from(new Set(factors.filter((f) => f.domain !== 'lifestyle').map((f) => f.domain)));
  const domainNames = nonHabitDomains
    .filter((d) => d !== 'lifestyle')
    .map((d) =>
      d === 'medical'
        ? isEn
          ? 'your medical history'
          : 'riwayat medis Anda'
        : isEn
        ? 'how long you have been trying'
        : 'lama program hamil',
    );

  let whatCouldChange: RiskExplanation['whatCouldChange'];
  if (changeable.length === 0) {
    whatCouldChange =
      levelCode === 'routine'
        ? {
            canImproveWithHabits: false,
            text: isEn
              ? 'Keep your current habits—they are working in your favour. Re-take the self-check if anything changes.'
              : 'Pertahankan kebiasaan Anda saat ini—semuanya mendukung kesehatan Anda. Ulangi Cek Awal bila ada perubahan.',
          }
        : {
            canImproveWithHabits: false,
            text: isEn
              ? `Your result comes from ${joinList(domainNames, locale) || 'factors habits cannot change'}, which habits cannot change. A check-up is the most helpful next step.`
              : `Hasil Anda ditentukan oleh ${joinList(domainNames, locale) || 'faktor yang tidak dapat diubah lewat kebiasaan'}, yang tidak bisa diubah lewat kebiasaan. Pemeriksaan adalah langkah paling membantu.`,
          };
  } else {
    const cfLevel = evaluateAssessment(bestLifestyleAnswers(answers, config), undefined, config, locale).levelCode;
    if (LEVEL_RANK[cfLevel] < LEVEL_RANK[levelCode]) {
      const improvedLevelLabel = localized.levels[cfLevel].label;
      whatCouldChange = {
        canImproveWithHabits: true,
        improvedLevelLabel,
        text: isEn
          ? `If you work on ${joinList(changeableTitles, locale)}, your self-check would likely move to “${improvedLevelLabel}”. Sperm take about 74 days to mature, so re-take the self-check in about 3 months to see the change.`
          : `Bila Anda memperbaiki ${joinList(changeableTitles, locale)}, hasil Cek Awal kemungkinan bergeser ke “${improvedLevelLabel}”. Sel sperma butuh ±74 hari untuk matang, jadi ulangi Cek Awal sekitar 3 bulan lagi untuk melihat perubahannya.`,
      };
    } else if (levelCode !== 'routine') {
      whatCouldChange = {
        canImproveWithHabits: false,
        text: isEn
          ? `Working on ${joinList(changeableTitles, locale)} supports sperm health, but your result is mainly set by ${joinList(domainNames, locale) || 'several factors together'}, so the advice to get checked stays. Do both: book the check-up and start the habits now.`
          : `Memperbaiki ${joinList(changeableTitles, locale)} mendukung kesehatan sperma, tetapi hasil Anda terutama ditentukan oleh ${joinList(domainNames, locale) || 'gabungan beberapa faktor'}, sehingga saran untuk periksa tetap berlaku. Lakukan keduanya: jadwalkan pemeriksaan dan mulai kebiasaan baik sekarang.`,
      };
    } else {
      whatCouldChange = {
        canImproveWithHabits: true,
        text: isEn
          ? `You are already in the routine range. Working on ${joinList(changeableTitles, locale)} keeps it that way and supports sperm health over the next ~3 months.`
          : `Anda sudah berada di kisaran rutin. Memperbaiki ${joinList(changeableTitles, locale)} membantu mempertahankannya dan mendukung kesehatan sperma dalam ±3 bulan ke depan.`,
      };
    }
  }

  return {
    levelCode,
    levelLabel,
    headline: isEn ? `Why your result is “${levelLabel}”` : `Mengapa hasil Anda “${levelLabel}”`,
    reasons,
    domains,
    factors,
    strengths,
    unanswered,
    answeredCount,
    totalCount,
    whatCouldChange,
  };
}

/** Ringkasan ringkas per kelompok faktor, untuk disimpan di riwayat (tanpa teks bebas). */
export function summarizeDomainInfluence(
  answers: AssessmentAnswers,
): Record<RiskDomainKey, InfluenceLevel> {
  const exp = explainAssessment(answers, 'en');
  return exp.domains.reduce(
    (acc, d) => ({ ...acc, [d.key]: d.influence }),
    { medical: 'none', timing: 'none', lifestyle: 'none' } as Record<RiskDomainKey, InfluenceLevel>,
  );
}
