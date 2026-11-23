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
  Palette,
  Activity,
  Heart,
  Calendar,
  CheckCircle,
  X,
  Database,
  Users,
  ArrowLeftRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { readLocalValue, writeLocalValue } from '../lib/crypto-storage';

const AVATAR_THEMES = ['teal', 'coral', 'navy', 'emerald', 'purple'] as const;
type AvatarTheme = (typeof AVATAR_THEMES)[number];

function loadSavedAvatarTheme(): AvatarTheme {
  const stored = readLocalValue('sbs_avatar_theme');
  return AVATAR_THEMES.includes(stored as AvatarTheme) ? (stored as AvatarTheme) : 'teal';
}

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
    cycleStartDate,
    doctorChecklist,
    healthJournal,
    lastSyncTime,
    syncError,
    isSyncing,
    loginAccount,
    logoutToWelcome,
    updateProfile,
    syncCloudData,
    wipeAllData,
  } = useApp();

  const isEn = locale === 'en';
  const navigate = useNavigate();

  const isAccountActive = authMode === 'account' || authMode === 'nakes';
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'data' | 'auth'>(
    isAccountActive ? 'profile' : 'auth'
  );

  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false);

  useEffect(() => {
    if (isAccountActive && activeTab === 'auth') {
      setActiveTab('profile');
    }
  }, [isAccountActive, activeTab]);

  // Auth Sub-tab: 'login' | 'register' (no fake OTP / Magic Link)
  const [authSubTab, setAuthSubTab] = useState<'login' | 'register'>('login');

  // Input States
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<'user' | 'nakes'>('user');
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showSecurityPassword, setShowSecurityPassword] = useState<boolean>(false);

  // Feedback states
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Profile & Security Edit State
  const [editName, setEditName] = useState<string>(displayName);
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [securityPasswordInput, setSecurityPasswordInput] = useState<string>('');
  const [profileMessage, setProfileMessage] = useState<string>('');
  const [profileSuccess, setProfileSuccess] = useState<boolean>(false);
  const [avatarTheme, setAvatarTheme] = useState<AvatarTheme>(loadSavedAvatarTheme);

  useEffect(() => {
    setEditName(displayName);
  }, [displayName]);

  // Delete Account Confirmation
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  // Password Strength
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: isEn ? 'Empty' : 'Kosong', color: 'bg-brand-navy/20' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, text: isEn ? 'Weak' : 'Lemah', color: 'bg-status-urgent' };
    if (score <= 3) return { score: 65, text: isEn ? 'Medium' : 'Sedang', color: 'bg-status-warning' };
    return { score: 100, text: isEn ? 'Strong' : 'Kuat', color: 'bg-status-success' };
  };

  const passwordStrength = calculatePasswordStrength(passwordInput);

  const getDeviceInfo = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let os = isEn ? 'Desktop / Workstation' : 'Komputer / Laptop';
    let isMobile = false;

    if (/Macintosh|Mac OS X/i.test(ua)) {
      os = 'Apple Mac (macOS)';
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

  const submitAuth = async (mode: 'login' | 'register') => {
    setAuthError('');
    setAuthSuccess('');

    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail.includes('@') || passwordInput.length < 8) {
      setAuthError(
        isEn
          ? 'Enter a valid email and password with at least 8 characters.'
          : 'Masukkan email valid dan kata sandi minimal 8 karakter.'
      );
      return;
    }

    if (mode === 'register') {
      if (passwordInput !== confirmPasswordInput) {
        setAuthError(isEn ? 'Password confirmation does not match.' : 'Konfirmasi kata sandi tidak cocok.');
        return;
      }
      if (roleInput === 'nakes' && !inviteCodeInput.trim()) {
        setAuthError(
          isEn
            ? 'A clinic invite code is required to register as a Healthcare Provider.'
            : 'Kode akses klinik wajib diisi untuk pendaftaran akun Tenaga Kesehatan.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        mode === 'register'
          ? {
              email: normalizedEmail,
              password: passwordInput,
              role: roleInput,
              displayName: nameInput.trim() || undefined,
              ...(roleInput === 'nakes' ? { inviteCode: inviteCodeInput.trim() } : {}),
            }
          : { email: normalizedEmail, password: passwordInput };

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        await loginAccount(data.email, data.role, data.displayName, data.id, {
          preserveLocalOnRegister: mode === 'register',
        });
        setAuthSuccess(
          mode === 'register'
            ? isEn
              ? 'Account created successfully! Cloud sync is now active.'
              : 'Akun berhasil dibuat! Sinkronisasi akun Anda sekarang aktif.'
            : isEn
            ? 'Successfully signed in to your account.'
            : 'Berhasil masuk ke akun Anda.'
        );
        setEmailInput('');
        setPasswordInput('');
        setConfirmPasswordInput('');
        setNameInput('');
        setInviteCodeInput('');
        setShowSwitchModal(false);
        setActiveTab('profile');
      } else if (isJson) {
        const errData = await res.json();
        setAuthError(errData.error || (isEn ? 'Authentication failed.' : 'Gagal memproses autentikasi.'));
      } else {
        setAuthError(
          isEn
            ? 'Authentication server returned an invalid response.'
            : 'Server autentikasi mengembalikan respons tidak valid.'
        );
      }
    } catch {
      setAuthError(
        isEn
          ? 'Unable to connect to the authentication server. Please verify the API is running and try again.'
          : 'Tidak dapat terhubung ke server autentikasi. Pastikan server aktif dan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAuth(authSubTab);
  };

  const handleSwitchModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAuth('login');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    if (!editName.trim() || editName.trim().length < 2) {
      setProfileSuccess(false);
      setProfileMessage(
        isEn ? 'Display name must be at least 2 characters.' : 'Nama panggilan minimal 2 karakter.'
      );
      return;
    }

    setIsSubmitting(true);
    const result = await updateProfile(editName.trim());
    setIsSubmitting(false);
    if (result.ok) {
      setProfileSuccess(true);
      setProfileMessage(isEn ? 'Profile updated successfully!' : 'Profil akun Anda berhasil diperbarui!');
      setTimeout(() => setProfileMessage(''), 3500);
    } else {
      setProfileSuccess(false);
      setProfileMessage(
        result.error || (isEn ? 'Failed to update profile.' : 'Gagal memperbarui profil.')
      );
    }
  };

  const handleSecurityPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    if (!currentPasswordInput) {
      setProfileSuccess(false);
      setProfileMessage(
        isEn ? 'Enter your current password to verify your identity.' : 'Masukkan kata sandi saat ini untuk verifikasi.'
      );
      return;
    }
    if (!securityPasswordInput || securityPasswordInput.length < 8) {
      setProfileSuccess(false);
      setProfileMessage(
        isEn ? 'New password must be at least 8 characters.' : 'Kata sandi baru minimal 8 karakter.'
      );
      return;
    }
    setIsSubmitting(true);
    const result = await updateProfile(displayName, {
      currentPassword: currentPasswordInput,
      newPassword: securityPasswordInput,
    });
    setIsSubmitting(false);
    if (result.ok) {
      setProfileSuccess(true);
      setProfileMessage(
        isEn ? 'Security password updated successfully!' : 'Kata sandi keamanan berhasil diperbarui!'
      );
      setCurrentPasswordInput('');
      setSecurityPasswordInput('');
      setTimeout(() => setProfileMessage(''), 3500);
    } else {
      setProfileSuccess(false);
      setProfileMessage(
        result.error || (isEn ? 'Failed to update password.' : 'Gagal memperbarui kata sandi.')
      );
    }
  };

  const handleManualSync = async () => {
    setAuthSuccess('');
    setAuthError('');
    const ok = await syncCloudData();
    if (ok) {
      setAuthSuccess(isEn ? 'All records synced to your encrypted cloud account.' : 'Seluruh data berhasil disinkronkan ke akun Anda.');
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
      cycleTracker: { cycleStartDate, habitLog },
      doctorChecklist,
      healthJournal,
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
      {/* 1. TOP HERO PROFILE CARD */}
      <section className="card relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-brand-teal via-[#17A7A0] to-brand-coral" />

        <div className="p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl sm:text-3xl font-black shadow-soft ring-4 ${avatarGradients[avatarTheme]} shrink-0`}
              >
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <h1 className="page-title">{displayName}</h1>

                  <span className={`badge ${isAccountActive ? 'badge-success' : 'badge-teal'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isAccountActive
                      ? authMode === 'nakes'
                        ? isEn
                          ? 'Verified Healthcare Provider'
                          : 'Tenaga Kesehatan Terverifikasi'
                        : isEn
                        ? 'Account Synced'
                        : 'Mode Akun Aktif'
                      : isEn
                      ? '100% Anonymous (Local)'
                      : 'Anonim Terenkripsi'}
                  </span>
                </div>

                <p className="text-xs text-brand-navy/70 dark:text-white/70 font-medium break-all">
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

                <p className="text-2xs font-mono text-brand-navy/55 dark:text-white/55 break-all">
                  UID: <span className="font-semibold text-brand-navy/80 dark:text-white/80">{userId}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setShowSwitchModal(true);
                }}
                className="btn btn-secondary"
              >
                <Users className="w-4 h-4 text-brand-teal" />
                <span>{isEn ? 'Switch Account' : 'Ganti Akun'}</span>
              </button>

              {isAccountActive ? (
                <>
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="btn btn-primary"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>
                      {isSyncing
                        ? isEn
                          ? 'Syncing...'
                          : 'Menyinkronkan...'
                        : isEn
                        ? 'Sync Cloud'
                        : 'Sinkronkan'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={logoutToWelcome}
                    className="btn border border-status-urgent/35 text-[#B33834] dark:text-[#FF8A85] hover:bg-status-urgent-bg dark:hover:bg-status-urgent/15"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isEn ? 'Sign Out' : 'Keluar Akun'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('auth')}
                  className="btn btn-coral"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isEn ? 'Upgrade to Cloud Account' : 'Tingkatkan ke Mode Akun'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Health Profile Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-brand-navy/10 dark:border-white/10">
            <div className="well p-3.5 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-brand-teal" />
                <span>{isEn ? 'Self Check' : 'Cek Awal'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white truncate">
                {assessmentResult ? assessmentResult.levelLabel : isEn ? 'Not Started' : 'Belum Ada'}
              </div>
            </div>

            <div className="well p-3.5 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <Activity className="w-3.5 h-3.5 text-brand-coral" />
                <span>{isEn ? 'Lab Records' : 'Hasil Lab'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white">
                {labResults.length} {isEn ? 'Tests Logged' : 'Hasil Tercatat'}
              </div>
            </div>

            <div className="well p-3.5 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <Heart className="w-3.5 h-3.5 text-brand-coral" />
                <span>{isEn ? 'Partner Plan' : 'Mode Berdua'}</span>
              </div>
              <div className="text-sm font-bold text-brand-navy dark:text-white truncate">
                {pairing && pairing.status === 'active'
                  ? pairing.partner_b_alias
                  : isEn
                  ? 'Not Paired'
                  : 'Belum Ditautkan'}
              </div>
            </div>

            <div className="well p-3.5 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-status-success" />
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
        <div
          role="status"
          className="p-4 rounded-2xl bg-status-success-bg dark:bg-status-success/15 text-[#1F7A50] dark:text-[#7BD9AC] text-xs font-bold flex items-center gap-2.5 border border-status-success/30"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{authSuccess}</span>
        </div>
      )}

      {(authError || syncError) && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-status-urgent-bg dark:bg-status-urgent/15 text-[#B33834] dark:text-[#FF8A85] text-xs font-bold flex items-center gap-2.5 border border-status-urgent/30"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError || syncError}</span>
        </div>
      )}

      {/* 2. SEGMENTED NAVIGATION TABS */}
      <div className="card flex items-center gap-1.5 p-1.5 shadow-xs overflow-x-auto thin-scroll">
        {isAccountActive ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              aria-pressed={activeTab === 'profile'}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-[10px] text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white hover:bg-brand-navy/[0.05] dark:hover:bg-white/10'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{isEn ? 'Profile & Preferences' : 'Profil & Tampilan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              aria-pressed={activeTab === 'security'}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-[10px] text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white hover:bg-brand-navy/[0.05] dark:hover:bg-white/10'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isEn ? 'Password & Security' : 'Kata Sandi & Keamanan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              aria-pressed={activeTab === 'data'}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-[10px] text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-2 ${
                activeTab === 'data'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white hover:bg-brand-navy/[0.05] dark:hover:bg-white/10'
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
              aria-pressed={activeTab === 'auth'}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-[10px] text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-2 ${
                activeTab === 'auth'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white hover:bg-brand-navy/[0.05] dark:hover:bg-white/10'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{isEn ? 'Sign In / Register' : 'Masuk / Buat Akun'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              aria-pressed={activeTab === 'data'}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-[10px] text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-2 ${
                activeTab === 'data'
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white hover:bg-brand-navy/[0.05] dark:hover:bg-white/10'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{isEn ? 'Data & Storage' : 'Kelola Data'}</span>
            </button>
          </>
        )}
      </div>

      {/* TAB A: PROFILE & PREFERENCES */}
      {activeTab === 'profile' && isAccountActive && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-6">
            <section className="card p-6 sm:p-7 space-y-5">
              <div className="border-b border-brand-navy/10 dark:border-white/10 pb-3">
                <h2 className="section-title flex items-center gap-2">
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
                  {profileSuccess ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
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
                    minLength={2}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="field w-full font-semibold"
                  />
                </div>

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
                        onClick={() => {
                          setAvatarTheme(clr);
                          writeLocalValue('sbs_avatar_theme', clr);
                        }}
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
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                    {isEn ? 'Save Profile Changes' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </section>

            <section className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-navy dark:text-white">
                    {isEn ? 'Switch Account' : 'Ganti Akun'}
                  </h3>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70">
                    {isEn
                      ? 'Sign in with a different user or healthcare provider account on this device.'
                      : 'Masuk dengan akun pengguna atau tenaga kesehatan lain di perangkat ini.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setShowSwitchModal(true);
                }}
                className="px-4 py-2 rounded-btn bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white border border-brand-teal/30 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isEn ? 'Switch Account' : 'Ganti Akun'}</span>
              </button>
            </section>
          </div>

          <div className="md:col-span-4 space-y-4">
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Current Device' : 'Perangkat Ini'}</span>
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-status-success/15 text-status-success border border-status-success/20">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  {isEn ? 'Active Now' : 'Aktif Sekarang'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 dark:border-white/10 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
                    {deviceInfo.isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-brand-navy dark:text-white">{deviceInfo.os}</h4>
                    <p className="text-2xs text-brand-navy/60 dark:text-white/60">
                      {deviceInfo.browser} • Web Client
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-navy/10 dark:border-white/10 text-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-brand-navy/70 dark:text-white/70">
                    <span>{isEn ? 'At-Rest Encryption:' : 'Enkripsi Server:'}</span>
                    <strong className="text-brand-teal font-semibold">AES-256-GCM</strong>
                  </div>
                  <div className="flex items-center justify-between text-brand-navy/70 dark:text-white/70">
                    <span>{isEn ? 'Storage:' : 'Penyimpanan:'}</span>
                    <span className="font-medium text-brand-navy dark:text-white">
                      {isEn ? 'Encrypted Cloud Sync' : 'Sinkron Terenkripsi'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-brand-navy/70 dark:text-white/70">
                    <span>{isEn ? 'Last Sync:' : 'Terakhir Sinkron:'}</span>
                    <span className="font-mono text-3xs">
                      {lastSyncTime ? lastSyncTime : isEn ? 'Synced on Sign-In' : 'Tersinkron'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-brand-coral" />
                  <span>{isEn ? 'Partner Device' : 'Perangkat Pasangan'}</span>
                </h3>
                {pairing && pairing.status === 'active' ? (
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal">
                    {isEn ? 'Connected' : 'Tertaut'}
                  </span>
                ) : (
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy/60 dark:text-white/60">
                    {isEn ? 'Not Linked' : 'Belum Tertaut'}
                  </span>
                )}
              </div>

              {pairing && pairing.status === 'active' ? (
                <div className="p-3.5 rounded-xl bg-brand-coral/[0.06] border border-brand-coral/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-brand-navy dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-brand-coral" />
                      <span>{pairing.partner_b_alias}</span>
                    </span>
                    <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-surface-dark border border-brand-coral/30 text-brand-teal tracking-wide shadow-xs">
                      {pairing.invite_code}
                    </span>
                  </div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Shared milestones synced without revealing private assessment answers.'
                      : 'Rencana bersama aktif tanpa membuka isi rekam medis pribadi Anda.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(isEn ? '/couple' : '/berdua')}
                    className="btn btn-secondary btn-sm w-full text-center"
                  >
                    {isEn ? 'Open Couple Plan →' : 'Buka Rencana Kita →'}
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/5 space-y-2.5">
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Invite your partner to plan together using a 24-hour disposable link.'
                      : 'Ajak pasangan menyusun linimasa bersama dengan kode tautan aman 24 jam.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(isEn ? '/couple' : '/berdua')}
                    className="btn btn-coral-soft w-full"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Connect Partner Phone' : 'Tautkan Ponsel Pasangan'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: PASSWORD & SECURITY */}
      {activeTab === 'security' && isAccountActive && (
        <div className="space-y-6">
          <section className="card p-6 sm:p-7 space-y-6">
            <div className="border-b border-brand-navy/10 dark:border-white/10 pb-4">
              <h2 className="section-title flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-teal" />
                <span>{isEn ? 'Security Credentials & Access Control' : 'Kredensial Keamanan & Akses Akun'}</span>
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Update your password (requires current password verification) and review encryption status.'
                  : 'Perbarui kata sandi Anda (memerlukan verifikasi kata sandi lama) dan pantau status enkripsi sesi.'}
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
                {profileSuccess ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{profileMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Change Account Password' : 'Ganti Kata Sandi Akun'}</span>
                </h3>
                <form onSubmit={handleSecurityPasswordChange} className="space-y-3">
                  <div>
                    <label htmlFor="sec-cur-pwd" className="block text-xs font-semibold mb-1 text-brand-navy dark:text-white">
                      {isEn ? 'Current Password' : 'Kata Sandi Saat Ini'}
                    </label>
                    <div className="relative">
                      <input
                        id="sec-cur-pwd"
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="field w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-2.5 text-brand-navy/40 dark:text-white/40 hover:text-brand-navy dark:hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="sec-new-pwd" className="block text-xs font-semibold mb-1 text-brand-navy dark:text-white">
                      {isEn ? 'New Password (min. 8 characters)' : 'Kata Sandi Baru (min. 8 karakter)'}
                    </label>
                    <div className="relative">
                      <input
                        id="sec-new-pwd"
                        type={showSecurityPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={securityPasswordInput}
                        onChange={(e) => setSecurityPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="field w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                        className="absolute right-3 top-2.5 text-brand-navy/40 dark:text-white/40 hover:text-brand-navy dark:hover:text-white"
                      >
                        {showSecurityPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                    {isEn ? 'Update Password' : 'Simpan Kata Sandi Baru'}
                  </button>
                </form>
              </div>

              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-teal" />
                  <span>{isEn ? 'Session Security Status' : 'Status Keamanan Sesi'}</span>
                </h3>
                <ul className="text-xs space-y-2 text-brand-navy/80 dark:text-white/80">
                  <li className="flex items-center justify-between py-1 border-b border-brand-navy/10 dark:border-white/10">
                    <span>{isEn ? 'Client Encryption:' : 'Enkripsi Perangkat:'}</span>
                    <strong className="text-brand-teal font-semibold">Web Crypto AES-GCM-256</strong>
                  </li>
                  <li className="flex items-center justify-between py-1 border-b border-brand-navy/10 dark:border-white/10">
                    <span>{isEn ? 'Server At-Rest:' : 'Enkripsi Basis Data:'}</span>
                    <strong className="text-brand-teal font-semibold">AES-256-GCM Authenticated</strong>
                  </li>
                  <li className="flex items-center justify-between py-1 border-b border-brand-navy/10 dark:border-white/10">
                    <span>{isEn ? 'Session Cookie:' : 'Cookie Sesi:'}</span>
                    <strong className="text-brand-navy dark:text-white font-semibold">Signed HttpOnly SameSite=Lax</strong>
                  </li>
                  <li className="flex items-center justify-between py-1">
                    <span>{isEn ? 'Health Payload Logging:' : 'Log Payload Kesehatan:'}</span>
                    <span className="text-status-success font-bold font-mono">0 bytes (Redacted)</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB C: AUTHENTICATION (Visible only when in Anonymous / Welcome mode) */}
      {activeTab === 'auth' && !isAccountActive && (
        <div className="space-y-6">
          <section className="card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-navy/10 dark:border-white/10 pb-5">
              <div>
                <h2 className="section-title sm:text-xl">
                  {isEn ? 'Sign In or Create an Account' : 'Masuk atau Daftarkan Akun Anda'}
                </h2>
                <p className="text-xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                  {isEn
                    ? 'Sync your self-check answers, semen test records, 72-day tracker, and couple plan securely across devices.'
                    : 'Sinkronkan hasil Cek Awal, catatan lab, pelacak siklus 72 hari, dan rencana berdua antar perangkat.'}
                </p>
              </div>

              <div className="flex p-1 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthSubTab('login');
                    setAuthError('');
                  }}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition ${
                    authSubTab === 'login'
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
                  }`}
                >
                  {isEn ? 'Sign In' : 'Masuk'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthSubTab('register');
                    setAuthError('');
                  }}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition ${
                    authSubTab === 'register'
                      ? 'bg-brand-teal-strong text-white shadow-xs'
                      : 'text-brand-navy/75 dark:text-white/75 hover:text-brand-navy'
                  }`}
                >
                  {isEn ? 'Register' : 'Daftar Baru'}
                </button>
              </div>
            </div>

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
                      placeholder={isEn ? 'name@email.com' : 'nama@email.com'}
                      className="field w-full pl-10 pr-4"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-pwd" className="block text-xs font-bold text-brand-navy dark:text-white">
                      {isEn ? 'Password' : 'Kata Sandi'}
                    </label>
                    {authSubTab === 'register' && (
                      <span className="text-3xs font-semibold text-brand-navy/60 dark:text-white/60">
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
                      minLength={8}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={isEn ? 'Minimum 8 characters' : 'Minimal 8 karakter'}
                      className="field w-full pl-10 pr-10"
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
                          minLength={8}
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="field w-full pl-10 pr-10"
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
                        placeholder={isEn ? 'Your nickname' : 'Nama panggilan Anda'}
                        className="field w-full"
                      />
                    </div>

                    <div>
                      <label htmlFor="auth-role-select" className="block text-xs font-bold mb-1 text-brand-navy dark:text-white">
                        {isEn ? 'Account Role' : 'Peran Akun'}
                      </label>
                      <select
                        id="auth-role-select"
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value as 'user' | 'nakes')}
                        className="field w-full"
                      >
                        <option value="user">
                          {isEn ? 'Patient / Partner Account' : 'Pengguna / Pasangan'}
                        </option>
                        <option value="nakes">
                          {isEn ? 'Healthcare Provider (Clinic Invite Required)' : 'Tenaga Kesehatan (Butuh Kode Klinik)'}
                        </option>
                      </select>
                    </div>

                    {roleInput === 'nakes' && (
                      <div>
                        <label htmlFor="auth-invite-code" className="block text-xs font-bold mb-1 text-brand-navy dark:text-white">
                          {isEn ? 'Clinic Invite Access Code' : 'Kode Akses Undangan Klinik'}
                        </label>
                        <input
                          id="auth-invite-code"
                          type="text"
                          required
                          value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value)}
                          placeholder={isEn ? 'Issued by your clinic admin' : 'Kode resmi dari administrator klinik'}
                          className="field w-full font-mono"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-2xs text-brand-navy/60 dark:text-white/60">
                  {isEn
                    ? 'Server-verified authentication with AES-256-GCM at-rest encryption.'
                    : 'Autentikasi terverifikasi server dengan enkripsi AES-256-GCM.'}
                </span>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  <span>
                    {authSubTab === 'register'
                      ? isEn
                        ? 'Create Protected Account'
                        : 'Daftar Akun Terlindungi'
                      : isEn
                      ? 'Sign In to Account'
                      : 'Masuk ke Akun'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* TAB D: DATA MANAGEMENT & STORAGE */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <section className="card p-6 sm:p-7 space-y-5">
            <div className="border-b border-brand-navy/10 dark:border-white/10 pb-3">
              <h2 className="section-title flex items-center gap-2">
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
              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10 space-y-3 flex flex-col justify-between">
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
                <button type="button" onClick={handleExportDataJson} className="btn btn-navy w-full">
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Download JSON Backup' : 'Unduh Cadangan JSON'}</span>
                </button>
              </div>

              <div className="p-5 rounded-card bg-surface-muted/60 dark:bg-surface-dark border border-status-urgent/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="font-bold text-sm text-status-urgent flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>{isEn ? 'Permanent Data Erase' : 'Hapus Semua Data Akun'}</span>
                  </div>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Permanently delete your profile, encrypted local IndexedDB data, and active server records. This cannot be undone.'
                      : 'Hapus permanen profil, data IndexedDB terenkripsi di perangkat ini, serta data di server. Tindakan ini tidak dapat dibatalkan.'}
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
                      className="field w-full font-bold"
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

      {/* 4. SWITCH ACCOUNT MODAL */}
      {showSwitchModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSwitchModal(false)}
        >
          <div
            className="bg-surface dark:bg-surface-dark-card w-full max-w-md rounded-2xl shadow-2xl border border-brand-navy/15 dark:border-white/10 overflow-hidden animate-rise-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-4 border-b border-brand-navy/10 dark:border-white/10 flex items-center justify-between bg-surface-muted/30 dark:bg-surface-dark">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                    {isEn ? 'Switch Account' : 'Ganti Akun'}
                  </h3>
                  <p className="text-2xs text-brand-navy/60 dark:text-white/60">
                    {isEn ? 'Sign in with another account' : 'Masuk ke akun lain pada perangkat ini'}
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

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <div className="text-3xs font-bold uppercase tracking-wider text-brand-navy/50 dark:text-white/50 mb-1.5">
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
                      <div className="text-2xs text-brand-navy/60 dark:text-white/60 font-mono truncate">
                        {userEmail || (isEn ? 'Anonymous Mode (Local)' : 'Mode Anonim (Perangkat)')}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-brand-teal text-white shrink-0 shadow-xs">
                    <Check className="w-3 h-3" />
                    <span>{isEn ? 'Active' : 'Aktif'}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-brand-navy/10 dark:border-white/10 space-y-3">
                <div className="text-xs font-semibold text-brand-navy/80 dark:text-white/80 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-brand-teal" />
                  <span>{isEn ? 'Sign in with another email' : 'Masuk dengan email lain'}</span>
                </div>

                {authError && (
                  <div className="p-2.5 rounded-lg bg-status-urgent-bg text-[#B33834] text-2xs font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleSwitchModalSubmit} className="space-y-3">
                  <div>
                    <label className="block text-2xs font-medium text-brand-navy/70 dark:text-white/70 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="nama@domain.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-medium text-brand-navy/70 dark:text-white/70 mb-1">
                      {isEn ? 'Password' : 'Kata Sandi'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="field w-full pr-9"
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
                    {isSubmitting
                      ? isEn
                        ? 'Signing in...'
                        : 'Memproses...'
                      : isEn
                      ? 'Sign In to Account'
                      : 'Masuk ke Akun'}
                  </button>
                </form>
              </div>
            </div>

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
