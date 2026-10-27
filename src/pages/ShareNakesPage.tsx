import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  XCircle,
  Eye,
  Stethoscope,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ShareNakesPage: React.FC = () => {
  const {
    shareToken,
    createShareToken,
    revokeShareToken,
    recordNakesAccess,
  } = useApp();
  const navigate = useNavigate();

  const [selectedScopes, setSelectedScopes] = useState<
    ('history' | 'risk_factors' | 'lab_results')[]
  >(['history', 'risk_factors', 'lab_results']);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const toggleScope = (scopeKey: 'history' | 'risk_factors' | 'lab_results') => {
    setSelectedScopes((prev) =>
      prev.includes(scopeKey) ? prev.filter((s) => s !== scopeKey) : [...prev, scopeKey]
    );
  };

  const handleGenerateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedScopes.length === 0) return;
    await createShareToken(selectedScopes);
  };

  const handleCopyToken = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSimulateDrMayaScan = async () => {
    if (!shareToken) return;
    await recordNakesAccess(
      shareToken.token_code,
      'dr. Maya (Dokter Umum Puskesmas Kecamatan Tebet)'
    );
    navigate(`/nakes?code=${encodeURIComponent(shareToken.token_code)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Berbagi dengan Tenaga Kesehatan */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          Kendali Privasi Pasien • Tautan Berlaku 1 Jam
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
          Bagikan Ringkasan Pasien ke Tenaga Kesehatan
        </h1>
        <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75 leading-relaxed">
          Pilih sendiri bagian mana yang ingin Anda tunjukkan kepada dokter saat konsultasi. Kode QR dan tautan otomatis kedaluwarsa dalam <strong>1 jam</strong> dan setiap akses oleh tenaga kesehatan tercatat di halaman ini.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom Kiri: Pilih Cakupan Data & Buat Kode QR */}
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
          <h2 className="text-base font-bold text-brand-navy dark:text-white">
            1. Pilih Bagian Data yang Disetujui untuk Dibagikan
          </h2>

          <form onSubmit={handleGenerateQr} className="space-y-3">
            <label className="p-3.5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedScopes.includes('history')}
                onChange={() => toggleScope('history')}
                className="w-4 h-4 accent-brand-teal mt-0.5 shrink-0"
              />
              <div className="text-xs">
                <div className="font-bold text-brand-navy dark:text-white">
                  Ringkasan Riwayat & Tingkat Saran Cek Awal
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  Durasi program hamil dan tingkat saran waktu pemeriksaan (tanpa membuka jawaban mentah per pertanyaan).
                </p>
              </div>
            </label>

            <label className="p-3.5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedScopes.includes('risk_factors')}
                onChange={() => toggleScope('risk_factors')}
                className="w-4 h-4 accent-brand-teal mt-0.5 shrink-0"
              />
              <div className="text-xs">
                <div className="font-bold text-brand-navy dark:text-white">
                  Faktor Risiko Gaya Hidup & Medis yang Dilaporkan
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  Membantu dokter memberikan konseling yang terfokus dalam waktu konsultasi singkat.
                </p>
              </div>
            </label>

            <label className="p-3.5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedScopes.includes('lab_results')}
                onChange={() => toggleScope('lab_results')}
                className="w-4 h-4 accent-brand-teal mt-0.5 shrink-0"
              />
              <div className="text-xs">
                <div className="font-bold text-brand-navy dark:text-white">
                  Riwayat Angka Hasil Analisis Semen
                </div>
                <p className="text-brand-navy/70 dark:text-white/70 mt-0.5">
                  Menampilkan tabel volume, konsentrasi, motilitas, dan morfologi yang telah Anda catat.
                </p>
              </div>
            </label>

            <button
              type="submit"
              disabled={selectedScopes.length === 0}
              className="touch-target w-full py-3 px-5 rounded-btn bg-brand-teal text-white font-bold text-xs shadow-soft hover:bg-brand-teal-dark transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              Buat Kode QR & Tautan Berlaku 1 Jam
            </button>
          </form>
        </section>

        {/* Kolom Kanan: Tampilan Kode QR Aktif */}
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col justify-between space-y-4">
          <h2 className="text-base font-bold text-brand-navy dark:text-white">
            2. Kode QR & Tautan Sementara (Berlaku 1 Jam)
          </h2>

          {shareToken && !shareToken.revoked ? (
            <div className="space-y-4 text-center">
              <div className="bg-white p-4 rounded-card inline-block border-2 border-brand-teal shadow-sm mx-auto">
                <QRCodeSVG
                  value={`${window.location.origin}/nakes?code=${shareToken.token_code}`}
                  size={168}
                  fgColor="#1B2A41"
                  level="M"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-brand-navy/70 dark:text-white/70">
                  Kode Akses Ringkasan Pasien:
                </div>
                <div className="text-lg font-bold tracking-wider text-brand-teal font-mono">
                  {shareToken.token_code}
                </div>
                <div className="text-[11px] text-brand-navy/65 dark:text-white/65 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-coral" />
                  Kedaluwarsa pada: {new Date(shareToken.expires_at).toLocaleTimeString('id-ID')} WIB (1 Jam)
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyToken(shareToken.token_code)}
                  className="touch-target px-3.5 py-2 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/15 text-xs font-bold flex items-center gap-1.5"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Kode Disalin!' : 'Salin Kode'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateDrMayaScan}
                  className="touch-target px-3.5 py-2 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-navy-light transition"
                >
                  <Stethoscope className="w-4 h-4 text-brand-coral" />
                  <span>Simulasikan dr. Maya Membuka QR Ini</span>
                </button>

                <button
                  type="button"
                  onClick={revokeShareToken}
                  className="touch-target px-3.5 py-2 rounded-btn bg-status-urgent-bg text-status-urgent text-xs font-bold flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cabut Akses</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-card bg-surface-muted dark:bg-surface-dark text-center space-y-2 my-auto">
              <QrCode className="w-10 h-10 text-brand-navy/40 mx-auto" />
              <p className="text-xs font-semibold text-brand-navy/75 dark:text-white/75">
                {shareToken?.revoked
                  ? 'Kode QR sebelumnya telah dicabut oleh Anda.'
                  : 'Belum ada Kode QR aktif.'}
              </p>
              <p className="text-[11px] text-brand-navy/60 dark:text-white/60">
                Pilih cakupan data di sebelah kiri lalu tekan “Buat Kode QR & Tautan Berlaku 1 Jam”.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Catatan Akses Transparan (Access Log — F7) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-brand-teal" />
              <span>Catatan Akses Tenaga Kesehatan (Audit Log Pasien)</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Setiap kali tenaga kesehatan membuka ringkasan Anda, waktu dan identitas pemeriksa tercatat secara otomatis di bawah ini.
            </p>
          </div>
        </div>

        {!shareToken || shareToken.accessed_log.length === 0 ? (
          <div className="p-4 rounded-btn bg-surface-muted dark:bg-surface-dark text-xs text-brand-navy/70 dark:text-white/70">
            Belum ada catatan akses pada kode QR saat ini.
          </div>
        ) : (
          <div className="space-y-2">
            {shareToken.accessed_log.map((log, i) => (
              <div
                key={i}
                className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-brand-navy dark:text-white">
                    {log.viewer_name}
                  </span>{' '}
                  <span className="text-brand-teal font-semibold">({log.action})</span>
                </div>
                <div className="text-brand-navy/65 dark:text-white/65 font-mono text-[11px]">
                  Waktu Akses: {new Date(log.accessed_at).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
