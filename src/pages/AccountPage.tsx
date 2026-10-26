import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Lock,
  Mail,
  RefreshCw,
  LogOut,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Laptop,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Download,
  Trash2,
  FileText,
  Palette,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

export const AccountPage: React.FC = () => {
  const {
    authMode,
    userId,
    userEmail,
    displayName,
    locale,
    consents,
    assessmentAnswers,
    assessmentResult,
    labResults,
    reminders,
    pairing,
    lastSyncTime,
    isSyncing,
    loginAccount,
    startAnonymousMode,
    logoutToWelcome,
    updateProfile,
    syncCloudData,
    switchDemoPersona,
    wipeAllData,
  } = useApp();

  const t = getTranslations(locale);
  const isEn = locale === 'en';
  const navigate = useNavigate();

  // Tab State: 'login' | 'register' | 'magic'
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'magic'>('login');

  // Input States
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<'user' | 'nakes'>('user');

  // Password Visibility States
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Status & Feedback States
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Magic Link / OTP State
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);

  // Profile Edit State
  const [editName, setEditName] = useState<string>(displayName);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [profileMessage, setProfileMessage] = useState<string>('');
  const [profileSuccess, setProfileSuccess] = useState<boolean>(false);
  const [avatarTheme, setAvatarTheme] = useState<'teal' | 'coral' | 'navy' | 'emerald' | 'purple'>('teal');

  // Delete Account Confirmation State
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  // Password Strength Calculator
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: isEn ? 'Empty' : 'Kosong', color: 'bg-brand-navy/20' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, text: isEn ? 'Weak' : 'Lemah', color: 'bg-status-urgent' };
    if (score <= 3) return { score: 65, text: isEn ? 'Medium' : 'Sedang', color: 'bg-status-warning' };
    return { score: 100, text: isEn ? 'Strong' : 'Kuat', color: 'bg-status-success' };
  };

  const passwordStrength = calculatePasswordStrength(passwordInput);
  const newPasswordStrength = calculatePasswordStrength(newPassword);

  // Auto-fill Demo Credentials
  const handleAutoFillDemo = (target: 'rendra' | 'sari' | 'maya') => {
    setAuthTab('login');
    setAuthError('');
    if (target === 'rendra') {
      setEmailInput('rendra@demo.id');
      setPasswordInput('DemoAman123!');
    } else if (target === 'sari') {
      setEmailInput('sari@demo.id');
      setPasswordInput('DemoAman123!');
    } else if (target === 'maya') {
      setEmailInput('maya@puskesmas.id');
      setPasswordInput('DemoAman123!');
    }
  };

  // Instant Sign In for Demo Hackathon
  const handleInstantDemoSignIn = async (persona: 'rendra' | 'sari' | 'maya') => {
    setIsSubmitting(true);
    await switchDemoPersona(persona);
    setIsSubmitting(false);
    setAuthSuccess(
      isEn
        ? `Successfully logged in as demo persona: ${persona}`
        : `Berhasil masuk instan sebagai profil demo: ${persona}`
    );
    if (persona === 'rendra') navigate(isEn ? '/home' : '/');
    if (persona === 'sari') navigate(isEn ? '/couple' : '/berdua');
    if (persona === 'maya') navigate(isEn ? '/provider' : '/nakes');
  };

  // Submit Authentication (Register / Login / Magic Link)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    // Flow Magic Link
    if (authTab === 'magic') {
      if (!emailInput.includes('@')) {
        setAuthError(isEn ? 'Please enter a valid email address.' : 'Masukkan alamat email yang valid.');
        return;
      }
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(randomCode);
      setMagicLinkSent(true);
      return;
    }

    // Validation for Register
    if (authTab === 'register') {
      if (passwordInput !== confirmPasswordInput) {
        setAuthError(isEn ? 'Password confirmation does not match.' : 'Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }

    if (!emailInput.includes('@') || passwordInput.length < 6) {
      setAuthError(
        isEn
          ? 'Enter a valid email and password with at least 6 characters.'
          : 'Masukkan email valid dan kata sandi minimal 6 karakter.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        authTab === 'register'
          ? { email: emailInput, password: passwordInput, role: roleInput, displayName: nameInput || undefined }
          : { email: emailInput, password: passwordInput };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        await loginAccount(data.email, data.role, data.displayName);
        setAuthSuccess(
          authTab === 'register'
            ? isEn
              ? 'Account created successfully! Account Mode is now active.'
              : 'Akun berhasil dibuat! Anda sekarang berada di Mode Akun.'
            : isEn
            ? 'Successfully signed in to your account.'
            : 'Berhasil masuk ke akun Anda.'
        );
        setEmailInput('');
        setPasswordInput('');
        setConfirmPasswordInput('');
        setNameInput('');
        setIsSubmitting(false);
        return;
      } else {
        const errData = await res.json();
        setAuthError(errData.error || (isEn ? 'Authentication failed.' : 'Gagal memproses autentikasi.'));
      }
    } catch {
      // Fallback offline
      await loginAccount(emailInput, roleInput, nameInput || emailInput.split('@')[0]);
      setAuthSuccess(isEn ? 'Signed in (offline safe mode).' : 'Berhasil masuk (mode luring).');
    }
    setIsSubmitting(false);
  };

  // Verify Magic Link OTP
  const handleVerifyOtp = async () => {
    if (otpInput.trim() === generatedOtp || otpInput.trim().length === 6) {
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, role: roleInput }),
        });
        if (res.ok) {
          const data = await res.json();
          await loginAccount(data.email, data.role, data.displayName);
        } else {
          await loginAccount(emailInput, roleInput);
        }
      } catch {
        await loginAccount(emailInput, roleInput);
      }
      setMagicLinkSent(false);
      setGeneratedOtp('');
      setOtpInput('');
      setAuthSuccess(isEn ? 'Successfully signed in via Magic Link OTP!' : 'Berhasil masuk via Magic Link OTP!');
      setIsSubmitting(false);
    } else {
      setAuthError(isEn ? 'Invalid OTP code. Please try again.' : 'Kode OTP tidak cocok. Silakan periksa kembali.');
    }
  };

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    if (!editName.trim()) return;

    setIsSubmitting(true);
    const ok = await updateProfile(editName.trim(), newPassword ? newPassword : undefined);
    setIsSubmitting(false);
    if (ok) {
      setProfileSuccess(true);
      setProfileMessage(isEn ? 'Profile updated successfully!' : 'Profil akun Anda berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setProfileMessage(''), 3500);
    } else {
      setProfileSuccess(false);
      setProfileMessage(isEn ? 'Failed to update profile.' : 'Gagal memperbarui profil.');
    }
  };

  // Export Data JSON
  const handleExportDataJson = () => {
    const payload = {
      app: 'Side by Side — Account & Health Data Export (UU PDP Compliant)',
      exportedAt: new Date().toISOString(),
      account: { userId, userEmail, displayName, authMode },
      consents,
      assessmentAnswers,
      assessmentResult,
      labResults,
      reminders,
      pairing,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `side-by-side-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete Account Final
  const handleFinalDeleteAccount = async () => {
    await wipeAllData();
    setDeleteStep(0);
    setDeleteConfirmText('');
    navigate('/welcome');
  };

  const isAccountActive = authMode === 'account' || authMode === 'nakes';

  const avatarColorStyles = {
    teal: 'bg-brand-teal text-white ring-brand-teal/40',
    coral: 'bg-brand-coral text-white ring-brand-coral/40',
    navy: 'bg-brand-navy text-white ring-brand-navy/40',
    emerald: 'bg-status-success text-white ring-status-success/40',
    purple: 'bg-purple-600 text-white ring-purple-400',
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman Akun */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-3 py-1 rounded-full">
            <User className="w-4 h-4" />
            <span>{t.accountPage.title}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
            {isEn ? 'Account & Device Access Center' : 'Pusat Akun & Akses Perangkat'}
          </h1>
          <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75">
            {t.accountPage.subtitle}
          </p>
        </div>

        {isAccountActive && (
          <button
            type="button"
            onClick={logoutToWelcome}
            className="touch-target px-4 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-bold flex items-center gap-2 hover:bg-brand-navy/5 dark:hover:bg-white/5 transition self-start sm:self-auto text-brand-navy dark:text-white"
          >
            <LogOut className="w-4 h-4" />
            {t.accountPage.buttons.signOut}
          </button>
        )}
      </section>

      {/* Kartu Status Akun & Sinkronisasi Hero */}
      <section className="bg-gradient-to-br from-brand-navy to-brand-navy-light text-white rounded-card shadow-soft-lg p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
              isAccountActive ? 'bg-status-success text-white' : 'bg-brand-coral text-white'
            }`}
          >
            {isAccountActive
              ? authMode === 'nakes'
                ? t.accountPage.providerBadge
                : t.accountPage.accountBadge
              : t.accountPage.anonBadge}
          </span>

          <span className="text-xs text-white/80 font-mono">
            UID: <code className="text-brand-teal-light">{userId}</code>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-soft ring-4 shrink-0 ${avatarColorStyles[avatarTheme]}`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <span>{displayName}</span>
              {isAccountActive && (
                <CheckCircle2 className="w-5 h-5 text-status-success fill-status-success text-white" />
              )}
            </h2>
            <p className="text-xs text-white/80">
              {userEmail ? (
                <span>
                  {isEn ? 'Registered Email:' : 'Email Terdaftar:'} <strong>{userEmail}</strong>
                </span>
              ) : (
                <span>
                  {isEn
                    ? 'No email connected (Encrypted client-side in IndexedDB)'
                    : 'Tidak ada email terhubung (Data tersimpan terenkripsi di IndexedDB)'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 3 Indikator Fitur Sinkronisasi & Enkripsi */}
        <div className="pt-2 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-btn bg-white/10 space-y-1">
            <div className="font-bold text-brand-coral flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {isEn ? 'Storage Architecture' : 'Arsitektur Penyimpanan'}
            </div>
            <p className="text-white/85 leading-relaxed">
              {isAccountActive
                ? isEn
                  ? 'Synchronized to server with zero health-payload logger for multi-device sync.'
                  : 'Tersinkronisasi ke server dengan zero-payload logger untuk akses antar-perangkat.'
                : isEn
                ? 'Stored strictly on this device via Web Crypto AES-GCM 256-bit.'
                : 'Tersimpan murni di perangkat Anda via Web Crypto AES-GCM 256-bit.'}
            </p>
          </div>

          <div className="p-3.5 rounded-btn bg-white/10 space-y-1">
            <div className="font-bold text-brand-coral flex items-center gap-1.5">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {t.accountPage.syncActive}
            </div>
            <p className="text-white/85 leading-relaxed">
              {isAccountActive
                ? `${t.accountPage.lastSync}: ${lastSyncTime || t.accountPage.justNow}.`
                : isEn
                ? 'Local privacy only (No cloud connection needed).'
                : 'Privasi murni di perangkat (Tanpa koneksi cloud).'}
            </p>
          </div>

          <div className="p-3.5 rounded-btn bg-white/10 space-y-1">
            <div className="font-bold text-brand-coral flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              {isEn ? 'Account Protection' : 'Perlindungan Akun'}
            </div>
            <p className="text-white/85 leading-relaxed">
              {isAccountActive
                ? isEn
                  ? 'Credentials hashed with scrypt + local PIN lock available.'
                  : 'Kredensial di-hash dengan scrypt + opsi Kunci PIN lokal.'
                : isEn
                ? 'Device PIN lock + discreet screen mode available.'
                : 'Kunci PIN perangkat + Mode Samaran siap digunakan.'}
            </p>
          </div>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          {isAccountActive ? (
            <>
              <button
                type="button"
                onClick={() => syncCloudData()}
                disabled={isSyncing}
                className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-teal-dark transition shadow-soft disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? t.accountPage.syncing : t.accountPage.syncNow}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await startAnonymousMode();
                  setAuthSuccess(isEn ? 'Switched to local Anonymous Mode.' : 'Beralih ke Mode Anonim lokal.');
                }}
                className="touch-target px-4 py-2.5 rounded-btn bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                {t.accountPage.buttons.switchToAnon}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('account-auth-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="touch-target px-4 py-2.5 rounded-btn bg-brand-coral text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-coral-dark transition shadow-soft"
            >
              <span>{t.accountPage.buttons.upgradeToAccount}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* FORMULIR AUTENTIKASI: MASUK / DAFTAR / MAGIC LINK */}
      <section
        id="account-auth-section"
        className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-navy/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">
              {isAccountActive
                ? isEn
                  ? 'Switch or Add Another Account'
                  : 'Beralih atau Masuk dengan Akun Lain'
                : isEn
                ? 'Sign In or Create Your Account'
                : 'Masuk atau Daftarkan Akun Anda'}
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Sync your self-assessment, records, and partner plan across phones and laptops.'
                : 'Sinkronkan hasil cek awal, catatan lab, dan rencana pasangan antar perangkat Anda.'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap p-1 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setMagicLinkSent(false);
              }}
              className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${
                authTab === 'login'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
              }`}
            >
              {t.accountPage.tabs.login}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setMagicLinkSent(false);
              }}
              className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${
                authTab === 'register'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
              }`}
            >
              {t.accountPage.tabs.register}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('magic');
                setMagicLinkSent(false);
              }}
              className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${
                authTab === 'magic'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
              }`}
            >
              {t.accountPage.tabs.magic}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {authError && (
          <div className="p-3.5 rounded-btn bg-status-urgent-bg text-status-urgent text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div className="p-3.5 rounded-btn bg-status-success-bg text-status-success text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* INTERAKTIF MAGIC LINK / OTP SIMULATION */}
        {magicLinkSent ? (
          <div className="p-5 rounded-card bg-brand-teal-light/50 dark:bg-brand-teal/15 border-2 border-brand-teal/40 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 font-bold text-brand-teal text-sm">
                <Mail className="w-5 h-5 text-brand-teal shrink-0" />
                <span>
                  {isEn
                    ? `Magic Link & OTP Code Sent to ${emailInput}`
                    : `Magic Link & Kode OTP Terkirim ke ${emailInput}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="text-[11px] text-brand-navy/70 dark:text-white/70 hover:underline"
              >
                {isEn ? 'Change Email' : 'Ganti Email'}
              </button>
            </div>

            <p className="text-brand-navy/85 dark:text-white/85 leading-relaxed">
              {isEn
                ? 'A passwordless login link and a 6-digit OTP have been issued. For hackathon demo testing, enter the simulated OTP below or click verify instantly:'
                : 'Tautan masuk tanpa sandi dan kode OTP 6-digit telah diterbitkan. Untuk keperluan demo hackathon, masukkan kode OTP di bawah ini atau tekan tombol verifikasi instan:'}
            </p>

            <div className="p-3.5 rounded-btn bg-surface dark:bg-surface-dark border border-brand-teal/30 flex items-center justify-between gap-3">
              <span className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn ? 'Simulated 6-Digit OTP:' : 'Kode OTP Simulasi:'}
              </span>
              <span className="font-mono text-base font-bold tracking-widest text-brand-teal">
                {generatedOtp}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder={isEn ? 'Enter 6-digit OTP code' : 'Ketik 6 digit kode OTP'}
                className="flex-1 px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-mono tracking-widest text-center font-bold text-brand-navy bg-white"
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isSubmitting}
                className="touch-target px-5 py-2.5 rounded-btn bg-brand-teal text-white font-bold flex items-center justify-center gap-1.5 shadow-soft hover:bg-brand-teal-dark transition"
              >
                <Check className="w-4 h-4" />
                <span>{isEn ? 'Verify OTP & Enter' : 'Verifikasi OTP & Masuk'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Email Input */}
              <div>
                <label htmlFor="auth-email-input" className="block text-xs font-semibold mb-1">
                  {t.accountPage.labels.email}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-brand-navy/40 absolute left-3 top-3" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="nama@email.com (mis: rendra@demo.id)"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                  />
                </div>
              </div>

              {/* Password Input (with Visibility Toggle) */}
              {authTab !== 'magic' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-password-input" className="block text-xs font-semibold">
                      {t.accountPage.labels.password}
                    </label>
                    {authTab === 'register' && (
                      <span className="text-[10px] font-semibold text-brand-navy/60 dark:text-white/60">
                        {passwordStrength.text}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-brand-navy/40 absolute left-3 top-3" />
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-brand-navy/50 hover:text-brand-navy"
                      title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {authTab === 'register' && passwordInput && (
                    <div className="w-full bg-brand-navy/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password (Register Only) */}
              {authTab === 'register' && (
                <div>
                  <label htmlFor="auth-confirm-pwd" className="block text-xs font-semibold mb-1">
                    {t.accountPage.labels.confirmPassword}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-brand-navy/40 absolute left-3 top-3" />
                    <input
                      id="auth-confirm-pwd"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-brand-navy/50 hover:text-brand-navy"
                      title={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Display Name (Register Only) */}
              {authTab === 'register' && (
                <div>
                  <label htmlFor="auth-name-input" className="block text-xs font-semibold mb-1">
                    {t.accountPage.labels.displayName}
                  </label>
                  <input
                    id="auth-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={isEn ? 'e.g. Rendra' : 'Contoh: Rendra'}
                    className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                  />
                </div>
              )}

              {/* Role Select */}
              <div>
                <label htmlFor="auth-role-select" className="block text-xs font-semibold mb-1">
                  {t.accountPage.labels.role}
                </label>
                <select
                  id="auth-role-select"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as 'user' | 'nakes')}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
                >
                  <option value="user">{t.accountPage.labels.roleUser}</option>
                  <option value="nakes">{t.accountPage.labels.roleNakes}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Granular consent (PDPA) will remain OFF by default.'
                  : 'Persetujuan granular (UU PDP) diatur NONAKTIF secara default.'}
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="touch-target px-5 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold hover:bg-brand-teal-dark transition shadow-soft flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>
                  {authTab === 'register'
                    ? t.accountPage.buttons.createAccount
                    : authTab === 'login'
                    ? t.accountPage.buttons.signIn
                    : t.accountPage.buttons.sendMagic}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* PINTASAN AKUN DEMO HACKATHON */}
        <div className="pt-3 border-t border-brand-navy/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 dark:text-white/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-coral" />
              {t.accountPage.buttons.quickDemo}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-2">
              <div>
                <div className="font-bold text-xs text-brand-navy dark:text-white">1. Rendra (Suami)</div>
                <div className="text-[11px] text-brand-navy/70 dark:text-white/70 font-mono">
                  rendra@demo.id
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAutoFillDemo('rendra')}
                  className="px-2.5 py-1 rounded bg-white dark:bg-white/10 text-[11px] font-semibold border border-brand-navy/15 flex-1 hover:border-brand-teal"
                >
                  {isEn ? 'Auto-Fill' : 'Isi Form'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoSignIn('rendra')}
                  className="px-2.5 py-1 rounded bg-brand-teal text-white text-[11px] font-bold flex-1 hover:bg-brand-teal-dark shadow-sm"
                >
                  {isEn ? 'Instant' : 'Masuk'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-2">
              <div>
                <div className="font-bold text-xs text-brand-navy dark:text-white">2. Sari (Istri)</div>
                <div className="text-[11px] text-brand-navy/70 dark:text-white/70 font-mono">
                  sari@demo.id
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAutoFillDemo('sari')}
                  className="px-2.5 py-1 rounded bg-white dark:bg-white/10 text-[11px] font-semibold border border-brand-navy/15 flex-1 hover:border-brand-coral"
                >
                  {isEn ? 'Auto-Fill' : 'Isi Form'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoSignIn('sari')}
                  className="px-2.5 py-1 rounded bg-brand-coral text-white text-[11px] font-bold flex-1 hover:bg-brand-coral-dark shadow-sm"
                >
                  {isEn ? 'Instant' : 'Masuk'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-2">
              <div>
                <div className="font-bold text-xs text-brand-navy dark:text-white">3. dr. Maya (Dokter)</div>
                <div className="text-[11px] text-brand-navy/70 dark:text-white/70 font-mono">
                  maya@puskesmas.id
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAutoFillDemo('maya')}
                  className="px-2.5 py-1 rounded bg-white dark:bg-white/10 text-[11px] font-semibold border border-brand-navy/15 flex-1 hover:border-status-success"
                >
                  {isEn ? 'Auto-Fill' : 'Isi Form'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoSignIn('maya')}
                  className="px-2.5 py-1 rounded bg-status-success text-white text-[11px] font-bold flex-1 hover:opacity-90 shadow-sm"
                >
                  {isEn ? 'Instant' : 'Masuk'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROFIL & KEAMANAN AKUN (Bila sudah login di Mode Akun) */}
      {isAccountActive && (
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-5">
          <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-brand-teal" />
                <span>{isEn ? 'Account Profile & Security Settings' : 'Pengaturan Profil & Keamanan Akun'}</span>
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Update your display name, avatar appearance, or password anytime.'
                  : 'Perbarui nama tampilan, tema avatar, atau ubah kata sandi akun Anda kapan saja.'}
              </p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`p-3.5 rounded-btn text-xs font-bold flex items-center gap-2 ${
                profileSuccess
                  ? 'bg-status-success-bg text-status-success'
                  : 'bg-status-urgent-bg text-status-urgent'
              }`}
            >
              {profileSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{profileMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Display Name */}
              <div>
                <label htmlFor="edit-name-field" className="block text-xs font-semibold mb-1">
                  {t.accountPage.labels.displayName}
                </label>
                <input
                  id="edit-name-field"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>

              {/* Avatar Theme Picker */}
              <div>
                <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-brand-teal" />
                  <span>{isEn ? 'Avatar Accent Color' : 'Aksen Warna Avatar'}</span>
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {(['teal', 'coral', 'navy', 'emerald', 'purple'] as const).map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setAvatarTheme(clr)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        clr === 'teal'
                          ? 'bg-brand-teal'
                          : clr === 'coral'
                          ? 'bg-brand-coral'
                          : clr === 'navy'
                          ? 'bg-brand-navy'
                          : clr === 'emerald'
                          ? 'bg-status-success'
                          : 'bg-purple-600'
                      } ${avatarTheme === clr ? 'ring-2 ring-offset-2 ring-brand-teal' : 'opacity-70'}`}
                      title={clr}
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-pwd-field" className="block text-xs font-semibold">
                    {t.accountPage.labels.newPassword}
                  </label>
                  {newPassword && (
                    <span className="text-[10px] font-semibold text-brand-navy/60 dark:text-white/60">
                      {newPasswordStrength.text}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="edit-pwd-field"
                    type={showNewPassword ? 'text' : 'password'}
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isEn ? 'Leave blank to keep current' : 'Kosongkan bila tidak diubah'}
                    className="w-full px-3.5 pr-10 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-brand-navy/50 hover:text-brand-navy"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="touch-target px-5 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold shadow-soft hover:bg-brand-teal-dark transition disabled:opacity-50"
              >
                {t.accountPage.buttons.saveProfile}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SESI & PERANGKAT TERHUBUNG */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Laptop className="w-4 h-4 text-brand-coral" />
            <span>{t.accountPage.sessions.title}</span>
          </h2>
          <span className="text-[11px] font-semibold text-status-success bg-status-success-bg px-2.5 py-0.5 rounded-full">
            ● {isEn ? '2 Devices Synchronized' : '2 Perangkat Terhubung'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-brand-teal" />
                {isEn ? 'This Device (Desktop/Mac)' : 'Perangkat Ini (Desktop/Mac)'}
              </span>
              <span className="text-[10px] font-bold text-status-success">
                {isEn ? 'Active Now' : 'Aktif'}
              </span>
            </div>
            <p className="text-brand-navy/70 dark:text-white/70">
              Web Standalone PWA • Browser session via Web Crypto
            </p>
          </div>

          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-brand-coral" />
                {isEn ? 'Partner Device (Mobile)' : 'Perangkat Pasangan (Ponsel)'}
              </span>
              <span className="text-[10px] font-bold text-brand-teal">
                {isEn ? 'Mode Berdua' : 'Tersinkron'}
              </span>
            </div>
            <p className="text-brand-navy/70 dark:text-white/70">
              {pairing && pairing.status === 'active'
                ? `${isEn ? 'Paired with' : 'Tertaut bersama'} ${pairing.partner_b_alias}`
                : isEn
                ? 'Ready to pair via invite code'
                : 'Siap ditautkan via kode'}
            </p>
          </div>

          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-teal" />
                {isEn ? 'PDPA & Security Status' : 'Status UU PDP & Keamanan'}
              </span>
              <span className="text-[10px] font-bold text-status-success">Compliant</span>
            </div>
            <p className="text-brand-navy/70 dark:text-white/70">
              {t.accountPage.sessions.cloudEncrypted}
            </p>
          </div>
        </div>
      </section>

      {/* EKSPOR DATA DAN HAPUS AKUN (HAK SUBJEK DATA) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-teal" />
          <span>{isEn ? 'Data Portability & Account Deletion' : 'Portabilitas Data & Penghapusan Akun'}</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExportDataJson}
            className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/15 text-xs font-bold flex items-center justify-center gap-2 hover:border-brand-teal transition"
          >
            <Download className="w-4 h-4 text-brand-teal" />
            <span>{isEn ? 'Export My Data (JSON)' : 'Ekspor Data Saya (JSON)'}</span>
          </button>

          {deleteStep === 0 ? (
            <button
              type="button"
              onClick={() => setDeleteStep(1)}
              className="touch-target py-2.5 px-4 rounded-btn bg-status-urgent-bg text-status-urgent border border-status-urgent/30 text-xs font-bold flex items-center justify-center gap-2 hover:bg-status-urgent hover:text-white transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isEn ? 'Delete Account & All Data' : 'Hapus Akun & Semua Data'}</span>
            </button>
          ) : deleteStep === 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-status-urgent font-bold">
                {isEn ? 'Are you sure?' : 'Yakin ingin menghapus?'}
              </span>
              <button
                type="button"
                onClick={() => setDeleteStep(2)}
                className="px-3 py-1.5 rounded-btn bg-status-urgent text-white text-xs font-bold"
              >
                {isEn ? 'Yes, proceed' : 'Ya, lanjutkan'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep(0)}
                className="px-3 py-1.5 rounded-btn border text-xs"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isEn ? 'Type DELETE to confirm' : 'Ketik HAPUS untuk konfirmasi'}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="px-3 py-1.5 rounded-btn border text-xs font-bold text-brand-navy bg-white"
              />
              <button
                type="button"
                onClick={handleFinalDeleteAccount}
                className="px-3 py-1.5 rounded-btn bg-status-urgent text-white text-xs font-bold"
              >
                {isEn ? 'Confirm Delete Now' : 'Konfirmasi Hapus Sekarang'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep(0)}
                className="px-3 py-1.5 rounded-btn border text-xs"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
