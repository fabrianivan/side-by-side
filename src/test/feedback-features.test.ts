// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { explainAssessment } from '../lib/risk-explainer';
import { buildIcsEvent } from '../lib/ics';
import { parseBackupJson } from '../lib/backup-import';
import {
  buildSuggestedCarePlan,
  computePathwayStages,
  createEmptyCarePathway,
  getRouteSteps,
  importClinicianPlans,
  lifestyleFocusFromAnswers,
  mergeCarePlanItems,
  recommendSpecialist,
  type ClinicianCarePlan,
} from '../lib/care-pathway';
import {
  appendAssessmentSnapshot,
  boundJournal,
  buildTimeline,
  checkInsToCsv,
  computeTmsc,
  createAssessmentSnapshot,
  createEmptyJournal,
  describeMetricTrend,
  diffSnapshots,
  getLevelLabels,
  NUMERIC_METRICS,
  upsertCheckIn,
  type CheckInEntry,
} from '../lib/health-journal';

const metric = (key: string) => NUMERIC_METRICS.find((m) => m.key === key)!;

describe('Feedback #1 — Explainable plain-language risk breakdown', () => {
  it('explains a time-based result as decisive without revealing the partner’s age', () => {
    const exp = explainAssessment(
      { ttc_duration: '6_to_12_months', partner_context: 'over_35', smoking_habit: 'never_or_quit' },
      'en',
    );
    expect(exp.levelCode).toBe('within_1_2_months');
    expect(exp.reasons[0].kind).toBe('time_rule');
    const ttc = exp.factors.find((f) => f.questionId === 'ttc_duration');
    expect(ttc?.isDecisive).toBe(true);
    const everyString = JSON.stringify(exp);
    expect(everyString).not.toMatch(/35/);
    expect(everyString).not.toMatch(/partner_context/);
    expect(exp.factors.some((f) => f.questionId === 'partner_context')).toBe(false);
  });

  it('explains when a time rule sets the floor and other factors raise it to “see a doctor soon”', () => {
    const exp = explainAssessment(
      {
        ttc_duration: '12_to_24_months',
        smoking_habit: 'daily_heavy',
        heat_exposure: 'moderate_laptop_sitting',
        physical_activity: 'sedentary',
      },
      'en',
    );
    expect(exp.levelCode).toBe('immediate');
    expect(exp.reasons.map((r) => r.kind)).toEqual(['time_rule', 'combined']);
    expect(exp.reasons[1].text).toMatch(/daily smoking habit/);
    expect(exp.whatCouldChange.canImproveWithHabits).toBe(true);
  });

  it('flags medical red flags as decisive and explains that habits cannot change the advice', () => {
    const exp = explainAssessment(
      { reproductive_history: 'varicocele_or_infection', smoking_habit: 'daily_heavy' },
      'id',
    );
    expect(exp.levelCode).toBe('immediate');
    expect(exp.reasons.some((r) => r.kind === 'red_flag')).toBe(true);
    expect(exp.domains.find((d) => d.key === 'medical')?.influence).toBe('high');
    expect(exp.whatCouldChange.canImproveWithHabits).toBe(false);
    expect(exp.whatCouldChange.text).toMatch(/riwayat medis/);
    const varicocele = exp.factors.find((f) => f.questionId === 'reproductive_history')!;
    expect(varicocele.changeability).toBe('medical');
    expect(varicocele.whatYouCanDo).toBeTruthy();
  });

  it('shows how improving changeable habits could move a cumulative result to routine', () => {
    const exp = explainAssessment(
      { smoking_habit: 'daily_heavy', heat_exposure: 'high_occupational_sauna', sleep_and_stress: 'good_rest' },
      'en',
    );
    expect(exp.levelCode).toBe('within_1_2_months');
    expect(exp.reasons[0].kind).toBe('combined');
    expect(exp.domains.find((d) => d.key === 'lifestyle')?.influence).toBe('high');
    expect(exp.whatCouldChange.canImproveWithHabits).toBe(true);
    expect(exp.whatCouldChange.improvedLevelLabel).toBeTruthy();
    expect(exp.strengths.length).toBeGreaterThan(0);
  });

  it('uses words, not a numeric score, for influence', () => {
    const exp = explainAssessment({ smoking_habit: 'daily_heavy', heat_exposure: 'high_occupational_sauna' }, 'en');
    for (const f of exp.factors) expect(['low', 'moderate', 'high']).toContain(f.influence);
    // total weight is 6 — it must never be surfaced as a "score"
    const text = [exp.headline, ...exp.reasons.map((r) => r.text), exp.whatCouldChange.text].join(' ');
    expect(text).not.toMatch(/\bscore\b|\bskor\b|\b6\b/i);
  });

  it('reports a clear routine result and counts answered questions excluding partner context', () => {
    const exp = explainAssessment({ ttc_duration: 'under_6_months', partner_context: 'under_35' }, 'id');
    expect(exp.levelCode).toBe('routine');
    expect(exp.reasons[0].kind).toBe('clear');
    expect(exp.answeredCount).toBe(1);
    expect(exp.totalCount).toBe(11);
    expect(exp.unanswered.length).toBe(10);
  });
});

