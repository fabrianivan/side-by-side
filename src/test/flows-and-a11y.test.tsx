import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AssessmentPage } from '../pages/AssessmentPage';
import { CoupleModePage } from '../pages/CoupleModePage';
import { ShareNakesPage } from '../pages/ShareNakesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { WelcomePage } from '../pages/WelcomePage';
import { FacilitiesPage } from '../pages/FacilitiesPage';
import { ResultsPage } from '../pages/ResultsPage';
import { NakesDashboardPage } from '../pages/NakesDashboardPage';
import { AccountPage } from '../pages/AccountPage';
import { SemenSimulatorPage } from '../pages/SemenSimulatorPage';
import { SpermatogenesisTrackerPage } from '../pages/SpermatogenesisTrackerPage';
import { DoctorChecklistPage } from '../pages/DoctorChecklistPage';
import { LibraryPage } from '../pages/LibraryPage';
import { Layout } from '../components/Layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { encryptPayload, decryptPayload, wipeAllLocalData, saveEncryptedItem } from '../lib/crypto-storage';
import { designTokens } from '../styles/design-tokens';
import { getLocalizedFacilities } from '../config/seed-facilities';
import { getLocalizedArticles } from '../config/seed-articles';

function createApiMockFetch() {
  const initialMode = window.localStorage.getItem('sbs_auth_mode');
  let session: { authenticated: boolean; userId: string; role: string } =
    initialMode === 'account' || initialMode === 'nakes'
      ? {
          authenticated: true,
          userId: window.localStorage.getItem('sbs_user_id') || 'user-test-1',
          role: initialMode === 'nakes' ? 'nakes' : 'user',
        }
      : {
          authenticated: false,
          userId: '',
          role: 'user',
        };
  const pairings = new Map<string, Record<string, unknown>>();
  const shareTokens = new Map<string, Record<string, unknown>>();
  const tickets: Array<Record<string, unknown>> = [];

  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input.toString();
    const url = new URL(rawUrl, 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : {};

    if (url.pathname === '/api/auth/session') {
      return jsonResponse(session.authenticated ? session : { authenticated: false, userId: null, role: null });
    }
    if (url.pathname === '/api/auth/anonymous' && method === 'POST') {
      const uid = body.userId || 'anon-test123';
      session = { authenticated: true, userId: uid, role: 'user' };
      return jsonResponse(session);
    }
    if (url.pathname === '/api/auth/login' && method === 'POST') {
      session = { authenticated: true, userId: 'dr-hendra-1', role: 'nakes' };
      return jsonResponse({
        id: 'dr-hendra-1',
        email: body.email,
        role: 'nakes',
        displayName: 'dr. Hendra, Sp.And',
      });
    }
    if (url.pathname === '/api/facilities') {
      const loc = url.searchParams.get('locale') === 'en' ? 'en' : 'id';
      return jsonResponse(getLocalizedFacilities(loc));
    }
    if (url.pathname === '/api/articles') {
      const loc = url.searchParams.get('locale') === 'en' ? 'en' : 'id';
      return jsonResponse(getLocalizedArticles(loc));
    }
    if (url.pathname === '/api/account/data') {
      if (!session.authenticated) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse({
        user: {
          id: session.userId,
          email: window.localStorage.getItem('sbs_user_email') || 'user@example.com',
          displayName: window.localStorage.getItem('sbs_display_name') || 'User',
          role: session.role,
          locale: window.localStorage.getItem('sbs_locale') || 'id',
        },
        consents: { store_results: false, share_partner: false, share_nakes: false },
        assessmentAnswers: null,
        results: [],
        reminders: [],
        pairing: null,
        shareToken: null,
        tickets,
      });
    }
    if (url.pathname === '/api/pairings' && method === 'POST') {
      const code = 'K7M4P9';
      const created = {
        invite_code: code,
        user_a: session.userId || 'anon-test123',
        user_b: null,
        partner_a_alias: body.partnerAAlias || 'Pasangan A',
        partner_b_alias: body.partnerBAlias || 'Pasangan B',
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        shared_items: {
          shareAssessmentAnswers: false,
          shareAssessmentLevel: false,
          shareLabSummary: false,
          noteFromA: 'Aku mau kita cek bareng, bukan karena ada yang salah, tapi biar kita tahu langkah terbaik.',
          noteFromB: '',
        },
        prep_checklist: [
          {
            id: 'prep-1',
            text: 'Sepakati jendela masa pantang (abstinensia 2–7 hari) sebelum jadwal analisis semen',
            textEn: 'Agree on the 2–7 day abstinence window before your semen analysis appointment',
            checked: false,
          },
        ],
        plan_steps: [
          { step_key: 'cek_awal', step_order: 1, title: 'Cek Awal Mandiri', status_a: 'not_started', status_b: 'not_started' },
          { step_key: 'pilih_layanan', step_order: 2, title: 'Pilih Layanan Pemeriksaan', status_a: 'not_started', status_b: 'not_started' },
          { step_key: 'jadwalkan', step_order: 3, title: 'Jadwalkan & Persiapan (Pantang 2–7 Hari)', status_a: 'not_started', status_b: 'not_started' },
          { step_key: 'periksa', step_order: 4, title: 'Kunjungan Pemeriksaan', status_a: 'not_started', status_b: 'not_started' },
          { step_key: 'pahami_hasil', step_order: 5, title: 'Pahami Hasil Bersama', status_a: 'not_started', status_b: 'not_started' },
          { step_key: 'tindak_lanjut', step_order: 6, title: 'Rencana Tindak Lanjut Dokter', status_a: 'not_started', status_b: 'not_started' },
        ],
      };
      pairings.set(code, created);
      return jsonResponse(created);
    }
    const pairMatch = url.pathname.match(/^\/api\/pairings\/([^/]+)(?:\/(prep|shared|step|revoke))?$/);
    if (pairMatch) {
      const code = decodeURIComponent(pairMatch[1]).toUpperCase();
      const action = pairMatch[2];
      const existing = pairings.get(code);
      if (!existing) return jsonResponse({ error: 'Not found' }, 404);
      if (!action && method === 'GET') return jsonResponse(existing);
      if (action === 'prep' && method === 'PUT') {
        const updated = { ...existing, prep_checklist: body.items };
        pairings.set(code, updated);
        return jsonResponse(updated);
      }
      if (action === 'shared' && method === 'PUT') {
        const updated = {
          ...existing,
          shared_items: { ...(existing.shared_items as Record<string, unknown>), ...body },
        };
        pairings.set(code, updated);
        return jsonResponse(updated);
      }
      return jsonResponse(existing);
    }
    if (url.pathname === '/api/share-tokens' && method === 'POST') {
      const tokenCode = 'SBS-9K2M4P-1H';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const token = {
        id: 'st-1',
        token_code: tokenCode,
        scope: body.scope,
        expires_at: expiresAt,
        revoked: false,
        accessed_log: [],
        snapshot: body.snapshot,
      };
      shareTokens.set(tokenCode, token);
      return jsonResponse(token);
    }
    const shareAuditMatch = url.pathname.match(/^\/api\/share-tokens\/([^/]+)\/audit$/);
    if (shareAuditMatch) {
      const code = decodeURIComponent(shareAuditMatch[1]).toUpperCase();
      const tok = shareTokens.get(code);
      return tok ? jsonResponse(tok) : jsonResponse({ error: 'Not found' }, 404);
    }
    const shareMatch = url.pathname.match(/^\/api\/share-tokens\/([^/]+)$/);
    if (shareMatch) {
      const code = decodeURIComponent(shareMatch[1]).toUpperCase();
      const tok = shareTokens.get(code);
      if (!tok) return jsonResponse({ error: 'Token not found' }, 404);
      return jsonResponse(tok);
    }
    if (url.pathname === '/api/tickets' && method === 'GET') {
      return jsonResponse(tickets);
    }
    if (url.pathname === '/api/tickets' && method === 'POST') {
      const tk = {
        id: 'tk-' + (tickets.length + 1),
        category: body.category,
        text: body.text,
        status: 'terkirim',
        created_at: new Date().toISOString(),
      };
      tickets.unshift(tk);
      return jsonResponse(tk);
    }
    return jsonResponse({});
  });
}

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>
  );
}

