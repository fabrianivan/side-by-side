// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../server/index';
import {
  createAiProviderFromEnv,
  createAnthropicProvider,
  createOpenAiCompatibleProvider,
  type AiCompleteOptions,
  type AiCompletion,
  type ChatProvider,
} from '../../server/ai';

function cookieOf(setCookieHeader: string | string[] | undefined): string {
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const raw = list.find((c) => c.startsWith('sbs_session='));
  if (!raw) throw new Error('Expected sbs_session cookie');
  return raw.split(';')[0];
}

/** Penyedia AI palsu yang menjalankan skrip jawaban, mencatat setiap permintaan. */
function fakeProvider() {
  const calls: AiCompleteOptions[] = [];
  const script: Array<(o: AiCompleteOptions) => AiCompletion | Promise<AiCompletion>> = [];
  const provider: ChatProvider = {
    name: 'fake',
    model: 'fake-model',
    fastModel: 'fake-fast',
    supportsPdf: true,
    userMessage: (content) => ({ role: 'user', content }),
    assistantText: (text) => ({ role: 'assistant', content: text }),
    toolResults: (results) => [{ role: 'user', content: results.map((r) => ({ type: 'tool_result', ...r })) }],
    async complete(o) {
      calls.push(JSON.parse(JSON.stringify(o)));
      const next = script.shift();
      if (!next) return { text: 'ok', toolCalls: [], assistantMessage: { role: 'assistant', content: 'ok' } };
      return next(o);
    },
  };
  return { provider, calls, script };
}

