import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  EyeOff,
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
    discreetMode,
    hasPin,
    consents,
    assessmentAnswers,
    assessmentResult,
    labResults,
    reminders,
    pairing,
    setLocale,
    setTextScale,
    setDarkMode,
    setDiscreetMode,
    setupPin,
    removePin,
    lockApp,
    updateConsent,
    wipeAllData,
  } = useApp();

  const navigate = useNavigate();

  const [pinField, setPinField] = useState<string>('');
  const [pinSavedMessage, setPinSavedMessage] = useState<string>('');

  // State Konfirmasi 2 Langkah untuk "Hapus semua data saya"
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [confirmWord, setConfirmWord] = useState<string>('');

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinField.length < 4) return;
    await setupPin(pinField);
    setPinField('');
    setPinSavedMessage('PIN keamanan (PBKDF2 + AES-GCM) berhasil diaktifkan!');
    setTimeout(() => setPinSavedMessage(''), 3500);
  };

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
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          Pusat Kendali Privasi & Pengaturan
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
          Pengaturan & Data Anda
        </h1>
        <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75">
          Kelola tampilan aplikasi, kunci keamanan PIN, penyamaran tampilan di tempat umum, persetujuan granular, ekspor data, atau hapus seluruh data Anda.
        </p>
      </section>

      {/* Seksi Status Akun & Sinkronisasi */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 sm:p-6 border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-brand-teal-light text-brand-teal flex items-center justify-center font-bold text-lg shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-brand-navy dark:text-white">{displayName}</span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  authMode === 'account' || authMode === 'nakes'
                    ? 'bg-status-success-bg text-status-success'
                    : 'bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral'
                }`}
              >
                {authMode === 'account' || authMode === 'nakes' ? 'Mode Akun (Tersinkron)' : 'Mode Anonim Lokal'}
              </span>
            </div>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-0.5">
              {userEmail ? `Email: ${userEmail}` : 'Data tersimpan terenkripsi lokal di perangkat ini'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(locale === 'en' ? '/account' : '/akun')}
          className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-teal-dark transition shadow-soft self-start sm:self-auto"
        >
          <User className="w-4 h-4" />
          <span>{locale === 'en' ? 'Manage Account & Sync' : 'Kelola Akun & Sinkronisasi'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* Seksi 1: Halaman "Data Anda" Berbahasa Sederhana & Persetujuan Granular */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <h2 className="text-lg font-bold text-brand-navy dark:text-white">
          Data Anda (Bahasa Sederhana) & Kelola Persetujuan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-1">
            <div className="font-bold text-brand-teal">1. Data Apa yang Disimpan?</div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Jawaban kuesioner Cek Awal, catatan angka laboratorium, dan jadwal pengingat. Pada Mode Anonim, seluruhnya disimpan terenkripsi AES-GCM di IndexedDB perangkat ini.
            </p>
          </div>
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-1">
            <div className="font-bold text-brand-teal">2. Untuk Apa Digunakan?</div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Semata-mata untuk menampilkan saran langkah pemeriksaan berikutnya dan grafik tren bagi Anda sendiri. Tanpa iklan dan tanpa pelacak pihak ketiga.
            </p>
          </div>
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-1">
            <div className="font-bold text-brand-teal">3. Siapa yang Bisa Melihat?</div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Hanya Anda. Pasangan hanya melihat checklist Rencana Kita, dan dokter hanya melihat ringkasan QR selama 1 jam jika Anda mengizinkannya.
            </p>
          </div>
        </div>

        <div className="divide-y divide-brand-navy/10 border-t border-brand-navy/10 pt-2">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold">Persetujuan Penyimpanan Hasil & Riwayat Tren</div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Simpan hasil Cek Awal dan analisis semen agar dapat dibandingkan antar waktu. (Default: OFF)
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.store_results}
              onChange={(e) => updateConsent('store_results', e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded shrink-0"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold">Persetujuan Berbagi dengan Pasangan (Mode Berdua)</div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Izinkan sinkronisasi tahapan Rencana Kita bersama pasangan Anda. (Default: OFF)
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_partner}
              onChange={(e) => updateConsent('share_partner', e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded shrink-0"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold">
                Persetujuan Berbagi dengan Tenaga Kesehatan (Kode QR 1 Jam)
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Izinkan pembuatan ringkasan sementara untuk ditunjukkan kepada dokter. (Default: OFF)
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_nakes}
              onChange={(e) => updateConsent('share_nakes', e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded shrink-0"
            />
          </label>
        </div>

        {/* Bukti Transparansi Enkripsi Sisi Klien (Web Crypto AES-GCM Vault Inspector) */}
        <details className="p-4 rounded-card bg-brand-navy text-white text-xs space-y-3">
          <summary className="font-bold cursor-pointer flex items-center justify-between">
            <span>🔐 Lihat Bukti Enkripsi Perangkat (Web Crypto AES-GCM 256-bit Vault)</span>
            <span className="text-brand-coral text-[11px]">Klik untuk periksa ciphertext</span>
          </summary>
          <p className="text-white/80 leading-relaxed pt-1">
            Di bawah ini adalah potongan <em>Initialization Vector (IV)</em> dan <em>Ciphertext</em> asli yang tersimpan di penyimpanan terenkripsi perangkat Anda. Server tidak pernah menerima jawaban mentah kuesioner Mode Anonim:
          </p>
          <div className="space-y-1.5 font-mono text-[11px]">
            {inspectEncryptedVault().length === 0 ? (
              <div className="text-white/60">Belum ada blok terenkripsi yang ditulis.</div>
            ) : (
              inspectEncryptedVault().map((v) => (
                <div
                  key={v.key}
                  className="p-2 rounded bg-white/10 flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-brand-coral font-bold">{v.key}</span>
                  <span className="text-white/80">
                    [{v.alg}] IV: {v.ivPreview} | CT: {v.ciphertextPreview}
                  </span>
                </div>
              ))
            )}
          </div>
        </details>
      </section>

      {/* Seksi 2: Penyamaran Tampilan (Discreet Mode) & Kunci PIN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
          <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-brand-teal" />
            <span>Opsi Penyamaran Tampilan (Aman di Tempat Umum)</span>
          </h2>
          <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
            Mengubah ikon aplikasi, judul tab browser, dan bilah atas menjadi aplikasi netral <strong>“Catatan Harian — Kesejahteraan & Kebiasaan”</strong> agar Anda nyaman membuka aplikasi di kantor atau transportasi umum.
          </p>
          <label className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark flex items-center justify-between cursor-pointer">
            <span className="text-xs font-bold">Aktifkan Penyamaran Tampilan (Mode Samaran)</span>
            <input
              type="checkbox"
              checked={discreetMode}
              onChange={(e) => setDiscreetMode(e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded"
            />
          </label>
        </section>

        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
          <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-coral" />
            <span>Kunci PIN & Enkripsi Perangkat</span>
          </h2>
          <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
            Atur PIN 4–6 digit untuk mengunci layar aplikasi dan membungkus kunci enkripsi Web Crypto (`PBKDF2` + `AES-GCM`).
          </p>

          {pinSavedMessage && (
            <p className="text-xs font-bold text-status-success">{pinSavedMessage}</p>
          )}

          <form onSubmit={handleSavePin} className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={6}
              required
              value={pinField}
              onChange={(e) => setPinField(e.target.value)}
              placeholder={hasPin ? 'Ubah PIN (4–6 digit)' : 'Buat PIN (4–6 digit)'}
              aria-label="Masukkan PIN keamanan 4 sampai 6 digit"
              className="flex-1 px-3.5 py-2 rounded-btn border border-brand-navy/20 text-xs font-bold text-brand-navy bg-white"
            />
            <button
              type="submit"
              className="touch-target px-4 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold"
            >
              Simpan PIN
            </button>
          </form>

          {hasPin && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={lockApp}
                className="touch-target flex-1 py-2 px-3 rounded-btn bg-brand-navy text-white text-xs font-bold"
              >
                Kunci Layar Sekarang
              </button>
              <button
                type="button"
                onClick={removePin}
                className="touch-target py-2 px-3 rounded-btn border border-status-urgent text-status-urgent text-xs font-bold"
              >
                Nonaktifkan PIN
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Seksi 3: Bahasa, Ukuran Teks, Mode Gelap, & Ekspor Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
          <h2 className="text-base font-bold text-brand-navy dark:text-white">
            Preferensi Bahasa, Ukuran Teks & Mode Gelap
          </h2>

          {/* Bahasa (i18n) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-brand-teal" /> Bahasa Antarmuka (i18n)
            </span>
            <div className="flex gap-1.5">
              {(['id', 'en'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  className={`px-3 py-1.5 rounded-btn text-xs font-bold ${
                    locale === loc
                      ? 'bg-brand-teal text-white'
                      : 'bg-surface-muted dark:bg-surface-dark'
                  }`}
                >
                  {loc === 'id' ? 'Bahasa Indonesia' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Ukuran Teks */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Type className="w-4 h-4 text-brand-teal" /> Ukuran Teks Aksesibilitas
            </span>
            <div className="flex gap-1.5">
              {(
                [
                  { id: 'normal', label: 'Normal (16px)' },
                  { id: 'lg', label: 'Besar (18px)' },
                  { id: 'xl', label: 'Ekstra (20px)' },
                ] as { id: TextScale; label: string }[]
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setTextScale(sc.id)}
                  className={`px-2.5 py-1.5 rounded-btn text-xs font-bold ${
                    textScale === sc.id
                      ? 'bg-brand-teal text-white'
                      : 'bg-surface-muted dark:bg-surface-dark'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Gelap */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              {darkMode ? (
                <Moon className="w-4 h-4 text-brand-coral" />
              ) : (
                <Sun className="w-4 h-4 text-brand-teal" />
              )}
              Tema Warna Layar
            </span>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="touch-target px-3.5 py-1.5 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/15 text-xs font-bold"
            >
              {darkMode ? 'Mode Gelap Aktif (Ubah ke Terang)' : 'Mode Terang Aktif (Ubah ke Gelap)'}
            </button>
          </div>
        </section>

        {/* Ekspor Data (JSON / PDF) */}
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-brand-navy dark:text-white">
              Portabilitas & Ekspor Data Saya (JSON / PDF)
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              Sebagai hak privasi Anda, Anda dapat mengunduh salinan lengkap data Anda dalam format JSON terstruktur atau mencetak ringkasan PDF kapan saja.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Ekspor Data (JSON)
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          </div>
        </section>
      </div>

      {/* Seksi 4: Tombol "Hapus semua data saya" yang Selalu Terlihat dengan Konfirmasi 2 Langkah */}
      <section
        aria-labelledby="delete-data-heading"
        className="bg-status-urgent-bg/60 dark:bg-status-urgent/15 rounded-card p-6 border-2 border-status-urgent/40 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="delete-data-heading"
              className="text-base sm:text-lg font-bold text-status-urgent flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              <span>Zona Penghapusan Permanen (Hak untuk Dilupakan)</span>
            </h2>
            <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Menghapus seluruh data lokal terenkripsi (IndexedDB, kunci AES-GCM, LocalStorage) serta seluruh catatan terkait di server secara permanen.
            </p>
          </div>

          {deleteStep === 0 && (
            <button
              type="button"
              onClick={() => setDeleteStep(1)}
              className="touch-target px-5 py-3 rounded-btn bg-status-urgent text-white text-xs font-bold shadow-soft hover:opacity-95 transition shrink-0 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Hapus semua data saya
            </button>
          )}
        </div>

        {/* Konfirmasi Langkah 1 */}
        {deleteStep === 1 && (
          <div className="p-4 rounded-card bg-surface dark:bg-surface-dark-card border border-status-urgent space-y-3">
            <div className="flex items-start gap-2.5 text-xs font-bold text-status-urgent">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                Konfirmasi Langkah 1 dari 2: Apakah Anda yakin ingin menghapus seluruh hasil Cek Awal, catatan lab, pengingat, dan tautan pasangan? Tindakan ini tidak dapat dibatalkan.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteStep(0)}
                className="touch-target px-4 py-2 rounded-btn border border-brand-navy/20 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep(2)}
                className="touch-target px-4 py-2 rounded-btn bg-status-urgent text-white text-xs font-bold"
              >
                Ya, Lanjut ke Konfirmasi Akhir (Langkah 2)
              </button>
            </div>
          </div>
        )}

        {/* Konfirmasi Langkah 2 (Final) */}
        {deleteStep === 2 && (
          <div className="p-4 rounded-card bg-surface dark:bg-surface-dark-card border-2 border-status-urgent space-y-3">
            <div className="text-xs font-bold text-status-urgent">
              Konfirmasi Langkah 2 dari 2 (Terakhir): Ketik kata <code>HAPUS</code> atau tekan tombol konfirmasi akhir di bawah ini untuk memusnahkan seluruh data lokal & server sekarang.
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder="Ketik HAPUS (opsional untuk verifikasi)"
                aria-label="Ketik HAPUS untuk konfirmasi"
                className="px-3.5 py-2 rounded-btn border border-status-urgent/40 text-xs font-bold text-brand-navy bg-white"
              />
              <button
                type="button"
                onClick={() => setDeleteStep(0)}
                className="touch-target px-4 py-2 rounded-btn border border-brand-navy/20 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFinalWipe}
                className="touch-target px-5 py-2 rounded-btn bg-status-urgent text-white text-xs font-bold"
              >
                Konfirmasi Hapus Permanen Sekarang
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