describe('Uji Alur Utama, Privasi & Aksesibilitas Dasar (Side by Side)', () => {
  beforeEach(async () => {
    await wipeAllLocalData();
    window.localStorage.removeItem('sbs_locale');
    vi.stubGlobal('fetch', createApiMockFetch());
  });

  it('Alur 1: Cek Awal berjalan tanpa akun, menampilkan progress bar, dan menyelesaikan hasil dengan disclaimer', async () => {
    renderWithProviders(<AssessmentPage />, ['/cek-awal']);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(
      screen.getByText(/Sudah berapa lama Anda dan pasangan berupaya memiliki anak/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Lebih dari 12 bulan \(1–2 tahun\)/i }));
    for (let step = 0; step < 11; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Lewati/i }));
    }

    await waitFor(() => {
      expect(screen.getByText('Sebaiknya periksa dalam 1 sampai 2 bulan')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Ini bukan diagnosis. Hanya dokter yang dapat menilai kondisi Anda.')
    ).toBeInTheDocument();
  });

  it('Alur 2: Mode Berdua menautkan kode pasangan nyata via API dan menjaga privasi jawaban/lab secara default (OFF)', async () => {
    renderWithProviders(<CoupleModePage />, ['/berdua']);

    const createBtn = screen.getByRole('button', { name: /Tautkan \/ Buat Kode 24 Jam/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Layar Bersama: “Rencana Kita”/i)).toBeInTheDocument();
    });

    expect(screen.getByText('K7M4P9')).toBeInTheDocument();
    expect(
      screen.getByText(/hanya melihat status tahapan Rencana Kita di bawah ini/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Aku mau kita cek bareng, bukan karena ada yang salah/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('Alur 3: Berbagi dengan Nakes membuat Kode QR berlaku 1 jam hanya dengan cakupan yang disetujui', async () => {
    renderWithProviders(<ShareNakesPage />, ['/bagikan-nakes']);

    const createQrBtn = screen.getByRole('button', {
      name: /Buat Kode QR & Tautan Berlaku 1 Jam/i,
    });
    fireEvent.click(createQrBtn);

    await waitFor(() => {
      expect(screen.getByText(/Kode Akses Ringkasan Pasien:/i)).toBeInTheDocument();
    });

    expect(screen.getByText('SBS-9K2M4P-1H')).toBeInTheDocument();
    expect(screen.getByText(/Kedaluwarsa pada:/i)).toBeInTheDocument();
  });

  it('Alur 4: Enkripsi Web Crypto AES-GCM & Tombol "Hapus semua data saya" dengan konfirmasi 2 langkah', async () => {
    const sampleSecret = { answer: '6_to_12_months', note: 'Rahasia Medis' };
    const encrypted = await encryptPayload(sampleSecret);
    expect(encrypted).not.toContain('Rahasia Medis');
    const decrypted = await decryptPayload<typeof sampleSecret>(encrypted);
    expect(decrypted).toEqual(sampleSecret);

    renderWithProviders(<SettingsPage />, ['/pengaturan']);

    const deleteBtn = screen.getByRole('button', { name: /Hapus semua data saya/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    const step1Confirm = screen.getByRole('button', {
      name: /Ya, Lanjut ke Konfirmasi Akhir \(Langkah 2\)/i,
    });
    expect(step1Confirm).toBeInTheDocument();

    fireEvent.click(step1Confirm);
    const finalConfirm = screen.getByRole('button', {
      name: /Konfirmasi Hapus Permanen Sekarang/i,
    });
    expect(finalConfirm).toBeInTheDocument();
  });

  it('Uji Aksesibilitas Dasar: Semua toggle persetujuan default OFF, tidak ada Magic Link simulasi, dan token warna sesuai standar', () => {
    renderWithProviders(<WelcomePage />, ['/welcome']);

    expect(screen.getByRole('button', { name: /Mulai tanpa akun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat akun \/ Masuk/i })).toBeInTheDocument();
    expect(screen.queryByText(/Magic Link/i)).not.toBeInTheDocument();

    const storeConsent = screen.getByLabelText('Persetujuan penyimpanan hasil') as HTMLInputElement;
    const partnerConsent = screen.getByLabelText(
      'Persetujuan berbagi dengan pasangan'
    ) as HTMLInputElement;
    const nakesConsent = screen.getByLabelText(
      'Persetujuan berbagi dengan tenaga kesehatan'
    ) as HTMLInputElement;

    expect(storeConsent.checked).toBe(false);
    expect(partnerConsent.checked).toBe(false);
    expect(nakesConsent.checked).toBe(false);

    expect(designTokens.colors.teal).toBe('#0F8B8D');
    expect(designTokens.colors.navy).toBe('#1B2A41');
    expect(designTokens.colors.coral).toBe('#FF7A66');
    expect(designTokens.accessibility.minTouchTargetPx).toBe(44);
  });

  it('Alur 5: Direktori Layanan menampilkan Peta Ringkas dan Detail Layanan', async () => {
    renderWithProviders(<FacilitiesPage />, ['/layanan']);

    expect(screen.getByText(/Peta Ringkas Sebaran Layanan/i)).toBeInTheDocument();

    const detailButtons = screen.getAllByRole('button', { name: /Detail/i });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Rincian Skor Kurasi “Ramah Pria”/i)).toBeInTheDocument();
    });
  });

  it('Alur 6: Tindak Lanjut Hasil menampilkan empty state, mendukung Edit hasil, dan memuat Grafik Tren SVG', async () => {
    renderWithProviders(<ResultsPage />, ['/hasil']);

    expect(
      screen.getByText(/Belum ada hasil\. Tidak apa-apa, mulai dari mana pun Anda siap\./i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Input Hasil Analisis Semen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Simpan Hasil Terenkripsi/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Input Hasil Baru/i })).toBeInTheDocument();
    });

    // Edit capability works even with 1 result
    expect(screen.getByRole('button', { name: /Ubah hasil tanggal/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Input Hasil Baru/i }));
    fireEvent.click(screen.getByRole('button', { name: /Simpan Hasil Terenkripsi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Grafik Tren Antar Pemeriksaan/i)).toBeInTheDocument();
    });
  });

  it('Alur 7: Dasbor Nakes memproteksi akses bagi non-nakes dan menampilkan Templat Konseling + Antrean Tiket untuk Nakes terautentikasi', async () => {
    // 1. Unauthenticated / non-nakes user sees Clinician Sign-In Gate
    const guestRender = renderWithProviders(<NakesDashboardPage />, ['/nakes']);
    expect(screen.getByText(/Masuk Akun Tenaga Kesehatan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Templat Konseling Siap Salin/i)).not.toBeInTheDocument();
    guestRender.unmount();

    // 2. Authenticated clinician sees full workspace
    localStorage.setItem('sbs_auth_mode', 'nakes');
    localStorage.setItem('sbs_display_name', 'dr. Hendra, Sp.And');
    localStorage.setItem('sbs_user_email', 'dr.hendra@clinic.id');
    vi.stubGlobal('fetch', createApiMockFetch());

    renderWithProviders(<NakesDashboardPage />, ['/nakes']);

    expect(screen.getByText(/Templat Konseling Siap Salin/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiket Pertanyaan Anonim Masuk/i)).toBeInTheDocument();
  });

  it('Alur 8: Halaman Akun dalam mode akun (login) menyembunyikan tab masuk akun dan bebas dari simulasi OTP palsu', () => {
    localStorage.setItem('sbs_auth_mode', 'account');
    localStorage.setItem('sbs_display_name', 'Budi Santoso');
    localStorage.setItem('sbs_user_email', 'budi@example.com');
    vi.stubGlobal('fetch', createApiMockFetch());

    renderWithProviders(<AccountPage />, ['/akun']);

    expect(screen.queryByRole('button', { name: /Masuk \/ Buat Akun/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Simulated 6-Digit Code/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Profil & Tampilan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kata Sandi & Keamanan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kelola Data/i })).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('budi@example.com')).toBeInTheDocument();
  });

  it('Alur 9: ShareNakes membuat snapshot bersih tanpa faktor risiko palsu dan Nakes membukanya via API token', async () => {
    const sharedFetch = createApiMockFetch();
    vi.stubGlobal('fetch', sharedFetch);

    const patient = renderWithProviders(<ShareNakesPage />, ['/bagikan-nakes']);
    fireEvent.click(patient.getByRole('button', { name: /Buat Kode QR & Tautan Berlaku 1 Jam/i }));

    await waitFor(() => {
      expect(patient.getByText('SBS-9K2M4P-1H')).toBeInTheDocument();
    });
    patient.unmount();

    // Clinician opens /nakes?code=..., sees Clinician Gate, signs in, and views the patient summary
    renderWithProviders(<NakesDashboardPage />, ['/nakes?code=SBS-9K2M4P-1H']);
    expect(screen.getByText(/Masuk Akun Tenaga Kesehatan/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Email Klinik/i), {
      target: { value: 'dr.hendra@clinic.id' },
    });
    fireEvent.change(screen.getByLabelText(/Kata Sandi/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Masuk ke Dasbor Nakes/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Belum menyelesaikan Cek Awal/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText(/Kebiasaan merokok ringan\/vape/i)).not.toBeInTheDocument();
  });

  it('Alur 10: NakesDashboard menyembunyikan ringkasan QR yang sudah kedaluwarsa', async () => {
    localStorage.setItem('sbs_auth_mode', 'nakes');
    localStorage.setItem('sbs_display_name', 'dr. Hendra, Sp.And');
    vi.stubGlobal('fetch', createApiMockFetch());
    await saveEncryptedItem('share_token', {
      token_code: 'EXPIRED-99-1H',
      scope: ['history', 'risk_factors'],
      expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      revoked: false,
      accessed_log: [],
      snapshot: {
        patientAlias: 'Pasien Anonim',
        programDuration: '6 sampai 12 bulan',
        assessmentLevel: 'Sebaiknya periksa dalam 1 sampai 2 bulan',
      },
    });

    renderWithProviders(<NakesDashboardPage />, ['/nakes']);

    await waitFor(() => {
      expect(screen.getByText(/Templat Konseling Siap Salin/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Ringkasan Pasien Terverifikasi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EXPIRED-99-1H/)).not.toBeInTheDocument();
  });

  it('Alur 11: Simulator WHO, Pelacak Siklus 72 Hari, dan Checklist Dokter (termasuk pertanyaan pribadi) interaktif', async () => {
    const { unmount } = renderWithProviders(<SemenSimulatorPage />, ['/simulator']);
    expect(screen.getByText(/Simulator & Kalkulator Parameter Sperma/i)).toBeInTheDocument();
    const volSlider = screen.getByLabelText(/Volume Ejakulat \(mL\)/i) as HTMLInputElement;
    fireEvent.change(volSlider, { target: { value: '3.0' } });
    expect(volSlider.value).toBe('3');
    unmount();

    const tracker = renderWithProviders(<SpermatogenesisTrackerPage />, ['/siklus-72-hari']);
    const firstHabit = tracker.getAllByRole('checkbox')[0];
    expect(firstHabit).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(firstHabit);
    expect(firstHabit).toHaveAttribute('aria-checked', 'true');
    tracker.unmount();

    renderWithProviders(<DoctorChecklistPage />, ['/checklist-dokter']);
    expect(screen.getByText(/Apakah dokter bisa melakukan pemeriksaan fisik skrotum/i)).toBeInTheDocument();
    const customInput = screen.getByPlaceholderText(/Tambahkan pertanyaan pribadi/i);
    fireEvent.change(customInput, { target: { value: 'Apakah saya perlu USG skrotum?' } });
    fireEvent.click(screen.getByRole('button', { name: /Tambah Pertanyaan/i }));
    await waitFor(() => {
      expect(screen.getByText(/"Apakah saya perlu USG skrotum\?"/i)).toBeInTheDocument();
    });
  });

  it('Alur 12: Layout mendukung toggle Bahasa EN/ID dan Mode Gelap di header', async () => {
    document.documentElement.classList.remove('dark');
    renderWithProviders(
      <Layout>
        <div>Konten Uji</div>
      </Layout>,
      ['/']
    );

    const enBtn = screen.getByRole('button', { name: 'en' });
    fireEvent.click(enBtn);
    await waitFor(() => {
      expect(screen.getByText(/Your journey/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Manage Data/i })).toBeInTheDocument();
    });

    const themeBtn = screen.getByRole('button', { name: /Switch to dark theme/i });
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('Alur 13: Direktori Layanan & Pustaka mendukung pencarian kata kunci, empty state, dan tombol Reset Filter', async () => {
    const fac = renderWithProviders(<FacilitiesPage />, ['/layanan']);
    const searchInput = fac.getByLabelText(/Cari Nama Fasilitas atau Area/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Klinik Tidak Ada XYZ' } });

    expect(
      fac.getByText(/Tidak ada fasilitas yang sesuai dengan filter saat ini/i)
    ).toBeInTheDocument();

    const showAllBtn = fac.getByRole('button', { name: /Atur Ulang Semua Filter/i });
    fireEvent.click(showAllBtn);
    expect(searchInput.value).toBe('');
    fac.unmount();

    const lib = renderWithProviders(<LibraryPage />, ['/pustaka']);
    const libSearch = lib.getByLabelText(/Cari artikel edukasi/i) as HTMLInputElement;
    fireEvent.change(libSearch, { target: { value: 'Topik Tidak Ditemukan 999' } });
    expect(
      lib.getByText(/Belum ada artikel yang cocok dengan kata kunci atau kategori ini/i)
    ).toBeInTheDocument();
    fireEvent.click(lib.getByRole('button', { name: /Tampilkan Semua 12 Artikel/i }));
    expect(libSearch.value).toBe('');
    lib.unmount();
  });

  it('Alur 14: Hasil Analisis Semen menghitung estimasi TMSC dan halaman mendukung mode Bahasa Inggris (EN)', async () => {
    localStorage.setItem('sbs_locale', 'en');
    renderWithProviders(<ResultsPage />, ['/results']);

    fireEvent.click(screen.getByRole('button', { name: /Log Semen Analysis Result/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Encrypted Result/i }));

    await waitFor(() => {
      expect(screen.getByText(/Calculated Total Motile Sperm Count \(TMSC\)/i)).toBeInTheDocument();
      expect(screen.getByText(/General Lifestyle Recommendations \(74-Day Cycle\)/i)).toBeInTheDocument();
    });
  });

  it('Alur 15: Konten klinis (Cek Awal, Pustaka & FAQ, serta Direktori Layanan) terlokalisasi penuh dalam Bahasa Inggris (EN)', () => {
    localStorage.setItem('sbs_locale', 'en');

    const assess = renderWithProviders(<AssessmentPage />, ['/assessment']);
    expect(
      assess.getByText(/How long have you and your partner been trying to conceive/i)
    ).toBeInTheDocument();
    assess.unmount();

    const lib = renderWithProviders(<LibraryPage />, ['/library']);
    expect(
      lib.getByText(/What Is Male Reproductive Health and Why Does Checking Early Matter\?/i)
    ).toBeInTheDocument();
    expect(
      lib.getByText(/Can my partner or anyone else see my Self-Check answers\?/i)
    ).toBeInTheDocument();
    lib.unmount();

    const fac = renderWithProviders(<FacilitiesPage />, ['/facilities']);
    expect(fac.getByText(/What Is a Semen Analysis\?/i)).toBeInTheDocument();
    expect(fac.getAllByText(/Mon–Fri 07:30–16:00/i).length).toBeGreaterThan(0);
    fac.unmount();
  });

  it('Alur 16: ErrorBoundary menampilkan fallback aman dwi-bahasa tanpa menjatuhkan aplikasi', () => {
    const CrashingChild: React.FC = () => {
      throw new Error('Synthetic route error');
    };
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      render(
        <ErrorBoundary locale="en">
          <CrashingChild />
        </ErrorBoundary>
      );
      expect(screen.getByText(/Something went wrong while displaying this page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Home/i })).toBeInTheDocument();
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('Alur 17: Pergantian bahasa langsung EN/ID menyinkronkan lang HTML dan memperbarui hasil Cek Awal aktif secara dinamis', async () => {
    renderWithProviders(
      <Layout>
        <AssessmentPage />
      </Layout>,
      ['/cek-awal']
    );

    expect(document.documentElement.lang).toBe('id');
    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en');
      expect(
        screen.getByRole('radio', { name: /More than 12 months \(1–2 years\)/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('radio', { name: /More than 12 months \(1–2 years\)/i }));
    for (let step = 0; step < 11; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    }

    await waitFor(() => {
      expect(screen.getByText('Recommended to consult within 1 to 2 months')).toBeInTheDocument();
      expect(
        screen.getByText('This is not a diagnosis. Only a clinician can evaluate your health condition.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'id' }));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('id');
      expect(screen.getByText('Sebaiknya periksa dalam 1 sampai 2 bulan')).toBeInTheDocument();
    });
  });

  it('Alur 18: Simulator WHO menampilkan Hipospermia saat volume rendah, Pelacak menampilkan strip 7 hari, dan Pengaturan memulihkan cadangan JSON', async () => {
    const sim = renderWithProviders(<SemenSimulatorPage />, ['/simulator']);
    const volSlider = sim.getByLabelText(/Volume Ejakulat \(mL\)/i) as HTMLInputElement;
    fireEvent.change(volSlider, { target: { value: '1.0' } });
    expect(sim.getByTestId('simulator-classification')).toHaveTextContent(/Hipospermia/i);
    sim.unmount();

    const tracker = renderWithProviders(<SpermatogenesisTrackerPage />, ['/siklus-72-hari']);
    expect(tracker.getByTestId('habit-7day-strip')).toHaveTextContent(/Runtutan aktif: 0 hari/i);
    fireEvent.click(tracker.getAllByRole('checkbox')[0]);
    await waitFor(() => {
      expect(tracker.getByTestId('habit-7day-strip')).toHaveTextContent(/Runtutan aktif: 1 hari/i);
    });
    tracker.unmount();

    const settings = renderWithProviders(<SettingsPage />, ['/pengaturan']);
    const backupPayload = JSON.stringify({
      app: 'Side by Side — Ekspor Data Pribadi',
      labResults: [
        {
          testDate: '2026-10-15',
          volume_ml: 2.5,
          concentration_m_per_ml: 22,
          total_motility_pct: 50,
          progressive_motility_pct: 36,
          morphology_normal_pct: 5,
        },
      ],
      reminders: [{ type: 'follow_up', title: 'Kontrol Lab', remindAt: '2026-12-01T09:00' }],
    });
    const backupFile = new File([backupPayload], 'backup.json', { type: 'application/json' });
    // jsdom File may lack .text() in some runtimes; provide fallback safely
    if (typeof backupFile.text !== 'function') {
      Object.defineProperty(backupFile, 'text', { value: async () => backupPayload });
    }
    fireEvent.change(settings.getByTestId('backup-import-input'), { target: { files: [backupFile] } });
    expect(await settings.findByText(/Cadangan berhasil dipulihkan/i)).toBeInTheDocument();
  });
});
