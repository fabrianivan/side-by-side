// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../server/index';

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const raw = list.find((c) => c.startsWith('sbs_session='));
  if (!raw) throw new Error('Expected sbs_session cookie header to be present');
  return raw.split(';')[0];
}

describe('Production Backend Security, Encryption At Rest, Clinician Gating & Sync Tests', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbs-api-test-'));
  const dbPath = path.join(tempDir, 'test.db');
  const dbUrl = `file:${dbPath}`;
  const prevInviteCode = process.env.NAKES_INVITE_CODE;
  const prevEncryptionKey = process.env.ENCRYPTION_KEY;

  let testPrisma: PrismaClient;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NAKES_INVITE_CODE = 'CLINIC-TEST-SECRET-2026';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-minimum-len';

    execFileSync('npx', ['prisma', 'db', 'push', '--force-reset', '--skip-generate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
    });

    testPrisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
    await testPrisma.$connect();
    app = await buildServer(testPrisma);
  }, 30000);

  afterAll(async () => {
    process.env.NAKES_INVITE_CODE = prevInviteCode;
    process.env.ENCRYPTION_KEY = prevEncryptionKey;
    if (app) await app.close();
    if (testPrisma) await testPrisma.$disconnect();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns readiness health check, localized config, facilities, and articles without demo endpoints', async () => {
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe('ok');
    expect(health.json().db).toBe('connected');

    const cfgEn = await app.inject({ method: 'GET', url: '/api/config?locale=en' });
    expect(cfgEn.statusCode).toBe(200);
    const cfgBody = cfgEn.json();
    expect(cfgBody.assessmentRules.disclaimer).toContain('This is not a diagnosis.');
    expect(cfgBody.semenReference.parameters[0].label).toBe('Ejaculate Volume');
    expect(cfgBody.templates.partnerInviteTemplates[0].tone).toBe('Warm');

    const facEn = await app.inject({ method: 'GET', url: '/api/facilities?locale=en' });
    expect(facEn.statusCode).toBe(200);
    expect(facEn.json()[0].hours).toMatch(/Mon–Fri|Mon–Sat/);

    const artEn = await app.inject({ method: 'GET', url: '/api/articles?locale=en' });
    expect(artEn.statusCode).toBe(200);
    expect(artEn.json()[0].title).toContain('Male Reproductive Health');

    // Demo & unverified magic-link endpoints must NOT exist
    const demoSession = await app.inject({
      method: 'POST',
      url: '/api/auth/demo-session',
      payload: { persona: 'rendra' },
    });
    expect(demoSession.statusCode).toBe(404);

    const magicLink = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'attacker@example.com' },
    });
    expect(magicLink.statusCode).toBe(404);
  });

  it('enforces strong registration, provider invite code gating, current password on change, and IDOR protections', async () => {
    // Reject short passwords
    const weakReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'weak@example.com', password: '123456' },
    });
    expect(weakReg.statusCode).toBe(400);

    // Reject uninvited clinician registration
    const uninvitedNakes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'fake.doc@example.com',
        password: 'StrongPassword1!',
        role: 'nakes',
        inviteCode: 'WRONG-CODE',
      },
    });
    expect(uninvitedNakes.statusCode).toBe(403);

    // Valid patient registration
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'Alice@Example.com',
        password: 'Password123!',
        displayName: 'Alice Test',
      },
    });
    expect(regRes.statusCode).toBe(200);
    const alice = regRes.json();
    expect(alice.email).toBe('alice@example.com');
    const rawCookieHeader = regRes.headers['set-cookie'];
    const rawCookieString = Array.isArray(rawCookieHeader) ? rawCookieHeader[0] : rawCookieHeader || '';
    expect(rawCookieString).toContain('HttpOnly');
    expect(rawCookieString).toContain('SameSite=Lax');
    const aliceCookie = extractSessionCookie(rawCookieHeader);

    // Duplicate registration rejected (case-insensitive email)
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@example.com', password: 'Password123!' },
    });
    expect(dupRes.statusCode).toBe(409);

    // Wrong password rejected
    const badLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.com', password: 'WrongPassword!' },
    });
    expect(badLogin.statusCode).toBe(401);

    // Password change requires valid currentPassword
    const missingCurPwd = await app.inject({
      method: 'PUT',
      url: `/api/auth/profile/${alice.id}`,
      headers: { cookie: aliceCookie },
      payload: { newPassword: 'NewPassword456!' },
    });
    expect(missingCurPwd.statusCode).toBe(400);

    const wrongCurPwd = await app.inject({
      method: 'PUT',
      url: `/api/auth/profile/${alice.id}`,
      headers: { cookie: aliceCookie },
      payload: { currentPassword: 'WrongPassword!', newPassword: 'NewPassword456!' },
    });
    expect(wrongCurPwd.statusCode).toBe(401);

    const validPwdChange = await app.inject({
      method: 'PUT',
      url: `/api/auth/profile/${alice.id}`,
      headers: { cookie: aliceCookie },
      payload: { currentPassword: 'Password123!', newPassword: 'NewPassword456!' },
    });
    expect(validPwdChange.statusCode).toBe(200);

    // Register second user Bob
    const bobRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'bob@example.com', password: 'Password123!', displayName: 'Bob Test' },
    });
    const bob = bobRes.json();
    const bobCookie = extractSessionCookie(bobRes.headers['set-cookie']);

    // Unauthenticated access returns 401
    expect((await app.inject({ method: 'GET', url: `/api/auth/profile/${alice.id}` })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/consents/${alice.id}`,
          payload: { key: 'store_results', granted: true },
        })
      ).statusCode
    ).toBe(401);

    // Tampered session cookie rejected with 401
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/consents/${alice.id}`,
          headers: { cookie: 'sbs_session=forged.invalidsig' },
        })
      ).statusCode
    ).toBe(401);

    // Cross-account IDOR attempt (Bob -> Alice) returns 403
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/consents/${alice.id}`,
          headers: { cookie: bobCookie },
        })
      ).statusCode
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/sync',
          headers: { cookie: bobCookie },
          payload: { userId: alice.id, results: [] },
        })
      ).statusCode
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/users/${alice.id}/data`,
          headers: { cookie: bobCookie },
        })
      ).statusCode
    ).toBe(403);
  });

  it('encrypts sensitive medical records at rest (AES-256-GCM), isolates pairings & tickets, gates nakes QR/replies, and erases data', async () => {
    // 1. Register patient Dani, partner Nina, and verified clinician Dr. Hendra
    const daniRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dani@example.com', password: 'Password123!', displayName: 'Dani' },
    });
    const dani = daniRes.json();
    const daniCookie = extractSessionCookie(daniRes.headers['set-cookie']);

    const ninaRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'nina@example.com', password: 'Password123!', displayName: 'Nina' },
    });
    const nina = ninaRes.json();
    const ninaCookie = extractSessionCookie(ninaRes.headers['set-cookie']);

    const drRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'dr.hendra@clinic.id',
        password: 'Password123!',
        displayName: 'dr. Hendra, Sp.And',
        role: 'nakes',
        inviteCode: 'CLINIC-TEST-SECRET-2026',
      },
    });
    expect(drRes.statusCode).toBe(200);
    const drCookie = extractSessionCookie(drRes.headers['set-cookie']);

    // 2. Sync assessment, lab results, reminders, cycleTracker, and doctorChecklist
    const syncPayload = {
      userId: dani.id,
      assessment: {
        answers: { ttc_duration: '12_to_24_months', smoking_habit: 'daily_heavy' },
        level: 'within_1_2_months',
        summaryFactors: [{ topic: 'Smoking', factorTitle: 'Daily smoking' }],
      },
      results: [
        {
          id: 'res-1',
          testDate: '2026-09-01',
          volume_ml: 2.2,
          concentration_m_per_ml: 18,
          total_motility_pct: 45,
          progressive_motility_pct: 32,
          morphology_normal_pct: 5,
          notes: 'Private clinical test note',
        },
        {
          id: 'res-1', // duplicate id should deduplicate
          testDate: '2026-09-01',
          volume_ml: 2.2,
          concentration_m_per_ml: 18,
          total_motility_pct: 45,
          progressive_motility_pct: 32,
          morphology_normal_pct: 5,
          notes: 'Private clinical test note',
        },
      ],
      reminders: [
        {
          id: 'rem-1',
          type: 'follow_up',
          title: 'Follow-up urology consultation',
          facilityName: 'RSCM Jakarta',
          notes: 'Bring prior lab sheet',
          remindAt: '2026-11-20T09:00',
          completed: false,
        },
      ],
      cycleTracker: {
        cycleStartDate: '2026-10-01',
        habitLog: { '2026-10-02': ['cool_temp', 'sleep_rest'] },
      },
      doctorChecklist: {
        context: { hasProlongedDuration: true, hasLabResult: true },
        selected: { 'q-physical-exam': true },
        customQuestions: [{ id: 'cq-1', text: 'Should I repeat DFI testing?' }],
      },
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: { cookie: daniCookie },
      payload: syncPayload,
    });
    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.json().resultCount).toBe(1);
    expect(syncRes.json().reminderCount).toBe(1);

    // Verify AES-256-GCM at-rest encryption in DB (no plaintext leaked in encrypted or duplicated columns!)
    const rawAssessment = await testPrisma.assessment.findFirst({ where: { user_id: dani.id } });
    const rawResult = await testPrisma.result.findFirst({ where: { user_id: dani.id } });
    const rawCycle = await testPrisma.cycleTracker.findUnique({ where: { user_id: dani.id } });
    const rawChecklist = await testPrisma.doctorChecklistState.findUnique({ where: { user_id: dani.id } });
    const rawReminder = await testPrisma.reminder.findFirst({ where: { user_id: dani.id } });
    expect(rawAssessment?.answers_json_encrypted).toMatch(/^sbs-aes-gcm-v1\$/);
    expect(rawAssessment?.answers_json_encrypted).not.toContain('daily_heavy');
    expect(rawResult?.values_json_encrypted).toMatch(/^sbs-aes-gcm-v1\$/);
    expect(rawResult?.values_json_encrypted).not.toContain('Private clinical test note');
    expect(rawResult?.notes).toBeNull();
    expect(rawResult?.attachment_name).toBeNull();
    expect(rawCycle?.habit_log_json_encrypted).toMatch(/^sbs-aes-gcm-v1\$/);
    expect(rawCycle?.habit_log_json_encrypted).not.toContain('cool_temp');
    expect(rawChecklist?.custom_questions_json).toMatch(/^sbs-aes-gcm-v1\$/);
    expect(rawChecklist?.custom_questions_json).not.toContain('Should I repeat DFI testing?');
    expect(rawReminder?.notes).toMatch(/^sbs-aes-gcm-v1\$/);
    expect(rawReminder?.notes).not.toContain('Bring prior lab sheet');

    // Verify transparent decryption on /api/account/data (including exact wall-clock remindAt!)
    const daniAccount = await app.inject({
      method: 'GET',
      url: '/api/account/data',
      headers: { cookie: daniCookie },
    });
    expect(daniAccount.statusCode).toBe(200);
    const daniData = daniAccount.json();
    expect(daniData.assessmentAnswers.smoking_habit).toBe('daily_heavy');
    expect(daniData.results).toHaveLength(1);
    expect(daniData.results[0].notes).toBe('Private clinical test note');
    expect(daniData.reminders).toHaveLength(1);
    expect(daniData.reminders[0].remindAt).toBe('2026-11-20T09:00');
    expect(daniData.reminders[0].facilityName).toBe('RSCM Jakarta');
    expect(daniData.reminders[0].notes).toBe('Bring prior lab sheet');
    expect(daniData.cycleTracker.habitLog['2026-10-02']).toEqual(['cool_temp', 'sleep_rest']);
    expect(daniData.doctorChecklist.customQuestions[0].text).toBe('Should I repeat DFI testing?');

    // 3. Pairing strict ownership & shared prep checklist sync
    const pairRes = await app.inject({
      method: 'POST',
      url: '/api/pairings',
      headers: { cookie: daniCookie },
      payload: { partnerAAlias: 'Dani', partnerBAlias: 'Nina' },
    });
    expect(pairRes.statusCode).toBe(200);
    const pairCode = pairRes.json().invite_code;
    expect(pairCode).toMatch(/^[A-Z2-9]{6}$/);

    // Non-participant cannot read pairing
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/pairings/${pairCode}`,
          headers: { cookie: drCookie },
        })
      ).statusCode
    ).toBe(403);

    // Partner Nina joins
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/pairings/${pairCode}/join`,
      headers: { cookie: ninaCookie },
      payload: { partnerBAlias: 'Nina' },
    });
    expect(joinRes.statusCode).toBe(200);
    expect(joinRes.json().user_b).toBe(nina.id);
    expect(joinRes.json().partner_shared_preview).toBeUndefined();

    // Partner B (Nina) CANNOT unlock Partner A's sharing toggles or update actor 'a'
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/pairings/${pairCode}/shared`,
          headers: { cookie: ninaCookie },
          payload: { shareLabSummary: true },
        })
      ).statusCode
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/pairings/${pairCode}/step`,
          headers: { cookie: ninaCookie },
          payload: { stepKey: 'cek_awal', actor: 'a', status: 'done' },
        })
      ).statusCode
    ).toBe(403);

    // Partner B updates her own step & shared prep checklist
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/pairings/${pairCode}/step`,
          headers: { cookie: ninaCookie },
          payload: { stepKey: 'cek_awal', actor: 'b', status: 'done' },
        })
      ).statusCode
    ).toBe(200);

    const prepRes = await app.inject({
      method: 'PUT',
      url: `/api/pairings/${pairCode}/prep`,
      headers: { cookie: ninaCookie },
      payload: {
        items: [{ id: 'prep-1', text: 'Abstinence agreed', textEn: 'Abstinence agreed', checked: true }],
      },
    });
    expect(prepRes.statusCode).toBe(200);
    expect(prepRes.json().prep_checklist[0].checked).toBe(true);

    // Partner A enables level + lab summary sharing -> Partner B sees decrypted counts
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/pairings/${pairCode}/shared`,
          headers: { cookie: daniCookie },
          payload: { shareAssessmentLevel: true, shareLabSummary: true },
        })
      ).statusCode
    ).toBe(200);

    const ninaView = await app.inject({
      method: 'GET',
      url: `/api/pairings/${pairCode}`,
      headers: { cookie: ninaCookie },
    });
    expect(ninaView.statusCode).toBe(200);
    expect(ninaView.json().partner_shared_preview).toEqual({
      assessmentLevel: 'within_1_2_months',
      labCount: 1,
    });

    // 4. Share Token: encrypted at rest, gated to verified nakes, owner audit endpoint
    const shareRes = await app.inject({
      method: 'POST',
      url: '/api/share-tokens',
      headers: { cookie: daniCookie },
      payload: {
        scope: ['history'],
        snapshot: {
          patientAlias: 'Dani',
          programDuration: '14 months trying to conceive',
          assessmentLevel: 'Recommended to consult within 1 to 2 months',
          reportedRiskFactors: ['Hidden Factor'],
          labResults: [{ concentration_m_per_ml: 18 }],
        },
      },
    });
    expect(shareRes.statusCode).toBe(200);
    const tokenCode = shareRes.json().token_code;

    const rawShareRow = await testPrisma.shareToken.findUnique({ where: { token_code: tokenCode } });
    expect(rawShareRow?.snapshot_json).toMatch(/^sbs-aes-gcm-v1\$/);
    expect(rawShareRow?.snapshot_json).not.toContain('Hidden Factor');

    // Non-clinician cannot read share token summary
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/share-tokens/${tokenCode}`,
          headers: { cookie: ninaCookie },
        })
      ).statusCode
    ).toBe(403);

    // Verified clinician reads scoped summary & logs access
    const drRead = await app.inject({
      method: 'GET',
      url: `/api/share-tokens/${tokenCode}`,
      headers: { cookie: drCookie },
    });
    expect(drRead.statusCode).toBe(200);
    expect(drRead.json().snapshot.programDuration).toBe('14 months trying to conceive');
    expect(drRead.json().snapshot.reportedRiskFactors).toBeUndefined();
    expect(drRead.json().snapshot.labResults).toBeUndefined();
    expect(drRead.json().accessed_log[0].viewer_name).toBe('dr. Hendra, Sp.And');

    // Owner checks audit log without adding a new clinician access log entry
    const auditRes = await app.inject({
      method: 'GET',
      url: `/api/share-tokens/${tokenCode}/audit`,
      headers: { cookie: daniCookie },
    });
    expect(auditRes.statusCode).toBe(200);
    expect(auditRes.json().accessed_log).toHaveLength(1);

    // 5. Question Tickets: anonymous session isolation & clinician-only reply
    const anonRes = await app.inject({
      method: 'POST',
      url: '/api/auth/anonymous',
      payload: { userId: 'anon-ticketuser1' },
    });
    const anonCookie = extractSessionCookie(anonRes.headers['set-cookie']);

    const ticketCreate = await app.inject({
      method: 'POST',
      url: '/api/tickets',
      headers: { cookie: anonCookie },
      payload: { category: 'Persiapan Tes', text: 'Berapa hari ideal pantang sebelum analisis semen?' },
    });
    expect(ticketCreate.statusCode).toBe(200);
    const ticketId = ticketCreate.json().id;

    // Patient (Nina) cannot see anon's ticket and cannot reply
    const ninaTickets = await app.inject({
      method: 'GET',
      url: '/api/tickets',
      headers: { cookie: ninaCookie },
    });
    expect(ninaTickets.json()).toHaveLength(0);

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/tickets/${ticketId}/reply`,
          headers: { cookie: ninaCookie },
          payload: { replyText: 'Unauthorized fake doctor reply' },
        })
      ).statusCode
    ).toBe(403);

    // Verified clinician sees queue and replies
    const drQueue = await app.inject({
      method: 'GET',
      url: '/api/tickets',
      headers: { cookie: drCookie },
    });
    expect(drQueue.json().some((tk: { id: string }) => tk.id === ticketId)).toBe(true);

    const drReply = await app.inject({
      method: 'POST',
      url: `/api/tickets/${ticketId}/reply`,
      headers: { cookie: drCookie },
      payload: { replyText: 'Standar WHO menganjurkan masa pantang 2 hingga 7 hari (ideal 3–4 hari).' },
    });
    expect(drReply.statusCode).toBe(200);
    expect(drReply.json().status).toBe('dijawab');
    expect(drReply.json().replied_by).toBe('dr. Hendra, Sp.And');

    // 6. Full data erasure removes everything for Dani
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/users/${dani.id}/data`,
      headers: { cookie: daniCookie },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(await testPrisma.result.count({ where: { user_id: dani.id } })).toBe(0);
    expect(await testPrisma.cycleTracker.count({ where: { user_id: dani.id } })).toBe(0);
    expect(await testPrisma.doctorChecklistState.count({ where: { user_id: dani.id } })).toBe(0);
    expect(await testPrisma.user.findUnique({ where: { id: dani.id } })).toBeNull();
  });
});
