import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext';
import { CompanionPage } from '../pages/CompanionPage';
import { ResultsPage } from '../pages/ResultsPage';
import { ShareNakesPage } from '../pages/ShareNakesPage';
import { saveEncryptedItem, wipeAllLocalData } from '../lib/crypto-storage';
import { evaluateAssessment } from '../lib/assessment-engine';
import { resetAiStatusCache } from '../lib/ai-client';

type Json = Record<string, unknown>;

function mockApi(opts: { aiEnabled: boolean; companionReply?: Json; labReply?: Json }) {
  const calls: Array<{ path: string; method: string; body: Json }> = [];
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? (JSON.parse(String(init.body)) as Json) : {};
    calls.push({ path: url.pathname, method, body });
    if (url.pathname === '/api/ai/status') {
      return json({ enabled: opts.aiEnabled, provider: opts.aiEnabled ? 'anthropic' : null, model: opts.aiEnabled ? 'claude-sonnet-5-5' : null });
    }
    if (url.pathname === '/api/ai/companion') return json(opts.companionReply ?? { reply: 'ok', actions: [], sources: [], toolsUsed: [], showSupport: false });
    if (url.pathname === '/api/ai/lab-report') return json(opts.labReply ?? { values: {}, missing: [] });
    if (url.pathname === '/api/auth/session') return json({ authenticated: true, userId: 'anon-test', role: 'user' });
    if (url.pathname === '/api/share-tokens' && method === 'POST') {
      return json({ token_code: 'SBS-AI0001-1H', scope: body.scope, expires_at: new Date(Date.now() + 3600_000).toISOString(), accessed_log: [] });
    }
    return json({});
  });
  return { fn, calls };
}

const JournalProbe: React.FC = () => {
  const { healthJournal } = useApp();
  return <span data-testid="plan-count">{healthJournal.carePathway.carePlan.length}</span>;
};

function renderAt(ui: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>,
  );
}

async function preload(opts: { aiConsent: boolean; answers?: Record<string, string> }) {
  await saveEncryptedItem('consents', { store_results: false, share_partner: false, share_nakes: false, ai_assist: opts.aiConsent });
  if (opts.answers) {
    await saveEncryptedItem('assessment_answers', opts.answers);
    await saveEncryptedItem('assessment_result', evaluateAssessment(opts.answers, undefined, undefined, 'id'));
  }
  window.localStorage.setItem('sbs_display_name', 'Budi Santoso');
  window.localStorage.setItem('sbs_user_email', 'budi@example.com');
}

