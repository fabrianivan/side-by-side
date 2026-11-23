import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext';
import { AssessmentPage } from '../pages/AssessmentPage';
import { CarePathwayPage } from '../pages/CarePathwayPage';
import { ProgressPage } from '../pages/ProgressPage';
import { NakesDashboardPage } from '../pages/NakesDashboardPage';
import { ShareNakesPage } from '../pages/ShareNakesPage';
import { saveEncryptedItem, wipeAllLocalData } from '../lib/crypto-storage';
import { evaluateAssessment } from '../lib/assessment-engine';

type Json = Record<string, unknown>;

function createMockApi(options: { carePlans?: Json[]; role?: 'user' | 'nakes' } = {}) {
  const calls: Array<{ path: string; method: string; body: Json }> = [];
  const shareTokens = new Map<string, Json>();
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const role = options.role ?? 'user';

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? (JSON.parse(String(init.body)) as Json) : {};
    calls.push({ path: url.pathname, method, body });

    if (url.pathname === '/api/auth/session') return json({ authenticated: true, userId: 'anon-test', role });
    if (url.pathname === '/api/auth/anonymous') return json({ authenticated: true, userId: 'anon-test', role: 'user' });
    if (url.pathname === '/api/account/data') {
      return json({
        user: { id: 'dr-1', email: 'dr@clinic.id', displayName: 'dr. Hendra, Sp.And', role, locale: 'id' },
        consents: { store_results: false, share_partner: false, share_nakes: false },
        assessmentAnswers: null,
        results: [],
        reminders: [],
        pairing: null,
        shareToken: null,
        tickets: [],
      });
    }
    if (url.pathname === '/api/care-plans') return json(options.carePlans ?? []);
    if (url.pathname === '/api/tickets') return json([]);
    if (url.pathname === '/api/share-tokens' && method === 'POST') {
      const token = {
        token_code: 'SBS-7Q2W9E-1H',
        scope: body.scope,
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        revoked: false,
        accessed_log: [],
        snapshot: body.snapshot,
      };
      shareTokens.set('SBS-7Q2W9E-1H', token);
      return json(token);
    }
    const carePlanMatch = url.pathname.match(/^\/api\/share-tokens\/([^/]+)\/care-plan$/);
    if (carePlanMatch && method === 'POST') {
      return json({ token_code: carePlanMatch[1], saved: true, written_at: new Date().toISOString() });
    }
    const tokenMatch = url.pathname.match(/^\/api\/share-tokens\/([^/]+)$/);
    if (tokenMatch) {
      return json({
        token_code: 'SBS-7Q2W9E-1H',
        scope: ['history', 'risk_factors', 'care_pathway', 'progress'],
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        revoked: false,
        accessed_log: [],
        snapshot: {
          patientAlias: 'Pasien (Mode Anonim)',
          programDuration: 'Lebih dari 12 bulan',
          assessmentLevel: 'Sebaiknya periksa dalam 1 sampai 2 bulan',
          reportedRiskFactors: ['Kebiasaan merokok harian (Kebiasaan Merokok & Vape)'],
          riskExplanation: {
            headline: 'Mengapa hasil Anda …',
            reasons: ['Anda sudah mencoba lebih dari 12 bulan.'],
            domains: [],
            factors: [{ title: 'Kebiasaan merokok harian', influence: 'Pengaruh sedang', changeability: 'Bisa Anda ubah', decisive: false }],
          },
          referral: {
            specialist: 'Dokter Spesialis Andrologi (Sp.And)',
            reasons: ['Setelah 12 bulan atau lebih mencoba …'],
            firstTests: ['Analisis semen'],
          },
          progressSummary: ['Tidur rata-rata: 5.5 → 7 jam/malam — bergerak ke arah yang sehat.'],
        },
      });
    }
    return json({});
  });
  return { fetchMock, calls };
}

function renderAt(ui: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>,
  );
}

/** Penanda hidrasi: memastikan data terenkripsi sudah dimuat sebelum interaksi. */
const HydrationProbe: React.FC = () => {
  const { assessmentResult } = useApp();
  return <span data-testid="hydration-probe">{assessmentResult?.levelCode ?? 'none'}</span>;
};

async function preloadAssessment(answers: Record<string, string>) {
  await saveEncryptedItem('assessment_answers', answers);
  await saveEncryptedItem('assessment_result', evaluateAssessment(answers, undefined, undefined, 'id'));
}

