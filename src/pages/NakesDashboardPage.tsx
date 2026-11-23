import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ClipboardList,
  Activity,
  AlertCircle,
  Clock,
  MessageCircleQuestion,
  Send,
  Lock,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { getLocalizedTemplates } from '../config/schemas';
import { useApp, type ShareTokenState } from '../context/AppContext';
import { ClinicianCarePlanForm } from '../components/ClinicianCarePlanForm';
import { AiVisitBrief } from '../components/AiVisitBrief';

export const NakesDashboardPage: React.FC = () => {
  const {
    locale,
    authMode,
    displayName,
    tickets,
    loginAccount,
    recordNakesAccess,
    refreshTickets,
    replyToTicket,
  } = useApp();
  const isEn = locale === 'en';
  const localizedTemplates = getLocalizedTemplates(locale);
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code');
  const isClinician = authMode === 'nakes';

  // Inline Clinician Portal Auth Gate state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providerName, setProviderName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  // Clinician Workspace state
  const [nakesName, setNakesName] = useState<string>(() => (isClinician && displayName ? displayName : ''));
  const [codeInput, setCodeInput] = useState<string>(() => (urlCode ? urlCode.toUpperCase() : ''));
  const [loadedSummary, setLoadedSummary] = useState<ShareTokenState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedTplId, setCopiedTplId] = useState<string>('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [isRefreshingTickets, setIsRefreshingTickets] = useState<boolean>(false);

  useEffect(() => {
    if (isClinician && displayName) {
      setNakesName(displayName);
    }
  }, [isClinician, displayName]);

  const loadQueue = useCallback(async () => {
    if (!isClinician) return;
    setIsRefreshingTickets(true);
    await refreshTickets();
    setIsRefreshingTickets(false);
  }, [isClinician, refreshTickets]);

  // Muat antrean sekali per sesi Nakes. (Bergantung pada `loadQueue` membuat efek berulang tanpa henti karena
  // `refreshTickets` berganti identitas setiap kali tiket diperbarui — memicu batas laju API 200/menit.)
  useEffect(() => {
    if (!isClinician) return;
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClinician]);

  useEffect(() => {
    if (!isClinician || !urlCode) return;
    const upper = urlCode.toUpperCase();
    setCodeInput(upper);
    recordNakesAccess(upper, nakesName || displayName).then((res) => {
      if (res.ok && res.data) {
        setLoadedSummary(res.data);
        setErrorMsg('');
      } else {
        setLoadedSummary(null);
        setErrorMsg(
          res.error ||
            (isEn
              ? 'Summary code not found, revoked by patient, or past the 1-hour expiry window.'
              : 'Kode ringkasan tidak ditemukan, sudah dicabut oleh pasien, atau telah melewati batas waktu 1 jam.')
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClinician, urlCode]);

  const handleClinicianAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@') || password.length < 8) {
      setAuthError(
        isEn
          ? 'Enter a valid clinic email and password (min. 8 characters).'
          : 'Masukkan email klinik valid dan kata sandi (minimal 8 karakter).'
      );
      return;
    }
    if (authTab === 'register' && !inviteCode.trim()) {
      setAuthError(
        isEn
          ? 'Clinic invite access code is required for Healthcare Provider registration.'
          : 'Kode akses undangan klinik wajib diisi untuk mendaftar sebagai Tenaga Kesehatan.'
      );
      return;
    }

    setIsAuthBusy(true);
    try {
      const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        authTab === 'register'
          ? {
              email: normalizedEmail,
              password,
              role: 'nakes',
              displayName: providerName.trim() || undefined,
              inviteCode: inviteCode.trim(),
            }
          : { email: normalizedEmail, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (!res.ok) {
        const errData = isJson ? await res.json() : {};
        setAuthError(
          errData.error ||
            (isEn ? 'Clinician authentication failed.' : 'Gagal masuk ke portal Tenaga Kesehatan.')
        );
        return;
      }
      const data = await res.json();
      if (data.role !== 'nakes') {
        setAuthError(
          isEn
            ? 'This account is registered as a Patient/Partner. Please sign in with a verified Healthcare Provider account.'
            : 'Akun ini terdaftar sebagai Pengguna/Pasangan. Gunakan akun Tenaga Kesehatan terverifikasi.'
        );
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        return;
      }
      await loginAccount(data.email, 'nakes', data.displayName, data.id);
    } catch {
      setAuthError(
        isEn
          ? 'Unable to connect to authentication server.'
          : 'Tidak dapat terhubung ke server autentikasi.'
      );
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleOpenPatientCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    if (!codeInput.trim()) return;

    const res = await recordNakesAccess(
      codeInput.trim(),
      nakesName.trim() || displayName || (isEn ? 'Healthcare Provider' : 'Tenaga Kesehatan')
    );
    if (res.ok && res.data) {
      setLoadedSummary(res.data);
    } else {
      setLoadedSummary(null);
      setErrorMsg(
        res.error ||
          (isEn
            ? 'Summary code not found, revoked by patient, or past the 1-hour expiry window.'
            : 'Kode ringkasan tidak ditemukan, sudah dicabut oleh pasien, atau telah melewati batas waktu 1 jam.')
      );
    }
  };

  const handleCopyCounselingTemplate = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard fallback in non-browser contexts
    }
    setCopiedTplId(id);
    setTimeout(() => setCopiedTplId(''), 2500);
  };

  const handleSendReply = async (ticketId: string) => {
    const text = replyDrafts[ticketId];
    if (!text || text.trim().length < 5) {
      setErrorMsg(
        isEn ? 'Clinical reply must be at least 5 characters.' : 'Balasan klinis minimal 5 karakter.'
      );
      return;
    }
    setErrorMsg('');
    const res = await replyToTicket(ticketId, text.trim());
    if (res.ok) {
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
    } else {
      setErrorMsg(res.error || (isEn ? 'Failed to send reply.' : 'Gagal mengirim balasan.'));
    }
  };

  const isActiveExpired = Boolean(
    loadedSummary && new Date(loadedSummary.expires_at).getTime() <= Date.now()
  );

  const filteredTickets = tickets.filter((tk) => {
    if (ticketFilter === 'pending') return tk.status !== 'dijawab';
    if (ticketFilter === 'answered') return tk.status === 'dijawab';
    return true;
  });

  // Protected Clinician Portal Gate
  if (!isClinician) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <section className="page-header space-y-2.5">
          <div className="badge badge-teal">
            <Lock className="w-3.5 h-3.5" />
            <span>
              {isEn ? 'Protected Healthcare Provider Portal' : 'Portal Tenaga Kesehatan Terproteksi'}
            </span>
          </div>
          <h1 className="page-title">
            {isEn ? 'Clinician Sign-In Required' : 'Masuk Akun Tenaga Kesehatan'}
          </h1>
          <p className="page-lead">
            {isEn
              ? 'To protect patient privacy, reading 1-hour QR clinical summaries and replying to anonymous patient questions require a verified Healthcare Provider session.'
              : 'Demi menjaga privasi pasien, pembukaan ringkasan QR 1 jam dan penjawaban antrean pertanyaan anonim hanya tersedia untuk akun Tenaga Kesehatan terverifikasi.'}
          </p>
          {urlCode && (
            <div className="p-3 rounded-xl bg-brand-teal-light/60 dark:bg-brand-teal/15 text-xs font-bold text-brand-teal-dark dark:text-[#7FDADB]">
              {isEn
                ? `QR Code detected (${urlCode.toUpperCase()}). Sign in as a Healthcare Provider below to inspect it.`
                : `Kode QR terdeteksi (${urlCode.toUpperCase()}). Masuk sebagai Tenaga Kesehatan di bawah untuk membukanya.`}
            </div>
          )}
        </section>

        <section className="card p-6 space-y-5">
          <div className="flex gap-2 p-1 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setAuthError('');
              }}
              className={`flex-1 py-2 rounded-btn text-xs font-bold transition ${
                authTab === 'login'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70'
              }`}
            >
              {isEn ? 'Provider Sign In' : 'Masuk Nakes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setAuthError('');
              }}
              className={`flex-1 py-2 rounded-btn text-xs font-bold transition ${
                authTab === 'register'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70'
              }`}
            >
              {isEn ? 'Register with Clinic Code' : 'Daftar dengan Kode Klinik'}
            </button>
          </div>

          <form onSubmit={handleClinicianAuthSubmit} className="space-y-4">
            {authTab === 'register' && (
              <>
                <div>
                  <label htmlFor="nakes-reg-name" className="field-label">
                    {isEn ? 'Clinician Full Name & Title' : 'Nama Lengkap & Gelar Klinis'}
                  </label>
                  <input
                    id="nakes-reg-name"
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder={isEn ? 'e.g., Dr. Budi Santoso, MD' : 'Mis: dr. Budi Santoso'}
                    className="field w-full"
                  />
                </div>
                <div>
                  <label htmlFor="nakes-reg-invite" className="field-label flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-teal" />
                    <span>{isEn ? 'Clinic Access Invite Code' : 'Kode Akses Undangan Klinik'}</span>
                  </label>
                  <input
                    id="nakes-reg-invite"
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={isEn ? 'Provided by your clinic admin' : 'Diperoleh dari admin fasilitas'}
                    className="field w-full font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="nakes-auth-email" className="field-label">
                {isEn ? 'Clinic / Provider Email' : 'Email Klinik / Tenaga Kesehatan'}
              </label>
              <input
                id="nakes-auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dokter@klinik.id"
                className="field w-full"
              />
            </div>

            <div>
              <label htmlFor="nakes-auth-password" className="field-label">
                {isEn ? 'Password (min. 8 characters)' : 'Kata Sandi (min. 8 karakter)'}
              </label>
              <input
                id="nakes-auth-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field w-full"
              />
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-status-urgent-bg text-[#B33834] text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" disabled={isAuthBusy} className="btn btn-primary w-full">
              <Stethoscope className="w-4 h-4" />
              <span>
                {isAuthBusy
                  ? isEn
                    ? 'Verifying...'
                    : 'Memverifikasi...'
                  : authTab === 'register'
                  ? isEn
                    ? 'Create Verified Provider Account'
                    : 'Buat Akun Nakes Terverifikasi'
                  : isEn
                  ? 'Sign In to Provider Dashboard'
                  : 'Masuk ke Dasbor Nakes'}
              </span>
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Mode Tenaga Kesehatan */}
      <section className="page-header flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5 min-w-0">
          <div className="badge badge-success">
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>
              {isEn
                ? 'Verified Clinician Workspace • Efficient, Empathetic Consultation'
                : 'Ruang Kerja Tenaga Kesehatan Terverifikasi • Konsultasi Efisien & Bermutu'}
            </span>
          </div>
          <h1 className="page-title">
            {isEn ? 'Healthcare Provider Dashboard' : 'Dasbor Tenaga Kesehatan'} — {displayName}
          </h1>
          <p className="page-lead">
            {isEn
              ? 'Review 1-hour patient QR summaries, copy structured counseling templates, and answer anonymous patient questions.'
              : 'Tinjau ringkasan pasien dari Kode QR (berlaku 1 jam), salin templat konseling terstruktur, dan jawab tiket pertanyaan anonim.'}
          </p>
        </div>
      </section>

      {/* Form Input Kode QR Pasien */}
      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="section-title flex items-start gap-2">
          <QrCode className="w-5 h-5 text-brand-teal shrink-0 mt-1" />
          <span>{isEn ? 'Open Patient Summary (1-Hour QR / Token)' : 'Buka Ringkasan Pasien (Kode QR / Tautan 1 Jam)'}</span>
        </h2>

        <form onSubmit={handleOpenPatientCode} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="nakes-viewer-name" className="field-label">
              {isEn
                ? 'Examining Provider Identity (Recorded in Patient Log)'
                : 'Identitas Tenaga Kesehatan Pemeriksa (Tercatat di Log Pasien)'}
            </label>
            <input
              id="nakes-viewer-name"
              type="text"
              required
              value={nakesName}
              onChange={(e) => setNakesName(e.target.value)}
              placeholder={isEn ? 'Example: Dr. Budi (General Practitioner)' : 'Contoh: dr. Budi (Dokter Umum)'}
              className="field w-full"
            />
          </div>

          <div>
            <label htmlFor="nakes-token-code" className="field-label">
              {isEn ? 'Patient Summary Code / QR Token' : 'Kode Ringkasan / Token QR Pasien'}
            </label>
            <input
              id="nakes-token-code"
              type="text"
              required
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="SBS-XXXXXX-1H"
              className="field w-full font-bold uppercase font-mono"
            />
          </div>

          <div className="flex items-end md:col-span-2 xl:col-span-1">
            <button type="submit" className="btn btn-primary w-full">
              {isEn ? 'Open & Log Access' : 'Buka & Catat Akses di Log Pasien'}
            </button>
          </div>
        </form>

        {errorMsg && (
          <div role="alert" className="p-3.5 rounded-xl bg-status-urgent-bg dark:bg-status-urgent/20 text-[#B33834] dark:text-[#FF8A85] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Ringkasan Pasien yang Dibagikan */}
      {loadedSummary && !loadedSummary.revoked && !isActiveExpired ? (
        <section className="card p-5 sm:p-6 border-brand-teal/50 ring-4 ring-brand-teal/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/10 dark:border-white/10 pb-4">
            <div className="space-y-1">
              <span className="eyebrow flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {isEn ? 'Verified Patient Summary' : 'Ringkasan Pasien Terverifikasi'} •{' '}
                {isEn ? 'Code:' : 'Kode:'} {loadedSummary.token_code}
              </span>
              <h2 className="text-xl font-extrabold text-brand-navy dark:text-white">
                {isEn ? 'Patient:' : 'Pasien:'} {loadedSummary.snapshot.patientAlias}
              </h2>
            </div>

            <div className="text-xs text-brand-navy/70 dark:text-white/70 flex items-center gap-1">
              <Clock className="w-4 h-4 text-brand-coral" />
              <span>
                {isEn
                  ? `Valid until ${new Date(loadedSummary.expires_at).toLocaleTimeString('en-US')}`
                  : `Berlaku s.d. ${new Date(loadedSummary.expires_at).toLocaleTimeString('id-ID')} WIB`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="well p-4 sm:p-5 space-y-2.5">
              <h3 className="eyebrow flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                {isEn ? '1. History Summary & Guidance Level' : '1. Ringkasan Riwayat & Tingkat Saran'}
              </h3>
              {loadedSummary.scope.includes('history') ? (
                <div className="space-y-1.5 text-xs leading-relaxed">
                  <div>
                    <span className="font-semibold">
                      {isEn ? 'Trying to Conceive Duration:' : 'Durasi Program Hamil:'}
                    </span>{' '}
                    {loadedSummary.snapshot.programDuration}
                  </div>
                  <div>
                    <span className="font-semibold">
                      {isEn ? 'Self-Check Guidance:' : 'Hasil Cek Awal Mandiri:'}
                    </span>{' '}
                    <strong className="text-[#B93E2B] dark:text-[#FFA596]">
                      {loadedSummary.snapshot.assessmentLevel}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-brand-navy/60 dark:text-white/60">
                  {isEn
                    ? 'Excluded by patient sharing consent.'
                    : 'Tidak termasuk dalam cakupan persetujuan berbagi pasien.'}
                </p>
              )}
            </div>

            <div className="well p-4 sm:p-5 space-y-2.5">
              <h3 className="eyebrow flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                {isEn ? '2. Reported Risk Factors' : '2. Faktor Risiko yang Dilaporkan'}
              </h3>
              {loadedSummary.scope.includes('risk_factors') &&
              loadedSummary.snapshot.reportedRiskFactors ? (
                <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85 marker:text-brand-teal">
                  {loadedSummary.snapshot.reportedRiskFactors.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-brand-navy/60 dark:text-white/60">
                  {isEn
                    ? 'Excluded by patient sharing consent.'
                    : 'Tidak termasuk dalam cakupan persetujuan berbagi pasien.'}
                </p>
              )}
            </div>
          </div>

          <div className="well p-4 sm:p-5 space-y-3">
            <h3 className="eyebrow">
              {isEn
                ? '3. Shared Semen Analysis Results (WHO 2021 Reference)'
                : '3. Hasil Analisis Semen yang Dibagikan (Acuan Rujukan WHO 2021)'}
            </h3>
            {loadedSummary.scope.includes('lab_results') &&
            loadedSummary.snapshot.labResults &&
            loadedSummary.snapshot.labResults.length > 0 ? (
              <div className="overflow-x-auto thin-scroll -mx-1 px-1">
                <table className="w-full min-w-[36rem] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-brand-navy/15 dark:border-white/15 text-2xs text-brand-navy/65 dark:text-white/65 whitespace-nowrap">
                      <th className="py-2 pr-3">{isEn ? 'Test Date' : 'Tanggal Tes'}</th>
                      <th className="py-2 pr-3">{isEn ? 'Volume (≥1.4 mL)' : 'Volume (≥1,4 mL)'}</th>
                      <th className="py-2 pr-3">{isEn ? 'Conc. (≥16 M/mL)' : 'Konsentrasi (≥16 jt/mL)'}</th>
                      <th className="py-2 pr-3">{isEn ? 'Total Motility (≥42%)' : 'Motilitas Total (≥42%)'}</th>
                      <th className="py-2 pr-3">{isEn ? 'Progressive (≥30%)' : 'Progresif (≥30%)'}</th>
                      <th className="py-2">{isEn ? 'Morphology (≥4%)' : 'Morfologi (≥4%)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
                    {loadedSummary.snapshot.labResults.map((lr, idx) => (
                      <tr key={idx} className="font-medium">
                        <td className="py-2.5 pr-3 font-bold whitespace-nowrap">{lr.testDate}</td>
                        <td className="py-2 pr-3">{lr.volume_ml} mL</td>
                        <td
                          className={`py-2 pr-3 font-bold ${
                            lr.concentration_m_per_ml < 16
                              ? 'text-[#946A00] dark:text-[#F3C64D]'
                              : 'text-[#1F7A50] dark:text-[#7BD9AC]'
                          }`}
                        >
                          {lr.concentration_m_per_ml} {isEn ? 'M/mL' : 'jt/mL'}
                        </td>
                        <td
                          className={`py-2 pr-3 font-bold ${
                            lr.total_motility_pct < 42
                              ? 'text-[#946A00] dark:text-[#F3C64D]'
                              : 'text-[#1F7A50] dark:text-[#7BD9AC]'
                          }`}
                        >
                          {lr.total_motility_pct}%
                        </td>
                        <td className="py-2 pr-3">{lr.progressive_motility_pct}%</td>
                        <td className="py-2">{lr.morphology_normal_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs italic text-brand-navy/60 dark:text-white/60">
                {isEn
                  ? 'No semen analysis lab results shared in this summary yet.'
                  : 'Belum ada hasil laboratorium yang dibagikan dalam ringkasan ini.'}
              </p>
            )}
          </div>

          {/* 4. Penjelasan risiko berbahasa awam (bukan skor) */}
          {loadedSummary.snapshot.riskExplanation && (
            <div className="well p-4 sm:p-5 space-y-3" data-testid="nakes-risk-explanation">
              <h3 className="eyebrow">
                {isEn ? '4. Plain-language breakdown the patient saw' : '4. Penjelasan berbahasa awam yang dilihat pasien'}
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85 marker:text-brand-teal">
                {loadedSummary.snapshot.riskExplanation.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              {loadedSummary.snapshot.riskExplanation.factors.length > 0 && (
                <div className="overflow-x-auto thin-scroll">
                  <table className="w-full min-w-[30rem] text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-brand-navy/15 dark:border-white/15 text-2xs text-brand-navy/65 dark:text-white/65">
                        <th className="py-2 pr-3">{isEn ? 'Factor' : 'Faktor'}</th>
                        <th className="py-2 pr-3">{isEn ? 'Influence' : 'Pengaruh'}</th>
                        <th className="py-2">{isEn ? 'Type' : 'Jenis'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
                      {loadedSummary.snapshot.riskExplanation.factors.map((f, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 font-semibold">
                            {f.title}
                            {f.decisive ? (isEn ? ' (decisive)' : ' (penentu)') : ''}
                          </td>
                          <td className="py-2 pr-3">{f.influence}</td>
                          <td className="py-2">{f.changeability}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. Ringkasan rujukan & jalur perawatan */}
          {loadedSummary.snapshot.referral && (
            <div className="well p-4 sm:p-5 space-y-2 text-xs leading-relaxed" data-testid="nakes-referral">
              <h3 className="eyebrow">{isEn ? '5. Referral request & care pathway' : '5. Permintaan rujukan & jalur perawatan'}</h3>
              <div>
                <span className="font-semibold">{isEn ? 'Seeking:' : 'Spesialis yang dituju:'}</span>{' '}
                {loadedSummary.snapshot.referral.specialist}
              </div>
              {loadedSummary.snapshot.referral.reasons.length > 0 && (
                <ul className="list-disc pl-4 space-y-1 marker:text-brand-teal">
                  {loadedSummary.snapshot.referral.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
              {loadedSummary.snapshot.referral.firstTests.length > 0 && (
                <div>
                  <span className="font-semibold">{isEn ? 'Likely first steps:' : 'Kemungkinan langkah awal:'}</span>{' '}
                  {loadedSummary.snapshot.referral.firstTests.join('; ')}
                </div>
              )}
              {(loadedSummary.snapshot.referral.route || loadedSummary.snapshot.referral.facility) && (
                <div>
                  <span className="font-semibold">{isEn ? 'Route / facility:' : 'Jalur / fasilitas:'}</span>{' '}
                  {[loadedSummary.snapshot.referral.route, loadedSummary.snapshot.referral.facility].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* Ringkasan AI (hanya bila pasien mengizinkan pada QR ini) */}
          {loadedSummary.ai_allowed && (
            <AiVisitBrief tokenCode={loadedSummary.token_code} locale={isEn ? 'en' : 'id'} />
          )}

          {/* 6. Ringkasan progres privat */}
          {loadedSummary.snapshot.progressSummary && (
            <div className="well p-4 sm:p-5 space-y-2" data-testid="nakes-progress">
              <h3 className="eyebrow">{isEn ? '6. Self-reported trends over time' : '6. Tren yang dilaporkan sendiri dari waktu ke waktu'}</h3>
              <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85 marker:text-brand-teal">
                {loadedSummary.snapshot.progressSummary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {/* Rencana pasca-konsultasi: tersedia setelah ringkasan dibuka (hingga 24 jam sejak kode dibuat) */}
      {loadedSummary && !loadedSummary.revoked && (
        <ClinicianCarePlanForm
          key={loadedSummary.token_code}
          tokenCode={loadedSummary.token_code}
          defaultClinicianName={nakesName || displayName}
          locale={isEn ? 'en' : 'id'}
          alreadyWrittenAt={loadedSummary.care_plan_written_at}
        />
      )}

      {/* Templat Konseling Tenaga Kesehatan */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title">
              {isEn
                ? 'Ready-to-Copy Counseling Templates (Patient Education & Clinical Notes)'
                : 'Templat Konseling Siap Salin (Untuk Edukasi Pasien & Catatan Klinis)'}
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Helps primary care clinicians deliver empathetic, blame-free, evidence-informed counseling quickly.'
                : 'Membantu dokter umum di Puskesmas/FKTP memberikan konseling singkat yang empatik, tidak menyalahkan, dan bermutu.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handleCopyCounselingTemplate(
                'all',
                localizedTemplates.counselingTemplates.map((t) => t.content).join('\n\n')
              )
            }
            className="btn btn-primary shrink-0 self-start lg:self-auto"
          >
            {copiedTplId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>
              {copiedTplId === 'all'
                ? isEn
                  ? 'All Templates Copied!'
                  : 'Semua Templat Disalin!'
                : isEn
                ? 'Copy Full Counseling Pack'
                : 'Salin Paket Konseling Lengkap'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localizedTemplates.counselingTemplates.map((tpl) => (
            <div key={tpl.id} className="well p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <span className="badge badge-teal">
                  {isEn ? 'Topic:' : 'Topik:'} {tpl.topic}
                </span>
                <h3 className="font-bold text-base leading-snug text-brand-navy dark:text-white">{tpl.title}</h3>
                <pre className="whitespace-pre-wrap font-sans text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed bg-surface dark:bg-surface-dark-card p-4 rounded-xl border border-brand-navy/5 dark:border-white/10">
                  {tpl.content}
                </pre>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCounselingTemplate(tpl.id, tpl.content)}
                className="btn btn-secondary w-full"
              >
                {copiedTplId === tpl.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>
                  {copiedTplId === tpl.id
                    ? isEn
                      ? 'Counseling Template Copied!'
                      : 'Templat Konseling Disalin!'
                    : isEn
                    ? 'Copy Counseling Template'
                    : 'Salin Templat Konseling'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Antrean Tiket Pertanyaan Anonim */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title flex items-start gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-brand-coral shrink-0 mt-1" />
              <span>
                {isEn
                  ? `Anonymous Patient Question Queue (${filteredTickets.length})`
                  : `Tiket Pertanyaan Anonim Masuk (${filteredTickets.length})`}
              </span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Reply to anonymous questions submitted through the Ask Healthcare Provider feature.'
                : 'Jawab pertanyaan anonim yang dikirimkan pengguna melalui fitur Tanya Tenaga Kesehatan.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-1 rounded-full bg-brand-navy/[0.05] dark:bg-white/[0.06] text-xs font-bold">
              {(['all', 'pending', 'answered'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTicketFilter(tab)}
                  className={`px-3 py-1.5 rounded-full transition ${
                    ticketFilter === tab
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/70 dark:text-white/70'
                  }`}
                >
                  {tab === 'all'
                    ? isEn
                      ? 'All'
                      : 'Semua'
                    : tab === 'pending'
                    ? isEn
                      ? 'Pending'
                      : 'Menunggu'
                    : isEn
                    ? 'Answered'
                    : 'Dijawab'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadQueue}
              disabled={isRefreshingTickets}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTickets ? 'animate-spin' : ''}`} />
              <span>{isEn ? 'Refresh' : 'Segarkan'}</span>
            </button>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="well p-5 text-xs text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'No anonymous question tickets in this view right now.'
              : 'Belum ada tiket pertanyaan anonim pada tampilan ini.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((tItem) => (
              <div key={tItem.id} className="well p-4 sm:p-5 space-y-3 text-xs leading-relaxed">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">{tItem.category}</span>
                  <span
                    className={`badge ${
                      tItem.status === 'dijawab'
                        ? 'badge-success'
                        : 'bg-status-warning-bg text-[#7A5600] dark:bg-status-warning/20 dark:text-[#F3C64D]'
                    }`}
                  >
                    {tItem.status === 'dijawab'
                      ? isEn
                        ? 'Answered'
                        : 'Sudah Dijawab'
                      : isEn
                      ? 'Awaiting Clinician Reply'
                      : 'Menunggu Jawaban Nakes'}
                  </span>
                </div>

                <p className="font-bold text-sm leading-relaxed text-brand-navy dark:text-white">“{tItem.text}”</p>

                {tItem.reply_text ? (
                  <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border-l-4 border-brand-teal space-y-1">
                    <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">{tItem.replied_by}:</div>
                    <p className="text-brand-navy/85 dark:text-white/85 leading-relaxed">{tItem.reply_text}</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      aria-label={isEn ? 'Reply to question ticket' : 'Tanggapan untuk tiket pertanyaan'}
                      value={replyDrafts[tItem.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [tItem.id]: e.target.value }))}
                      placeholder={
                        isEn
                          ? 'Write an educational clinical response for this anonymous question...'
                          : 'Tulis tanggapan edukasi medis untuk pertanyaan anonim ini...'
                      }
                      className="field flex-1"
                    />
                    <button type="button" onClick={() => handleSendReply(tItem.id)} className="btn btn-primary">
                      <Send className="w-4 h-4" /> {isEn ? 'Reply' : 'Jawab'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
