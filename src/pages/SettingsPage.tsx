import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Printer,
  Trash2,
  AlertTriangle,
  Globe,
  Type,
  Moon,
  Sun,
  User,
  ArrowRight,
} from 'lucide-react';
import { useApp, type TextScale } from '../context/AppContext';
import { inspectEncryptedVault } from '../lib/crypto-storage';
import type { Locale } from '../i18n';

export const SettingsPage: React.FC = () => {
  const {
    authMode,
    userId,
    userEmail,
    displayName,
    locale,
    textScale,
    darkMode,
    consents,
    assessmentAnswers,
    assessmentResult,
    labResults,
    reminders,
    pairing,
    setLocale,
    setTextScale,
    setDarkMode,
    updateConsent,
    wipeAllData,
  } = useApp();

  const isEn = locale === 'en';
  const navigate = useNavigate();

  // State Konfirmasi 2 Langkah untuk "Hapus semua data saya"
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [confirmWord, setConfirmWord] = useState<string>('');

  const handleExportJson = () => {
    const exportPayload = {
      app: 'Side by Side — Ekspor Data Pribadi',
      exportedAt: new Date().toISOString(),
      mode: authMode,
      user: { id: userId, email: userEmail, displayName },
      consents,
      assessmentAnswers,
      assessmentResult,
      labResults,
      reminders,
      pairing,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `side-by-side-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleFinalWipe = async () => {
    await wipeAllData();
    setDeleteStep(0);
    setConfirmWord('');
    navigate('/welcome');
  };

  return (
    <div className="space-y-6">
      {/* Header Pengaturan & Data Saya */}
      <section className="page-header space-y-2.5">
        <span className="badge badge-teal">
          <ShieldCheck className="w-4 h-4" />
          {isEn ? 'Privacy & Settings Control Center' : 'Pusat Kendali Privasi & Pengaturan'}
        </span>
        <h1 className="page-title">
          {isEn ? 'Settings & Your Data' : 'Pengaturan & Data Anda'}
        </h1>
        <p className="page-lead">
          {isEn
            ? 'Manage app appearance, granular data consents, local encryption proof, data exports, or permanently delete all your records.'
            : 'Kelola tampilan aplikasi, persetujuan privasi granular, bukti enkripsi lokal, ekspor data, atau hapus seluruh data Anda.'}
        </p>
      </section>

      {/* Seksi Status Akun & Sinkronisasi */}
      <section className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-teal-light dark:bg-brand-teal/20 text-brand-teal-dark dark:text-[#7FDADB] flex items-center justify-center font-extrabold text-lg shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base text-brand-navy dark:text-white">{displayName}</span>
              <span
                className={`badge ${
                  authMode === 'account' || authMode === 'nakes'
                    ? 'badge-success'
                    : 'badge-coral'
                }`}
              >
                {authMode === 'account' || authMode === 'nakes'
                  ? isEn
                    ? 'Account Mode (Synced)'
                    : 'Mode Akun (Tersinkron)'
                  : isEn
                  ? 'Local Anonymous Mode'
                  : 'Mode Anonim Lokal'}
              </span>
            </div>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-0.5">
              {userEmail
                ? `Email: ${userEmail}`
                : isEn
                ? 'Data stays encrypted locally on this device'
                : 'Data tersimpan terenkripsi lokal di perangkat ini'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(locale === 'en' ? '/account' : '/akun')}
          className="btn btn-primary self-start sm:self-auto"
        >
          <User className="w-4 h-4" />
          <span>{isEn ? 'Manage Account & Sync' : 'Kelola Akun & Sinkronisasi'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Seksi 1: Halaman "Data Anda" Berbahasa Sederhana & Persetujuan Granular */}
      <section className="card p-5 sm:p-6 space-y-5">
        <h2 className="section-title">
          {isEn ? 'Your Data (Plain Language) & Consent Controls' : 'Data Anda (Bahasa Sederhana) & Kelola Persetujuan'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="well p-4 space-y-1">
            <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">
              {isEn ? '1. What Data Is Stored?' : '1. Data Apa yang Disimpan?'}
            </div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'Self-check questionnaire answers, lab entries, and reminders. In Anonymous Mode, everything stays encrypted locally on this device.'
                : 'Jawaban kuesioner Cek Awal, catatan angka laboratorium, dan jadwal pengingat. Pada Mode Anonim, seluruhnya disimpan secara aman di perangkat ini.'}
            </p>
          </div>
          <div className="well p-4 space-y-1">
            <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">
              {isEn ? '2. How Is It Used?' : '2. Untuk Apa Digunakan?'}
            </div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'Strictly to show next-step guidance and trend charts for yourself. Zero ads and zero third-party trackers.'
                : 'Semata-mata untuk menampilkan saran langkah pemeriksaan berikutnya dan grafik tren bagi Anda sendiri. Tanpa iklan dan tanpa pelacak pihak ketiga.'}
            </p>
          </div>
          <div className="well p-4 space-y-1">
            <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">
              {isEn ? '3. Who Can See It?' : '3. Siapa yang Bisa Melihat?'}
            </div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'Only you. Your partner only sees the shared Our Plan checklist, and clinicians only see a 1-hour QR summary when you explicitly allow it.'
                : 'Hanya Anda. Pasangan hanya melihat checklist Rencana Kita, dan dokter hanya melihat ringkasan QR selama 1 jam jika Anda mengizinkannya.'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-brand-navy/10 dark:divide-white/10 border-t border-brand-navy/10 dark:border-white/10">
          <label className="py-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {isEn ? 'Consent: Store Results & Trend History' : 'Persetujuan Penyimpanan Hasil & Riwayat Tren'}
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed mt-0.5">
                {isEn
                  ? 'Save Self-Check results and semen analyses so you can compare progress over time. (Default: OFF)'
                  : 'Simpan hasil Cek Awal dan analisis semen agar dapat dibandingkan antar waktu. (Default: OFF)'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.store_results}
              onChange={(e) => updateConsent('store_results', e.target.checked)}
              className="switch"
            />
          </label>

          <label className="py-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {isEn ? 'Consent: Share with Partner (Couple Mode)' : 'Persetujuan Berbagi dengan Pasangan (Mode Berdua)'}
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed mt-0.5">
                {isEn
                  ? 'Allow syncing Our Plan milestone steps together with your partner. (Default: OFF)'
                  : 'Izinkan sinkronisasi tahapan Rencana Kita bersama pasangan Anda. (Default: OFF)'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_partner}
              onChange={(e) => updateConsent('share_partner', e.target.checked)}
              className="switch"
            />
          </label>

          <label className="py-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {isEn ? 'Consent: Share with Healthcare Provider (1-Hour QR)' : 'Persetujuan Berbagi dengan Tenaga Kesehatan (Kode QR 1 Jam)'}
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed mt-0.5">
                {isEn
                  ? 'Allow generating a temporary clinical summary QR code to show a doctor. (Default: OFF)'
                  : 'Izinkan pembuatan ringkasan sementara untuk ditunjukkan kepada dokter. (Default: OFF)'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_nakes}
              onChange={(e) => updateConsent('share_nakes', e.target.checked)}
              className="switch"
            />
          </label>
        </div>

        {/* Bukti Transparansi Enkripsi Sisi Klien (Web Crypto AES-GCM Vault Inspector) */}
        <details className="px-4 py-3.5 rounded-2xl bg-brand-navy-deep text-white text-xs space-y-3 ring-1 ring-white/10">
          <summary className="font-bold cursor-pointer flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span>🔐 {isEn ? 'On-Device Encrypted Storage Proof' : 'Bukti Penyimpanan Terenkripsi Perangkat'}</span>
            <span className="text-[#FFA596] text-2xs">{isEn ? 'Click to inspect ciphertext' : 'Klik untuk periksa ciphertext'}</span>
          </summary>
          <p className="text-white/80 leading-relaxed pt-1">
            {isEn
              ? 'Below are real Initialization Vector (IV) and Ciphertext slices stored in your device’s encrypted vault. The server never receives raw Anonymous Mode questionnaire answers:'
              : 'Di bawah ini adalah potongan Initialization Vector (IV) dan Ciphertext asli yang tersimpan di penyimpanan terenkripsi perangkat Anda. Server tidak pernah menerima jawaban mentah kuesioner Mode Anonim:'}
          </p>
          <div className="space-y-1.5 font-mono text-2xs">
            {inspectEncryptedVault().length === 0 ? (
              <div className="text-white/60">
                {isEn ? 'No encrypted blocks written yet.' : 'Belum ada blok terenkripsi yang ditulis.'}
              </div>
            ) : (
              inspectEncryptedVault().map((v) => (
                <div
                  key={v.key}
                  className="p-2.5 rounded-lg bg-white/10 flex flex-wrap items-center justify-between gap-2 break-all"
                >
                  <span className="text-[#FFA596] font-bold">{v.key}</span>
                  <span className="text-white/80">
                    [{v.alg}] IV: {v.ivPreview} | CT: {v.ciphertextPreview}
                  </span>
                </div>
              ))
            )}
          </div>
        </details>
      </section>

      {/* Seksi 2: Bahasa, Ukuran Teks, Mode Gelap, & Ekspor Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-5 sm:p-6 space-y-5">
          <h2 className="section-title">
            {isEn ? 'Language, Text Size & Dark Mode' : 'Preferensi Bahasa, Ukuran Teks & Mode Gelap'}
          </h2>

          {/* Bahasa (i18n) */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-xs font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-teal" /> {isEn ? 'Interface Language (i18n)' : 'Bahasa Antarmuka (i18n)'}
            </span>
            <div className="flex gap-1 p-1 rounded-2xl bg-brand-navy/[0.05] dark:bg-white/[0.06]">
              {(['id', 'en'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  aria-pressed={locale === loc}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    locale === loc
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white'
                  }`}
                >
                  {loc === 'id' ? 'Bahasa Indonesia' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Ukuran Teks */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-xs font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-brand-teal" /> {isEn ? 'Accessibility Text Size' : 'Ukuran Teks Aksesibilitas'}
            </span>
            <div className="flex gap-1 p-1 rounded-2xl bg-brand-navy/[0.05] dark:bg-white/[0.06]">
              {(
                [
                  { id: 'normal', label: 'Normal (16px)' },
                  { id: 'lg', label: isEn ? 'Large (18px)' : 'Besar (18px)' },
                  { id: 'xl', label: isEn ? 'Extra (20px)' : 'Ekstra (20px)' },
                ] as { id: TextScale; label: string }[]
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setTextScale(sc.id)}
                  aria-pressed={textScale === sc.id}
                  className={`px-3 py-2 rounded-xl text-xs font-bold leading-tight transition ${
                    textScale === sc.id
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Gelap */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-xs font-bold text-brand-navy dark:text-white flex items-center gap-2">
              {darkMode ? (
                <Moon className="w-4 h-4 text-[#FFA596]" />
              ) : (
                <Sun className="w-4 h-4 text-brand-teal" />
              )}
              {isEn ? 'Display Color Theme' : 'Tema Warna Layar'}
            </span>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-secondary"
            >
              {isEn
                ? darkMode
                  ? 'Dark Mode Active (Switch to Light)'
                  : 'Light Mode Active (Switch to Dark)'
                : darkMode
                ? 'Mode Gelap Aktif (Ubah ke Terang)'
                : 'Mode Terang Aktif (Ubah ke Gelap)'}
            </button>
          </div>
        </section>

        {/* Ekspor Data (JSON / PDF) */}
        <section className="card p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h2 className="section-title">
              {isEn ? 'Data Portability & Export (JSON / PDF)' : 'Portabilitas & Ekspor Data Saya (JSON / PDF)'}
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              {isEn
                ? 'As part of your privacy rights, you can download a complete structured JSON copy of your records or print a PDF summary anytime.'
                : 'Sebagai hak privasi Anda, Anda dapat mengunduh salinan lengkap data Anda dalam format JSON terstruktur atau mencetak ringkasan PDF kapan saja.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              className="btn btn-primary flex-1"
            >
              <Download className="w-4 h-4" />
              {isEn ? 'Export Data (JSON)' : 'Ekspor Data (JSON)'}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="btn btn-navy flex-1"
            >
              <Printer className="w-4 h-4" />
              {isEn ? 'Print / Save PDF' : 'Cetak / Simpan PDF'}
            </button>
          </div>
        </section>
      </div>

      {/* Seksi 4: Tombol "Hapus semua data saya" yang Selalu Terlihat dengan Konfirmasi 2 Langkah */}
      <section
        aria-labelledby="delete-data-heading"
        className="bg-status-urgent-bg/70 dark:bg-status-urgent/10 rounded-card p-5 sm:p-6 border border-status-urgent/35 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="delete-data-heading"
              className="text-lg font-bold text-[#B33834] dark:text-[#FF8A85] flex items-start gap-2"
            >
              <Trash2 className="w-5 h-5 shrink-0 mt-1" />
              <span>{isEn ? 'Permanent Deletion Zone (Right to Be Forgotten)' : 'Zona Penghapusan Permanen (Hak untuk Dilupakan)'}</span>
            </h2>
            <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'Permanently deletes all local encrypted data and associated server records.'
                : 'Menghapus seluruh data lokal serta seluruh catatan terkait di server secara permanen.'}
            </p>
          </div>

          {deleteStep === 0 && (
            <button
              type="button"
              onClick={() => setDeleteStep(1)}
              className="btn btn-danger shrink-0 self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4" />
              {isEn ? 'Delete all my data' : 'Hapus semua data saya'}
            </button>
          )}
        </div>

        {/* Konfirmasi Langkah 1 */}
        {deleteStep === 1 && (
          <div className="card p-4 sm:p-5 border-status-urgent/60 space-y-3.5">
            <div className="flex items-start gap-2.5 text-xs leading-relaxed font-bold text-[#B33834] dark:text-[#FF8A85]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                {isEn
                  ? 'Confirmation Step 1 of 2: Are you sure you want to permanently delete all Self-Check results, lab logs, reminders, and partner links? This action cannot be undone.'
                  : 'Konfirmasi Langkah 1 dari 2: Apakah Anda yakin ingin menghapus seluruh hasil Cek Awal, catatan lab, pengingat, dan tautan pasangan? Tindakan ini tidak dapat dibatalkan.'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDeleteStep(0)}
                className="btn btn-secondary"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep(2)}
                className="btn btn-danger"
              >
                {isEn ? 'Yes, Proceed to Final Confirmation (Step 2)' : 'Ya, Lanjut ke Konfirmasi Akhir (Langkah 2)'}
              </button>
            </div>
          </div>
        )}

        {/* Konfirmasi Langkah 2 (Final) */}
        {deleteStep === 2 && (
          <div className="card p-4 sm:p-5 border-status-urgent space-y-3.5">
            <div className="text-xs leading-relaxed font-bold text-[#B33834] dark:text-[#FF8A85]">
              {isEn ? (
                <>
                  Confirmation Step 2 of 2 (Final): Type <code>DELETE</code> or press the final confirmation button below to erase all local & server records immediately.
                </>
              ) : (
                <>
                  Konfirmasi Langkah 2 dari 2 (Terakhir): Ketik kata <code>HAPUS</code> atau tekan tombol konfirmasi akhir di bawah ini untuk memusnahkan seluruh data lokal & server sekarang.
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder={isEn ? 'Type DELETE (optional confirmation)' : 'Ketik HAPUS (opsional untuk verifikasi)'}
                aria-label={isEn ? 'Type DELETE to confirm' : 'Ketik HAPUS untuk konfirmasi'}
                className="field border-status-urgent/40 font-bold"
              />
              <button
                type="button"
                onClick={() => setDeleteStep(0)}
                className="btn btn-secondary"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleFinalWipe}
                className="btn btn-danger"
              >
                {isEn ? 'Confirm Permanent Deletion Now' : 'Konfirmasi Hapus Permanen Sekarang'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