describe('Reviewer feedback flows (UI)', () => {
  beforeEach(async () => {
    // Beri waktu penulisan terenkripsi asinkron dari tes sebelumnya selesai agar kunci perangkat tidak tertimpa.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await wipeAllLocalData();
    window.localStorage.clear();
  });

  it('Feedback #1: the self-check result explains WHY in plain language instead of a single label', async () => {
    vi.stubGlobal('fetch', createMockApi().fetchMock);
    renderAt(<AssessmentPage />, '/cek-awal');

    fireEvent.click(screen.getByRole('radio', { name: /Lebih dari 12 bulan \(1–2 tahun\)/i }));
    for (let i = 0; i < 11; i += 1) fireEvent.click(screen.getByRole('button', { name: /Lewati/i }));

    const breakdown = await screen.findByTestId('risk-breakdown');
    expect(within(breakdown).getByRole('heading', { name: /Mengapa hasil Anda/ })).toBeInTheDocument();
    expect(within(breakdown).getByText(/Pedoman WHO menyarankan kedua pasangan diperiksa/)).toBeInTheDocument();
    expect(within(breakdown).getByText('Alasan utama hasil Anda')).toBeInTheDocument();
    expect(within(breakdown).getByText('Apa yang bisa mengubah hasil Anda')).toBeInTheDocument();
    expect(within(breakdown).getAllByRole('img', { name: /Pengaruh (besar|sedang|kecil)|Tidak berpengaruh/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Susun jalur perawatan saya/i })).toBeInTheDocument();
  });

  it('Feedback #2: walks the connected pathway from specialist match to a doctor-written after-care plan', async () => {
    const { fetchMock } = createMockApi({
      carePlans: [
        {
          tokenCode: 'SBS-7Q2W9E-1H',
          writtenAt: '2026-11-12T03:00:00.000Z',
          clinicianName: 'dr. Hendra, Sp.And',
          specialty: 'andrology',
          visitDate: '2026-11-12',
          summaryForPatient: 'Ulangi analisis semen 3 bulan lagi dan berhenti merokok.',
          orderedTests: ['repeat_semen_analysis'],
          lifestyleFocus: ['smoking'],
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    await preloadAssessment({ ttc_duration: '12_to_24_months', smoking_habit: 'daily_heavy' });
    renderAt(<CarePathwayPage />, '/jalur-perawatan');

    await waitFor(() =>
      expect(screen.getByTestId('recommended-specialist')).toHaveTextContent('Dokter Spesialis Andrologi (Sp.And)'),
    );
    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi dan lanjutkan/i }));
    await screen.findByText(/Jalur ditetapkan: mulai dengan Spesialis Andrologi/i);

    fireEvent.click(screen.getAllByRole('button', { name: /Pilih untuk jalur saya/i })[0]);
    await screen.findByText(/Fasilitas pilihan/i);

    fireEvent.click(screen.getByRole('button', { name: /Simpan & ingatkan saya/i }));
    await screen.findByText(/Dijadwalkan/i);

    fireEvent.click(screen.getByRole('button', { name: /^Catat kunjungan$/i }));
    const form = screen.getByRole('form', { name: /Catat kunjungan/i });
    fireEvent.click(within(form).getByLabelText(/Analisis semen diminta/i));
    fireEvent.click(within(form).getByRole('button', { name: /Simpan kunjungan & susun rencana lanjutan/i }));
    expect(
      await screen.findByRole('checkbox', { name: /Lakukan analisis semen \(pantang 2–7 hari sebelumnya\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Ikuti rencana kebiasaan 74 hari: berhenti merokok\/vape/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Periksa rencana dari dokter/i }));
    expect(await screen.findByText(/1 rencana perawatan dari dokter berhasil diimpor/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ditulis oleh dokter Anda/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('checkbox', { name: /Analisis semen ulang setelah satu siklus sperma/i })).toBeInTheDocument();

    // Ringkasan rujukan untuk dokter dapat dibuka & dicetak
    fireEvent.click(screen.getByRole('button', { name: /Buka Ringkasan Rujukan/i }));
    const summary = await screen.findByTestId('referral-summary');
    expect(within(summary).getByText(/Ringkasan Rujukan — Side by Side/)).toBeInTheDocument();
    expect(within(summary).getByText(/Kebiasaan merokok harian/)).toBeInTheDocument();
  });

  it('Feedback #2: share-to-doctor can include the referral summary and private trends as separate consent scopes', async () => {
    const { fetchMock, calls } = createMockApi();
    vi.stubGlobal('fetch', fetchMock);
    await preloadAssessment({ ttc_duration: '12_to_24_months' });
    renderAt(
      <>
        <ShareNakesPage />
        <HydrationProbe />
      </>,
      '/bagikan-nakes?preset=pathway',
    );
    await waitFor(() => expect(screen.getByTestId('hydration-probe')).toHaveTextContent('within_1_2_months'));

    expect(screen.getByRole('checkbox', { name: /Ringkasan Rujukan & Jalur Perawatan/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Progres Saya \(ringkasan tren saja\)/i })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Buat Kode QR & Tautan Berlaku 1 Jam/i }));
    await screen.findByText('SBS-7Q2W9E-1H');
    const create = calls.find((c) => c.path === '/api/share-tokens' && c.method === 'POST')!;
    expect(create.body.scope).toEqual(expect.arrayContaining(['care_pathway']));
    expect(create.body.scope).not.toContain('progress');
    const snapshot = create.body.snapshot as Json;
    expect((snapshot.referral as Json).specialist).toBe('Dokter Spesialis Andrologi (Sp.And)');
    expect(snapshot.progressSummary).toBeUndefined();
    expect(JSON.stringify(snapshot)).not.toMatch(/partner_context|over_35/);
  });

  it('Feedback #3: private progress needs opt-in, then charts trends and offers support when stress is high', async () => {
    vi.stubGlobal('fetch', createMockApi().fetchMock);
    renderAt(<ProgressPage />, '/progres');

    expect(screen.getByText(/Riwayat privat sedang nonaktif/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan check-in/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Aktifkan riwayat privat/i }));
    await waitFor(() => expect(screen.queryByText(/Riwayat privat sedang nonaktif/i)).not.toBeInTheDocument());

    const form = screen.getByRole('form', { name: /Check-in kesehatan/i });
    fireEvent.change(within(form).getByLabelText(/^Tanggal$/i), { target: { value: '2026-09-01' } });
    fireEvent.change(within(form).getByLabelText(/Tidur rata-rata/i), { target: { value: '5.5' } });
    fireEvent.click(within(form).getByRole('button', { name: /Simpan check-in/i }));
    await screen.findByText(/Check-in tersimpan secara privat/i);

    fireEvent.change(within(form).getByLabelText(/^Tanggal$/i), { target: { value: '2026-11-01' } });
    fireEvent.change(within(form).getByLabelText(/Tidur rata-rata/i), { target: { value: '7.5' } });
    fireEvent.change(within(form).getByLabelText(/Tingkat stres/i), { target: { value: '5' } });
    fireEvent.click(within(form).getByRole('button', { name: /Simpan check-in/i }));

    expect(await screen.findByText(/Tidur rata-rata: 5\.5 → 7\.5 jam\/malam/)).toBeInTheDocument();
    expect(screen.getByText(/Kini sudah sesuai target/)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/119 ext 8/);
    expect(screen.getByRole('img', { name: /Tidur rata-rata: 5\.5 → 7\.5/ })).toBeInTheDocument();
  });

  it('Feedback #2: a verified clinician sees the plain-language breakdown and sends a post-visit plan back', async () => {
    window.localStorage.setItem('sbs_auth_mode', 'nakes');
    window.localStorage.setItem('sbs_display_name', 'dr. Hendra, Sp.And');
    const { fetchMock, calls } = createMockApi({ role: 'nakes' });
    vi.stubGlobal('fetch', fetchMock);
    renderAt(<NakesDashboardPage />, '/nakes?code=SBS-7Q2W9E-1H');

    expect(await screen.findByTestId('nakes-risk-explanation')).toHaveTextContent('Kebiasaan merokok harian');
    expect(screen.getByTestId('nakes-referral')).toHaveTextContent('Dokter Spesialis Andrologi (Sp.And)');
    expect(screen.getByTestId('nakes-progress')).toHaveTextContent('5.5 → 7');

    fireEvent.change(screen.getByLabelText(/Ringkasan untuk pasien/i), {
      target: { value: 'Hasil awal perlu diulang. Berhenti merokok dan ulangi analisis semen 3 bulan lagi.' },
    });
    fireEvent.click(screen.getByLabelText(/Analisis semen ulang/i));
    fireEvent.click(screen.getByRole('button', { name: /Kirim ke Jalur Perawatan pasien/i }));
    expect(await screen.findByText(/Rencana terkirim/i)).toBeInTheDocument();
    const post = calls.find((c) => c.path.endsWith('/care-plan'))!;
    expect(post.body.orderedTests).toEqual(['repeat_semen_analysis']);
    expect(post.body.specialty).toBe('andrology');
  });
});
