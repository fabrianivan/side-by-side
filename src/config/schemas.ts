import { z } from 'zod';
import assessmentRulesRaw from './assessment-rules.json';
import semenReferenceRaw from './semen-reference.json';
import templatesRaw from './templates.json';

export const QuestionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  weight: z.number().min(0),
  factorTitle: z.string().optional(),
  whyRelevant: z.string().optional(),
});

export const AssessmentQuestionSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  topic: z.string(),
  question: z.string(),
  helperText: z.string(),
  options: z.array(QuestionOptionSchema).min(2),
});

export const LevelInfoSchema = z.object({
  code: z.enum(['routine', 'within_1_2_months', 'immediate']),
  label: z.string(),
  badgeColor: z.enum(['success', 'warning', 'urgent']),
  summary: z.string(),
  nextSteps: z.array(z.string()).min(1),
});

export const AssessmentRulesConfigSchema = z.object({
  version: z.string(),
  lastReviewed: z.string(),
  medicalReviewer: z.string(),
  disclaimer: z.string(),
  emotionalDistressKeywords: z.array(z.string()),
  emotionalSupportBanner: z.object({
    title: z.string(),
    message: z.string(),
    contacts: z.array(
      z.object({
        name: z.string(),
        contact: z.string(),
      })
    ),
  }),
  levels: z.object({
    routine: LevelInfoSchema,
    within_1_2_months: LevelInfoSchema,
    immediate: LevelInfoSchema,
  }),
  rules: z.object({
    immediateTriggers: z.array(
      z.object({
        questionId: z.string(),
        optionValues: z.array(z.string()),
      })
    ),
    within1To2MonthsMandatoryRules: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        conditions: z.record(z.string(), z.array(z.string())),
      })
    ),
    scoreThresholds: z.object({
      within_1_2_months: z.number(),
      immediate: z.number(),
    }),
  }),
  questions: z.array(AssessmentQuestionSchema).min(10).max(14),
});

export const SemenParameterSchema = z.object({
  key: z.enum([
    'volume_ml',
    'concentration_m_per_ml',
    'total_motility_pct',
    'progressive_motility_pct',
    'morphology_normal_pct',
  ]),
  label: z.string(),
  unit: z.string(),
  lowerReferenceLimit: z.number().nonnegative(),
  step: z.number().positive(),
  placeholder: z.string(),
  plainExplanation: z.string(),
  belowRangeNote: z.string(),
});

export const SemenReferenceConfigSchema = z.object({
  version: z.string(),
  source: z.string(),
  disclaimer: z.string(),
  parameters: z.array(SemenParameterSchema).min(4),
  lifestyleRecommendations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
    })
  ),
});

export type AssessmentRulesConfig = z.infer<typeof AssessmentRulesConfigSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type AssessmentLevelCode = 'routine' | 'within_1_2_months' | 'immediate';
export type SemenReferenceConfig = z.infer<typeof SemenReferenceConfigSchema>;

// Validasi konfigurasi saat modul dimuat agar kesalahan terdeteksi sejak dini
export const assessmentRulesConfig: AssessmentRulesConfig =
  AssessmentRulesConfigSchema.parse(assessmentRulesRaw);

export const semenReferenceConfig: SemenReferenceConfig =
  SemenReferenceConfigSchema.parse(semenReferenceRaw);

export const templatesConfig = templatesRaw;