describe('Feedback #2 — Connected specialist referral pathway', () => {
  it('routes pain/swelling to urology with an emergency safety note', () => {
    const rec = recommendSpecialist({ physical_symptoms: 'frequent_pain_or_swelling' }, 'immediate', 'en');
    expect(rec.primary).toBe('urology');
    expect(rec.firstTests).toContain('scrotal_ultrasound');
    expect(rec.emergencyNote).toMatch(/emergency/i);
  });

  it('routes varicocele to andrology with urology supporting, and steroids to andrology with hormones', () => {
    const varicocele = recommendSpecialist({ reproductive_history: 'varicocele_or_infection' }, 'immediate', 'id');
    expect(varicocele.primary).toBe('andrology');
    expect(varicocele.supporting).toContain('urology');

    const steroids = recommendSpecialist({ medications_supplements: 'testosterone_or_steroids' }, 'immediate', 'en');
    expect(steroids.primary).toBe('andrology');
    expect(steroids.firstTests).toContain('hormone_panel');
  });

  it('routes 12+ months of trying to andrology plus a couples fertility clinic', () => {
    const rec = recommendSpecialist({ ttc_duration: '12_to_24_months' }, 'within_1_2_months', 'en');
    expect(rec.primary).toBe('andrology');
    expect(rec.supporting).toEqual(expect.arrayContaining(['fertility_clinic', 'lab']));
  });

  it('starts routine/lifestyle results at primary care (JKN entry point) and adds counselling for heavy stress', () => {
    const rec = recommendSpecialist({ sleep_and_stress: 'high_stress_insomnia' }, 'routine', 'en');
    expect(rec.primary).toBe('gp');
    expect(rec.supporting).toContain('counselling');
    expect(getRouteSteps('jkn', 'andrology', 'id').join(' ')).toMatch(/90 hari/);
    expect(getRouteSteps('private', 'lab', 'en').join(' ')).toMatch(/without a doctor’s referral/);
  });

  it('advances pathway stages in order from self-check to after-care', () => {
    const p = createEmptyCarePathway();
    expect(computePathwayStages(p, false)[0]).toEqual({ key: 'self_check', status: 'current' });
    const withFacility = { ...p, specialistKey: 'andrology' as const, facility: { id: 'f', name: 'Clinic' } };
    const stages = computePathwayStages(withFacility, true);
    expect(stages.map((s) => s.status)).toEqual(['done', 'done', 'done', 'current', 'upcoming', 'upcoming']);
  });

  it('turns a logged visit into a dated after-care plan without duplicating open steps', () => {
    const items = buildSuggestedCarePlan(
      {
        date: '2026-11-10',
        outcomes: ['semen_analysis_ordered', 'lifestyle_advice'],
        nextVisitDate: '2026-12-15',
      },
      lifestyleFocusFromAnswers({ smoking_habit: 'daily_heavy', alcohol_habit: 'none' }),
    );
    const keys = items.map((i) => i.key);
    expect(keys).toEqual(
      expect.arrayContaining(['do_semen_analysis', 'enter_results', 'habit_plan', 'follow_up_visit', 'monthly_checkin']),
    );
    expect(items.find((i) => i.key === 'do_semen_analysis')?.dueDate).toBe('2026-11-24');
    expect(items.find((i) => i.key === 'habit_plan')?.focus).toEqual(['smoking']);
    const merged = mergeCarePlanItems(items, buildSuggestedCarePlan({ date: '2026-11-11', outcomes: [] }, []));
    expect(merged.filter((i) => i.key === 'monthly_checkin').length).toBe(1);
  });

  it('imports a clinician’s post-visit plan once (idempotent) and links it to the pathway', () => {
    const plan: ClinicianCarePlan = {
      tokenCode: 'SBS-ABC123-1H',
      writtenAt: '2026-11-12T03:00:00.000Z',
      clinicianName: 'dr. Hendra, Sp.And',
      specialty: 'andrology',
      visitDate: '2026-11-12',
      summaryForPatient: 'Semen analysis looks below reference; repeat in 3 months.',
      orderedTests: ['repeat_semen_analysis', 'hormone_panel'],
      lifestyleFocus: ['smoking'],
      nextFollowUpDate: '2027-02-12',
    };
    const first = importClinicianPlans(createEmptyCarePathway(), [plan]);
    expect(first.importedCount).toBe(1);
    expect(first.pathway.consultations[0].source).toBe('clinician');
    expect(first.pathway.carePlan.some((i) => i.key === 'repeat_semen_analysis' && i.source === 'clinician')).toBe(true);
    // App-generated generic steps are never attributed to the doctor
    expect(first.pathway.carePlan.find((i) => i.key === 'monthly_checkin')?.source).toBe('suggested');
    const second = importClinicianPlans(first.pathway, [plan]);
    expect(second.importedCount).toBe(0);
    expect(second.pathway.consultations.length).toBe(1);
  });
});

