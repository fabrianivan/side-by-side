import type { AssessmentLevelCode, AssessmentRulesConfig, SemenReferenceConfig } from './schemas';

export interface QuestionOptionEn {
  label: string;
  factorTitle?: string;
  whyRelevant?: string;
}

export interface QuestionEn {
  topic: string;
  question: string;
  helperText: string;
  options: Record<string, QuestionOptionEn>;
}

export interface LevelEn {
  label: string;
  summary: string;
  nextSteps: string[];
}

export const EN_DISTRESS_KEYWORDS: string[] = [
  'hopeless',
  'worthless',
  'give up',
  'severe depression',
  'suicide',
  'end my life',
  'shattered',
  'cant go on',
  "can't go on",
  'hate myself',
];

export const ASSESSMENT_RULES_EN: {
  medicalReviewer: string;
  disclaimer: string;
  emotionalSupportBanner: AssessmentRulesConfig['emotionalSupportBanner'];
  levels: Record<AssessmentLevelCode, LevelEn>;
  ttc6MoFactor: {
    topic: string;
    factorTitle: string;
    whyRelevant: string;
  };
  questions: Record<string, QuestionEn>;
} = {
  medicalReviewer: 'Andrology & Public Health Advisory Team (WHO & IAUI Guidelines)',
  disclaimer: 'This is not a diagnosis. Only a clinician can evaluate your health condition.',
  emotionalSupportBanner: {
    title: 'You Are Not Alone — Your Wellbeing Matters',
    message:
      'The fertility journey can feel exhausting and emotionally heavy. Your self-worth is never defined by a lab report or medical result. If you are carrying overwhelming emotional distress, please consider reaching out to a counselor or qualified mental health professional.',
    contacts: [
      {
        name: 'SEJIWA / Kemenkes Mental Health Helpline (Indonesia)',
        contact: '119 ext 8',
      },
      {
        name: 'Into The Light Indonesia & Community Health Counseling',
        contact: 'Available via your nearest primary clinic or hospital',
      },
    ],
  },
  levels: {
    routine: {
      label: 'Consider a routine check-up',
      summary:
        'Based on your answers, there are no urgent indicators requiring immediate medical follow-up. You can consider scheduling a baseline check-up at your own pace while maintaining supportive daily habits together.',
      nextSteps: [
        'Maintain consistent sleep (7–8 hours) and regular moderate physical activity.',
        'Discuss a comfortable timeline for a baseline check-up with your partner via Our Plan.',
        'Read "What Is Semen Analysis?" in the Library so you know what to expect if you decide to test.',
      ],
    },
    within_1_2_months: {
      label: 'Recommended to consult within 1 to 2 months',
      summary:
        'Based on your answers, scheduling a consultation within the next 1 to 2 months is recommended. This is not a diagnosis, but an early supportive step to give you and your partner clearer clarity.',
      nextSteps: [
        'Explore comfortable clinics, hospitals, or laboratories in the Care Directory.',
        'Schedule a visit together (remember the recommended 2–7 day abstinence window before lab testing).',
        'Start reducing modifiable lifestyle heat or oxidative stressors ahead of the next ~74-day sperm maturation cycle.',
      ],
    },
    immediate: {
      label: 'Recommended to see a clinician soon',
      summary:
        'Based on your answers, there are medical history items or physical symptoms worth discussing with a doctor soon. Seeking evaluation early allows a clinician to provide timely, safe guidance.',
      nextSteps: [
        'Book an appointment with a general practitioner, andrologist, or urologist near you.',
        'Use the Doctor Question Checklist to keep your consultation structured and comfortable.',
        'Do not start or stop any prescribed medication or hormone product without consulting your doctor directly.',
      ],
    },
  },
  ttc6MoFactor: {
    topic: 'Trying-to-Conceive Timeline',
    factorTitle: 'Optimal shared timing for baseline evaluation',
    whyRelevant:
      'Based on your current trying-to-conceive timeline, an earlier baseline evaluation helps you and your partner plan the next steps calmly.',
  },
  questions: {
    ttc_duration: {
      topic: 'Trying-to-Conceive Duration',
      question:
        'How long have you and your partner been trying to conceive (regular unprotected intercourse)?',
      helperText: 'This context helps tailor the most practical timing guidance for both of you.',
      options: {
        under_6_months: { label: 'Just planning or less than 6 months' },
        '6_to_12_months': {
          label: 'Around 6 to 12 months',
          factorTitle: '6–12 months trying to conceive',
          whyRelevant:
            'Many couples begin a basic evaluation in this timeframe to gain clarity early rather than waiting longer.',
        },
        '12_to_24_months': {
          label: 'More than 12 months (1–2 years)',
          factorTitle: 'Over 12 months trying to conceive',
          whyRelevant:
            'International clinical guidelines (WHO) recommend parallel evaluation of both male and female partners after 12 months of trying.',
        },
        over_24_months: {
          label: 'More than 2 years',
          factorTitle: 'Over 2 years trying to conceive',
          whyRelevant:
            'A coordinated clinical evaluation for both partners is strongly advised so your next steps can be focused and time-efficient.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    partner_context: {
      topic: 'Shared Timeline Context',
      question:
        'To tailor guideline timing accurately, is your female partner currently aged 35 years or older?',
      helperText:
        'Your partner’s age detail is never shown in your summary report or shared externally—it only calibrates timing guidance.',
      options: {
        under_35: { label: 'Under 35 years' },
        over_35: {
          label: '35 years or older',
          factorTitle: 'Shared evaluation timing priority',
          whyRelevant:
            'Standard clinical guidelines suggest initiating parallel baseline check-ups earlier when planning a shared timeline.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    prior_pregnancy: {
      topic: 'Pregnancy History',
      question:
        'Have you ever been involved in a pregnancy with your current partner or in a prior relationship?',
      helperText: 'Includes pregnancies carried to term as well as miscarriages.',
      options: {
        yes_together: { label: 'Yes, with my current partner' },
        yes_previous: { label: 'Yes, in a previous relationship' },
        never: { label: 'No prior pregnancy' },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    reproductive_history: {
      topic: 'Reproductive Medical History',
      question:
        'Have you ever had a medical condition or surgery in the groin or reproductive area?',
      helperText:
        'For example: hernia repair, varicocele (enlarged scrotal veins), post-pubertal mumps, or pelvic surgery.',
      options: {
        none: { label: 'Never' },
        hernia_or_minor: {
          label: 'Prior hernia surgery or minor groin injury',
          factorTitle: 'History of groin procedure or condition',
          whyRelevant:
            'Because reproductive ducts pass through the inguinal area, a physician exam helps confirm healthy anatomical pathways.',
        },
        varicocele_or_infection: {
          label: 'History of varicocele, recurrent urinary/reproductive infection, or adult mumps',
          factorTitle: 'History of varicocele or relevant infection',
          whyRelevant:
            'Varicoceles and past infections are common male factors that clinicians routinely evaluate and often manage effectively.',
        },
        undescended_testis_or_surgery: {
          label: 'History of undescended testicle in childhood or testicular surgery',
          factorTitle: 'Specific testicular medical history',
          whyRelevant:
            'This history benefits from direct specialist assessment to evaluate current sperm production function.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    physical_symptoms: {
      topic: 'Physical Comfort',
      question:
        'Have you noticed discomfort, a dull ache/heaviness, or swelling in the scrotal area?',
      helperText: 'A mild dull ache after prolonged standing is often overlooked as something worth checking.',
      options: {
        none: { label: 'No symptoms' },
        mild_occasional: {
          label: 'Occasional dull ache or heaviness after prolonged standing or exertion',
          factorTitle: 'Occasional scrotal heaviness or ache',
          whyRelevant:
            'Heaviness after standing is sometimes related to venous blood flow (such as mild varicocele) that a clinician can easily examine.',
        },
        frequent_pain_or_swelling: {
          label: 'Frequent pain, noticeable lump, or clear swelling',
          factorTitle: 'Physical pain or swelling symptoms',
          whyRelevant:
            'Direct physical symptoms should be checked promptly for your comfort and timely medical care.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    smoking_habit: {
      topic: 'Smoking & Vaping Habits',
      question:
        'What has your tobacco smoking or e-cigarette (vaping) pattern been over the last 3 months?',
      helperText: 'One full cycle of new sperm development takes roughly 2.5 to 3 months.',
      options: {
        never_or_quit: { label: 'Do not smoke / quit more than 6 months ago' },
        occasional_or_vape: {
          label: 'Occasional smoking or using vape/light cigarettes',
          factorTitle: 'Nicotine / vape exposure',
          whyRelevant:
            'Oxidants in smoke and nicotine vapor can affect sperm movement (motility) and quality, and parameters often recover after cutting back.',
        },
        daily_heavy: {
          label: 'Daily smoker (more than half a pack per day)',
          factorTitle: 'Daily smoking habit',
          whyRelevant:
            'Daily smoking raises oxidative stress in reproductive cells. Reducing exposure over the next 3 months supports natural sperm recovery.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    alcohol_habit: {
      topic: 'Alcohol Intake',
      question: 'How frequently do you consume alcoholic beverages?',
      helperText: 'Choose whichever matches your routine without hesitation.',
      options: {
        none: { label: 'Never' },
        social_occasional: { label: 'Rarely (fewer than 1–2 times a month)' },
        weekly_regular: {
          label: 'Regularly every week (several drinks per week or more)',
          factorTitle: 'Weekly alcohol intake',
          whyRelevant:
            'Frequent alcohol consumption can disrupt reproductive hormone balance and normal sperm shape (morphology).',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    heat_exposure: {
      topic: 'Heat Exposure',
      question: 'Are you frequently exposed to heat around the lap/groin or workplace?',
      helperText:
        'Examples: holding a laptop directly on your thighs for hours, frequent hot baths/sauna, long-distance driving, or hot industrial equipment.',
      options: {
        rarely: { label: 'Rarely / never' },
        moderate_laptop_sitting: {
          label: 'Frequently rest laptop on lap or sit continuously >6 hours without breaks',
          factorTitle: 'Localized heat from prolonged sitting / laptop on lap',
          whyRelevant:
            'Sperm production requires temperatures roughly 2°C cooler than core body temperature. Using a desk and standing every hour helps significantly.',
        },
        high_occupational_sauna: {
          label: 'Regular sauna/hot tub use or working in high-heat environments',
          factorTitle: 'Regular high-temperature exposure',
          whyRelevant:
            'Repeated high heat can temporarily lower sperm concentration, though counts typically recover once heat exposure decreases.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    physical_activity: {
      topic: 'Physical Activity',
      question: 'What is your weekly exercise or physical activity routine?',
      helperText: 'Balanced movement supports healthy circulation and endocrine regulation.',
      options: {
        active_moderate: { label: 'Active regularly / moderate exercise 2–4 times per week' },
        sedentary: {
          label: 'Rarely exercise (less than once a week, mostly seated)',
          factorTitle: 'Limited weekly physical activity',
          whyRelevant:
            'Light-to-moderate exercise such as brisk 30-minute walks supports metabolic and reproductive vitality.',
        },
        extreme_cycling: {
          label: 'Very intense training or long-distance cycling (>5 hours/week)',
          factorTitle: 'Mechanical pressure / heat from prolonged cycling',
          whyRelevant:
            'Extended cycling sessions can introduce localized pelvic pressure and heat.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    bmi_category: {
      topic: 'Weight & Height Range (Optional)',
      question: 'How would you estimate your current body weight relative to your height?',
      helperText: 'This step is optional. You can also skip it if you prefer.',
      options: {
        normal: { label: 'Balanced / normal BMI range (18.5 – 24.9)' },
        overweight_or_underweight: {
          label: 'Slightly below or above ideal weight (BMI < 18.5 or 25 – 29.9)',
          factorTitle: 'Body weight and metabolic balance',
          whyRelevant:
            'Adipose tissue and metabolic health help regulate natural testosterone-to-estrogen balance.',
        },
        obese: {
          label: 'Noticeably above ideal weight (BMI ≥ 30)',
          factorTitle: 'Metabolic and body-weight factor',
          whyRelevant:
            'Gradual weight optimization (even 5–10%) often brings measurable improvements in male reproductive hormone balance.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    medications_supplements: {
      topic: 'Routine Medications & Supplements',
      question:
        'Are you currently taking any prescription medications or bodybuilding/hormone supplements?',
      helperText:
        'Strictly for organizing questions to discuss with your clinician. This app does not provide medication advice.',
      options: {
        none_or_vitamins: { label: 'None, or standard daily multivitamins only' },
        chronic_meds: {
          label: 'Yes, ongoing medication (e.g., blood pressure, acid reflux, hair loss, etc.)',
          factorTitle: 'Ongoing routine medication use',
          whyRelevant:
            'Some helpful long-term medications are worth reviewing with your clinician while planning a pregnancy.',
        },
        testosterone_or_steroids: {
          label: 'Yes, testosterone injections/gels or hormonal fitness steroids',
          factorTitle: 'Exogenous testosterone or hormonal fitness supplement use',
          whyRelevant:
            'External testosterone signals the brain to suppress natural sperm production. Speak with your doctor about a safe clinical review.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
    sleep_and_stress: {
      topic: 'Sleep Quality & Stress Load',
      question: 'How have your sleep quality and daily stress levels been over the past month?',
      helperText: 'Natural male reproductive hormones peak during deep overnight sleep.',
      options: {
        good_rest: { label: 'Restful sleep (7–8 hours) with manageable stress' },
        moderate_stress_lack_sleep: {
          label: 'Frequently sleeping under 6 hours or moderate work stress',
          factorTitle: 'Sleep debt and daily stress load',
          whyRelevant:
            'Short sleep and persistently elevated stress hormones (cortisol) can dampen natural reproductive hormone signaling.',
        },
        high_stress_insomnia: {
          label: 'Trouble sleeping most nights and feeling deeply overwhelmed',
          factorTitle: 'Significant sleep deprivation and high emotional stress',
          whyRelevant:
            'Your mental health and rest matter just as much as physical health. Carving out recovery time with your partner or speaking with a counselor is warmly encouraged.',
        },
        unknown: { label: 'Unsure / Prefer not to answer' },
      },
    },
  },
};

export const SEMEN_REFERENCE_EN: {
  source: string;
  disclaimer: string;
  parameters: Record<
    SemenReferenceConfig['parameters'][number]['key'],
    {
      label: string;
      unit: string;
      placeholder: string;
      plainExplanation: string;
      belowRangeNote: string;
    }
  >;
  lifestyleRecommendations: Record<string, { title: string; description: string }>;
} = {
  source: 'WHO Laboratory Manual for the Examination and Processing of Human Semen, 6th Ed. (2021)',
  disclaimer: 'A single test result can vary naturally. Always discuss your full report with a clinician.',
  parameters: {
    volume_ml: {
      label: 'Ejaculate Volume',
      unit: 'mL',
      placeholder: 'Example: 2.5',
      plainExplanation:
        'Total fluid collected in one sample. Over 90% of this fluid comes from the seminal vesicles and prostate gland to nourish and carry sperm.',
      belowRangeNote:
        'A volume below 1.4 mL can stem from incomplete collection, too short an abstinence interval, or duct/gland factors that a doctor can check.',
    },
    concentration_m_per_ml: {
      label: 'Sperm Concentration',
      unit: 'M/mL',
      placeholder: 'Example: 22',
      plainExplanation:
        'Number of sperm cells per milliliter of semen. The WHO 6th edition lower reference limit is 16 million/mL.',
      belowRangeNote:
        'Values below 16 M/mL may reflect a recent fever/heat exposure 2–3 months ago, varicocele, hormones, or lifestyle factors. Clinicians commonly suggest a repeat test.',
    },
    total_motility_pct: {
      label: 'Total Motility (Movement)',
      unit: '%',
      placeholder: 'Example: 48',
      plainExplanation:
        'Percentage of sperm moving (either forward or in place). Active motility is essential for sperm to travel toward the egg.',
      belowRangeNote:
        'Total motility below 42% is often associated with smoke/oxidative exposure, groin heat, sleep loss, or sample handling timing.',
    },
    progressive_motility_pct: {
      label: 'Progressive Motility (Forward)',
      unit: '%',
      placeholder: 'Example: 34',
      plainExplanation:
        'Percentage of sperm swimming actively forward in a straight line or wide circles rather than moving only in place.',
      belowRangeNote:
        'When progressive motility is under 30%, a clinician can help evaluate potentially reversible contributing factors.',
    },
    morphology_normal_pct: {
      label: 'Normal Morphology (Shape)',
      unit: '%',
      placeholder: 'Example: 5',
      plainExplanation:
        'Percentage of sperm meeting strict microscopic criteria (Strict Kruger) for head, neck, and tail form. A number like 4–5% often sounds low, yet WHO defines ≥ 4% as within the reference range.',
      belowRangeNote:
        'A score below 4% frequently causes alarm, even though microscopic grading is very strict and millions of normal cells can still be present. Review the whole report with your clinician.',
    },
  },
  lifestyleRecommendations: {
    sleep_recovery: {
      title: 'Protect 7–8 Hours of Quality Sleep',
      description:
        'Natural testosterone pulses happen primarily during deep sleep stages overnight.',
    },
    temperature_care: {
      title: 'Keep the Scrotal Area Cool',
      description:
        'Use a desk instead of your lap for laptops, limit hot tubs/saunas, and stand up briefly every hour during prolonged sitting.',
    },
    smoke_free: {
      title: 'Cut Back or Stop Smoking & Vaping',
      description:
        'Because sperm renew on a ~74-day cycle, reducing nicotine and smoke over 3 months gives new cells room to recover.',
    },
    active_balance: {
      title: 'Stay Moderately Active & Unwind Together',
      description:
        'Brisk walking, swimming, or moderate exercise 30 minutes 3–4 times weekly supports circulation and reduces stress hormones.',
    },
  },
};

export const TEMPLATES_EN = {
  partnerInviteTemplates: [
    {
      id: 'warm_husband',
      tone: 'Warm',
      senderRole: 'Husband to Wife',
      title: 'Warm invitation to start together',
      message:
        'I want us to look at this check-up together—not because anything is wrong, but so we both have clarity for our family plan. I started using a private guide on Side by Side so we can plan things comfortably at our pace.',
    },
    {
      id: 'warm_wife',
      tone: 'Warm',
      senderRole: 'Wife to Husband',
      title: 'Gentle invite from partner (zero blame)',
      message:
        'Hey love, this family-planning journey belongs to both of us. I want us both to feel calm with complete information. Whenever you feel ready, let’s check the private Side by Side guide together—no pressure at all.',
    },
    {
      id: 'casual',
      tone: 'Casual',
      senderRole: 'General / Couple',
      title: 'Light & casual tone',
      message:
        'Hey, I came across a really thoughtful, private app called Side by Side. Zero judgment, and data stays encrypted on-device. Want to look through our next steps together so we’re not guessing?',
    },
    {
      id: 'practical',
      tone: 'Practical',
      senderRole: 'General / Couple',
      title: 'Practical & solution-focused',
      message:
        'To save time and get complete clarity, doctors usually recommend checking both partners early. I drafted a simple shared checklist on Side by Side—here is our invite code so we can coordinate dates easily.',
    },
  ],
  supportiveQuickNotes: [
    'Thank you for taking this step together. One day at a time.',
    'Whatever the results look like, we are always on the same team.',
    'Get some good rest tonight—your health comes first.',
    'Really proud of you for taking that first brave step today.',
  ],
  counselingTemplates: [
    {
      id: 'gaya_hidup',
      topic: 'Lifestyle & the 74-Day Spermatogenesis Cycle',
      title: '74-Day Maturation Window & Habit Counseling',
      content:
        'Lifestyle Counseling Summary:\n1. Explain that complete sperm formation (spermatogenesis) takes roughly 74 days (2.5–3 months), so positive daily changes today are reflected in tests ~3 months ahead.\n2. Recommend limiting scrotal heat exposure (place laptops on desks, avoid regular saunas/hot baths, and take standing breaks every hour when seated).\n3. Support gradual cessation or reduction of tobacco/vaping to lower oxidative stress on sperm membranes and DNA.\n4. Encourage 7–8 hours of nightly sleep and moderate physical activity 3–4 times per week.',
    },
    {
      id: 'kecemasan',
      topic: 'Validating Anxiety & Normalizing Testing',
      title: 'Reducing Stigma and Clinical Nervousness',
      content:
        'Anxiety Support Counseling Summary:\n1. Acknowledge the patient’s initiative in seeking early evaluation—reinforce that fertility is a couple’s journey (~40–50% involves male factors) and has nothing to do with masculinity or virility.\n2. Emphasize that a single semen analysis varies naturally (due to fatigue, fever in the past 2 months, or suboptimal abstinence timing).\n3. Keep language collaborative and non-blaming; focus on actionable medical and lifestyle steps.',
    },
    {
      id: 'komunikasi_pasangan',
      topic: 'Supportive Partner Communication',
      title: 'Guiding Blame-Free Couple Conversations',
      content:
        'Couple Communication Counseling Summary:\n1. Encourage shared "we/our plan" framing rather than pinpointing one partner as "at fault."\n2. Suggest setting aside TTC-free time or date nights so the relationship stays warm beyond clinic calendars.\n3. Use shared checklists (such as Our Plan) so scheduling and mental load are evenly shared.',
    },
    {
      id: 'rencana_tindak_lanjut',
      topic: 'Follow-Up & Specialist Referral Pathway',
      title: 'Clinical Follow-Up & Referral Guidance',
      content:
        'Follow-Up Care Plan Summary:\n1. If no baseline semen analysis has been completed yet: arrange lab testing with a 2–7 day sexual abstinence window.\n2. If values fall below WHO 2021 lower reference limits or clinical flags exist (e.g., suspected varicocele, prior groin surgery, hormonal symptoms): coordinate targeted referral to an Andrologist (Sp.And) or Urologist (Sp.U).\n3. Schedule follow-up reassessment in 8–12 weeks alongside supportive lifestyle modifications or per specialist advice.',
    },
  ],
  doctorQuestionsList: [
    {
      category: 'Understanding Baseline Health',
      questions: [
        'Based on our history so far, would you recommend a baseline semen analysis now?',
        'Is there a quick physical exam (such as checking for varicocele) we should do during this visit?',
      ],
    },
    {
      category: 'Test Preparation & Logistics',
      questions: [
        'How many days of sexual abstinence are ideal for my lab appointment (within the 2–7 day window)?',
        'Should sample collection happen in a private clinic room, or is at-home collection within a timed window permitted?',
      ],
    },
    {
      category: 'Interpreting Results & Lifestyle',
      questions: [
        'Across concentration, motility, and morphology, which areas deserve the closest focus?',
        'Which daily habit adjustment (sleep, exercise, heat, smoking) would make the biggest difference over the next 3 months?',
        'Are any regular medications or supplements I take okay to continue while trying to conceive?',
      ],
    },
    {
      category: 'Next Steps & Coordination',
      questions: [
        'When is the right time to schedule a follow-up visit or repeat semen analysis?',
        'Should I consult an Andrologist (Sp.And) or Urologist (Sp.U) for a closer specialist review?',
      ],
    },
  ],
  examinationGuide: {
    steps: [
      {
        stepNumber: 1,
        title: 'What Is a Semen Analysis?',
        summary:
          'A simple, painless laboratory test examining sperm count, movement (motility), and shape (morphology) under a microscope.',
        details:
          'Semen analysis is never a test of masculinity. It is the quickest, least invasive baseline step to give clinicians a complete picture of fertility alongside your partner.',
      },
      {
        stepNumber: 2,
        title: 'Who Orders & Performs the Test?',
        summary:
          'Orders can come from a general practitioner, your partner’s OB/GYN, an andrologist (Sp.And), or a urologist (Sp.U).',
        details:
          'Trained lab analysts evaluate your sample confidentially. An andrologist or urologist can interpret the findings and discuss targeted next steps.',
      },
      {
        stepNumber: 3,
        title: 'Preparation Before Testing (2–7 Day Abstinence)',
        summary:
          'Avoid ejaculation for 2 to 7 days (ideally 3–4 days) prior to sample collection.',
        details:
          'Under 2 days may temporarily lower volume/count; over 7 days can increase older non-motile cells. Also avoid high fever, sleep deprivation, or saunas right before testing.',
      },
      {
        stepNumber: 4,
        title: 'What Happens in the Collection Room?',
        summary:
          'You receive a sterile labeled wide-mouth container and use a private, lockable collection room.',
        details:
          'Samples are collected via masturbation directly into the sterile cup without soap, lubricants, or saliva (which harm sperm). Aim to collect the full sample, especially the first sperm-rich portion.',
      },
      {
        stepNumber: 5,
        title: 'How Soon Are Results Ready?',
        summary:
          'Lab processing starts within 30–60 minutes, and reports are usually ready within 1 to 2 working days.',
        details:
          'Many modern hospitals and diagnostic labs also deliver password-protected digital reports the same day.',
      },
    ],
    costAndInsuranceInfo: {
      rangeSummary:
        'IDR 250,000 – 850,000 (Basic Semen Analysis) | IDR 150,000 – 500,000 (Doctor Consultation)',
      jknSummary:
        'Initial primary-care consultations and urology referrals for medical indications (such as scrotal pain, infection, or suspected varicocele via a Puskesmas/FKTP referral) are generally eligible for BPJS Kesehatan / JKN coverage. Routine fertility-only semen testing is often billed out-of-pocket depending on the facility.',
      disclaimer:
        'Cost estimates and JKN/insurance rules vary by healthcare facility and should be confirmed directly ahead of booking.',
    },
  },
};

export interface ArticleEn {
  title: string;
  summary: string;
  reviewer: string;
  body_md: string;
}

export const ARTICLES_EN: Record<string, ArticleEn> = {
  'art-1': {
    title: 'What Is Male Reproductive Health and Why Does Checking Early Matter?',
    summary:
      'Understanding the male role in family planning without awkwardness—because trying to conceive is a shared two-person journey.',
    reviewer: 'Clinical Reference: WHO & IAUI (Indonesian Urological Association) Guidelines',
    body_md: `### Fertility Is a Shared Two-Person Journey

For decades, conversations around family planning and fertility focused almost exclusively on women. Yet global World Health Organization (WHO) data shows that among couples taking longer to conceive, **male factors contribute to roughly 40% to 50% of cases**—either alone or alongside female factors.

### Why Checking Early Saves Time and Stress

Many men postpone getting checked because they feel physically fit or worry about social stigma. In reality, baseline male evaluation offers three clear advantages:

1. **Simple and completely non-invasive:** Unlike many multi-step female fertility procedures, an initial male workup usually consists of a medical history conversation and a straightforward laboratory semen analysis.
2. **Saves time and resources as a couple:** Having clarity from both partners early helps clinicians recommend focused next steps instead of guessing for months.
3. **Many factors are modifiable:** Sperm cells are freshly produced every day. Everyday factors such as heat exposure, sleep/smoking habits, or enlarged scrotal veins (varicocele) can often be addressed medically.

### A Small Step Today

Learning about your reproductive health is never about assigning blame—it is an act of care and teamwork with your partner.`,
  },
  'art-2': {
    title: 'Myths vs. Facts: Fertility Is Never a Measure of Masculinity',
    summary:
      'Clearing up common misconceptions that make many men hesitant to ask questions or book a check-up.',
    reviewer: 'Clinical Reference: PERANDI & WHO Guidelines',
    body_md: `### Myth 1: "If I look athletic and sexual function is fine, my sperm must be optimal."
**Fact:** Erections and libido depend primarily on blood flow and testosterone, whereas conception depends on the microscopic count, movement (motility), and form (morphology) of sperm cells. Fit men with zero sexual symptoms can still discover parameters worth checking under a microscope.

### Myth 2: "A larger semen volume means higher sperm count."
**Fact:** Over 90% of semen is nourishing carrier fluid made by the prostate and seminal vesicles. Sperm cells themselves represent a tiny fraction of total volume and cannot be assessed with the naked eye.

### Myth 3: "Fertility challenges reflect a lack of virility."
**Fact:** Sperm quality is simply a biological vital sign—no different from blood pressure or cholesterol. It can be shaped by past fevers, vein anatomy, or work heat, and says nothing about your worth or masculinity.

### Myth 4: "One suboptimal result is permanent."
**Fact:** Your body produces millions of new sperm continuously across an ~74-day cycle. Many factors are temporary and improve with medical follow-up and supportive daily habits.`,
  },
  'art-3': {
    title: 'The 74-Day Cycle: How Everyday Habits Shape Tomorrow’s Sperm',
    summary:
      'Why small adjustments in sleep, movement, and nutrition today build meaningful gains 2.5 to 3 months from now.',
    reviewer: 'Clinical Reference: WHO Laboratory Manual 6th Ed. (2021)',
    body_md: `### A Continuous 74-Day Renewal Window

Unlike women who are born with a finite reserve of eggs, men generate fresh sperm cells continuously. Going from an early germ cell to a mature swimmer takes an average of **72 to 74 days** (about 2.5 months).

### What That Means for You

1. **Today’s test reflects life 2–3 months ago:** A high fever, intense exhaustion, or acute stress two months back can temporarily show up in a current lab report.
2. **Real room for progress:** Healthy changes you start today become the foundation for the new generation of sperm maturing three months ahead.

### Four Evidence-Supported Daily Habits

- **Protect 7–8 hours of sleep:** Key reproductive hormone release peaks during deep nighttime sleep.
- **Regular moderate movement:** Brisk walking, swimming, or light jogging (30 minutes, 3–4 times weekly) supports pelvic circulation and healthy metabolism.
- **Antioxidant-rich whole foods:** Leafy greens, berries/fruit, nuts, and fish help defend cell membranes against everyday oxidative stress.
- **Steady hydration:** Supports healthy seminal fluid balance overall.`,
  },
  'art-4': {
    title: 'When Should a Man Schedule a Check-Up?',
    summary:
      'Clear clinical timing guidelines so you and your partner do not lose valuable months wondering.',
    reviewer: 'Clinical Reference: IAUI & European Association of Urology (EAU) Guidelines',
    body_md: `### You Don’t Need to Wait Years

Many couples wait 2 or 3 years before evaluating the male partner. Clinical guidelines favor **parallel evaluation**—checking both partners within the same timeframe.

### Practical Timing Guide

1. **After 12 months of trying:** If you have had regular unprotected intercourse for one year without pregnancy, WHO guidelines advise basic checks for both partners.
2. **After 6 months (when partner age is 35 or older):** Earlier baseline checks at month 6 help preserve options and clarity together.
3. **Anytime without waiting, if you notice or recall:**
   - Prior groin surgery (such as hernia repair) or testicular procedures.
   - Mumps infection after puberty.
   - A dull scrotal ache, heaviness, lump, or vein cluster.
   - Simply wanting peace of mind before or early in planning a family.

### Where to Start?

You can start comfortably with a **general practitioner at a primary clinic/Puskesmas**, an **Andrologist (Sp.And)**, or a **Urologist (Sp.U)**.`,
  },
  'art-5': {
    title: 'What Actually Happens at the Clinic and Lab?',
    summary:
      'A calm walkthrough from check-in to sample collection so unfamiliarity never holds you back.',
    reviewer: 'Clinical Reference: WHO Laboratory Manual 6th Ed. (2021)',
    body_md: `### Feeling Nervous Beforehand Is Completely Normal

Most hesitation comes from not knowing what the visit looks like: *"What will they ask? What is the room like?"* Here is the exact step-by-step experience.

### 1. Conversation with Your Clinician
The doctor reviews general medical history, daily habits (sleep, smoking, work environment), and your trying-to-conceive timeline. Where helpful, a brief private physical exam checks scrotal anatomy (such as varicoceles).

### 2. Preparing for Semen Analysis
Before your lab date, you follow a **2 to 7 day abstinence window** (ideally 3–4 days without ejaculation) so the sample meets reference conditions.

### 3. Inside the Private Collection Room
- A lab staff member provides a sterile, labeled wide-mouth container.
- You are guided into a **quiet, lockable private room**.
- Collection is done via masturbation directly into the container without soap, lotion, saliva, or lubricants (all of which impair sperm motion).
- Once finished, seal the lid and drop it off discreetly at the lab pass-through window.

Everything is handled confidentially, professionally, and quickly.`,
  },
  'art-6': {
    title: 'Talking With Your Partner About Testing Without Blame',
    summary:
      'Practical communication cues for husbands and wives so planning a family brings you closer as teammates.',
    reviewer: 'Clinical Reference: Couple & Reproductive Counseling Guidelines',
    body_md: `### Shifting From "You" to "Us"

Months of waiting can make every conversation feel loaded. Wives may worry about sounding pushy, while husbands may silently fear disappointing their partner.

### For Husbands
- **Take a small proactive step:** Saying *"I’d like to do a quick check too so we have the full picture"* instantly lifts huge weight off your partner.
- **Share if you feel awkward:** Admitting nervousness builds trust rather than distance.

### For Wives
- **Pick a calm moment:** Avoid bringing up scheduling when either of you is drained after work.
- **Use collaborative phrasing:** Instead of *"When are you finally going?"*, try *"Let’s map out our check-ups together so the doctor has both sides clear."*

### Keep a "TTC-Free Zone"
Protect regular evenings or weekends where fertility scheduling is off-limits so your relationship stays nourished beyond appointments.`,
  },
  'art-7': {
    title: 'Heat, Laptops on Your Lap, and Sperm Production',
    summary:
      'Why staying 2°C cooler matters for healthy sperm development and easy workspace fixes you can make today.',
    reviewer: 'Clinical Reference: Occupational & Male Reproductive Health Studies (WHO / ASRM)',
    body_md: `### Why Cooler Temperature Matters

Anatomically, the testes sit inside the scrotum outside the core abdominal cavity for one essential reason: **sperm development thrives roughly 2°C to 3°C cooler than core body temperature (37°C).**

### Everyday Sources of Extra Heat

1. **Laptops resting directly on your thighs:** Device heat plus closed legs rapidly warms the scrotal area.
2. **Sitting >4–6 hours uninterrupted:** Desk work and long commutes trap local pelvic heat.
3. **Frequent saunas or hot baths (>39°C):** Repeated high thermal exposure temporarily lowers counts and motility.
4. **Hot industrial or kitchen environments.**

### Simple Changes Starting Today

- Use a table or cooling stand instead of your lap.
- Stand up and walk 3–5 minutes every hour of sitting.
- Choose breathable cotton underwear that isn’t overly restrictive.`,
  },
  'art-8': {
    title: 'Smoking, Vaping, and Oxidative Stress: Good News About Recovery',
    summary:
      'How nicotine and oxidants affect sperm cells—and why cutting back produces measurable natural recovery.',
    reviewer: 'Clinical Reference: WHO & ASRM Clinical Studies',
    body_md: `### Understanding Oxidative Stress Without Judgment

Quitting or cutting back on cigarettes or vapes can be tough—especially during busy work seasons. Knowing what happens at the cellular level helps turn intention into practical motivation.

### What Happens Inside Semen Fluid?

Tobacco smoke and e-cigarette vapor carry nicotine and free-radical compounds that elevate **oxidative stress** around developing sperm cells:
- Forward swimming speed (**motility**) slows down.
- Normal cell structure (**morphology**) can decline.
- Delicate sperm DNA becomes slightly more vulnerable.

### The Encouraging Part: Natural Recovery

Because fresh sperm are formed roughly every 74 days, **tobacco-related changes are largely reversible**. Studies consistently observe encouraging improvements in concentration and movement within 3 to 6 months after reducing or stopping nicotine exposure.`,
  },
  'art-9': {
    title: 'Understanding Varicocele: A Common, Treatable Male Factor',
    summary:
      'What enlarged scrotal veins are, why they often stay painless, and how clinicians diagnose and care for them.',
    reviewer: 'Clinical Reference: IAUI & EAU Varicocele Practice Guidelines',
    body_md: `### What Is a Varicocele?

A varicocele is an enlargement of veins draining blood inside the scrotum—similar to varicose veins in the legs. It is surprisingly common: seen in roughly **15% of men overall** and in **35–40% of men evaluated for subfertility**.

### Why It Often Goes Unnoticed

Most varicoceles grow slowly and **do not cause sharp pain**. Common clues include:
- A mild heavy or aching sensation after prolonged standing or strenuous activity.
- Discomfort easing when lying flat.
- Occasionally feeling soft vein clusters above the testicle (most commonly on the left side).

### How Clinicians Evaluate It

A urologist or andrologist can assess varicoceles with a straightforward exam and, if helpful, scrotal Doppler ultrasound. Not every varicocele needs a procedure—your doctor discusses tailored options based on exam and semen findings.`,
  },
  'art-10': {
    title: 'Reading a Semen Analysis Without Panic: WHO Reference Limits Explained',
    summary:
      'A plain-language guide to volume, concentration, motility, and morphology numbers.',
    reviewer: 'Clinical Reference: WHO Laboratory Manual 6th Ed. (2021)',
    body_md: `### One Report Is Never a Final Verdict

Medical terms and asterisk flags on lab printouts look intimidating. Remember WHO’s foundational principle: **single semen samples naturally fluctuate**, and only a clinician interprets them in full context.

### The Four Core WHO 6th Edition (2021) Reference Markers

1. **Volume (Lower limit: ≥ 1.4 mL)**
   Total fluid volume; slightly low numbers sometimes simply reflect missed droplets or short abstinence.
2. **Concentration (Lower limit: ≥ 16 million/mL)**
   Density of sperm per milliliter of fluid.
3. **Motility (Total ≥ 42%, Progressive ≥ 30%)**
   Proportion moving actively and swimming forward.
4. **Normal Morphology (Lower limit: ≥ 4%)**
   Often the most misunderstood figure! Seeing "5% normal" alarms many men—yet labs use strict microscopic scoring where **4% or higher already sits inside the healthy reference range**.

### Next Step
Bring your report to your doctor to look at the bigger picture together with your partner.`,
  },
  'art-11': {
    title: 'Sleep, Work Stress, and Male Reproductive Hormones',
    summary:
      'Why real rest and stress recovery are practical fertility habits—not clichés.',
    reviewer: 'Clinical Reference: Reproductive Endocrinology & Sleep Medicine',
    body_md: `### Brain-to-Testis Hormonal Signaling

Sperm production and natural testosterone rely on rhythmic hormone signals released by the brain (hypothalamus and pituitary gland). Those signals respond directly to daily sleep depth and chronic stress load.

### What Chronic Short Sleep (<6 Hours) Does

Peak daily testosterone release occurs during **deep restorative sleep overnight**. Weeks of chronic sleep restriction can reduce baseline testosterone noticeably.

### How Cortisol Plays a Role

Under ongoing pressure, elevated stress hormone (**cortisol**) competes with and dampens the brain signals that support sperm and hormone production.

### Tonight’s Small Adjustment
- Aim for consistent sleep/wake windows even on weekends.
- Dim screens 30 minutes before bed.
- Take 15 minutes for an unhurried walk or calm chat with your partner.`,
  },
  'art-12': {
    title: 'Your Health Privacy on Side by Side & Data Protection Principles',
    summary:
      'How on-device encryption, granular opt-in consent, and instant erasure keep your reproductive data in your hands.',
    reviewer: 'Reviewed by: Side by Side Digital Privacy & Ethics Team',
    body_md: `### Reproductive Health Data Belongs Strictly to You

Fear of privacy leaks stops many people from seeking guidance. **Side by Side** is built around *Privacy by Design* so you stay in control from day one.

### Five Privacy Guarantees

1. **Use Anonymously Without an Account:** Complete self-checks, read guides, and track lab results without providing a name or email. On-device records are encrypted locally using **Web Crypto (AES-GCM-256)** in IndexedDB.
2. **Granular Consents (Default OFF):** Nothing syncs to an account, shares with a partner, or opens to clinicians unless you explicitly toggle permission on.
3. **Couple Sharing Without Exposing Raw Records:** In Couple Mode, partners only see shared plan milestones—not private answers or numbers unless you specifically opt in per item.
4. **1-Hour Audited Doctor QR Links:** Shared clinician codes expire automatically after 1 hour and log every view on your timeline.
5. **Instant Full Deletion:** Using *"Delete All My Data"* in Settings permanently erases both local encrypted storage and cloud records.`,
  },
};

export const FAQS_EN: Record<string, { category: string; question: string; answer: string }> = {
  'faq-1': {
    category: 'Privacy',
    question: 'Can my partner or anyone else see my Self-Check answers?',
    answer:
      'No. By default, answers are encrypted locally on your device. Even after linking Couple Mode with your partner, they only see shared milestone statuses (such as "Self-Check Completed")—never raw answers or lab figures unless you opt in per item.',
  },
  'faq-2': {
    category: 'Medical & Evaluation',
    question: 'Does the Self-Check replace seeing a doctor?',
    answer:
      'No. Side by Side provides evidence-informed educational self-guidance and factor mapping, not a medical diagnosis. Only a clinician can assess your individual health directly.',
  },
  'faq-3': {
    category: 'Costs & BPJS/JKN',
    question: 'Is male fertility evaluation covered by BPJS Kesehatan (JKN)?',
    answer:
      'Primary-care consultations and urology referrals for medical indications (such as scrotal pain, infection, or suspected varicocele via Puskesmas/FKTP referral) are often eligible for JKN coverage. Routine fertility-only semen testing at some facilities is billed privately. Confirm policies directly with your target facility.',
  },
  'faq-4': {
    category: 'Test Preparation',
    question: 'Why wait 2 to 7 days before a semen analysis?',
    answer:
      'A 2–7 day abstinence window (typically 3–4 days) standardizes volume, count, and movement against WHO criteria. Shorter intervals may lower count temporarily, while longer than 7 days can reduce active motility.',
  },
  'faq-5': {
    category: 'Privacy & Security',
    question: 'What if I open this app on a shared phone or public computer?',
    answer:
      'Use Anonymous Mode without an email, lock sensitive tabs behind local AES-GCM encryption / PIN, keep sharing toggles off by default, and use "Delete All My Data" in Settings whenever finished.',
  },
};

export const FACILITIES_EN: Record<
  string,
  { typeLabel: string; hours: string; friendliness_notes: string }
> = {
  'fac-jkt-1': {
    typeLabel: 'Hospital',
    hours: 'Mon–Fri 07:30–16:00, Sat 08:00–13:00',
    friendliness_notes:
      'Private sample collection room inside the specialized lab wing, experienced andrology & urology specialists, and JKN referrals accepted for urologic indications.',
  },
  'fac-jkt-2': {
    typeLabel: 'Clinic',
    hours: 'Mon–Sat 08:00–19:00',
    friendliness_notes:
      'Privacy-code check-in without calling names aloud in the waiting area, soundproofed collection room connecting directly to the lab counter, and warm couple counseling.',
  },
  'fac-jkt-3': {
    typeLabel: 'Primary Care (Puskesmas)',
    hours: 'Mon–Fri 07:30–16:00',
    friendliness_notes:
      'Ideal starting point for free GP counseling (for active JKN members) and preparing tiered referrals to hospital Urology clinics.',
  },
  'fac-jkt-4': {
    typeLabel: 'Hospital',
    hours: 'Mon–Sat 07:00–20:00',
    friendliness_notes:
      'Calm private waiting lounge, punctual app-based scheduling, and password-encrypted digital lab delivery.',
  },
  'fac-jkt-5': {
    typeLabel: 'Hospital',
    hours: 'Mon–Fri 07:30–15:30, Sat 07:30–12:00',
    friendliness_notes:
      'Welcomes both JKN and self-pay patients at accessible fees with approachable clinicians experienced in male reproductive education.',
  },
  'fac-jkt-6': {
    typeLabel: 'Diagnostic Lab',
    hours: 'Mon–Sat 06:30–15:00 (Semen collection 08:00–12:00)',
    friendliness_notes:
      'Follows WHO 2021 standards with clean private collection rooms located separately from general blood-draw queues.',
  },
  'fac-bdg-1': {
    typeLabel: 'Hospital',
    hours: 'Mon–Fri 07:30–15:30',
    friendliness_notes:
      'West Java’s main referral center featuring multidisciplinary Urology, Andrology, and Counseling teams; accepts JKN urologic referrals.',
  },
  'fac-bdg-2': {
    typeLabel: 'Hospital',
    hours: 'Mon–Sat 08:00–18:00',
    friendliness_notes:
      'Calm, modern environment where couples routinely visit together, with highly private collection rooms.',
  },
  'fac-bdg-3': {
    typeLabel: 'Clinic',
    hours: 'Mon–Sat 08:00–20:00',
    friendliness_notes:
      'Offers evening appointment slots convenient for working professionals and supports JKN primary evaluation and referrals.',
  },
  'fac-bdg-4': {
    typeLabel: 'Primary Care (Puskesmas)',
    hours: 'Mon–Sat 07:30–14:30',
    friendliness_notes:
      'Trained GPs provide non-judgmental couple guidance and prepare JKN referrals whenever clinical indications are present.',
  },
  'fac-bdg-5': {
    typeLabel: 'Hospital',
    hours: 'Mon–Fri 08:00–17:00, Sun 08:00–12:00',
    friendliness_notes:
      'Open Sunday mornings for patients with weekday schedule conflicts; serves both JKN and private-pay patients.',
  },
  'fac-sby-1': {
    typeLabel: 'Hospital',
    hours: 'Mon–Fri 07:30–15:30',
    friendliness_notes:
      'One of Indonesia’s longest-standing academic Andrology & Urology centers offering comprehensive JKN and specialist care.',
  },
  'fac-sby-2': {
    typeLabel: 'Hospital',
    hours: 'Mon–Fri 07:30–16:00, Sat 08:00–12:00',
    friendliness_notes:
      'Staffed by resident Andrology specialists focusing on clear education, with sample rooms separated from main waiting lounges.',
  },
  'fac-sby-3': {
    typeLabel: 'Clinic',
    hours: 'Mon–Sat 08:00–20:00',
    friendliness_notes:
      'Designed to be male-friendly with timed private reservations minimizing waiting-room overlap.',
  },
  'fac-sby-4': {
    typeLabel: 'Primary Care (Puskesmas)',
    hours: 'Mon–Sat 07:30–14:30',
    friendliness_notes:
      'Welcoming primary-care entry point in Surabaya for baseline health checks (blood sugar, blood pressure, preconception guidance) via JKN.',
  },
  'fac-sby-5': {
    typeLabel: 'Hospital',
    hours: 'Mon–Sat 07:30–19:30',
    friendliness_notes:
      'Discreet care offering visual lab breakdowns and unhurried clinician Q&A consultations.',
  },
};

export const PLAN_STEPS_EN: Record<string, string> = {
  cek_awal: 'Baseline Self-Check',
  pilih_layanan: 'Choose Evaluation Facility',
  jadwalkan: 'Schedule & Prep (2–7 Day Abstinence)',
  periksa: 'Clinic & Lab Visit',
  pahami_hasil: 'Understand Results Together',
  tindak_lanjut: 'Doctor Follow-Up Plan',
};

export const SERVICE_LABELS_EN: Record<string, string> = {
  Andrologi: 'Andrology',
  Urologi: 'Urology',
  Laboratorium: 'Laboratory',
};