describe('AI features backend: provider adapters, companion agent, lab reader, distress, visit brief', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbs-ai-test-'));
  const dbUrl = `file:${path.join(tempDir, 'test.db')}`;
  const prevInvite = process.env.NAKES_INVITE_CODE;
  const prevKey = process.env.ENCRYPTION_KEY;
  let db: PrismaClient;
  let app: FastifyInstance;
  let appNoAi: FastifyInstance;
  const fake = fakeProvider();

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
    app = await buildServer(db, { ai: fake.provider });
    appNoAi = await buildServer(db, { ai: null });
  }, 30000);

  afterAll(async () => {
    process.env.NAKES_INVITE_CODE = prevInvite;
    process.env.ENCRYPTION_KEY = prevKey;
    if (app) await app.close();
    if (appNoAi) await appNoAi.close();
    if (db) await db.$disconnect();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function anonCookie(server: FastifyInstance, id: string) {
    const res = await server.inject({ method: 'POST', url: '/api/auth/anonymous', payload: { userId: id } });
    return cookieOf(res.headers['set-cookie']);
  }

  it('reports status, stays off without a key, and accepts the ai_assist consent', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/ai/status' })).json()).toMatchObject({
      enabled: true,
      provider: 'fake',
      supportsPdf: true,
    });
    expect((await appNoAi.inject({ method: 'GET', url: '/api/ai/status' })).json()).toMatchObject({
      enabled: false,
      supportsPdf: false,
    });
    const cookie = await anonCookie(appNoAi, 'anon-noai0001');
    const off = await appNoAi.inject({
      method: 'POST',
      url: '/api/ai/companion',
      headers: { cookie },
      payload: { locale: 'en', messages: [{ role: 'user', content: 'Hi' }] },
    });
    expect(off.statusCode).toBe(503);
    expect(createAiProviderFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(createAiProviderFromEnv({ ANTHROPIC_API_KEY: 'k', AI_DISABLED: 'true' } as NodeJS.ProcessEnv)).toBeNull();
    expect(createAiProviderFromEnv({ ANTHROPIC_API_KEY: 'k' } as NodeJS.ProcessEnv)?.model).toBe('claude-sonnet-5-5');

    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'ai@example.com', password: 'Password123!' } });
    const user = reg.json();
    const consent = await app.inject({
      method: 'PUT',
      url: `/api/consents/${user.id}`,
      headers: { cookie: cookieOf(reg.headers['set-cookie']) },
      payload: { key: 'ai_assist', granted: true },
    });
    expect(consent.statusCode).toBe(200);
  });

  it('runs the companion agent: server tools ground the answer, client actions come back only as validated suggestions', async () => {
    const unauth = await app.inject({ method: 'POST', url: '/api/ai/companion', payload: { locale: 'en', messages: [{ role: 'user', content: 'Hi' }] } });
    expect(unauth.statusCode).toBe(401);

    const cookie = await anonCookie(app, 'anon-agent0001');
    fake.calls.length = 0;
    fake.script.push(() => ({
      text: '',
      toolCalls: [
        { id: 't1', name: 'search_library', input: { query: 'semen analysis abstinence' } },
        { id: 't2', name: 'find_facilities', input: { city: 'Jakarta', service: 'Andrologi', jkn_only: true } },
        { id: 't3', name: 'suggest_care_plan_task', input: { title: 'Book a semen analysis', due_in_days: 14 } },
        { id: 't4', name: 'suggest_open_page', input: { page: 'admin_panel', label: 'Hack' } },
      ],
      assistantMessage: { role: 'assistant', content: 'tool-use' },
    }));
    fake.script.push(() => ({ text: 'Plan 2–7 days of abstinence before the test.', toolCalls: [], assistantMessage: {} }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/companion',
      headers: { cookie },
      payload: {
        locale: 'en',
        messages: [{ role: 'user', content: 'How do I prepare for a semen analysis?' }],
        context: { selfCheck: { level: 'Within 1–2 months', reasons: ['12+ months trying'], factors: [] } },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reply).toMatch(/abstinence/);
    expect(body.actions).toEqual([{ type: 'care_plan_task', title: 'Book a semen analysis', dueInDays: 14 }]);
    expect(body.sources.length).toBeGreaterThan(0);
    expect(body.toolsUsed).toEqual(['search_library', 'find_facilities', 'suggest_care_plan_task', 'suggest_open_page']);
    expect(body.showSupport).toBe(false);

    // Prompt carries the medical boundary + consented context; the second call carries the tool results.
    expect(fake.calls[0].system).toMatch(/Never diagnose/);
    expect(fake.calls[0].system).toMatch(/12\+ months trying/);
    expect(fake.calls[0].tools?.map((t) => t.name)).toContain('suggest_reminder');
    const toolResultMsg = JSON.stringify(fake.calls[1].messages.at(-1));
    expect(toolResultMsg).toMatch(/shown_to_user_as_button/);
    expect(toolResultMsg).toMatch(/rejected/);
    expect(toolResultMsg).toMatch(/accepts_jkn/);
  });

  it('flags distress in companion messages and in the AI distress check, falling back to keywords if AI fails', async () => {
    const cookie = await anonCookie(app, 'anon-distress01');
    fake.script.push(() => ({ text: 'I hear you.', toolCalls: [], assistantMessage: {} }));
    const companion = await app.inject({
      method: 'POST',
      url: '/api/ai/companion',
      headers: { cookie },
      payload: { locale: 'id', messages: [{ role: 'user', content: 'Saya merasa putus asa soal program hamil ini' }] },
    });
    expect(companion.json().showSupport).toBe(true);

    fake.script.push(() => ({ text: '{"level":"crisis"}', toolCalls: [], assistantMessage: {} }));
    const crisis = await app.inject({
      method: 'POST',
      url: '/api/ai/distress-check',
      headers: { cookie },
      payload: { locale: 'en', text: 'I do not see the point of anything anymore' },
    });
    expect(crisis.json()).toMatchObject({ level: 'crisis', showSupport: true, source: 'ai' });
    expect(fake.calls.at(-1)?.fast).toBe(true);

    fake.script.push(() => {
      throw new Error('provider down');
    });
    const fallback = await app.inject({
      method: 'POST',
      url: '/api/ai/distress-check',
      headers: { cookie },
      payload: { locale: 'en', text: 'feeling hopeless today' },
    });
    expect(fallback.json()).toMatchObject({ showSupport: true, source: 'keywords' });
  });

  it('reads a lab report image into validated values and rejects unsupported files', async () => {
    const cookie = await anonCookie(app, 'anon-labread01');
    const bad = await app.inject({
      method: 'POST',
      url: '/api/ai/lab-report',
      headers: { cookie },
      payload: { locale: 'en', file: 'data:text/plain;base64,aGVsbG8=' },
    });
    expect(bad.statusCode).toBe(400);

    fake.script.push(() => ({
      text: '',
      toolCalls: [
        {
          id: 'l1',
          name: 'record_semen_values',
          input: {
            test_date: '2026-11-02',
            volume_ml: 99,
            concentration_million_per_ml: '15.2',
            total_motility_pct: 38,
            progressive_motility_pct: 27,
            missing: ['normal_morphology_pct'],
            note: 'Morphology not printed.',
          },
        },
      ],
      assistantMessage: {},
    }));
    const ok = await app.inject({
      method: 'POST',
      url: '/api/ai/lab-report',
      headers: { cookie },
      payload: { locale: 'en', file: 'data:image/png;base64,iVBORw0KGgo=' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().values).toEqual({
      test_date: '2026-11-02',
      concentration_million_per_ml: 15.2,
      total_motility_pct: 38,
      progressive_motility_pct: 27,
    });
    expect(ok.json().missing).toEqual(['normal_morphology_pct', 'volume_ml']);
    const sent = JSON.stringify(fake.calls.at(-1)?.messages);
    expect(sent).toMatch(/image\/png/);
    expect(fake.calls.at(-1)?.system).toMatch(/Ignore patient names/);
  });

  it('lets a clinician generate a visit brief only when the patient allowed AI, without sending the patient alias', async () => {
    const patient = await anonCookie(app, 'anon-brief0001');
    const nakesReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dr.ai@clinic.id', password: 'Password123!', role: 'nakes', displayName: 'dr. AI Test', inviteCode: 'CLINIC-TEST-SECRET-2026' },
    });
    const nakes = cookieOf(nakesReg.headers['set-cookie']);
    const snapshot = { patientAlias: 'Budi Rahasia', programDuration: '12 to 24 months', assessmentLevel: 'Within 1–2 months' };

    const notAllowed = await app.inject({
      method: 'POST',
      url: '/api/share-tokens',
      headers: { cookie: patient },
      payload: { scope: ['history'], snapshot },
    });
    const denied = await app.inject({
      method: 'POST',
      url: '/api/ai/visit-brief',
      headers: { cookie: nakes },
      payload: { locale: 'en', tokenCode: notAllowed.json().token_code },
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/share-tokens',
      headers: { cookie: patient },
      payload: { scope: ['history'], snapshot: { ...snapshot, aiAllowed: true } },
    });
    const code = allowed.json().token_code as string;
    const opened = await app.inject({ method: 'GET', url: `/api/share-tokens/${code}`, headers: { cookie: nakes } });
    expect(opened.json().ai_allowed).toBe(true);

    const byPatient = await app.inject({ method: 'POST', url: '/api/ai/visit-brief', headers: { cookie: patient }, payload: { locale: 'en', tokenCode: code } });
    expect(byPatient.statusCode).toBe(403);

    fake.script.push(() => ({ text: '1. What the patient shared\n- Trying 12–24 months', toolCalls: [], assistantMessage: {} }));
    const brief = await app.inject({ method: 'POST', url: '/api/ai/visit-brief', headers: { cookie: nakes }, payload: { locale: 'en', tokenCode: code } });
    expect(brief.statusCode).toBe(200);
    expect(brief.json().brief).toMatch(/What the patient shared/);
    const sent = JSON.stringify(fake.calls.at(-1));
    expect(sent).toContain('12 to 24 months');
    expect(sent).not.toContain('Budi Rahasia');

    const audit = await app.inject({ method: 'GET', url: `/api/share-tokens/${code}/audit`, headers: { cookie: patient } });
    expect(audit.json().accessed_log[0].action).toBe('Membuat Ringkasan AI');
  });

  it('builds correct Anthropic and OpenAI-compatible requests and parses tool calls', async () => {
    const anthropicFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [
            { type: 'thinking', thinking: '…', signature: 'sig' },
            { type: 'text', text: 'Hello' },
            { type: 'tool_use', id: 'tu1', name: 'search_library', input: { query: 'heat' } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const a = createAnthropicProvider({ apiKey: 'sk-test', fetchImpl: anthropicFetch as unknown as typeof fetch });
    const out = await a.complete({ system: 'S', messages: [a.userMessage([{ type: 'pdf', base64: 'JVBER' }])], tools: [{ name: 'x', description: 'd', input_schema: { type: 'object' } }] });
    const [url, init] = anthropicFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const sentBody = JSON.parse(String(init.body));
    expect(sentBody).toMatchObject({ model: 'claude-sonnet-5-5', system: 'S', output_config: { effort: 'low' } });
    expect(sentBody.messages[0].content[0].type).toBe('document');
    expect(out.text).toBe('Hello');
    expect(out.toolCalls).toEqual([{ id: 'tu1', name: 'search_library', input: { query: 'heat' } }]);
    // thinking blocks are passed back untouched in the next turn
    expect(JSON.stringify(out.assistantMessage)).toContain('"signature":"sig"');

    const openaiFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'find_facilities', arguments: '{"city":"Bandung"}' } }] } }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const o = createOpenAiCompatibleProvider({
      apiKey: 'az-key',
      baseUrl: 'https://res.openai.azure.com/openai/deployments/dep?api-version=2024-10-21',
      model: 'dep',
      authHeader: 'api-key',
      fetchImpl: openaiFetch as unknown as typeof fetch,
    });
    const res = await o.complete({ system: 'S', messages: [o.userMessage([{ type: 'text', text: 'hi' }])], tools: [{ name: 'find_facilities', description: 'd', input_schema: { type: 'object' } }] });
    const [ourl, oinit] = openaiFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(ourl).toBe('https://res.openai.azure.com/openai/deployments/dep/chat/completions?api-version=2024-10-21');
    expect((oinit.headers as Record<string, string>)['api-key']).toBe('az-key');
    expect(JSON.parse(String(oinit.body)).messages[0]).toEqual({ role: 'system', content: 'S' });
    expect(res.toolCalls).toEqual([{ id: 'c1', name: 'find_facilities', input: { city: 'Bandung' } }]);
    expect(() => o.userMessage([{ type: 'pdf', base64: 'x' }])).toThrow();

    const failing = createAnthropicProvider({
      apiKey: 'k',
      fetchImpl: (async () => new Response('secret prompt echo', { status: 500 })) as unknown as typeof fetch,
    });
    await expect(failing.complete({ system: 's', messages: [] })).rejects.toThrow('AI provider responded 500');
  });

  it('grounds companion tools in live DB facilities/articles and validates conversation role order', async () => {
    const cookie = await anonCookie(app, 'anon-dbtools1');
    const badOrder = await app.inject({
      method: 'POST',
      url: '/api/ai/companion',
      headers: { cookie },
      payload: {
        locale: 'en',
        messages: [
          { role: 'assistant', content: 'Hello first' },
          { role: 'user', content: 'Follow up' },
        ],
      },
    });
    expect(badOrder.statusCode).toBe(400);

    await db.facility.create({
      data: {
        id: 'fac-yog-db-1',
        name: 'Klinik Andrologi Sardjito Yogyakarta',
        type: 'RS',
        city: 'Yogyakarta',
        address: 'Jl. Kesehatan No. 1',
        services_json: JSON.stringify(['Andrologi', 'Laboratorium']),
        price_min: 200000,
        price_max: 500000,
        accepts_jkn: true,
        hours: '08.00–16.00',
        map_url: 'https://maps.google.com/?q=Sardjito',
        friendliness_score: 4.9,
        friendliness_notes: 'Ramah pria',
      },
    });
    await db.article.create({
      data: {
        slug: 'panduan-khusus-yogyakarta',
        title: 'Panduan Khusus Klinik Yogyakarta',
        summary: 'Ringkasan persiapan pemeriksaan di Yogyakarta.',
        body_md: 'Isi panduan persiapan analisis semen di Yogyakarta.',
        category: 'Persiapan Tes',
        read_minutes: 3,
        reviewer: 'dr. Hendra, Sp.And',
      },
    });

    fake.calls.length = 0;
    fake.script.push(() => ({
      text: '',
      toolCalls: [
        { id: 'db1', name: 'find_facilities', input: { city: 'yogyakarta', service: 'Andrologi' } },
        { id: 'db2', name: 'search_library', input: { query: 'yogyakarta' } },
      ],
      assistantMessage: { role: 'assistant', content: 'tool-use' },
    }));
    fake.script.push(() => ({ text: 'Klinik Andrologi Sardjito Yogyakarta accepts JKN.', toolCalls: [], assistantMessage: {} }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/companion',
      headers: { cookie },
      payload: {
        locale: 'id',
        messages: [
          { role: 'user', content: 'Halo' },
          { role: 'user', content: 'Ada klinik andrologi di Yogyakarta?' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    // Two consecutive user turns are coalesced into one turn before sending to provider
    expect(fake.calls[0].messages).toHaveLength(1);
    const toolResultMsg = JSON.stringify(fake.calls[1].messages.at(-1));
    expect(toolResultMsg).toContain('Klinik Andrologi Sardjito Yogyakarta');
    expect(toolResultMsg).toContain('panduan-khusus-yogyakarta');
    expect(res.json().sources).toEqual([{ slug: 'panduan-khusus-yogyakarta', title: 'Panduan Khusus Klinik Yogyakarta' }]);
  });
});