describe('Feedback #3 — Private longitudinal tracking', () => {
  it('never stores partner context in self-check history snapshots', () => {
    const snap = createAssessmentSnapshot(
      { ttc_duration: '6_to_12_months', partner_context: 'over_35' },
      { levelCode: 'within_1_2_months', evaluatedAt: '2026-08-01T00:00:00.000Z' },
    );
    expect(snap.answers.partner_context).toBeUndefined();
    expect(snap.domainInfluence.timing).toBe('moderate');
  });

  it('keeps history sorted and de-duplicated, and describes what improved between self-checks', () => {
    const a = createAssessmentSnapshot(
      { smoking_habit: 'daily_heavy', sleep_and_stress: 'good_rest' },
      { levelCode: 'routine', evaluatedAt: '2026-08-01T00:00:00.000Z' },
    );
    const b = createAssessmentSnapshot(
      { smoking_habit: 'never_or_quit', sleep_and_stress: 'high_stress_insomnia' },
      { levelCode: 'routine', evaluatedAt: '2026-11-01T00:00:00.000Z' },
    );
    const history = appendAssessmentSnapshot(appendAssessmentSnapshot([b], a), b);
    expect(history.map((h) => h.takenAt)).toEqual([a.takenAt, b.takenAt]);
    const changes = diffSnapshots(a, b, 'en');
    expect(changes.find((c) => c.questionId === 'smoking_habit')?.direction).toBe('better');
    expect(changes.find((c) => c.questionId === 'sleep_and_stress')?.direction).toBe('worse');
  });

  it('writes plain-language trends with the correct direction for each metric type', () => {
    const entries: CheckInEntry[] = [
      { id: '1', date: '2026-08-01', sleepHours: 5.5, cigarettesPerDay: 10, createdAt: '' },
      { id: '2', date: '2026-10-01', sleepHours: 7.5, cigarettesPerDay: 12, createdAt: '' },
    ];
    const sleep = describeMetricTrend(entries, metric('sleepHours'), 'en')!;
    expect(sleep.direction).toBe('better');
    expect(sleep.inTarget).toBe(true);
    expect(sleep.text).toMatch(/5\.5 → 7\.5/);
    const cigs = describeMetricTrend(entries, metric('cigarettesPerDay'), 'id')!;
    expect(cigs.direction).toBe('worse');
    expect(describeMetricTrend(entries, metric('weightKg'), 'en')).toBeNull();
  });

  it('replaces a same-day check-in, exports safe CSV, and bounds journal size for sync', () => {
    let list = upsertCheckIn([], { id: 'a', date: '2026-11-01', sleepHours: 6, createdAt: '' });
    list = upsertCheckIn(list, { id: 'b', date: '2026-11-01', sleepHours: 7, note: 'tired, "busy"', createdAt: '' });
    expect(list.length).toBe(1);
    expect(checkInsToCsv(list)).toContain('"tired, ""busy"""');
    // Neutralizes CSV spreadsheet formula injection prefixes (=, +, -, @)
    const formulaCsv = checkInsToCsv([{ id: 'f', date: '2026-11-02', note: '=SUM(A1:A2)', createdAt: '' }]);
    expect(formulaCsv).toContain("'=SUM(A1:A2)");

    const big = createEmptyJournal();
    big.checkIns = Array.from({ length: 450 }, (_, i) => ({ id: `c${i}`, date: '2026-01-01', createdAt: '' }));
    big.carePathway.carePlan = Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, done: false, source: 'self' as const }));
    const bounded = boundJournal(big);
    expect(bounded.checkIns.length).toBe(400);
    expect(bounded.carePathway.carePlan.length).toBe(100);
  });

  it('populates localized timeline details for completed key-based care plan steps', () => {
    const journal = createEmptyJournal();
    journal.carePathway.carePlan.push({
      id: 'p-clin-1',
      key: 'repeat_semen_analysis',
      done: true,
      doneAt: '2026-11-15T08:00:00.000Z',
      source: 'clinician',
    });
    const events = buildTimeline(journal, [], getLevelLabels('en'), 'en');
    expect(events).toHaveLength(1);
    expect(events[0].detail).toContain('Repeat the semen analysis');
  });

  it('computes TMSC with the same formula as the lab simulator', () => {
    expect(computeTmsc({ volume_ml: 2, concentration_m_per_ml: 20, progressive_motility_pct: 50 })).toBe(20);
  });

  it('generates RFC 5545 .ics calendar events with UID, escaping, floating local time, and alarm', () => {
    const ics = buildIcsEvent(
      {
        uid: 'test-uid@side-by-side.app',
        title: 'Visit, Andrology; Follow-up',
        start: '2026-11-25T09:30',
        durationMinutes: 45,
        location: 'RSUPN Dr. Cipto, Jakarta',
        description: 'Line 1\nLine 2',
        alarmMinutesBefore: 1440,
      },
      new Date('2026-11-22T00:00:00Z'),
    );
    expect(ics).toContain('UID:test-uid@side-by-side.app');
    expect(ics).toContain('DTSTAMP:20261122T000000Z');
    expect(ics).toContain('DTSTART:20261125T093000');
    expect(ics).toContain('DTEND:20261125T101500');
    expect(ics).toContain('SUMMARY:Visit\\, Andrology\\; Follow-up');
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1440M');
  });

  it('validates and restores JSON backups while stripping partner_context and rejecting invalid files', () => {
    const valid = parseBackupJson(
      JSON.stringify({
        app: 'Side by Side — Ekspor Data Pribadi',
        consents: { store_results: true },
        assessmentAnswers: { ttc_duration: '12_to_24_months', smoking_habit: 'daily_heavy' },
        labResults: [
          {
            testDate: '2026-10-15',
            volume_ml: 2.2,
            concentration_m_per_ml: 18,
            total_motility_pct: 46,
            progressive_motility_pct: 33,
            morphology_normal_pct: 5,
          },
        ],
        reminders: [{ type: 'follow_up', title: 'Kontrol', remindAt: '2026-12-01T09:00' }],
        cycleTracker: { cycleStartDate: '2026-10-01', habitLog: { '2026-10-02': ['cool_temp'] } },
        healthJournal: {
          assessmentHistory: [
            {
              id: 'snap-1',
              takenAt: '2026-10-01T00:00:00.000Z',
              levelCode: 'within_1_2_months',
              answers: { ttc_duration: '6_to_12_months', partner_context: 'over_35' },
              domainInfluence: { medical: 'none', timing: 'moderate', lifestyle: 'none' },
            },
          ],
          checkIns: [{ id: 'ci-1', date: '2026-10-10', sleepHours: 7, createdAt: '2026-10-10T01:00:00.000Z' }],
          carePathway: { prepDone: {}, consultations: [], carePlan: [], importedPlanIds: [] },
          updatedAt: '2026-10-10T01:00:00.000Z',
        },
      }),
      'en',
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.summary).toMatchObject({
        hasAssessment: true,
        labCount: 1,
        reminderCount: 1,
        checkInCount: 1,
        habitDaysCount: 1,
      });
      expect(valid.data.healthJournal?.assessmentHistory[0].answers.partner_context).toBeUndefined();
    }

    expect(parseBackupJson('not json', 'en').ok).toBe(false);
    expect(parseBackupJson(JSON.stringify({ unrelated: 123 }), 'en').ok).toBe(false);
  });
});
