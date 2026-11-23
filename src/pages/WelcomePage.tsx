import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, HeartHandshake, UserCheck, ArrowRight, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

export const WelcomePage: React.FC = () => {
  const {
    locale,
    consents,
    updateConsent,
    startAnonymousMode,
    loginAccount,
  } = useApp();
  const t = getTranslations(locale);
  const navigate = useNavigate();

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [role, setRole] = useState<'user' | 'nakes'>('user');
  const [inviteCode, setInviteCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEn = locale === 'en';

  const handleStartAnonymous = async () => {
    await startAnonymousMode();
    navigate(isEn ? '/home' : '/');
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@') || password.length < 8) {
      setAuthError(
        isEn
          ? 'Please enter a valid email and a password of at least 8 characters.'
          : 'Masukkan email yang valid dan kata sandi minimal 8 karakter.'
      );
      return;
    }

    if (authTab === 'register') {
      if (password !== confirmPassword) {
        setAuthError(
          isEn ? 'Password confirmation does not match.' : 'Konfirmasi kata sandi tidak cocok.'
        );
        return;
      }
      if (role === 'nakes' && !inviteCode.trim()) {
        setAuthError(
          isEn
            ? 'A clinic invite access code is required to register as a Healthcare Provider.'
            : 'Kode akses undangan klinik wajib diisi untuk mendaftar sebagai Tenaga Kesehatan.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        authTab === 'register'
          ? {
              email: normalizedEmail,
              password,
              role,
              displayName: displayNameInput.trim() || undefined,
              ...(role === 'nakes' ? { inviteCode: inviteCode.trim() } : {}),
            }
          : { email: normalizedEmail, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        await loginAccount(data.email, data.role, data.displayName, data.id, {
          preserveLocalOnRegister: authTab === 'register',
        });
        navigate(
          data.role === 'nakes' ? (isEn ? '/provider' : '/nakes') : isEn ? '/home' : '/'
        );
        return;
      }
      if (isJson) {
        const errData = await res.json();
        setAuthError(
          errData.error ||
            (isEn ? 'Authentication failed. Please check your credentials.' : 'Gagal memproses autentikasi.')
        );
      } else {
        setAuthError(
          isEn
            ? 'Authentication server returned an unexpected response.'
            : 'Server autentikasi mengembalikan respons tidak valid.'
        );
      }
    } catch {
      setAuthError(
        isEn
          ? 'Unable to connect to the authentication server. Please verify the server is running and try again.'
          : 'Tidak dapat terhubung ke server autentikasi. Pastikan server aktif dan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Kartu Utama Sambutan (F1) */}
      <section className="card relative overflow-hidden p-6 sm:p-10 space-y-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-brand-teal/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-brand-coral/10 blur-3xl"
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo-icon.png"
              alt="Logo Side by Side"
              className="w-14 h-14 rounded-2xl object-contain bg-white p-1 shadow-xs border border-brand-navy/10 shrink-0"
            />
            <div>
              <p className="text-lg font-extrabold tracking-tight text-brand-navy dark:text-white">
                Side by Side
              </p>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Men’s Reproductive Health • Private & Judgment-Free'
                  : 'Kesehatan Reproduksi Pria • Privat & Tanpa Penghakiman'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative space-y-4 max-w-3xl">
          <span className="badge badge-teal">Better together.</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-navy dark:text-white">
            {t.brand.welcomeGreeting}
          </h1>
          <p className="text-base sm:text-lg text-brand-navy/75 dark:text-white/75 leading-relaxed">
            {t.brand.valueProposition}
          </p>
        </div>

        {/* Dua Tombol Utama Sesuai Spesifikasi F1 */}
        <div className="relative flex flex-col sm:flex-row gap-3 max-w-2xl">
          <button
            type="button"
            onClick={handleStartAnonymous}
            className="btn btn-primary btn-lg flex-1"
          >
            <ShieldCheck className="w-5 h-5" />
            {t.cta.startAnonymous}
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowAuthForm(!showAuthForm)}
            aria-expanded={showAuthForm}
            className="btn btn-secondary btn-lg flex-1"
          >
            {isEn ? 'Create account / Sign in' : 'Buat akun / Masuk'}
          </button>
        </div>

        {/* 3 Pilar Keamanan & Privasi */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="well p-4 sm:p-5 space-y-2">
            <div className="icon-tile w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white">
              {isEn ? '1. Privacy First' : '1. Privasi Dulu'}
            </h3>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              {isEn
                ? 'Start without an account. Your answers are encrypted directly on this device and never sent raw to any server.'
                : 'Bisa dipakai tanpa akun. Jawaban Anda disimpan aman langsung di perangkat dan tidak dikirim ke server.'}
            </p>
          </div>

          <div className="well p-4 sm:p-5 space-y-2">
            <div className="icon-tile w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white">
              {isEn ? '2. Together, No Blame' : '2. Berdua, Tanpa Penghakiman'}
            </h3>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              {isEn
                ? 'Walk side-by-side through a shared checklist without needing to reveal personal quiz answers or lab numbers.'
                : 'Dampingi pasangan lewat daftar langkah bersama tanpa harus membuka isi kuesioner atau hasil lab pribadi Anda.'}
            </p>
          </div>

          <div className="well p-4 sm:p-5 space-y-2">
            <div className="icon-tile w-10 h-10 rounded-xl bg-status-success/15 text-status-success">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-navy dark:text-white">
              {isEn ? '3. Clear Medical Boundaries' : '3. Batas Medis Jelas'}
            </h3>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              {isEn
                ? 'WHO-referenced educational guidance and men-friendly care navigation—not medical diagnosis or prescription advice.'
                : 'Panduan edukasi berbasis pedoman WHO dan navigasi layanan ramah pria—bukan klaim diagnosis atau saran obat.'}
            </p>
          </div>
        </div>

        {/* Formulir Buat Akun / Masuk (Email + Kata Sandi Nyata) */}
        {showAuthForm && (
          <div className="relative well p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/10 dark:border-white/10 pb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setAuthError('');
                  }}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${
                    authTab === 'register'
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/70 dark:text-white/70 hover:bg-brand-navy/[0.06] dark:hover:bg-white/10'
                  }`}
                >
                  {isEn ? 'Create New Account' : 'Buat Akun Baru'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setAuthError('');
                  }}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${
                    authTab === 'login'
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/70 dark:text-white/70 hover:bg-brand-navy/[0.06] dark:hover:bg-white/10'
                  }`}
                >
                  {isEn ? 'Sign In (Email & Password)' : 'Masuk (Email & Sandi)'}
                </button>
              </div>
              <span className="text-xs text-brand-teal font-medium">
                {isEn ? 'Encrypted Multi-Device Sync' : 'Sinkron Terenkripsi Antar Perangkat'}
              </span>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="auth-email" className="field-label">
                    {isEn ? 'Email Address' : 'Alamat Email'}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isEn ? 'name@email.com' : 'nama@email.com'}
                    className="field w-full"
                  />
                </div>
                <div>
                  <label htmlFor="auth-password" className="field-label">
                    {isEn ? 'Password' : 'Kata Sandi'}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEn ? 'Minimum 8 characters' : 'Minimal 8 karakter'}
                    className="field w-full"
                  />
                </div>
              </div>

              {authTab === 'register' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="auth-confirm-password" className="field-label">
                        {isEn ? 'Confirm Password' : 'Ulangi Kata Sandi'}
                      </label>
                      <input
                        id="auth-confirm-password"
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={isEn ? 'Re-enter password' : 'Masukkan ulang kata sandi'}
                        className="field w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-display-name" className="field-label">
                        {isEn ? 'Display Name / Nickname' : 'Nama Panggilan'}
                      </label>
                      <input
                        id="auth-display-name"
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder={isEn ? 'Your preferred name' : 'Nama panggilan Anda'}
                        className="field w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-role" className="field-label">
                      {isEn ? 'Account Role' : 'Peran Pengguna'}
                    </label>
                    <select
                      id="auth-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'user' | 'nakes')}
                      className="field w-full"
                    >
                      <option value="user">
                        {isEn
                          ? 'User / Partner (Husband / Wife)'
                          : 'Pengguna / Pasangan (Pria / Istri)'}
                      </option>
                      <option value="nakes">
                        {isEn
                          ? 'Healthcare Provider (Requires Clinic Invite Code)'
                          : 'Tenaga Kesehatan (Memerlukan Kode Undangan Klinik)'}
                      </option>
                    </select>
                  </div>

                  {role === 'nakes' && (
                    <div>
                      <label htmlFor="auth-invite-code" className="field-label flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-brand-teal" />
                        <span>{isEn ? 'Clinic / Provider Invite Code' : 'Kode Akses Undangan Klinik'}</span>
                      </label>
                      <input
                        id="auth-invite-code"
                        type="text"
                        required
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder={
                          isEn
                            ? 'Enter the access code issued by your clinic administrator'
                            : 'Masukkan kode akses dari administrator klinik Anda'
                        }
                        className="field w-full font-mono"
                      />
                    </div>
                  )}
                </>
              )}

              {authError && (
                <p role="alert" className="text-xs text-status-urgent font-medium">
                  {authError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting
                    ? isEn
                      ? 'Processing...'
                      : 'Memproses...'
                    : authTab === 'register'
                    ? isEn
                      ? 'Register & Sign In'
                      : 'Daftar & Masuk'
                    : isEn
                    ? 'Sign In Now'
                    : 'Masuk Sekarang'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Onboarding Privasi & Persetujuan Granular ("Data Anda", Default OFF) */}
      <section className="card p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">
              {isEn ? 'Your Data & Granular Consent' : 'Data Anda & Persetujuan Granular'}
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 mt-1 leading-relaxed">
              {isEn ? (
                <>
                  All options below are <strong>OFF by default</strong>. You stay in complete control anytime.
                </>
              ) : (
                <>
                  Semua opsi di bawah ini bernilai <strong>NONAKTIF (OFF) secara default</strong>. Anda memegang kendali penuh kapan saja.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="well p-4">
            <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB] mb-1">
              {isEn ? 'What Data Is Stored?' : 'Data Apa yang Disimpan?'}
            </div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'Only Self-Check selections, lab entries you type yourself, and reminder schedules. Zero ad trackers or forced geolocation.'
                : 'Hanya pilihan jawaban Cek Awal, catatan hasil lab yang Anda ketik sendiri, dan jadwal pengingat. Tidak ada pelacak iklan atau lokasi paksa.'}
            </p>
          </div>
          <div className="well p-4">
            <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB] mb-1">
              {isEn ? 'How Is It Used?' : 'Untuk Apa Digunakan?'}
            </div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'To provide next-step guidance, display personal trend charts, and help you plan milestones together with your partner.'
                : 'Memberikan panduan langkah pemeriksaan berikutnya, menampilkan grafik tren pribadi, dan membantu Anda menyusun rencana bersama pasangan.'}
            </p>
          </div>
          <div className="well p-4">
            <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB] mb-1">
              {isEn ? 'Who Can See It?' : 'Siapa yang Bisa Melihat?'}
            </div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              {isEn
                ? 'Only you on this device. Neither your partner nor a clinician can view your answers or lab results unless you turn on sharing yourself.'
                : 'Hanya Anda sendiri di perangkat ini. Pasangan atau dokter tidak dapat melihat isi hasil Anda kecuali Anda menyalakan izinnya sendiri.'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-brand-navy/10 dark:divide-white/10 border-t border-brand-navy/10 dark:border-white/10">
          <label className="py-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {isEn
                  ? '1. Store Results & Trend History'
                  : '1. Penyimpanan Riwayat Hasil & Tren'}
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed mt-0.5">
                {isEn
                  ? 'Allow the app to save encrypted Self-Check and semen analysis records so you can view trend charts over time.'
                  : 'Izinkan aplikasi menyimpan riwayat hasil Cek Awal dan analisis semen terenkripsi agar Anda dapat melihat grafik tren dari waktu ke waktu.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.store_results}
              onChange={(e) => updateConsent('store_results', e.target.checked)}
              className="switch"
              aria-label="Persetujuan penyimpanan hasil"
            />
          </label>

          <label className="py-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {isEn
                  ? '2. Share Plan Progress with Partner'
                  : '2. Berbagi Progres Rencana dengan Pasangan'}
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed mt-0.5">
                {isEn
                  ? 'Allow syncing milestone step statuses in Couple Mode (without revealing questionnaire answers or lab numbers).'
                  : 'Izinkan sinkronisasi status tahapan di Mode Berdua (tanpa membuka jawaban kuesioner maupun angka laboratorium).'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_partner}
              onChange={(e) => updateConsent('share_partner', e.target.checked)}
              className="switch"
              aria-label="Persetujuan berbagi dengan pasangan"
            />
          </label>

          <label className="py-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {isEn
                  ? '3. Share Summary with Healthcare Provider (1-Hour QR)'
                  : '3. Berbagi Ringkasan ke Tenaga Kesehatan (QR 1 Jam)'}
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed mt-0.5">
                {isEn
                  ? 'Allow generating a temporary 1-hour expiring QR code when consulting with your doctor.'
                  : 'Izinkan pembuatan kode QR sementara (berlaku 1 jam) saat Anda berkonsultasi dengan dokter.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_nakes}
              onChange={(e) => updateConsent('share_nakes', e.target.checked)}
              className="switch"
              aria-label="Persetujuan berbagi dengan tenaga kesehatan"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