describe('AI features (UI)', () => {
  beforeEach(async () => {
    await new Promise((r) => setTimeout(r, 100));
    await wipeAllLocalData();
    window.localStorage.clear();
    resetAiStatusCache();
  });

  it('hides AI behind server configuration and an explicit opt-in', async () => {
    vi.stubGlobal('fetch', mockApi({ aiEnabled: false }).fn);
    const { unmount } = renderAt(<CompanionPage />, '/asisten');
    expect(await screen.findByText(/Fitur AI belum diaktifkan di server ini/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Pertanyaan Anda/)).not.toBeInTheDocument();
    unmount();

    resetAiStatusCache();
    vi.stubGlobal('fetch', mockApi({ aiEnabled: true }).fn);
    renderAt(<CompanionPage />, '/asisten');
    const gate = await screen.findByTestId('ai-consent-gate');
    expect(gate).toHaveTextContent(/Anthropic Claude/);
    expect(gate).toHaveTextContent(/Tidak pernah nama, email, telepon, NIK/);
    fireEvent.click(within(gate).getByRole('button', { name: /Aktifkan asisten AI/ }));
    expect(await screen.findByLabelText(/Pertanyaan Anda/)).toBeInTheDocument();
  });

  it('companion answers with sources and suggested actions that only run when pressed, sending no identity', async () => {
    const api = mockApi({
      aiEnabled: true,
      companionReply: {
        reply: 'Atur masa pantang 2–7 hari sebelum analisis semen.',
        actions: [{ type: 'care_plan_task', title: 'Jadwalkan analisis semen', dueInDays: 14 }],
        sources: [{ slug: 'kapan-harus-periksa-ke-dokter', title: 'Kapan Harus Periksa ke Dokter' }],
        toolsUsed: ['search_library', 'suggest_care_plan_task'],
        showSupport: false,
      },
    });
    vi.stubGlobal('fetch', api.fn);
    await preload({ aiConsent: true, answers: { ttc_duration: '12_to_24_months', partner_context: 'over_35', smoking_habit: 'daily_heavy' } });
    renderAt(
      <>
        <CompanionPage />
        <JournalProbe />
      </>,
      '/asisten',
    );

    const input = await screen.findByLabelText(/Pertanyaan Anda/);
    await waitFor(() => expect(screen.getByRole('button', { name: /Jelaskan hasil Cek Awal saya/ })).toBeInTheDocument());
    fireEvent.change(input, { target: { value: 'Apa persiapan sebelum analisis semen?' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));

    const reply = await screen.findByTestId('companion-reply');
    expect(reply).toHaveTextContent('Atur masa pantang 2–7 hari');
    expect(within(reply).getByRole('button', { name: 'Kapan Harus Periksa ke Dokter' })).toBeInTheDocument();
    expect(screen.getByTestId('plan-count')).toHaveTextContent('0');

    fireEvent.click(within(reply).getByRole('button', { name: /Tambahkan ke rencana: Jadwalkan analisis semen/ }));
    await waitFor(() => expect(screen.getByTestId('plan-count')).toHaveTextContent('1'));
    expect(await within(reply).findByRole('button', { name: /Selesai/ })).toBeDisabled();

    const sent = api.calls.find((c) => c.path === '/api/ai/companion')!;
    const raw = JSON.stringify(sent.body);
    expect(raw).not.toMatch(/Budi|budi@example\.com|partner_context|over_35/);
    expect((sent.body.context as Json).selfCheck).toBeTruthy();
  });

  it('lab reader fills the manual form for the person to check before saving', async () => {
    vi.stubGlobal(
      'fetch',
      mockApi({
        aiEnabled: true,
        labReply: {
          values: { test_date: '2026-11-02', volume_ml: 2.1, concentration_million_per_ml: 12.5, progressive_motility_pct: 28 },
          missing: ['normal_morphology_pct'],
        },
      }).fn,
    );
    await preload({ aiConsent: true });
    renderAt(<ResultsPage />, '/hasil');
    fireEvent.click(await screen.findByRole('button', { name: /Input Hasil Baru/ }));
    const reader = await screen.findByTestId('lab-report-reader');
    const choose = within(reader).getByRole('button', { name: /Pilih foto atau PDF/ });
    expect(choose).toBeDisabled();
    fireEvent.click(within(reader).getByRole('checkbox'));
    expect(choose).not.toBeDisabled();

    const file = new File([new Uint8Array([137, 80, 78, 71])], 'hasil-lab.png', { type: 'image/png' });
    fireEvent.change(within(reader).getByTestId('lab-report-input'), { target: { files: [file] } });

    expect(await within(reader).findByText(/AI mengisi 4 dari 6 nilai/)).toBeInTheDocument();
    expect(within(reader).getByText(/Morfologi normal/)).toBeInTheDocument();
    await waitFor(() => expect((screen.getByLabelText(/Volume/i, { selector: 'input' }) as HTMLInputElement).value).toBe('2.1'));
  });

  it('share-to-doctor offers an opt-in AI visit brief only when AI is enabled', async () => {
    const api = mockApi({ aiEnabled: true });
    vi.stubGlobal('fetch', api.fn);
    renderAt(<ShareNakesPage />, '/bagikan-nakes');
    const allow = await screen.findByRole('checkbox', { name: /Izinkan ringkasan kunjungan AI/ });
    expect(allow).not.toBeChecked();
    fireEvent.click(allow);
    fireEvent.click(screen.getByRole('button', { name: /Buat Kode QR & Tautan Berlaku 1 Jam/ }));
    await screen.findByText('SBS-AI0001-1H');
    const create = api.calls.find((c) => c.path === '/api/share-tokens' && c.method === 'POST')!;
    expect((create.body.snapshot as Json).aiAllowed).toBe(true);
  });
});
