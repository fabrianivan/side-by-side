import React, { useEffect, useState } from 'react';
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
  ShieldCheck,
  Sparkles,
  ChevronUp,
  ChevronDown,
  User,
  Sliders,
  Calendar,
  FileText,
  LayoutGrid,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

interface NavItem {
  to: string;
  aliases: string[];
  label: string;
  shortLabel: string;
  discreetLabel: string;
  icon: LucideIcon;
}

interface NavGroup {
  key: string;
  title: string;
  items: NavItem[];
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    authMode,
    activePersona,
    displayName,
    locale,
    setLocale,
    switchDemoPersona,
  } = useApp();

  const t = getTranslations(locale);
  const navigate = useNavigate();
  const location = useLocation();

  const [demoPanelOpen, setDemoPanelOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const handlePersonaClick = async (persona: 'rendra' | 'sari' | 'maya') => {
    await switchDemoPersona(persona);
    if (persona === 'rendra') navigate('/');
    if (persona === 'sari') navigate('/berdua');
    if (persona === 'maya') navigate('/nakes');
  };

  const isEn = locale === 'en';
  const isSignedIn = authMode === 'account' || authMode === 'nakes';

  const navGroups: NavGroup[] = [
    {
      key: 'journey',
      title: isEn ? 'Your journey' : 'Perjalanan Anda',
      items: [
        {
          to: isEn ? '/home' : '/',
          aliases: ['/', '/home', '/beranda'],
          label: t.nav.home,
          shortLabel: t.nav.home,
          discreetLabel: isEn ? 'Overview' : 'Ringkasan',
          icon: Home,
        },
        {
          to: isEn ? '/assessment' : '/cek-awal',
          aliases: ['/cek-awal', '/assessment', '/self-check'],
          label: t.nav.assessment,
          shortLabel: t.nav.assessment,
          discreetLabel: isEn ? 'Questionnaire' : 'Kuesioner',
          icon: ClipboardCheck,
        },
        {
          to: isEn ? '/facilities' : '/layanan',
          aliases: ['/layanan', '/facilities', '/clinics'],
          label: t.nav.facilities,
          shortLabel: isEn ? 'Care' : 'Layanan',
          discreetLabel: isEn ? 'Directory' : 'Direktori',
          icon: MapPin,
        },
        {
          to: isEn ? '/couple' : '/berdua',
          aliases: ['/berdua', '/couple', '/our-plan'],
          label: t.nav.couple,
          shortLabel: isEn ? 'Our Plan' : 'Rencana',
          discreetLabel: isEn ? 'Our Plan' : 'Rencana',
          icon: Users,
        },
        {
          to: isEn ? '/results' : '/hasil',
          aliases: ['/hasil', '/results'],
          label: t.nav.results,
          shortLabel: isEn ? 'Results' : 'Hasil',
          discreetLabel: isEn ? 'Records' : 'Catatan',
          icon: Activity,
        },
      ],
    },
    {
      key: 'tools',
      title: isEn ? 'Tools & learning' : 'Alat & Edukasi',
      items: [
        {
          to: isEn ? '/semen-calculator' : '/simulator',
          aliases: ['/simulator', '/kalkulator', '/semen-calculator'],
          label: isEn ? 'Simulator' : 'Simulator Lab',
          shortLabel: 'Simulator',
          discreetLabel: isEn ? 'Simulator' : 'Simulator',
          icon: Sliders,
        },
        {
          to: isEn ? '/cycle-tracker' : '/siklus-72-hari',
          aliases: ['/siklus-72-hari', '/cycle-tracker', '/sperm-cycle'],
          label: isEn ? '72-Day Cycle' : 'Siklus 72 Hari',
          shortLabel: isEn ? '72-Day Cycle' : 'Siklus 72 Hari',
          discreetLabel: isEn ? 'Tracker' : 'Pelacak',
          icon: Calendar,
        },
        {
          to: isEn ? '/doctor-checklist' : '/checklist-dokter',
          aliases: ['/checklist-dokter', '/doctor-checklist', '/questions-doctor'],
          label: isEn ? 'Dr. Checklist' : 'Tanya Dokter',
          shortLabel: isEn ? 'Dr. Checklist' : 'Tanya Dokter',
          discreetLabel: isEn ? 'Questions' : 'Pertanyaan',
          icon: FileText,
        },
        {
          to: isEn ? '/library' : '/pustaka',
          aliases: ['/pustaka', '/library', '/education'],
          label: t.nav.library,
          shortLabel: t.nav.library,
          discreetLabel: isEn ? 'Articles' : 'Bacaan',
          icon: BookOpen,
        },
      ],
    },
    {
      key: 'sharing',
      title: isEn ? 'Share with care team' : 'Berbagi dengan Nakes',
      items: [
        {
          to: isEn ? '/share' : '/bagikan-nakes',
          aliases: ['/bagikan-nakes', '/share', '/share-doctor'],
          label: t.nav.shareNakes,
          shortLabel: t.nav.shareNakes,
          discreetLabel: isEn ? 'QR Code' : 'Kode QR',
          icon: QrCode,
        },
        {
          to: isEn ? '/provider' : '/nakes',
          aliases: ['/nakes', '/provider', '/doctor'],
          label: t.nav.nakesDashboard,
          shortLabel: t.nav.nakesDashboard,
          discreetLabel: isEn ? 'Provider View' : 'Panel Mitra',
          icon: Stethoscope,
        },
      ],
    },
    {
      key: 'account',
      title: isEn ? 'Account' : 'Akun',
      items: [
        {
          to: isEn ? '/account' : '/akun',
          aliases: ['/akun', '/account', '/profile'],
          label: t.nav.account,
          shortLabel: t.nav.account,
          discreetLabel: isEn ? 'Account' : 'Akun',
          icon: User,
        },
        {
          to: isEn ? '/settings' : '/pengaturan',
          aliases: ['/pengaturan', '/settings'],
          label: t.nav.settings,
          shortLabel: t.nav.settings,
          discreetLabel: isEn ? 'Settings' : 'Pengaturan',
          icon: Settings,
        },
      ],
    },
  ];

  const navItems = navGroups.flatMap((group) => group.items);
  const isActive = (item: NavItem) => item.aliases.includes(location.pathname);
  const activeItem = navItems.find(isActive);

  // Bilah bawah: 4 tujuan utama + "Lainnya" yang membuka seluruh menu.
  const tabItems = navItems.slice(0, 4);
  const activeIsInTabs = tabItems.some(isActive);

  // Saat berpindah halaman: tutup lembar "Lainnya" dan mulai dari bagian atas halaman baru.
  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  const languageSwitcher = (
    <div
      role="group"
      aria-label={isEn ? 'Language' : 'Bahasa'}
      className="flex items-center rounded-full border border-brand-navy/10 dark:border-white/15 bg-brand-navy/[0.04] dark:bg-white/[0.06] p-0.5 text-2xs font-bold shrink-0"
    >
      {(['id', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          title={code === 'id' ? 'Bahasa Indonesia' : 'English'}
          className={`px-2.5 py-1.5 rounded-full uppercase tracking-wide transition ${
            locale === code
              ? 'bg-surface dark:bg-white/15 text-brand-teal-dark dark:text-white shadow-xs'
              : 'text-brand-navy/60 dark:text-white/60 hover:text-brand-navy dark:hover:text-white'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );

  const brandButton = (
    <button
      type="button"
      onClick={() => navigate(isEn ? '/home' : '/')}
      className="flex items-center gap-3 text-left rounded-btn"
    >
      <img
        src="/logo-icon.png"
        alt="Logo Side by Side"
        className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-xs border border-brand-navy/10 shrink-0"
      />
      <span className="min-w-0">
        <span className="block font-extrabold text-base leading-tight tracking-tight text-brand-navy dark:text-white">
          {t.brand.name}
        </span>
        <span className="block text-2xs font-semibold text-brand-teal dark:text-[#7FDADB]">{t.brand.slogan}</span>
      </span>
    </button>
  );

  return (
    <div className="app-canvas min-h-screen text-brand-navy dark:text-surface-muted flex flex-col pb-[4.75rem] xl:pb-0 xl:pl-[17rem]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] btn btn-navy"
      >
        {isEn ? 'Skip to content' : 'Lewati ke konten'}
      </a>

      {/* Bilah Samping (Desktop ≥ 1280px; di bawah itu memakai bilah bawah agar konten tetap lega) */}
      <aside className="no-print hidden xl:flex fixed inset-y-0 left-0 z-40 w-[17rem] flex-col bg-surface dark:bg-surface-dark-card border-r border-brand-navy/[0.08] dark:border-white/[0.08]">
        <div className="px-5 pt-5 pb-4">{brandButton}</div>

        <nav aria-label="Navigasi Utama" className="flex-1 overflow-y-auto thin-scroll px-3 pb-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.key}>
              <p className="px-3 mb-1.5 text-3xs font-bold uppercase tracking-[0.1em] text-brand-navy/45 dark:text-white/45">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        aria-current={active ? 'page' : undefined}
                        className={() => `nav-link ${active ? 'nav-link-active' : ''}`}
                      >
                        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-brand-navy/[0.08] dark:border-white/[0.08]">
          <div className="flex items-start gap-2.5 rounded-2xl bg-brand-teal-soft dark:bg-brand-teal/10 px-3 py-2.5">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-brand-teal dark:text-[#7FDADB]" />
            <p className="text-2xs leading-snug text-brand-navy/75 dark:text-white/75">
              {isSignedIn
                ? isEn
                  ? 'Signed in. Your data syncs to your account.'
                  : 'Masuk akun. Data tersinkron ke akun Anda.'
                : isEn
                ? 'Private by default. Your answers stay on this device.'
                : 'Privat sejak awal. Jawaban Anda tetap di perangkat ini.'}
            </p>
          </div>
        </div>
      </aside>

      {/* Bilah Atas (Header) */}
      <header className="no-print sticky top-0 z-30 glass border-b border-brand-navy/[0.08] dark:border-white/[0.08]">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 xl:px-8 h-16 flex items-center justify-between gap-3">
          <div className="xl:hidden min-w-0">{brandButton}</div>

          {/* Penanda halaman aktif (desktop) */}
          <div className="hidden xl:flex items-center gap-2 min-w-0 text-xs font-semibold text-brand-navy/60 dark:text-white/60">
            <span>{t.brand.name}</span>
            <span aria-hidden="true" className="text-brand-navy/30 dark:text-white/30">
              /
            </span>
            <span className="truncate text-brand-navy dark:text-white">{activeItem?.label ?? t.nav.home}</span>
            {authMode === 'anonymous' && (
              <span className="badge badge-teal ml-2">
                <ShieldCheck className="w-3 h-3" /> Anonim Terenkripsi
              </span>
            )}
          </div>

          {/* Tombol Cepat: Bahasa & Akun */}
          <div className="flex items-center gap-2 shrink-0">
            {languageSwitcher}

            {/* Tombol Akun Saya & Status Sinkronisasi */}
            <NavLink
              to={isEn ? '/account' : '/akun'}
              title={isEn ? 'Account & Cloud Sync' : 'Kelola Akun & Sinkronisasi'}
              aria-label={isEn ? 'Account & Cloud Sync' : 'Kelola Akun & Sinkronisasi'}
              className={() => {
                const active = ['/akun', '/account', '/profile'].includes(location.pathname);
                return `relative flex items-center gap-2 rounded-full border pl-1 pr-1 sm:pr-3 py-1 text-xs font-bold transition ${
                  active
                    ? 'border-brand-teal bg-brand-teal-light text-brand-teal-dark dark:bg-brand-teal/20 dark:text-white'
                    : 'border-brand-navy/10 dark:border-white/15 bg-surface dark:bg-white/[0.06] text-brand-navy dark:text-white hover:border-brand-teal'
                }`;
              }}
            >
              <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-brand-teal-light dark:bg-brand-teal/25 text-brand-teal-dark dark:text-[#7FDADB]">
                <User className="w-[18px] h-[18px]" />
                <span
                  className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-surface dark:border-surface-dark ${
                    isSignedIn ? 'bg-status-success' : 'bg-brand-coral'
                  }`}
                  title={
                    isSignedIn
                      ? isEn
                        ? 'Account Synced'
                        : 'Akun Tersinkron'
                      : isEn
                      ? 'Local Anonymous Mode'
                      : 'Mode Anonim Lokal'
                  }
                />
              </span>
              <span className="hidden sm:inline max-w-[9rem] truncate">
                {isSignedIn ? displayName.split(' ')[0] : isEn ? 'Account' : 'Akun'}
              </span>
            </NavLink>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 xl:px-8 py-6 sm:py-8">
        <div key={location.pathname} className="animate-rise-in">
          {children}
        </div>
      </main>

      {/* Panel Demo Hackathon (1-Klik Pindah Peran: Rendra, Sari, dr. Maya) */}
      <aside
        aria-label="Panel Skenario Demo Hackathon"
        className="no-print max-w-6xl w-full mx-auto px-4 sm:px-6 xl:px-8 mb-6"
      >
        <div className="relative overflow-hidden bg-brand-navy-deep text-white rounded-card shadow-soft-lg ring-1 ring-white/10">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-teal via-[#17A7A0] to-brand-coral"
          />
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 shrink-0">
                <Sparkles className="w-4 h-4 text-brand-coral" />
              </span>
              <span className="text-2xs sm:text-xs font-bold tracking-wide leading-snug">
                PANEL DEMO HACKATHON — Peran Aktif: <span className="text-brand-coral">{displayName}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDemoPanelOpen(!demoPanelOpen)}
              aria-expanded={demoPanelOpen}
              className="touch-target shrink-0 text-2xs font-semibold text-white/75 hover:text-white hover:bg-white/10 flex items-center gap-1 px-2.5 rounded-btn transition"
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
            <div className="px-4 sm:px-5 pb-5 space-y-4">
              <div className="pt-4 border-t border-white/10 space-y-2.5">
                <p className="text-2xs text-white/70">
                  Klik persona untuk memuat skenario demo siap pakai secara instan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: 'rendra',
                        label: '1. Rendra (32 thn, Suami)',
                        active: activePersona === 'rendra',
                        activeClass: 'bg-brand-teal text-white ring-2 ring-white/80',
                      },
                      {
                        key: 'sari',
                        label: '2. Sari (30 thn, Istri)',
                        active: activePersona === 'sari',
                        activeClass: 'bg-brand-coral text-brand-navy-deep ring-2 ring-white/80',
                      },
                      {
                        key: 'maya',
                        label: '3. dr. Maya (Nakes Puskesmas)',
                        active: activePersona === 'maya' || location.pathname === '/nakes',
                        activeClass: 'bg-status-success text-white ring-2 ring-white/80',
                      },
                    ] as const
                  ).map((persona) => (
                    <button
                      key={persona.key}
                      type="button"
                      onClick={() => handlePersonaClick(persona.key)}
                      aria-pressed={persona.active}
                      className={`touch-target px-3.5 py-2 rounded-btn text-xs font-bold text-left transition ${
                        persona.active ? persona.activeClass : 'bg-white/[0.08] hover:bg-white/[0.16] text-white'
                      }`}
                    >
                      {persona.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alur Cerita Demo 6 Langkah Sesuai Spesifikasi #DATA DEMO */}
              <div className="pt-4 border-t border-white/10 space-y-2.5">
                <p className="text-2xs text-white/70 font-semibold">Alur Demo Pitch:</p>
                <div className="flex flex-wrap items-center gap-1.5">
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
                      className={`px-3 py-2 rounded-full text-2xs transition ${
                        location.pathname === step.to
                          ? 'bg-brand-coral text-brand-navy-deep font-bold'
                          : 'bg-white/[0.06] hover:bg-white/[0.14] text-white/85 font-medium'
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Footer Disclaimer Medis & Privasi (Wajib di setiap layar) */}
      <footer className="border-t border-brand-navy/[0.08] dark:border-white/[0.08] py-6 text-2xs text-brand-navy/65 dark:text-white/65">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 xl:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="leading-relaxed max-w-3xl">{t.disclaimer.footer}</p>
          <div className="no-print flex items-center gap-3 shrink-0 font-bold text-brand-teal dark:text-[#7FDADB]">
            <NavLink to="/pengaturan" className="hover:underline underline-offset-4">
              Kelola Data
            </NavLink>
            <span aria-hidden="true">•</span>
            <NavLink to="/welcome" className="hover:underline underline-offset-4">
              Layar Sambutan
            </NavLink>
          </div>
        </div>
      </footer>

      {/* Navigasi Bawah Mobile-First */}
      <nav
        aria-label="Navigasi Bawah"
        className="no-print xl:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-brand-navy/[0.08] dark:border-white/[0.08] pb-safe"
      >
        <div className="max-w-xl mx-auto grid grid-cols-5 px-1.5 pt-1.5">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={() =>
                  `touch-target flex flex-col items-center justify-center gap-1 rounded-btn px-1 py-1 text-3xs transition ${
                    active
                      ? 'text-brand-teal-dark dark:text-[#7FDADB] font-bold'
                      : 'text-brand-navy/60 dark:text-white/60 font-semibold'
                  }`
                }
              >
                <span
                  className={`flex items-center justify-center w-12 h-7 rounded-full transition ${
                    active ? 'bg-brand-teal-light dark:bg-brand-teal/25' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="truncate max-w-full">{item.shortLabel}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`touch-target flex flex-col items-center justify-center gap-1 rounded-btn px-1 py-1 text-3xs transition ${
              !activeIsInTabs || moreOpen
                ? 'text-brand-teal-dark dark:text-[#7FDADB] font-bold'
                : 'text-brand-navy/60 dark:text-white/60 font-semibold'
            }`}
          >
            <span
              className={`flex items-center justify-center w-12 h-7 rounded-full transition ${
                !activeIsInTabs || moreOpen ? 'bg-brand-teal-light dark:bg-brand-teal/25' : ''
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </span>
            <span className="truncate max-w-full">{isEn ? 'More' : 'Lainnya'}</span>
          </button>
        </div>
      </nav>

      {/* Lembar "Lainnya": seluruh menu untuk layar kecil */}
      {moreOpen && (
        <div className="no-print xl:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={isEn ? 'All menus' : 'Semua menu'}>
          <button
            type="button"
            aria-label={isEn ? 'Close menu' : 'Tutup menu'}
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 w-full h-full bg-brand-navy-deep/55 animate-fade-in cursor-default"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto thin-scroll rounded-t-[28px] bg-surface dark:bg-surface-dark-card shadow-sheet animate-sheet-up pb-safe">
            <div className="sticky top-0 z-10 bg-surface dark:bg-surface-dark-card px-5 pt-3 pb-3">
              <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-brand-navy/15 dark:bg-white/20" />
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">{isEn ? 'All menus' : 'Semua Menu'}</h2>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label={isEn ? 'Close menu' : 'Tutup menu'}
                  className="touch-target flex items-center justify-center rounded-full bg-brand-navy/[0.06] dark:bg-white/10 text-brand-navy dark:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-w-xl mx-auto px-5 pb-5 space-y-5">
              {navGroups.map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-3xs font-bold uppercase tracking-[0.1em] text-brand-navy/50 dark:text-white/50">
                    {group.title}
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item);
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            onClick={() => setMoreOpen(false)}
                            aria-current={active ? 'page' : undefined}
                            className={() =>
                              `flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                                active
                                  ? 'border-brand-teal bg-brand-teal-light text-brand-teal-dark dark:bg-brand-teal/20 dark:text-[#7FDADB]'
                                  : 'border-brand-navy/[0.08] dark:border-white/10 bg-surface-muted dark:bg-surface-dark text-brand-navy dark:text-white'
                              }`
                            }
                          >
                            <span
                              className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                                active
                                  ? 'bg-brand-teal text-white'
                                  : 'bg-surface dark:bg-white/10 text-brand-teal dark:text-[#7FDADB] shadow-xs'
                              }`}
                            >
                              <Icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className="leading-tight">{item.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
