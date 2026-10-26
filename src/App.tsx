import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { WelcomePage } from './pages/WelcomePage';
import { HomePage } from './pages/HomePage';
import { AssessmentPage } from './pages/AssessmentPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { CoupleModePage } from './pages/CoupleModePage';
import { ResultsPage } from './pages/ResultsPage';
import { LibraryPage } from './pages/LibraryPage';
import { ShareNakesPage } from './pages/ShareNakesPage';
import { NakesDashboardPage } from './pages/NakesDashboardPage';
import { AccountPage } from './pages/AccountPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <AppProvider>
      <Layout>
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
      </Layout>
    </AppProvider>
  );
}

export default App;
