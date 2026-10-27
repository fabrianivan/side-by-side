import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ClipboardCheck,
  MapPin,
  Users,
  Activity,
  BookOpen,
  QrCode,
  Stethoscope,
  Settings,
  EyeOff,
  Eye,
  Lock,
  ShieldCheck,
  Sparkles,
  ChevronUp,
  ChevronDown,
  User,
  Sliders,
  Calendar,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    authMode,
    activePersona,
    displayName,
    locale,
    discreetMode,
    setDiscreetMode,
    hasPin,
    isLocked,
    lockApp,
    unlockApp,
    setupPin,
    switchDemoPersona,
  } = useApp();

  const t = getTranslations(locale);
  const navigate = useNavigate();
  const location = useLocation();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [demoPanelOpen, setDemoPanelOpen] = useState(true);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await unlockApp(pinInput);
    if (ok) {
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN tidak sesuai. Silakan coba lagi (atau hapus PIN di Pengaturan).');
    }
  };

  const handleQuickPinClick = () => {
    if (hasPin) {
      lockApp();
    } else {
      setShowPinSetupModal(true);
    }
  };

  const handleSaveQuickPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length < 4) return;
    await setupPin(newPinInput);
    setNewPinInput('');
    setShowPinSetupModal(false);
    lockApp();
  };

  const handlePersonaClick = async (persona: 'rendra' | 'sari' | 'maya') => {
    await switchDemoPersona(persona);
    if (persona === 'rendra') navigate('/');
    if (persona === 'sari') navigate('/berdua');
    if (persona === 'maya') navigate('/nakes');
  };

  // Layar Kunci PIN Penuh (ketika pengguna menekan Kunci PIN di tempat umum)
  if (isLocked) {
    return (
      <div
        className="min-h-screen bg-brand-navy text-white flex flex-col items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-lock-title"
      >
        <div className="max-w-sm w-full bg-surface text-brand-navy rounded-card p-6 shadow-soft-lg space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-btn bg-brand-teal/10 text-brand-teal flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 id="pin-lock-title" className="font-bold text-lg">
                {discreetMode ? 'Catatan Harian Terkunci' : 'Layar Terkunci Privasi'}
              </h1>
              <p className="text-xs text-brand-navy/70">
                Masukkan PIN keamanan Anda untuk melanjutkan.
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label htmlFor="unlock-pin-input" className="block text-xs font-semibold mb-1">
                PIN Keamanan (4–6 digit)
              </label>
              <input
                id="unlock-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-btn border border-brand-navy/20 text-center text-xl tracking-widest font-bold"
                autoFocus
              />
              {pinError && <p className="text-xs text-status-urgent mt-1">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="touch-target w-full py-3 px-4 rounded-btn bg-brand-teal text-white font-semibold hover:bg-brand-teal-dark transition"
            >
              Buka Kunci
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isEn = locale === 'en';

  const navItems = [
    {
      to: isEn ? '/home' : '/',
      aliases: ['/', '/home', '/beranda'],
      label: t.nav.home,
      discreetLabel: isEn ? 'Overview' : 'Ringkasan',
      icon: Home,
    },
    {
      to: isEn ? '/assessment' : '/cek-awal',
      aliases: ['/cek-awal', '/assessment', '/self-check'],
      label: t.nav.assessment,
      discreetLabel: isEn ? 'Questionnaire' : 'Kuesioner',
      icon: ClipboardCheck,
    },
    {
      to: isEn ? '/facilities' : '/layanan',
      aliases: ['/layanan', '/facilities', '/clinics'],
      label: t.nav.facilities,
      discreetLabel: isEn ? 'Directory' : 'Direktori',
      icon: MapPin,
    },
    {
      to: isEn ? '/couple' : '/berdua',
      aliases: ['/berdua', '/couple', '/our-plan'],
      label: t.nav.couple,
      discreetLabel: isEn ? 'Our Plan' : 'Rencana',
      icon: Users,
    },
    {
      to: isEn ? '/results' : '/hasil',
      aliases: ['/hasil', '/results'],
      label: t.nav.results,
      discreetLabel: isEn ? 'Records' : 'Catatan',
      icon: Activity,
    },
    {
      to: isEn ? '/semen-calculator' : '/simulator',
      aliases: ['/simulator', '/kalkulator', '/semen-calculator'],
      label: isEn ? 'Simulator' : 'Simulator Lab',
      discreetLabel: isEn ? 'Simulator' : 'Simulator',
      icon: Sliders,
    },
    {
      to: isEn ? '/cycle-tracker' : '/siklus-72-hari',
      aliases: ['/siklus-72-hari', '/cycle-tracker', '/sperm-cycle'],
      label: isEn ? '72-Day Cycle' : 'Siklus 72 Hari',
      discreetLabel: isEn ? 'Tracker' : 'Pelacak',
      icon: Calendar,
    },
    {
      to: isEn ? '/doctor-checklist' : '/checklist-dokter',
      aliases: ['/checklist-dokter', '/doctor-checklist', '/questions-doctor'],
      label: isEn ? 'Dr. Checklist' : 'Tanya Dokter',
      discreetLabel: isEn ? 'Questions' : 'Pertanyaan',
      icon: FileText,
    },
    {
      to: isEn ? '/library' : '/pustaka',
      aliases: ['/pustaka', '/library', '/education'],
      label: t.nav.library,
      discreetLabel: isEn ? 'Articles' : 'Bacaan',
      icon: BookOpen,
    },
    {
      to: isEn ? '/share' : '/bagikan-nakes',
      aliases: ['/bagikan-nakes', '/share', '/share-doctor'],
      label: t.nav.shareNakes,
      discreetLabel: isEn ? 'QR Code' : 'Kode QR',
      icon: QrCode,
    },
    {
      to: isEn ? '/provider' : '/nakes',
      aliases: ['/nakes', '/provider', '/doctor'],
      label: t.nav.nakesDashboard,
      discreetLabel: isEn ? 'Provider View' : 'Panel Mitra',
      icon: Stethoscope,
    },
    {
      to: isEn ? '/account' : '/akun',
      aliases: ['/akun', '/account', '/profile'],
      label: t.nav.account,
      discreetLabel: isEn ? 'Account' : 'Akun',
      icon: User,
    },
    {
      to: isEn ? '/settings' : '/pengaturan',
      aliases: ['/pengaturan', '/settings'],
      label: t.nav.settings,
      discreetLabel: isEn ? 'Settings' : 'Pengaturan',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-surface-muted dark:bg-surface-dark text-brand-navy dark:text-surface-muted flex flex-col pb-20 md:pb-0">
      {/* Bilah Atas (Header) */}
      <header className="sticky top-0 z-30 bg-surface dark:bg-surface-dark-card border-b border-brand-navy/10 dark:border-white/10 shadow-sm">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(isEn ? '/home' : '/')}
            className="flex items-center gap-3 text-left group"
          >
            <img
              src={discreetMode ? '/favicon-discreet.svg' : '/logo-icon.png'}
              alt={discreetMode ? 'Ikon Catatan Harian' : 'Logo Side by Side'}
              className="w-11 h-11 rounded-btn object-contain bg-white p-0.5 shadow-sm border border-brand-navy/10 shrink-0"
            />
            <div>
              <div className="font-bold text-base sm:text-lg leading-tight text-brand-navy dark:text-white flex items-center gap-2">
                {discreetMode ? t.brand.discreetName : t.brand.name}
                {authMode === 'anonymous' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-teal-light text-brand-teal">
                    <ShieldCheck className="w-3 h-3" /> Anonim Terenkripsi
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-brand-teal">
                {discreetMode ? t.brand.discreetSlogan : t.brand.slogan}
              </p>
            </div>
          </button>

          {/* Tombol Cepat Privasi: Mode Samaran & Kunci PIN */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDiscreetMode(!discreetMode)}
              aria-pressed={discreetMode}
              title="Ubah judul tab & tampilan menjadi aplikasi Catatan Harian netral saat di tempat umum"
              className={`touch-target px-3 py-2 rounded-btn text-xs font-semibold flex items-center gap-1.5 border transition ${
                discreetMode
                  ? 'bg-status-success text-white border-status-success'
                  : 'bg-surface-muted dark:bg-surface-dark text-brand-navy dark:text-white border-brand-navy/15 hover:border-brand-teal'
              }`}
            >
              {discreetMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {discreetMode ? 'Mode Samaran Aktif' : t.nav.discreetMode}
              </span>
            </button>

            <button
              type="button"
              onClick={handleQuickPinClick}
              title="Kunci layar dengan PIN"
              className="touch-target px-3 py-2 rounded-btn text-xs font-semibold flex items-center gap-1.5 bg-surface-muted dark:bg-surface-dark text-brand-navy dark:text-white border border-brand-navy/15 hover:border-brand-teal transition"
            >
              <Lock className="w-4 h-4 text-brand-teal" />
              <span className="hidden sm:inline">{t.nav.lockScreen}</span>
            </button>

            {/* Tombol Akun Saya & Status Sinkronisasi */}
            <NavLink
              to={isEn ? '/account' : '/akun'}
              title={isEn ? 'Account & Cloud Sync' : 'Kelola Akun & Sinkronisasi'}
              className={() => {
                const isActive = ['/akun', '/account', '/profile'].includes(location.pathname);
                return `touch-target px-3 py-2 rounded-btn text-xs font-semibold flex items-center gap-1.5 border transition ${
                  isActive
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : authMode === 'account' || authMode === 'nakes'
                    ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/40 hover:bg-brand-teal/25'
                    : 'bg-surface-muted dark:bg-surface-dark text-brand-navy dark:text-white border-brand-navy/15 hover:border-brand-teal'
                }`;
              }}
            >
              <User className="w-4 h-4 text-brand-teal" />
              <span className="hidden sm:inline font-bold">
                {authMode === 'account' || authMode === 'nakes'
                  ? displayName.split(' ')[0]
                  : isEn
                  ? 'Account'
                  : 'Akun'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  authMode === 'account' || authMode === 'nakes' ? 'bg-status-success' : 'bg-brand-coral'
                }`}
                title={
                  authMode === 'account' || authMode === 'nakes'
                    ? isEn ? 'Account Synced' : 'Akun Tersinkron'
                    : isEn ? 'Local Anonymous Mode' : 'Mode Anonim Lokal'
                }
              />
            </NavLink>
          </div>
        </div>

        {/* Navigasi Desktop */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:block border-t border-brand-navy/5 dark:border-white/5 bg-surface/80 dark:bg-surface-dark-card"
        >
          <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center gap-1.5 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = item.aliases.includes(location.pathname);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={() =>
                    `px-3 py-2 rounded-btn text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
                      isItemActive
                        ? 'bg-brand-teal text-white shadow-sm'
                        : 'text-brand-navy/80 dark:text-white/80 hover:bg-surface-muted dark:hover:bg-white/10'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{discreetMode ? item.discreetLabel : item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Modal Setup PIN Cepat */}
      {showPinSetupModal && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-pin-modal-title"
        >
          <div className="bg-surface dark:bg-surface-dark-card rounded-card max-w-sm w-full p-6 shadow-soft-lg space-y-4">
            <h2 id="setup-pin-modal-title" className="font-bold text-lg text-brand-navy dark:text-white">
              Buat PIN Kunci Layar (4–6 Digit)
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              PIN ini digunakan untuk mengunci tampilan aplikasi saat Anda berada di tempat umum dan membungkus kunci enkripsi perangkat Anda.
            </p>
            <form onSubmit={handleSaveQuickPin} className="space-y-4">
              <div>
                <label htmlFor="quick-new-pin" className="block text-xs font-semibold mb-1">
                  Masukkan PIN Baru
                </label>
                <input
                  id="quick-new-pin"
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={6}
                  required
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Contoh: 1234"
                  className="w-full px-4 py-2.5 rounded-btn border border-brand-navy/20 text-center text-lg tracking-widest font-bold text-brand-navy"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinSetupModal(false)}
                  className="touch-target flex-1 py-2.5 px-4 rounded-btn border border-brand-navy/20 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-brand-teal text-white text-xs font-semibold"
                >
                  Simpan & Kunci Layar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Konten Utama */}
      <main id="main-content" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        {children}
      </main>

      {/* Panel Demo Hackathon (1-Klik Pindah Peran: Rendra, Sari, dr. Maya) */}
      <aside
        aria-label="Panel Skenario Demo Hackathon"
        className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 mb-5"
      >
        <div className="bg-brand-navy text-white rounded-card p-3.5 shadow-soft border border-brand-teal/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-coral shrink-0" />
              <span className="text-xs font-bold tracking-wide">
                PANEL DEMO HACKATHON — Peran Aktif: <span className="text-brand-coral">{displayName}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDemoPanelOpen(!demoPanelOpen)}
              className="text-xs text-white/80 hover:text-white flex items-center gap-1 px-2 py-1 rounded"
            >
              {demoPanelOpen ? (
                <>
                  Sembunyikan <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Tampilkan <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {demoPanelOpen && (
            <div className="mt-3 pt-3 border-t border-white/15 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-white/80">
                  Klik persona untuk memuat skenario demo siap pakai secara instan:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePersonaClick('rendra')}
                    className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition ${
                      activePersona === 'rendra'
                        ? 'bg-brand-teal text-white ring-2 ring-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    1. Rendra (32 thn, Suami)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePersonaClick('sari')}
                    className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition ${
                      activePersona === 'sari'
                        ? 'bg-brand-coral text-white ring-2 ring-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    2. Sari (30 thn, Istri)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePersonaClick('maya')}
                    className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition ${
                      activePersona === 'maya' || location.pathname === '/nakes'
                        ? 'bg-status-success text-white ring-2 ring-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    3. dr. Maya (Nakes Puskesmas)
                  </button>
                </div>
              </div>

              {/* Alur Cerita Demo 6 Langkah Sesuai Spesifikasi #DATA DEMO */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-white/70 font-semibold mr-1">Alur Demo Pitch:</span>
                {[
                  { label: '① Cek Awal (1–2 bln)', to: '/cek-awal' },
                  { label: '② Ajak Sari (Templat)', to: '/berdua' },
                  { label: '③ Klinik JKN & Ramah Pria', to: '/layanan' },
                  { label: '④ Hasil & Tren WHO', to: '/hasil' },
                  { label: '⑤ Buat QR 1 Jam', to: '/bagikan-nakes' },
                  { label: '⑥ Dasbor dr. Maya', to: '/nakes' },
                ].map((step) => (
                  <button
                    key={step.to}
                    type="button"
                    onClick={async () => {
                      if (activePersona === 'custom') {
                        await switchDemoPersona('rendra');
                      }
                      navigate(step.to);
                    }}
                    className={`px-2.5 py-1 rounded transition font-medium ${
                      location.pathname === step.to
                        ? 'bg-brand-coral text-white font-bold'
                        : 'bg-white/5 hover:bg-white/15 text-white/85'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Footer Disclaimer Medis & Privasi (Wajib di setiap layar) */}
      <footer className="bg-surface dark:bg-surface-dark-card border-t border-brand-navy/10 dark:border-white/10 py-5 text-xs text-brand-navy/75 dark:text-white/75">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="leading-relaxed">{t.disclaimer.footer}</p>
          <div className="flex items-center gap-3 shrink-0 font-semibold text-brand-teal">
            <NavLink to="/pengaturan" className="hover:underline">
              Data & Privasi (UU PDP)
            </NavLink>
            <span>•</span>
            <NavLink to="/welcome" className="hover:underline">
              Layar Sambutan
            </NavLink>
          </div>
        </div>
      </footer>

      {/* Navigasi Bawah Mobile-First */}
      <nav
        aria-label="Navigasi Bawah"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface dark:bg-surface-dark-card border-t border-brand-navy/10 dark:border-white/10 flex items-center justify-around py-1 px-1 shadow-soft-lg"
      >
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[8], navItems[9]].map((item) => {
          const Icon = item.icon;
          const isItemActive = item.aliases.includes(location.pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={() =>
                `touch-target flex flex-col items-center justify-center px-2 py-1 rounded-btn text-[11px] font-semibold transition ${
                  isItemActive
                    ? 'text-brand-teal font-bold'
                    : 'text-brand-navy/65 dark:text-white/65'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[60px]">
                {discreetMode ? item.discreetLabel : item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
