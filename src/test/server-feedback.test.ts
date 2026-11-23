// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../server/index';

function cookieOf(setCookieHeader: string | string[] | undefined): string {
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const raw = list.find((c) => c.startsWith('sbs_session='));
  if (!raw) throw new Error('Expected sbs_session cookie');
  return raw.split(';')[0];
}

const SAMPLE_JOURNAL = {
  assessmentHistory: [
    {
      id: 'chk-1',
      takenAt: '2026-08-01T00:00:00.000Z',
      levelCode: 'within_1_2_months',
      answers: { ttc_duration: '12_to_24_months', smoking_habit: 'daily_heavy' },
      domainInfluence: { medical: 'none', timing: 'high', lifestyle: 'moderate' },
    },
  ],
  checkIns: [
    { id: 'ci-1', date: '2026-08-02', sleepHours: 5.5, stressLevel: 4, note: 'RAHASIA-CATATAN-PRIBADI', createdAt: '2026-08-02T01:00:00.000Z' },
  ],
  carePathway: {
    specialistKey: 'andrology',
    route: 'jkn',
    facility: { id: 'fac-jkt-1', name: 'RSUPN Dr. Cipto Mangunkusumo', city: 'Jakarta', acceptsJkn: true },
    appointmentAt: '2026-11-20T09:00',
    prepDone: { abstinence: true },
    consultations: [],
    carePlan: [{ id: 'plan-1', key: 'monthly_checkin', dueDate: '2026-12-01', done: false, source: 'suggested' }],
    importedPlanIds: [],
  },
  updatedAt: '2026-11-17T00:00:00.000Z',
};

