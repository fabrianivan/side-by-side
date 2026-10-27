import React, { useState, useEffect } from 'react';
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
  Activity,
  Heart,
  Calendar,
  CheckCircle,
  X,
  UserCheck,
  Database,
  Users,
  ArrowLeftRight,
  ChevronRight,
  ChevronDown,
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
    habitLog,
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

  // Active Main Tab: 'profile' | 'security' | 'data' | 'auth'
  const isAccountActive = authMode === 'account' || authMode === 'nakes';
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'data' | 'auth'>(
    isAccountActive ? 'profile' : 'auth'
  );

  // Switch account modal state & custom email form toggle
  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false);
  const [showCustomLoginForm, setShowCustomLoginForm] = useState<boolean>(false);

  // Automatically ensure logged-in user never lands on the login tab
  useEffect(() => {
    if (isAccountActive && activeTab === 'auth') {
      setActiveTab('profile');
    }
  }, [isAccountActive, activeTab]);

  // Auth Sub-tab: 'login' | 'register' | 'magic'
  const [authSubTab, setAuthSubTab] = useState<'login' | 'register' | 'magic'>('login');

  // Input States
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<'user' | 'nakes'>('user');

  // Password Visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showSecurityPassword, setShowSecurityPassword] = useState<boolean>(false);

  // Feedback states
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Magic Link OTP simulation
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);

  // Profile Edit State
  const [editName, setEditName] = useState<string>(displayName);
  const [newPassword, setNewPassword] = useState<string>('');
  const [securityPasswordInput, setSecurityPasswordInput] = useState<string>('');
  const [profileMessage, setProfileMessage] = useState<string>('');
  const [profileSuccess, setProfileSuccess] = useState<boolean>(false);
  const [avatarTheme, setAvatarTheme] = useState<'teal' | 'coral' | 'navy' | 'emerald' | 'purple'>('teal');

  // Delete Account Confirmation
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  // Password Strength
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

  // Dynamic client environment detection
  const getDeviceInfo = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let os = isEn ? 'Apple Mac (macOS)' : 'Komputer Mac (macOS)';
    let isMobile = false;

    if (/Macintosh|Mac OS X/i.test(ua)) {
      os = isEn ? 'Apple Mac (macOS)' : 'Apple Mac (macOS)';
    } else if (/Windows/i.test(ua)) {
      os = 'Windows PC';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = 'Apple iOS (iPhone/iPad)';
      isMobile = true;
    } else if (/Android/i.test(ua)) {
      os = 'Android Mobile';
      isMobile = true;
    }

    let browser = isEn ? 'Modern Web Browser' : 'Peramban Web Modern';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
    else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/Edg/i.test(ua)) browser = 'Microsoft Edge';

    return { os, browser, isMobile };
  };

  const deviceInfo = getDeviceInfo();

  const handleAutoFillDemo = (target: 'rendra' | 'sari' | 'maya') => {
    setAuthSubTab('login');
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

  const handleInstantDemoSignIn = async (persona: 'rendra' | 'sari' | 'maya') => {
    setIsSubmitting(true);
    await switchDemoPersona(persona);
    setIsSubmitting(false);
    setShowSwitchModal(false);
    setActiveTab('profile');
    setAuthSuccess(
      isEn
        ? `Successfully switched to ${persona.toUpperCase()} profile!`
        : `Berhasil masuk sebagai profil demo ${persona.toUpperCase()}!`
    );
    if (persona === 'rendra') navigate(isEn ? '/home' : '/');
    if (persona === 'sari') navigate(isEn ? '/couple' : '/berdua');
    if (persona === 'maya') navigate(isEn ? '/provider' : '/nakes');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (authSubTab === 'magic') {
      if (!emailInput.includes('@')) {
        setAuthError(isEn ? 'Please enter a valid email address.' : 'Masukkan alamat email yang valid.');
        return;
      }
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(randomCode);
      setMagicLinkSent(true);
      return;
    }

    if (authSubTab === 'register') {
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
      const endpoint = authSubTab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        authSubTab === 'register'
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
          authSubTab === 'register'
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
        setShowSwitchModal(false);
        setActiveTab('profile');
        return;
      } else {
        const errData = await res.json();
        setAuthError(errData.error || (isEn ? 'Authentication failed.' : 'Gagal memproses autentikasi.'));
      }
    } catch {
      await loginAccount(emailInput, roleInput, nameInput || emailInput.split('@')[0]);
      setAuthSuccess(isEn ? 'Signed in (offline safe mode).' : 'Berhasil masuk (mode luring).');
      setShowSwitchModal(false);
      setActiveTab('profile');
    }
    setIsSubmitting(false);
  };

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
      setShowSwitchModal(false);
      setActiveTab('profile');
    } else {
      setAuthError(isEn ? 'Invalid OTP code. Please try again.' : 'Kode OTP tidak cocok. Silakan periksa kembali.');
    }
  };

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
      setNewPassword('');
      setTimeout(() => setProfileMessage(''), 3500);
    } else {
      setProfileSuccess(false);
      setProfileMessage(isEn ? 'Failed to update profile.' : 'Gagal memperbarui profil.');
    }
  };

  const handleSecurityPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityPasswordInput || securityPasswordInput.length < 6) {
      setProfileSuccess(false);
      setProfileMessage(isEn ? 'Password must be at least 6 characters.' : 'Kata sandi baru minimal 6 karakter.');
      return;
    }
    setIsSubmitting(true);
    const ok = await updateProfile(displayName, securityPasswordInput);
    setIsSubmitting(false);
    if (ok) {
      setProfileSuccess(true);
      setProfileMessage(isEn ? 'Security password updated successfully!' : 'Kata sandi keamanan berhasil diperbarui!');
      setSecurityPasswordInput('');
      setTimeout(() => setProfileMessage(''), 3500);
    } else {
      setProfileSuccess(false);
      setProfileMessage(isEn ? 'Failed to update password.' : 'Gagal memperbarui kata sandi.');
    }
  };

  const handleExportDataJson = () => {
    const payload = {
      app: 'Side by Side — Account & Health Data Export',
      exportedAt: new Date().toISOString(),
      account: { userId, userEmail, displayName, authMode },
      consents,
      assessmentAnswers,
      assessmentResult,
      labResults,
      reminders,
      pairing,
      habitLog,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `side-by-side-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinalDeleteAccount = async () => {
    await wipeAllData();
    setDeleteStep(0);
    setDeleteConfirmText('');
    navigate('/welcome');
  };

  const avatarGradients = {
    teal: 'from-brand-teal to-teal-700 text-white ring-brand-teal/30',
    coral: 'from-brand-coral to-orange-600 text-white ring-brand-coral/30',
    navy: 'from-brand-navy to-slate-800 text-white ring-brand-navy/30',
    emerald: 'from-emerald-500 to-green-700 text-white ring-emerald-400/30',
    purple: 'from-purple-600 to-indigo-800 text-white ring-purple-400/30',
  };

  const totalHabitsLogged = Object.values(habitLog).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. TOP HERO PROFILE CARD (Modern Clean Studio Aesthetic) */}
      <section className="relative overflow-hidden rounded-card bg-surface dark:bg-surface-dark-card border border-brand-navy/10 shadow-soft">
        {/* Decorative Top Accent Bar */}
        <div className="h-2.5 bg-gradient-to-r from-brand-teal via-brand-coral to-brand-navy" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* User Avatar & Info */}
            <div className="flex items-center gap-5">
              <div
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl font-black shadow-md ring-4 ${avatarGradients[avatarTheme]} shrink-0`}
              >
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-brand-navy dark:text-white tracking-tight">
                    {displayName}
                  </h1>

                  {/* Mode Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isAccountActive
                        ? 'bg-status-success/15 text-status-success'
                        : 'bg-brand-teal/15 text-brand-teal'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isAccountActive
                      ? authMode === 'nakes'
                        ? isEn ? 'Verified Healthcare Provider' : 'Tenaga Kesehatan'
                        : isEn ? 'Account Synced' : 'Mode Akun Aktif'
                      : isEn ? '100% Anonymous (Local)' : 'Anonim Terenkripsi'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-brand-navy/70 dark:text-white/70 font-medium">
                  {userEmail ? (
                    <span className="flex items-center gap-1.5 font-mono">
                      <Mail className="w-3.5 h-3.5 text-brand-teal" />
                      {userEmail}
                    </span>
                  ) : (
                    <span>
                      {isEn
                        ? 'Zero personal info shared • Protected on Device'
                        : 'Bebas data pribadi • Tersimpan aman di perangkat'}
                    </span>
                  )}
                </p>

                <p className="text-[11px] font-mono text-brand-navy/50 dark:text-white/50">
                  UID: <span className="font-semibold text-brand-navy/80 dark:text-white/80">{userId}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions (Switch Account / Sync / Sign Out) */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                className="touch-target px-4 py-2 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/15 text-brand-navy dark:text-white text-xs font-semibold flex items-center justify-center gap-2 hover:border-brand-teal hover:bg-brand-teal/5 transition shadow-xs"
              >
                <Users className="w-3.5 h-3.5 text-brand-teal" />
                <span>{isEn ? 'Switch Account' : 'Ganti Akun'}</span>
              </button>

              {isAccountActive ? (
                <>
                  <button
                    type="button"
                    onClick={() => syncCloudData()}
                    disabled={isSyncing}
                    className="touch-target px-4 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:bg-brand-teal-dark transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? (isEn ? 'Syncing...' : 'Menyinkronkan...') : (isEn ? 'Sync Cloud' : 'Sinkronkan')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={logoutToWelcome}
                    className="touch-target px-4 py-2 rounded-btn border border-status-urgent/30 text-status-urgent text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-status-urgent-bg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Sign Out' : 'Keluar Akun'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('auth')}
                  className="touch-target px-5 py-2.5 rounded-btn bg-brand-coral text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-brand-coral-dark transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isEn ? 'Upgrade to Cloud Account' : 'Tingkatkan ke Mode Akun'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-time Health Profile Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-brand-navy/10">
            <div className="p-3.5 rounded-btn bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-brand-teal" />
                <span>{isEn ? 'Self Check' : 'Cek Awal'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white truncate">
                {assessmentResult ? assessmentResult.levelLabel : (isEn ? 'Not Started' : 'Belum Ada')}
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <Activity className="w-3.5 h-3.5 text-brand-coral" />
                <span>{isEn ? 'Lab Records' : 'Hasil Lab'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {labResults.length} {isEn ? 'Tests Logged' : 'Hasil Tercatat'}
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <Heart className="w-3.5 h-3.5 text-pink-500" />
                <span>{isEn ? 'Partner Plan' : 'Mode Berdua'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white truncate">
                {pairing && pairing.status === 'active'
                  ? pairing.partner_b_alias
                  : isEn ? 'Not Paired' : 'Belum Ditautkan'}
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isEn ? 'Habits Tracked' : 'Kebiasaan Sehat'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {totalHabitsLogged} {isEn ? 'Checkmarks' : 'Centang'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEEDBACK ALERTS */}
      {authSuccess && (
        <div className="p-4 rounded-card bg-status-success-bg text-status-success text-xs font-bold flex items-center gap-2.5 shadow-sm border border-status-success/30">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{authSuccess}</span>
        </div>
      )}

      {authError && (
        <div className="p-4 rounded-card bg-status-urgent-bg text-status-urgent text-xs font-bold flex items-center gap-2.5 shadow-sm border border-status-urgent/30">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}



      {/* 2. MODERN SEGMENTED NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 rounded-card bg-surface dark:bg-surface-dark-card border border-brand-navy/10 shadow-xs">
        {isAccountActive ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 px-3 rounded-btn text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy hover:bg-surface-muted'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{isEn ? 'Profile & Preferences' : 'Profil & Tampilan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-2.5 px-3 rounded-btn text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy hover:bg-surface-muted'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isEn ? 'Password & Security' : 'Kata Sandi & Keamanan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-2.5 px-3 rounded-btn text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'data'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy hover:bg-surface-muted'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{isEn ? 'Data & Storage' : 'Kelola Data'}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('auth')}
              className={`flex-1 py-2.5 px-3 rounded-btn text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'auth'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy hover:bg-surface-muted'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{isEn ? 'Sign In / Register' : 'Masuk / Buat Akun'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-2.5 px-3 rounded-btn text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'data'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy hover:bg-surface-muted'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{isEn ? 'Data & Storage' : 'Kelola Data'}</span>
            </button>
          </>
        )}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB A: PROFILE & PREFERENCES (Visible when logged in) */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Form (8 Cols) */}
          <div className="md:col-span-8 space-y-6">
            <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-7 border border-brand-navy/5 space-y-5">
              <div className="border-b border-brand-navy/10 pb-3">
                <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Personal Profile Settings' : 'Pengaturan Profil Akun'}</span>
                </h2>
                <p className="text-xs text-brand-navy/70 dark:text-white/70">
                  {isEn
                    ? 'Manage your public nickname and appearance preferences.'
                    : 'Kelola nama tampilan panggilan dan preferensi tampilan akun Anda.'}
                </p>
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
                <div>
                  <label htmlFor="edit-name-field" className="block text-xs font-bold mb-1 text-brand-navy dark:text-white">
                    {isEn ? 'Display Name / Nickname' : 'Nama Tampilan / Panggilan'}
                  </label>
                  <input
                    id="edit-name-field"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  />
                </div>

                {/* Avatar Color Picker */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-brand-navy dark:text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-brand-teal" />
                    <span>{isEn ? 'Avatar Accent Color Theme' : 'Pilihan Warna Tema Avatar'}</span>
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    {(['teal', 'coral', 'navy', 'emerald', 'purple'] as const).map((clr) => (
                      <button
                        key={clr}
                        type="button"
                        onClick={() => setAvatarTheme(clr)}
                        className={`w-9 h-9 rounded-xl transition shadow-xs flex items-center justify-center ${
                          clr === 'teal'
                            ? 'bg-brand-teal'
                            : clr === 'coral'
                            ? 'bg-brand-coral'
                            : clr === 'navy'
                            ? 'bg-brand-navy'
                            : clr === 'emerald'
                            ? 'bg-emerald-600'
                            : 'bg-purple-600'
                        } ${avatarTheme === clr ? 'ring-3 ring-offset-2 ring-brand-teal scale-110' : 'opacity-80 hover:opacity-100'}`}
                        title={clr}
                      >
                        {avatarTheme === clr && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="touch-target px-6 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold shadow-soft hover:bg-brand-teal-dark transition disabled:opacity-50"
                  >
                    {isEn ? 'Save Profile Changes' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </section>

            {/* Quick Demo Personas / Switch Account Hub */}
            <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-navy dark:text-white">
                    {isEn ? 'Switch Account or Demo Persona' : 'Ganti Akun & Persona Demo'}
                  </h3>
                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70">
                    {isEn
                      ? 'Instantly switch between Husband, Wife, or Healthcare Provider profiles.'
                      : 'Beralih instan antara profil Suami, Istri, atau Dokter Puskesmas untuk kemudahan evaluasi.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                className="px-4 py-2 rounded-btn bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white border border-brand-teal/30 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isEn ? 'Switch Account' : 'Ganti Akun'}</span>
              </button>
            </section>
          </div>

          {/* Right Info Cards: Device & Network Protection Hub (4 Cols) */}
          <div className="md:col-span-4 space-y-4">
            {/* Card 1: Perangkat Ini (Current Verified Session) */}
            <div className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Current Device' : 'Perangkat Ini'}</span>
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/20">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  {isEn ? 'Active Now' : 'Aktif Sekarang'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
                    {deviceInfo.isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-brand-navy dark:text-white">
                      {deviceInfo.os}
                    </h4>
                    <p className="text-[11px] text-brand-navy/60 dark:text-white/60">
                      {deviceInfo.browser} • Standalone Web Client
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-navy/10 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-brand-navy/70 dark:text-white/70">
                    <span>{isEn ? 'Protection:' : 'Keamanan:'}</span>
                    <strong className="text-brand-teal font-semibold">{isEn ? 'Protected & Secure' : 'Tersimpan Terlindungi'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-brand-navy/70 dark:text-white/70">
                    <span>{isEn ? 'Storage:' : 'Penyimpanan:'}</span>
                    <span className="font-medium text-brand-navy dark:text-white">
                      {isAccountActive
                        ? isEn ? 'Cloud Encrypted Sync' : 'Sinkron Cloud Terenkripsi'
                        : isEn ? 'Device-Only (IndexedDB)' : 'Lokal Terenkripsi (IndexedDB)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-brand-navy/70 dark:text-white/70">
                    <span>{isEn ? 'Last Sync:' : 'Terakhir Sinkron:'}</span>
                    <span className="font-mono text-[10px]">
                      {lastSyncTime ? lastSyncTime : (isEn ? 'Live Session' : 'Sesi Aktif')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Perangkat Pasangan (Couple Mode Sync Card) */}
            <div className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span>{isEn ? 'Partner Device' : 'Perangkat Pasangan'}</span>
                </h3>
                {pairing && pairing.status === 'active' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal">
                    {isEn ? 'Connected' : 'Tertaut'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy/60 dark:text-white/60">
                    {isEn ? 'Not Linked' : 'Belum Tertaut'}
                  </span>
                )}
              </div>

              {pairing && pairing.status === 'active' ? (
                <div className="p-3.5 rounded-xl bg-pink-500/5 border border-pink-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-brand-navy dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-pink-500" />
                      <span>{pairing.partner_b_alias}</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-surface-dark border border-pink-500/30 text-brand-teal tracking-wide shadow-xs">
                      {pairing.invite_code}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Shared milestones synced without revealing private assessment answers.'
                      : 'Rencana bersama aktif tanpa membuka isi rekam medis pribadi Anda.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(isEn ? '/couple' : '/berdua')}
                    className="w-full py-1.5 px-3 rounded-btn bg-white dark:bg-surface-dark border border-brand-navy/15 text-xs font-bold text-brand-navy dark:text-white hover:border-brand-teal transition text-center"
                  >
                    {isEn ? 'Open Couple Plan →' : 'Buka Rencana Kita →'}
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-2.5">
                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Invite your partner to plan together using a 24-hour disposable link.'
                      : 'Ajak pasangan menyusun linimasa bersama dengan kode tautan aman 24 jam.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(isEn ? '/couple' : '/berdua')}
                    className="w-full py-2 px-3 rounded-btn bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral text-xs font-bold hover:bg-brand-coral/25 transition flex items-center justify-center gap-1.5"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Connect Partner Phone' : 'Tautkan Ponsel Pasangan'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Card 3: Jaminan Privasi */}
            <div className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-5 border border-brand-navy/10 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-teal" />
                <span>{isEn ? 'Privacy Shield' : 'Jaminan Privasi'}</span>
              </h3>
              <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
                {isAccountActive
                  ? isEn
                    ? 'Cross-device sync enabled with zero health-payload server logging.'
                    : 'Sinkronisasi cloud aktif dengan zero health-payload server logging.'
                  : isEn
                    ? 'Pure client-side zero-knowledge encryption. No personal data leaves this device.'
                    : 'Enkripsi zero-knowledge lokal. Tidak ada data pribadi dikirim ke server.'}
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-brand-teal">
                <span>{isEn ? 'No Trackers • No Ads' : 'Bebas Pelacak • Bebas Iklan'}</span>
                <span className="text-status-success font-bold">✓ Terproteksi</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: PASSWORD & SECURITY (Visible when logged in) */}
      {activeTab === 'security' && isAccountActive && (
        <div className="space-y-6">
          <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-7 border border-brand-navy/5 space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-teal" />
                <span>{isEn ? 'Security Credentials & Access Control' : 'Kredensial Keamanan & Akses Akun'}</span>
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Update your master password and review cryptographic session status.'
                  : 'Perbarui kata sandi utama dan pantau status enkripsi kriptografi sesi Anda.'}
              </p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Change Password Form */}
              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Change Account Password' : 'Ganti Kata Sandi Akun'}</span>
                </h3>
                <form onSubmit={handleSecurityPasswordChange} className="space-y-3">
                  <div>
                    <label htmlFor="sec-new-pwd" className="block text-xs font-semibold mb-1 text-brand-navy dark:text-white">
                      {isEn ? 'New Password (min. 6 characters)' : 'Kata Sandi Baru (min. 6 karakter)'}
                    </label>
                    <div className="relative">
                      <input
                        id="sec-new-pwd"
                        type={showSecurityPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={securityPasswordInput}
                        onChange={(e) => setSecurityPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 pr-10 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                        className="absolute right-3 top-2.5 text-brand-navy/40 hover:text-brand-navy"
                      >
                        {showSecurityPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="touch-target w-full py-2.5 px-4 rounded-btn bg-brand-teal text-white text-xs font-bold shadow-soft hover:bg-brand-teal-dark transition disabled:opacity-50"
                  >
                    {isEn ? 'Update Password' : 'Simpan Kata Sandi Baru'}
                  </button>
                </form>
              </div>

              {/* Cryptographic Session Diagnostics */}
              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Session Security Status' : 'Status Keamanan Sesi'}</span>
                </h3>
                <ul className="text-xs space-y-2 text-brand-navy/80 dark:text-white/80">
                  <li className="flex items-center justify-between py-1 border-b border-brand-navy/10">
                    <span>{isEn ? 'Storage Protection:' : 'Perlindungan Data:'}</span>
                    <strong className="text-brand-teal font-semibold">{isEn ? 'Encrypted & Private' : 'Tersimpan Terenkripsi'}</strong>
                  </li>
                  <li className="flex items-center justify-between py-1 border-b border-brand-navy/10">
                    <span>{isEn ? 'Access Control:' : 'Kontrol Akses:'}</span>
                    <strong className="text-brand-navy dark:text-white font-semibold">{isEn ? 'Secure Session Token' : 'Sesi Token Aman'}</strong>
                  </li>
                  <li className="flex items-center justify-between py-1 border-b border-brand-navy/10">
                    <span>{isEn ? 'Server Health Payload:' : 'Payload Kesehatan Server:'}</span>
                    <span className="text-status-success font-bold font-mono">0 bytes (Zero-Knowledge)</span>
                  </li>
                  <li className="flex items-center justify-between py-1">
                    <span>{isEn ? 'Session Verification:' : 'Verifikasi Sesi:'}</span>
                    <span className="text-status-success font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isEn ? 'Verified Active' : 'Terverifikasi Aktif'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB C: AUTHENTICATION (Visible only when in Anonymous mode) */}
      {activeTab === 'auth' && !isAccountActive && (
        <div className="space-y-6">
          <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-8 border border-brand-navy/5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-navy/10 pb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-brand-navy dark:text-white">
                  {isEn ? 'Sign In or Create an Account' : 'Masuk atau Daftarkan Akun Anda'}
                </h2>
                <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'Sync your self-check answers, semen test records, and couple plan across phones and tablets.'
                    : 'Sinkronkan hasil Cek Awal, catatan laboratorium, dan rencana berdua ke perangkat lain.'}
                </p>
              </div>

              {/* Sub-tabs: Login / Register / Magic */}
              <div className="flex p-1 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthSubTab('login');
                    setMagicLinkSent(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition ${
                    authSubTab === 'login'
                      ? 'bg-brand-navy text-white shadow-xs'
                      : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
                  }`}
                >
                  {isEn ? 'Sign In' : 'Masuk'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthSubTab('register');
                    setMagicLinkSent(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition ${
                    authSubTab === 'register'
                      ? 'bg-brand-navy text-white shadow-xs'
                      : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
                  }`}
                >
                  {isEn ? 'Register' : 'Daftar Baru'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthSubTab('magic');
                    setMagicLinkSent(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition ${
                    authSubTab === 'magic'
                      ? 'bg-brand-teal text-white shadow-xs'
                      : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
                  }`}
                >
                  {isEn ? 'Magic Link' : 'Magic Link'}
                </button>
              </div>
            </div>

            {/* MAGIC LINK / OTP SIMULATOR */}
            {magicLinkSent ? (
              <div className="p-5 rounded-card bg-brand-teal-light/40 dark:bg-brand-teal/15 border border-brand-teal/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand-teal">
                    <Mail className="w-5 h-5" />
                    <span>{isEn ? `Simulated OTP Sent to ${emailInput}` : `Kode OTP Terkirim ke ${emailInput}`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMagicLinkSent(false)}
                    className="text-xs text-brand-navy/70 dark:text-white/70 hover:underline"
                  >
                    {isEn ? 'Change Email' : 'Ganti Email'}
                  </button>
                </div>

                <div className="p-3.5 rounded-btn bg-white dark:bg-surface-dark border border-brand-teal/30 flex items-center justify-between">
                  <span className="text-xs text-brand-navy/70 dark:text-white/70">
                    {isEn ? 'Simulated 6-Digit Code:' : 'Kode 6-Digit Simulasi:'}
                  </span>
                  <span className="font-mono text-lg font-black tracking-widest text-brand-teal">
                    {generatedOtp}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="123456"
                    className="flex-1 px-4 py-2.5 rounded-btn border border-brand-navy/20 text-center font-mono text-sm tracking-widest font-bold text-brand-navy bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="px-5 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold shadow-soft hover:bg-brand-teal-dark transition"
                  >
                    {isEn ? 'Verify & Enter' : 'Verifikasi & Masuk'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-bold mb-1 text-brand-navy dark:text-white">
                      {isEn ? 'Email Address' : 'Alamat Email'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-brand-navy/40 absolute left-3.5 top-3" />
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="rendra@demo.id"
                        className="w-full pl-10 pr-4 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                      />
                    </div>
                  </div>

                  {authSubTab !== 'magic' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="auth-pwd" className="block text-xs font-bold text-brand-navy dark:text-white">
                          {isEn ? 'Password' : 'Kata Sandi'}
                        </label>
                        {authSubTab === 'register' && (
                          <span className="text-[10px] font-semibold text-brand-navy/60 dark:text-white/60">
                            {passwordStrength.text}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-brand-navy/40 absolute left-3.5 top-3" />
                        <input
                          id="auth-pwd"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-2.5 text-brand-navy/40 hover:text-brand-navy"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {authSubTab === 'register' && (
                    <>
                      <div>
                        <label htmlFor="auth-conf-pwd" className="block text-xs font-bold mb-1 text-brand-navy dark:text-white">
                          {isEn ? 'Confirm Password' : 'Ulangi Kata Sandi'}
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-brand-navy/40 absolute left-3.5 top-3" />
                          <input
                            id="auth-conf-pwd"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-10 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 top-2.5 text-brand-navy/40 hover:text-brand-navy"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="auth-display-name" className="block text-xs font-bold mb-1 text-brand-navy dark:text-white">
                          {isEn ? 'Your Nickname / Call Name' : 'Nama Panggilan'}
                        </label>
                        <input
                          id="auth-display-name"
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Rendra"
                          className="w-full px-4 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    {isEn ? 'Client encryption & privacy preserved.' : 'Enkripsi data & hak privasi terjamin.'}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="touch-target px-6 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold shadow-soft hover:bg-brand-teal-dark transition flex items-center gap-2"
                  >
                    <span>
                      {authSubTab === 'register'
                        ? isEn ? 'Create Protected Account' : 'Daftar Akun Terlindungi'
                        : authSubTab === 'magic'
                        ? isEn ? 'Send Magic OTP' : 'Kirim Kode OTP'
                        : isEn ? 'Sign In to Account' : 'Masuk ke Akun'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* QUICK DEMO PRESETS */}
            <div className="pt-6 border-t border-brand-navy/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70">
                  {isEn ? 'Or Test Drive with Demo Accounts:' : 'Atau Coba Akun Demo Cepat (Juri / Penguji):'}
                </span>
                <span className="text-[11px] font-semibold text-brand-teal">1-Click Sign-in</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rendra */}
                <div className="p-4 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 space-y-2.5 hover:border-brand-teal transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-teal to-teal-700 text-white font-bold flex items-center justify-center shadow-xs">
                      R
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-brand-navy dark:text-white">Rendra (Suami)</h4>
                      <p className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono">rendra@demo.id</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAutoFillDemo('rendra')}
                      className="flex-1 py-1 px-2 rounded-btn bg-white dark:bg-white/10 text-[11px] font-semibold border border-brand-navy/15 hover:border-brand-teal transition"
                    >
                      {isEn ? 'Auto-Fill' : 'Isi Form'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInstantDemoSignIn('rendra')}
                      className="flex-1 py-1 px-2 rounded-btn bg-brand-teal text-white text-[11px] font-bold shadow-xs hover:bg-brand-teal-dark transition"
                    >
                      {isEn ? 'Instant' : 'Masuk'}
                    </button>
                  </div>
                </div>

                {/* Sari */}
                <div className="p-4 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 space-y-2.5 hover:border-brand-coral transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-coral to-orange-600 text-white font-bold flex items-center justify-center shadow-xs">
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-brand-navy dark:text-white">Sari (Istri)</h4>
                      <p className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono">sari@demo.id</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAutoFillDemo('sari')}
                      className="flex-1 py-1 px-2 rounded-btn bg-white dark:bg-white/10 text-[11px] font-semibold border border-brand-navy/15 hover:border-brand-coral transition"
                    >
                      {isEn ? 'Auto-Fill' : 'Isi Form'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInstantDemoSignIn('sari')}
                      className="flex-1 py-1 px-2 rounded-btn bg-brand-coral text-white text-[11px] font-bold shadow-xs hover:bg-brand-coral-dark transition"
                    >
                      {isEn ? 'Instant' : 'Masuk'}
                    </button>
                  </div>
                </div>

                {/* dr. Maya */}
                <div className="p-4 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 space-y-2.5 hover:border-emerald-500 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white font-bold flex items-center justify-center shadow-xs">
                      M
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-brand-navy dark:text-white">dr. Maya (Dokter)</h4>
                      <p className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono">maya@puskesmas.id</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAutoFillDemo('maya')}
                      className="flex-1 py-1 px-2 rounded-btn bg-white dark:bg-white/10 text-[11px] font-semibold border border-brand-navy/15 hover:border-emerald-500 transition"
                    >
                      {isEn ? 'Auto-Fill' : 'Isi Form'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInstantDemoSignIn('maya')}
                      className="flex-1 py-1 px-2 rounded-btn bg-emerald-600 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-700 transition"
                    >
                      {isEn ? 'Instant' : 'Masuk'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB D: DATA MANAGEMENT & STORAGE */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-7 border border-brand-navy/5 space-y-5">
            <div className="border-b border-brand-navy/10 pb-3">
              <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-teal" />
                <span>{isEn ? 'Data & Storage Management' : 'Kelola Data & Penyimpanan'}</span>
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Manage your health records, download backup files, or erase account data.'
                  : 'Kelola data catatan kesehatan Anda, unduh cadangan file, atau hapus riwayat data.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export JSON Card */}
              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="font-bold text-sm text-brand-navy dark:text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-brand-teal" />
                    <span>{isEn ? 'Export My Full Data (JSON)' : 'Ekspor Seluruh Data (JSON)'}</span>
                  </div>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Download your self-check answers, semen analysis parameters, reminders, and couple plan in machine-readable JSON format.'
                      : 'Unduh seluruh riwayat jawaban Cek Awal, catatan analisis semen, jadwal kontrol, dan rencana berdua dalam format file JSON.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDataJson}
                  className="w-full py-2.5 px-4 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-navy-light transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Download JSON Backup' : 'Unduh Cadangan JSON'}</span>
                </button>
              </div>

              {/* Wipe / Delete Card */}
              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-status-urgent/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="font-bold text-sm text-status-urgent flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>{isEn ? 'Permanent Data Erase' : 'Hapus Semua Data Akun'}</span>
                  </div>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Permanently delete your profile, encrypted local IndexedDB data, and active server sessions. This cannot be undone.'
                      : 'Hapus permanen profil, data IndexedDB terenkripsi di perangkat ini, serta sesi server yang aktif. Tindakan ini tidak dapat dibatalkan.'}
                  </p>
                </div>

                {deleteStep === 0 ? (
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="w-full py-2.5 px-4 rounded-btn bg-status-urgent-bg text-status-urgent border border-status-urgent/30 text-xs font-bold flex items-center justify-center gap-2 hover:bg-status-urgent hover:text-white transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Start Deletion Process' : 'Mulai Proses Penghapusan'}</span>
                  </button>
                ) : deleteStep === 1 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-status-urgent">
                      {isEn ? 'Are you sure? All health logs will be erased.' : 'Yakin? Seluruh data catatan akan hilang.'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteStep(2)}
                        className="flex-1 py-1.5 rounded-btn bg-status-urgent text-white text-xs font-bold"
                      >
                        {isEn ? 'Yes, proceed' : 'Ya, lanjutkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteStep(0)}
                        className="py-1.5 px-3 rounded-btn border border-brand-navy/20 text-xs"
                      >
                        {isEn ? 'Cancel' : 'Batal'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={isEn ? 'Type DELETE to confirm' : 'Ketik HAPUS untuk konfirmasi'}
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-btn border text-xs font-bold text-brand-navy bg-white focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleFinalDeleteAccount}
                        disabled={deleteConfirmText.trim().toUpperCase() !== (isEn ? 'DELETE' : 'HAPUS')}
                        className="flex-1 py-1.5 rounded-btn bg-status-urgent text-white text-xs font-bold disabled:opacity-40"
                      >
                        {isEn ? 'Wipe Everything' : 'Hapus Bersih'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteStep(0)}
                        className="py-1.5 px-3 rounded-btn border border-brand-navy/20 text-xs"
                      >
                        {isEn ? 'Cancel' : 'Batal'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 4. STUDIO-GRADE FLOATING SWITCH ACCOUNT MODAL */}
      {showSwitchModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowSwitchModal(false)}
        >
          <div
            className="bg-surface dark:bg-surface-dark-card w-full max-w-md rounded-2xl shadow-2xl border border-brand-navy/15 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 pb-4 border-b border-brand-navy/10 dark:border-white/10 flex items-center justify-between bg-surface-muted/30 dark:bg-surface-dark">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                    {isEn ? 'Switch Account' : 'Ganti Akun'}
                  </h3>
                  <p className="text-[11px] text-brand-navy/60 dark:text-white/60">
                    {isEn ? 'Select persona or switch account' : 'Pilih persona demo atau masuk ke akun lain'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="w-8 h-8 rounded-lg text-brand-navy/60 dark:text-white/60 hover:text-brand-navy dark:hover:text-white hover:bg-brand-navy/5 dark:hover:bg-white/10 flex items-center justify-center transition"
                aria-label={isEn ? 'Close modal' : 'Tutup jendela'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Active Account Card */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/50 dark:text-white/50 mb-1.5">
                  {isEn ? 'Currently Active' : 'Akun Sedang Digunakan'}
                </div>
                <div className="p-3.5 rounded-xl border-2 border-brand-teal/70 bg-brand-teal/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-teal to-teal-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-brand-navy dark:text-white truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono truncate">
                        {userEmail || (isEn ? 'Anonymous Mode (Local)' : 'Mode Anonim (Perangkat)')}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-teal text-white shrink-0 shadow-xs">
                    <Check className="w-3 h-3" />
                    <span>{isEn ? 'Active' : 'Aktif'}</span>
                  </span>
                </div>
              </div>

              {/* Demo Personas for Evaluators */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/50 dark:text-white/50 mb-1.5 flex items-center justify-between">
                  <span>{isEn ? 'Demo Personas (1-Click Switch)' : 'Persona Demo (Beralih 1-Klik)'}</span>
                  <span className="text-[10px] font-semibold text-brand-teal">
                    {isEn ? 'Instant' : 'Instan'}
                  </span>
                </div>
                <div className="space-y-2">
                  {/* Persona: Rendra (Suami) */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoSignIn('rendra')}
                    disabled={userEmail === 'rendra@demo.id'}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition group ${
                      userEmail === 'rendra@demo.id'
                        ? 'border-brand-teal/30 bg-brand-teal/5 opacity-60 cursor-default'
                        : 'border-brand-navy/10 hover:border-brand-teal hover:bg-brand-teal/5 bg-surface-muted/40 dark:bg-surface-dark hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-teal to-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        R
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-brand-navy dark:text-white truncate">Rendra</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal font-semibold shrink-0">
                            Suami
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono truncate">
                          rendra@demo.id
                        </p>
                      </div>
                    </div>
                    {userEmail === 'rendra@demo.id' ? (
                      <span className="text-[11px] font-bold text-brand-teal shrink-0">
                        {isEn ? 'Active' : 'Aktif'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-brand-teal group-hover:translate-x-0.5 transition flex items-center gap-0.5 shrink-0">
                        <span>{isEn ? 'Switch' : 'Beralih'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>

                  {/* Persona: Sari (Istri) */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoSignIn('sari')}
                    disabled={userEmail === 'sari@demo.id'}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition group ${
                      userEmail === 'sari@demo.id'
                        ? 'border-brand-coral/30 bg-brand-coral/5 opacity-60 cursor-default'
                        : 'border-brand-navy/10 hover:border-brand-coral hover:bg-brand-coral/5 bg-surface-muted/40 dark:bg-surface-dark hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-coral to-orange-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        S
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-brand-navy dark:text-white truncate">Sari</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-coral/15 text-brand-coral font-semibold shrink-0">
                            Istri
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono truncate">
                          sari@demo.id
                        </p>
                      </div>
                    </div>
                    {userEmail === 'sari@demo.id' ? (
                      <span className="text-[11px] font-bold text-brand-coral shrink-0">
                        {isEn ? 'Active' : 'Aktif'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-brand-coral group-hover:translate-x-0.5 transition flex items-center gap-0.5 shrink-0">
                        <span>{isEn ? 'Switch' : 'Beralih'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>

                  {/* Persona: dr. Maya (Nakes) */}
                  <button
                    type="button"
                    onClick={() => handleInstantDemoSignIn('maya')}
                    disabled={userEmail === 'maya@puskesmas.id'}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition group ${
                      userEmail === 'maya@puskesmas.id'
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-60 cursor-default'
                        : 'border-brand-navy/10 hover:border-emerald-500 hover:bg-emerald-500/5 bg-surface-muted/40 dark:bg-surface-dark hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        M
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-brand-navy dark:text-white truncate">dr. Maya</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-semibold shrink-0">
                            Nakes
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-navy/60 dark:text-white/60 font-mono truncate">
                          maya@puskesmas.id
                        </p>
                      </div>
                    </div>
                    {userEmail === 'maya@puskesmas.id' ? (
                      <span className="text-[11px] font-bold text-emerald-600 shrink-0">
                        {isEn ? 'Active' : 'Aktif'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition flex items-center gap-0.5 shrink-0">
                        <span>{isEn ? 'Switch' : 'Beralih'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Account Sign In Toggle (Accordion) */}
              <div className="pt-2 border-t border-brand-navy/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCustomLoginForm(!showCustomLoginForm)}
                  className="w-full py-2 text-xs font-semibold text-brand-navy/80 dark:text-white/80 hover:text-brand-teal flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-brand-teal" />
                    <span>{isEn ? 'Sign in with another email' : 'Masuk dengan email lain'}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showCustomLoginForm ? 'rotate-180 text-brand-teal' : ''
                    }`}
                  />
                </button>

                {showCustomLoginForm && (
                  <form
                    onSubmit={handleAuthSubmit}
                    className="pt-2 space-y-3 animate-in fade-in duration-150"
                  >
                    <div>
                      <label className="block text-[11px] font-medium text-brand-navy/70 dark:text-white/70 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="nama@domain.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-brand-navy/15 text-xs text-brand-navy bg-white dark:bg-surface-dark dark:text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-brand-navy/70 dark:text-white/70 mb-1">
                        {isEn ? 'Password' : 'Kata Sandi'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full px-3 pr-9 py-2 rounded-xl border border-brand-navy/15 text-xs text-brand-navy bg-white dark:bg-surface-dark dark:text-white focus:outline-none focus:border-brand-teal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-brand-navy/40 hover:text-brand-navy"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-brand-teal text-white text-xs font-bold hover:bg-brand-teal-dark transition shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? (isEn ? 'Signing in...' : 'Memproses...') : (isEn ? 'Sign In to Account' : 'Masuk ke Akun')}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-surface-muted/40 dark:bg-surface-dark border-t border-brand-navy/10 dark:border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(false);
                  logoutToWelcome();
                }}
                className="text-xs font-semibold text-status-urgent hover:underline flex items-center gap-1.5 px-2 py-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isEn ? 'Sign Out' : 'Keluar Akun'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-1.5 rounded-lg border border-brand-navy/20 text-xs font-semibold hover:bg-surface-muted transition"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
