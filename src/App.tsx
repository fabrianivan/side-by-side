import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

function lazyNamed<T extends React.ComponentType<unknown>>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    loader().then((mod) => ({ default: mod[exportName] as T })),
  );
}

const WelcomePage = lazyNamed(() => import('./pages/WelcomePage'), 'WelcomePage');
const HomePage = lazyNamed(() => import('./pages/HomePage'), 'HomePage');
const AssessmentPage = lazyNamed(() => import('./pages/AssessmentPage'), 'AssessmentPage');
const FacilitiesPage = lazyNamed(() => import('./pages/FacilitiesPage'), 'FacilitiesPage');
const CoupleModePage = lazyNamed(() => import('./pages/CoupleModePage'), 'CoupleModePage');
const ResultsPage = lazyNamed(() => import('./pages/ResultsPage'), 'ResultsPage');
const LibraryPage = lazyNamed(() => import('./pages/LibraryPage'), 'LibraryPage');
const ShareNakesPage = lazyNamed(() => import('./pages/ShareNakesPage'), 'ShareNakesPage');
const NakesDashboardPage = lazyNamed(() => import('./pages/NakesDashboardPage'), 'NakesDashboardPage');
const AccountPage = lazyNamed(() => import('./pages/AccountPage'), 'AccountPage');
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage'), 'SettingsPage');
const SemenSimulatorPage = lazyNamed(() => import('./pages/SemenSimulatorPage'), 'SemenSimulatorPage');
const SpermatogenesisTrackerPage = lazyNamed(
  () => import('./pages/SpermatogenesisTrackerPage'),
  'SpermatogenesisTrackerPage',
);
const CarePathwayPage = lazyNamed(() => import('./pages/CarePathwayPage'), 'CarePathwayPage');
const ProgressPage = lazyNamed(() => import('./pages/ProgressPage'), 'ProgressPage');
const CompanionPage = lazyNamed(() => import('./pages/CompanionPage'), 'CompanionPage');
const DoctorChecklistPage = lazyNamed(
  () => import('./pages/DoctorChecklistPage'),
  'DoctorChecklistPage',
);

const PageLoader: React.FC = () => {
  const { locale } = useApp();
  return (
    <div
      role="status"
      aria-live="polite"
      className="card p-8 max-w-2xl mx-auto my-6 text-center space-y-3"
    >
      <div className="w-8 h-8 mx-auto rounded-full border-2 border-[var(--brand-primary)] border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-[var(--ink-700)]">
        {locale === 'en' ? 'Loading section…' : 'Memuat halaman…'}
      </p>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { locale } = useApp();
  const navigate = useNavigate();

  return (
    <ErrorBoundary locale={locale} onReset={() => navigate('/home')}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Welcome Screen (ID & EN) */}
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/sambutan" element={<WelcomePage />} />

          {/* Home (ID & EN) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/beranda" element={<HomePage />} />

          {/* Self-Assessment / Cek Awal (ID & EN) */}
          <Route path="/cek-awal" element={<AssessmentPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/self-check" element={<AssessmentPage />} />

          {/* Connected Care Pathway / Jalur Perawatan (ID & EN) */}
          <Route path="/jalur-perawatan" element={<CarePathwayPage />} />
          <Route path="/care-pathway" element={<CarePathwayPage />} />
          <Route path="/referral" element={<CarePathwayPage />} />

          {/* Private Longitudinal Progress / Progres Saya (ID & EN) */}
          <Route path="/progres" element={<ProgressPage />} />
          <Route path="/progress" element={<ProgressPage />} />

          {/* AI Companion / Asisten AI (ID & EN) */}
          <Route path="/asisten" element={<CompanionPage />} />
          <Route path="/companion" element={<CompanionPage />} />

          {/* Facilities / Direktori Layanan (ID & EN) */}
          <Route path="/layanan" element={<FacilitiesPage />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/clinics" element={<FacilitiesPage />} />

          {/* Couple Mode / Rencana Kita (ID & EN) */}
          <Route path="/berdua" element={<CoupleModePage />} />
          <Route path="/couple" element={<CoupleModePage />} />
          <Route path="/our-plan" element={<CoupleModePage />} />

          {/* Lab Results & Trend (ID & EN) */}
          <Route path="/hasil" element={<ResultsPage />} />
          <Route path="/results" element={<ResultsPage />} />

          {/* Interactive Semen Analysis Simulator (ID & EN) */}
          <Route path="/simulator" element={<SemenSimulatorPage />} />
          <Route path="/kalkulator" element={<SemenSimulatorPage />} />
          <Route path="/semen-calculator" element={<SemenSimulatorPage />} />

          {/* 72-Day Spermatogenesis Cycle & Habit Tracker (ID & EN) */}
          <Route path="/siklus-72-hari" element={<SpermatogenesisTrackerPage />} />
          <Route path="/cycle-tracker" element={<SpermatogenesisTrackerPage />} />
          <Route path="/sperm-cycle" element={<SpermatogenesisTrackerPage />} />

          {/* Smart Doctor Checklist Generator (ID & EN) */}
          <Route path="/checklist-dokter" element={<DoctorChecklistPage />} />
          <Route path="/doctor-checklist" element={<DoctorChecklistPage />} />
          <Route path="/questions-doctor" element={<DoctorChecklistPage />} />

          {/* Education Library & Ask Doctor (ID & EN) */}
          <Route path="/pustaka" element={<LibraryPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/education" element={<LibraryPage />} />

          {/* Share to Doctor 1-Hour QR (ID & EN) */}
          <Route path="/bagikan-nakes" element={<ShareNakesPage />} />
          <Route path="/share" element={<ShareNakesPage />} />
          <Route path="/share-doctor" element={<ShareNakesPage />} />

          {/* Healthcare Provider Dashboard (ID & EN) */}
          <Route path="/nakes" element={<NakesDashboardPage />} />
          <Route path="/doctor" element={<NakesDashboardPage />} />
          <Route path="/provider" element={<NakesDashboardPage />} />

          {/* Account & Profile (ID & EN) */}
          <Route path="/akun" element={<AccountPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/profile" element={<AccountPage />} />

          {/* Settings & Privacy (ID & EN) */}
          <Route path="/pengaturan" element={<SettingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