describe('Reviewer feedback backend: encrypted journal sync, referral scopes & clinician care plans', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbs-feedback-test-'));
  const dbUrl = `file:${path.join(tempDir, 'test.db')}`;
  const prevInvite = process.env.NAKES_INVITE_CODE;
  const prevKey = process.env.ENCRYPTION_KEY;
  let db: PrismaClient;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NAKES_INVITE_CODE = 'CLINIC-TEST-SECRET-2026';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-minimum-len';
    execFileSync('npx', ['prisma', 'db', 'push', '--force-reset', '--skip-generate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
    });
    db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await db.$connect();
    app = await buildServer(db);
  }, 30000);

  afterAll(async () => {
    process.env.NAKES_INVITE_CODE = prevInvite;
    process.env.ENCRYPTION_KEY = prevKey;
    if (app) await app.close();
    if (db) await db.$disconnect();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('syncs the private health journal encrypted at rest, returns it to the owner only, and erases it', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'journal@example.com', password: 'Password123!' },
    });
    const user = reg.json();
    const cookie = cookieOf(reg.headers['set-cookie']);

    const sync = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: { cookie },
      payload: { userId: user.id, journal: SAMPLE_JOURNAL },
    });
    expect(sync.statusCode).toBe(200);
    expect(sync.json().journalSynced).toBe(true);

    const row = await db.healthJournal.findUnique({ where: { user_id: user.id } });
    expect(row).toBeTruthy();
    expect(row!.journal_json_encrypted).not.toContain('RAHASIA-CATATAN-PRIBADI');
    expect(row!.journal_json_encrypted).not.toContain('andrology');

    const data = await app.inject({ method: 'GET', url: '/api/account/data', headers: { cookie } });
    expect(data.json().journal.checkIns[0].note).toBe('RAHASIA-CATATAN-PRIBADI');
    expect(data.json().journal.carePathway.specialistKey).toBe('andrology');

    // Invalid journal is skipped without breaking the rest of the sync
    const badSync = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: { cookie },
      payload: {
        userId: user.id,
        reminders: [{ type: 'follow_up', title: 'Kontrol', remindAt: '2026-12-01T09:00' }],
        journal: { ...SAMPLE_JOURNAL, checkIns: [{ id: 'x', date: 'not-a-date', createdAt: 'nope' }] },
      },
    });
    expect(badSync.statusCode).toBe(200);
    expect(badSync.json().journalSynced).toBe(false);
    expect(badSync.json().reminderCount).toBe(1);
    const stillThere = await app.inject({ method: 'GET', url: '/api/account/data', headers: { cookie } });
    expect(stillThere.json().journal.checkIns).toHaveLength(1);

    // Another user cannot write into this journal
    const other = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'other@example.com', password: 'Password123!' },
    });
    const otherCookie = cookieOf(other.headers['set-cookie']);
    const idor = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: { cookie: otherCookie },
      payload: { userId: user.id, journal: SAMPLE_JOURNAL },
    });
    expect(idor.statusCode).toBe(403);

    const del = await app.inject({ method: 'DELETE', url: `/api/users/${user.id}/data`, headers: { cookie } });
    expect(del.statusCode).toBe(200);
    expect(await db.healthJournal.count({ where: { user_id: user.id } })).toBe(0);
  });

  it('filters referral & progress by consent scope and lets only a verified clinician send a post-visit plan back', async () => {
    const anon = await app.inject({ method: 'POST', url: '/api/auth/anonymous', payload: { userId: 'anon-pathway01' } });
    const patientCookie = cookieOf(anon.headers['set-cookie']);
    const nakesReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'dr.hendra@clinic.id',
        password: 'Password123!',
        role: 'nakes',
        displayName: 'dr. Hendra, Sp.And',
        inviteCode: 'CLINIC-TEST-SECRET-2026',
      },
    });
    const nakesCookie = cookieOf(nakesReg.headers['set-cookie']);

    const snapshot = {
      patientAlias: 'Pasien (Mode Anonim)',
      riskExplanation: { headline: 'Mengapa…', reasons: ['Alasan'], domains: [], factors: [] },
      referral: { specialist: 'Dokter Spesialis Andrologi (Sp.And)', reasons: ['…'], firstTests: [] },
      progressSummary: ['Tidur rata-rata: 5.5 → 7 jam/malam'],
    };
    const created = await app.inject({
      method: 'POST',
      url: '/api/share-tokens',
      headers: { cookie: patientCookie },
      payload: { scope: ['history', 'care_pathway'], snapshot },
    });
    expect(created.statusCode).toBe(200);
    const code = created.json().token_code as string;

    const opened = await app.inject({ method: 'GET', url: `/api/share-tokens/${code}`, headers: { cookie: nakesCookie } });
    expect(opened.statusCode).toBe(200);
    expect(opened.json().snapshot.referral.specialist).toBe('Dokter Spesialis Andrologi (Sp.And)');
    expect(opened.json().snapshot.progressSummary).toBeUndefined();
    expect(opened.json().snapshot.riskExplanation).toBeUndefined();

    const plan = {
      specialty: 'andrology',
      visitDate: '2026-11-17',
      summaryForPatient: 'Ulangi analisis semen 3 bulan lagi; fokus berhenti merokok.',
      orderedTests: ['repeat_semen_analysis'],
      lifestyleFocus: ['smoking'],
      nextFollowUpDate: '2027-02-17',
    };
    const patientTries = await app.inject({
      method: 'POST',
      url: `/api/share-tokens/${code}/care-plan`,
      headers: { cookie: patientCookie },
      payload: plan,
    });
    expect(patientTries.statusCode).toBe(403);
    const invalid = await app.inject({
      method: 'POST',
      url: `/api/share-tokens/${code}/care-plan`,
      headers: { cookie: nakesCookie },
      payload: { ...plan, orderedTests: ['prescribe_something'] },
    });
    expect(invalid.statusCode).toBe(400);
    const written = await app.inject({
      method: 'POST',
      url: `/api/share-tokens/${code}/care-plan`,
      headers: { cookie: nakesCookie },
      payload: plan,
    });
    expect(written.statusCode).toBe(200);

    const row = await db.shareToken.findUnique({ where: { token_code: code } });
    expect(row!.care_plan_json_encrypted).not.toContain('berhenti merokok');

    const audit = await app.inject({ method: 'GET', url: `/api/share-tokens/${code}/audit`, headers: { cookie: patientCookie } });
    expect(audit.json().care_plan_written_at).toBeTruthy();
    expect(audit.json().accessed_log[0].action).toBe('Menulis Rencana Pasca-Konsultasi');

    const plans = await app.inject({ method: 'GET', url: '/api/care-plans', headers: { cookie: patientCookie } });
    expect(plans.statusCode).toBe(200);
    expect(plans.json()).toHaveLength(1);
    expect(plans.json()[0]).toMatchObject({
      tokenCode: code,
      clinicianName: 'dr. Hendra, Sp.And',
      orderedTests: ['repeat_semen_analysis'],
    });
    const strangerPlans = await app.inject({ method: 'GET', url: '/api/care-plans', headers: { cookie: nakesCookie } });
    expect(strangerPlans.json()).toHaveLength(0);

    // Revoked or older than 24 hours → no more writes
    await db.shareToken.update({ where: { token_code: code }, data: { created_at: new Date(Date.now() - 25 * 3600_000) } });
    const late = await app.inject({
      method: 'POST',
      url: `/api/share-tokens/${code}/care-plan`,
      headers: { cookie: nakesCookie },
      payload: plan,
    });
    expect(late.statusCode).toBe(410);
  });
});
