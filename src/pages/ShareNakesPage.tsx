import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  XCircle,
  Eye,
  Link2,
  Printer,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp, type ShareScope } from '../context/AppContext';
import { useAiStatus } from '../lib/ai-client';

export const ShareNakesPage: React.FC = () => {
  const {
    locale,
    shareToken,
    createShareToken,
    refreshShareTokenAudit,
    revokeShareToken,
  } = useApp();
  const isEn = locale === 'en';

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromPathway = searchParams.get('preset') === 'pathway';
  // Dari Jalur Perawatan: ringkasan rujukan ikut dicentang; progres privat tetap OFF kecuali dipilih sendiri.
  const [selectedScopes, setSelectedScopes] = useState<ShareScope[]>(() =>
    fromPathway
      ? ['history', 'risk_factors', 'care_pathway', 'lab_results']
      : ['history', 'risk_factors', 'lab_results']
  );
  const aiStatus = useAiStatus();
  const [allowAiBrief, setAllowAiBrief] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRefreshingLog, setIsRefreshingLog] = useState<boolean>(false);

  const isTokenExpired = Boolean(
    shareToken && new Date(shareToken.expires_at).getTime() <= Date.now()
  );
  const isTokenActive = Boolean(shareToken && !shareToken.revoked && !isTokenExpired);

  const handleRefreshAudit = useCallback(async () => {
    if (!isTokenActive) return;
    setIsRefreshingLog(true);
    await refreshShareTokenAudit();
    setIsRefreshingLog(false);
  }, [isTokenActive, refreshShareTokenAudit]);

  useEffect(() => {
    if (!isTokenActive) return;
    void refreshShareTokenAudit();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshShareTokenAudit();
      }
    }, 10000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenActive, shareToken?.token_code]);

  const toggleScope = (scopeKey: ShareScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeKey) ? prev.filter((s) => s !== scopeKey) : [...prev, scopeKey]
    );
  };

  const handleGenerateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedScopes.length === 0) return;
    setErrorMsg('');
    setIsGenerating(true);
    const res = await createShareToken(selectedScopes, { aiAllowed: aiStatus.enabled && allowAiBrief });
    setIsGenerating(false);
    if (!res.ok) {
      setErrorMsg(
        res.error ||
          (isEn ? 'Failed to generate QR share link.' : 'Gagal membuat kode QR berbagi.')
      );
    }
  };

  const handleRevoke = async () => {
    setErrorMsg('');
    const res = await revokeShareToken();
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleCopyToken = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard fallback
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyShareUrl = async (code: string) => {
    const url = `${window.location.origin}${isEn ? '/provider' : '/nakes'}?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard fallback
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Berbagi dengan Tenaga Kesehatan */}
      <section className="page-header space-y-2.5">
        <span className="badge badge-teal">
          <ShieldCheck className="w-4 h-4" />
          {isEn ? 'Patient Privacy Control • 1-Hour Expiry Link' : 'Kendali Privasi Pasien • Tautan Berlaku 1 Jam'}
        </span>
        <h1 className="page-title">
          {isEn ? 'Share Patient Summary with Healthcare Provider' : 'Bagikan Ringkasan Pasien ke Tenaga Kesehatan'}
        </h1>
        <p className="page-lead">
          {isEn ? (
            <>
              Choose exactly which sections to show your clinician during consultation. The QR code and link automatically expire in <strong>1 hour</strong>, and every provider access is logged below.
            </>
          ) : (
            <>
              Pilih sendiri bagian mana yang ingin Anda tunjukkan kepada dokter saat konsultasi. Kode QR dan tautan otomatis kedaluwarsa dalam <strong>1 jam</strong> dan setiap akses oleh tenaga kesehatan tercatat di halaman ini.
            </>
          )}
        </p>
      </section>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-status-urgent-bg dark:bg-status-urgent/20 text-[#B33834] dark:text-[#FF8A85] text-xs font-bold flex items-center gap-2 border border-status-urgent/30"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Kolom Kiri: Pilih Cakupan Data & Buat Kode QR */}
        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="section-title">
            {isEn ? '1. Select Approved Data Sections to Share' : '1. Pilih Bagian Data yang Disetujui untuk Dibagikan'}
          </h2>

          <form onSubmit={handleGenerateQr} className="space-y-3">
            <label className="well p-4 flex items-start gap-3 cursor-pointer transition hover:border-brand-teal/50 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15">
              <input
                type="checkbox"
                checked={selectedScopes.includes('history')}
                onChange={() => toggleScope('history')}
                className="check mt-0.5 shrink-0"
              />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-sm text-brand-navy dark:text-white">
                  {isEn ? 'History Summary & Self-Check Guidance Level' : 'Ringkasan Riwayat & Tingkat Saran Cek Awal'}
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'Time trying to conceive and recommended check-up timeframe (without exposing raw per-question answers).'
                    : 'Durasi program hamil dan tingkat saran waktu pemeriksaan (tanpa membuka jawaban mentah per pertanyaan).'}
                </p>
              </div>
            </label>

            <label className="well p-4 flex items-start gap-3 cursor-pointer transition hover:border-brand-teal/50 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15">
              <input
                type="checkbox"
                checked={selectedScopes.includes('risk_factors')}
                onChange={() => toggleScope('risk_factors')}
                className="check mt-0.5 shrink-0"
              />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-sm text-brand-navy dark:text-white">
                  {isEn ? 'Reported Lifestyle & Medical Risk Factors' : 'Faktor Risiko Gaya Hidup & Medis yang Dilaporkan'}
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'Helps your physician provide focused, empathetic counseling within a brief appointment.'
                    : 'Membantu dokter memberikan konseling yang terfokus dalam waktu konsultasi singkat.'}
                </p>
              </div>
            </label>

            <label className="well p-4 flex items-start gap-3 cursor-pointer transition hover:border-brand-teal/50 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15">
              <input
                type="checkbox"
                checked={selectedScopes.includes('care_pathway')}
                onChange={() => toggleScope('care_pathway')}
                className="check mt-0.5 shrink-0"
              />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-sm text-brand-navy dark:text-white">
                  {isEn ? 'Referral Summary & Care Pathway' : 'Ringkasan Rujukan & Jalur Perawatan'}
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'The specialist you are seeking and why, likely first tests, and your chosen route. Lets your doctor send a post-visit care plan back to you.'
                    : 'Spesialis yang Anda tuju beserta alasannya, kemungkinan tes awal, dan jalur yang dipilih. Memungkinkan dokter mengirim rencana pasca-kunjungan kembali kepada Anda.'}
                </p>
              </div>
            </label>

            <label className="well p-4 flex items-start gap-3 cursor-pointer transition hover:border-brand-teal/50 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15">
              <input
                type="checkbox"
                checked={selectedScopes.includes('progress')}
                onChange={() => toggleScope('progress')}
                className="check mt-0.5 shrink-0"
              />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-sm text-brand-navy dark:text-white">
                  {isEn ? 'My Progress (trend summary only)' : 'Progres Saya (ringkasan tren saja)'}
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'Plain-language trends from your private check-ins and past self-check levels. Your notes are never included.'
                    : 'Tren berbahasa awam dari check-in privat dan tingkat Cek Awal sebelumnya. Catatan pribadi Anda tidak pernah disertakan.'}
                </p>
              </div>
            </label>

            <label className="well p-4 flex items-start gap-3 cursor-pointer transition hover:border-brand-teal/50 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal-light/40 dark:has-[:checked]:bg-brand-teal/15">
              <input
                type="checkbox"
                checked={selectedScopes.includes('lab_results')}
                onChange={() => toggleScope('lab_results')}
                className="check mt-0.5 shrink-0"
              />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-sm text-brand-navy dark:text-white">
                  {isEn ? 'Semen Analysis Lab Results Log' : 'Riwayat Angka Hasil Analisis Semen'}
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'Displays volume, concentration, motility, and morphology numbers you have recorded.'
                    : 'Menampilkan tabel volume, konsentrasi, motilitas, dan morfologi yang telah Anda catat.'}
                </p>
              </div>
            </label>

            {aiStatus.enabled && (
              <label className="flex items-start gap-2.5 px-1 text-xs cursor-pointer text-brand-navy/85 dark:text-white/85">
                <input
                  type="checkbox"
                  className="check mt-0.5 shrink-0"
                  checked={allowAiBrief}
                  onChange={(e) => setAllowAiBrief(e.target.checked)}
                />
                <span>
                  <strong>{isEn ? 'Allow an AI visit brief (optional).' : 'Izinkan ringkasan kunjungan AI (opsional).'}</strong>{' '}
                  {isEn
                    ? 'Lets the clinician generate a short AI brief from the sections above. Your name is never sent; the action is logged below. Default: off.'
                    : 'Memungkinkan dokter membuat ringkasan AI singkat dari bagian di atas. Nama Anda tidak pernah dikirim; tindakan tercatat di log di bawah. Default: nonaktif.'}
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={selectedScopes.length === 0 || isGenerating}
              className="btn btn-primary btn-lg w-full"
            >
              <QrCode className="w-4 h-4" />
              {isGenerating
                ? isEn
                  ? 'Generating Verified QR...'
                  : 'Membuat Kode QR...'
                : isEn
                ? 'Generate 1-Hour QR Code & Link'
                : 'Buat Kode QR & Tautan Berlaku 1 Jam'}
            </button>
          </form>
        </section>

        {/* Kolom Kanan: Tampilan Kode QR Aktif */}
        <section className="card p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <h2 className="section-title">
            {isEn ? '2. Temporary QR Code & Link (Valid 1 Hour)' : '2. Kode QR & Tautan Sementara (Berlaku 1 Jam)'}
          </h2>

          {shareToken && isTokenActive ? (
            <div className="space-y-4 text-center">
              <div className="bg-white p-4 rounded-card inline-block border border-brand-teal/40 ring-4 ring-brand-teal/10 shadow-soft mx-auto">
                <QRCodeSVG
                  value={`${window.location.origin}${isEn ? '/provider' : '/nakes'}?code=${shareToken.token_code}`}
                  size={168}
                  fgColor="#1B2A41"
                  level="M"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-brand-navy/70 dark:text-white/70">
                  {isEn ? 'Patient Summary Access Code:' : 'Kode Akses Ringkasan Pasien:'}
                </div>
                <div className="text-xl font-bold tracking-wider text-brand-teal-dark dark:text-[#7FDADB] font-mono">
                  {shareToken.token_code}
                </div>
                <div className="text-2xs text-brand-navy/65 dark:text-white/65 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-coral" />
                  {isEn
                    ? `Expires at: ${new Date(shareToken.expires_at).toLocaleTimeString('en-US')} (1 Hour)`
                    : `Kedaluwarsa pada: ${new Date(shareToken.expires_at).toLocaleTimeString('id-ID')} WIB (1 Jam)`}
                </div>
              </div>

              <div className="no-print flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyToken(shareToken.token_code)}
                  className="btn btn-secondary"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>
                    {copiedCode ? (isEn ? 'Code Copied!' : 'Kode Disalin!') : isEn ? 'Copy Code' : 'Salin Kode'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyShareUrl(shareToken.token_code)}
                  className="btn btn-secondary"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  <span>
                    {copiedLink ? (isEn ? 'Link Copied!' : 'Tautan Disalin!') : isEn ? 'Copy Link' : 'Salin Tautan'}
                  </span>
                </button>

                <button type="button" onClick={() => window.print()} className="btn btn-secondary">
                  <Printer className="w-4 h-4" />
                  <span>{isEn ? 'Print Slip' : 'Cetak QR'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRevoke}
                  className="btn bg-status-urgent-bg text-[#B33834] hover:bg-status-urgent/20 dark:bg-status-urgent/20 dark:text-[#FF8A85]"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isEn ? 'Revoke Access' : 'Cabut Akses'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="well border-dashed px-6 py-10 text-center space-y-2 my-auto">
              <QrCode className="w-10 h-10 text-brand-navy/35 dark:text-white/35 mx-auto" />
              <p className="text-xs font-semibold text-brand-navy/75 dark:text-white/75">
                {shareToken?.revoked
                  ? isEn
                    ? 'The previous QR code was revoked by you.'
                    : 'Kode QR sebelumnya telah dicabut oleh Anda.'
                  : isTokenExpired
                  ? isEn
                    ? 'Your previous 1-hour QR code has expired for privacy.'
                    : 'Kode QR sebelumnya telah kedaluwarsa melewati batas 1 jam.'
                  : isEn
                  ? 'No active QR code yet.'
                  : 'Belum ada Kode QR aktif.'}
              </p>
              <p className="text-2xs text-brand-navy/60 dark:text-white/60">
                {isEn
                  ? 'Select data sections on the left and press “Generate 1-Hour QR Code & Link”.'
                  : 'Pilih cakupan data di sebelah kiri lalu tekan “Buat Kode QR & Tautan Berlaku 1 Jam”.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Catatan Akses Transparan (Access Log — F7) */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title flex items-start gap-2">
              <Eye className="w-5 h-5 text-brand-teal shrink-0 mt-1" />
              <span>
                {isEn ? 'Clinician Access Audit Log (Patient Visibility)' : 'Catatan Akses Tenaga Kesehatan (Audit Log Pasien)'}
              </span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Every time a verified healthcare provider opens your summary, their identity and timestamp are logged automatically below.'
                : 'Setiap kali tenaga kesehatan terverifikasi membuka ringkasan Anda, waktu dan identitas pemeriksa tercatat otomatis di bawah ini.'}
            </p>
          </div>
          {isTokenActive && (
            <button
              type="button"
              onClick={handleRefreshAudit}
              disabled={isRefreshingLog}
              className="btn btn-secondary btn-sm shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLog ? 'animate-spin' : ''}`} />
              <span>{isEn ? 'Refresh Log' : 'Segarkan Log'}</span>
            </button>
          )}
        </div>

        {shareToken && (
          <div
            role="status"
            className={`p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              shareToken.care_plan_written_at
                ? 'bg-status-success-bg dark:bg-status-success/15 text-[#1F7A50] dark:text-[#7BD9AC] font-semibold'
                : 'bg-brand-teal-light/50 dark:bg-brand-teal/10 text-brand-navy/80 dark:text-white/80'
            }`}
          >
            <span>
              {shareToken.care_plan_written_at
                ? isEn
                  ? 'Your doctor has written a post-visit care plan for you.'
                  : 'Dokter Anda telah menulis rencana perawatan pasca-kunjungan untuk Anda.'
                : isEn
                ? 'After your visit, the doctor can send a care plan from this summary straight into your Care Pathway (up to 24 hours after the code was created).'
                : 'Setelah kunjungan, dokter dapat mengirim rencana perawatan dari ringkasan ini langsung ke Jalur Perawatan Anda (hingga 24 jam setelah kode dibuat).'}
            </span>
            <button
              type="button"
              className={`btn btn-sm shrink-0 ${shareToken.care_plan_written_at ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => navigate(isEn ? '/care-pathway#stage-consult' : '/jalur-perawatan#stage-consult')}
            >
              {isEn ? 'Open Care Pathway' : 'Buka Jalur Perawatan'}
            </button>
          </div>
        )}

        {!shareToken || shareToken.accessed_log.length === 0 ? (
          <div className="well p-4 text-xs text-brand-navy/70 dark:text-white/70">
            {isEn
              ? 'No clinician access entries recorded on the current QR code yet.'
              : 'Belum ada catatan akses pada kode QR saat ini.'}
          </div>
        ) : (
          <div className="space-y-2">
            {shareToken.accessed_log.map((log, i) => (
              <div
                key={i}
                className="well p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-brand-navy dark:text-white">{log.viewer_name}</span>{' '}
                  <span className="text-brand-teal-dark dark:text-[#7FDADB] font-semibold">({log.action})</span>
                </div>
                <div className="text-brand-navy/65 dark:text-white/65 font-mono text-2xs">
                  {isEn ? 'Accessed:' : 'Waktu Akses:'}{' '}
                  {new Date(log.accessed_at).toLocaleString(isEn ? 'en-US' : 'id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
