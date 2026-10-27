import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, HeartHandshake, UserCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslations } from '../i18n';

export const WelcomePage: React.FC = () => {
  const {
    locale,
    consents,
    updateConsent,
    startAnonymousMode,
    loginAccount,
    switchDemoPersona,
  } = useApp();
  const t = getTranslations(locale);
  const navigate = useNavigate();

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'magic'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'nakes'>('user');
  const [authError, setAuthError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleStartAnonymous = async () => {
    await startAnonymousMode();
    navigate('/');
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authTab === 'magic') {
      if (!email.includes('@')) {
        setAuthError('Masukkan alamat email yang valid untuk menerima Magic Link.');
        return;
      }
      setMagicLinkSent(true);
      return;
    }

    if (!email.includes('@') || password.length < 6) {
      setAuthError('Masukkan email yang valid dan kata sandi minimal 6 karakter.');
      return;
    }

    try {
      const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      if (res.ok) {
        const data = await res.json();
        await loginAccount(data.email, data.role, data.displayName);
        navigate(data.role === 'nakes' ? '/nakes' : '/');
        return;
      }
    } catch {
      // Fallback offline untuk kemudahan demo
    }

    await loginAccount(email, role);
    navigate(role === 'nakes' ? '/nakes' : '/');
  };

  const handleStartDemoRendra = async () => {
    await switchDemoPersona('rendra');
    navigate('/');
  };

  return (
    <div className="space-y-6">
      {/* Kartu Utama Sambutan (F1) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-8 border border-brand-navy/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-navy/10 pb-5">
          <div className="flex items-center gap-4">
            <img
              src="/logo-icon.png"
              alt="Logo Side by Side"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-card object-contain bg-white p-1 shadow-sm border border-brand-navy/10 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-brand-navy dark:text-white tracking-tight">
                  Side by Side
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-teal-light text-brand-teal">
                  Better together.
                </span>
              </div>
              <p className="text-sm text-brand-navy/75 dark:text-white/75 mt-0.5">
                Kesehatan Reproduksi Pria • Privat & Tanpa Penghakiman
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartDemoRendra}
            className="touch-target px-4 py-2.5 rounded-btn bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral font-semibold text-xs flex items-center gap-2 hover:bg-brand-coral/25 transition self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            Muat Skenario Demo Rendra (Siap Pakai)
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
            “{t.brand.welcomeGreeting}”
          </h2>
          <p className="text-base text-brand-navy/85 dark:text-white/85 leading-relaxed">
            {t.brand.valueProposition}
          </p>
        </div>

        {/* 3 Pilar Keamanan & Privasi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-1.5">
            <div className="w-9 h-9 rounded-btn bg-brand-teal/15 text-brand-teal flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm">1. Privasi Dulu</h3>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              Bisa dipakai tanpa akun. Jawaban Anda dienkripsi di perangkat (IndexedDB + Web Crypto AES-GCM) dan tidak dikirim ke server.
            </p>
          </div>

          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-1.5">
            <div className="w-9 h-9 rounded-btn bg-brand-coral/15 text-brand-coral flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm">2. Berdua, Tanpa Penghakiman</h3>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              Dampingi pasangan lewat daftar langkah bersama tanpa harus membuka isi kuesioner atau hasil lab pribadi Anda.
            </p>
          </div>

          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-1.5">
            <div className="w-9 h-9 rounded-btn bg-status-success/15 text-status-success flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm">3. Batas Medis Jelas</h3>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
              Panduan edukasi berbasis pedoman WHO dan navigasi layanan ramah pria—bukan klaim diagnosis atau saran obat.
            </p>
          </div>
        </div>

        {/* Dua Tombol Utama Sesuai Spesifikasi F1 */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleStartAnonymous}
            className="touch-target flex-1 py-3.5 px-6 rounded-btn bg-brand-teal text-white font-bold text-sm shadow-soft hover:bg-brand-teal-dark transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            Mulai tanpa akun
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowAuthForm(!showAuthForm)}
            className="touch-target flex-1 py-3.5 px-6 rounded-btn bg-surface dark:bg-surface-dark border-2 border-brand-navy/20 dark:border-white/20 text-brand-navy dark:text-white font-bold text-sm hover:border-brand-teal transition flex items-center justify-center gap-2"
          >
            Buat akun
          </button>
        </div>

        {/* Formulir Buat Akun / Masuk (Mode Akun, Magic Link & Login Nakes) */}
        {showAuthForm && (
          <div className="p-5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/10 pb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setMagicLinkSent(false);
                  }}
                  className={`px-3 py-1.5 rounded-btn text-xs font-bold ${
                    authTab === 'register'
                      ? 'bg-brand-navy text-white'
                      : 'text-brand-navy/70 dark:text-white/70'
                  }`}
                >
                  Buat Akun Baru
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setMagicLinkSent(false);
                  }}
                  className={`px-3 py-1.5 rounded-btn text-xs font-bold ${
                    authTab === 'login'
                      ? 'bg-brand-navy text-white'
                      : 'text-brand-navy/70 dark:text-white/70'
                  }`}
                >
                  Masuk (Email & Sandi)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('magic');
                    setMagicLinkSent(false);
                  }}
                  className={`px-3 py-1.5 rounded-btn text-xs font-bold ${
                    authTab === 'magic'
                      ? 'bg-brand-teal text-white'
                      : 'text-brand-navy/70 dark:text-white/70'
                  }`}
                >
                  Magic Link (Tanpa Sandi)
                </button>
              </div>
              <span className="text-xs text-brand-teal font-medium">Sinkron Antar Perangkat</span>
            </div>

            {magicLinkSent ? (
              <div className="p-4 rounded-card bg-status-success-bg border border-status-success/30 space-y-3 text-xs">
                <div className="font-bold text-status-success text-sm">
                  Tautan Masuk Sekali Pakai (Magic Link) Terkirim ke {email}!
                </div>
                <p className="text-brand-navy/85 leading-relaxed">
                  Periksa kotak masuk email Anda untuk masuk tanpa kata sandi. Untuk keperluan demo, klik tombol di bawah ini untuk langsung memverifikasi tautan:
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await loginAccount(email, role);
                    navigate(role === 'nakes' ? '/nakes' : '/');
                  }}
                  className="touch-target px-4 py-2 rounded-btn bg-status-success text-white font-bold"
                >
                  Verifikasi Magic Link & Masuk Sekarang →
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccountSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-semibold mb-1">
                      Alamat Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com (atau rendra@demo.id)"
                      className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-sm text-brand-navy bg-white"
                    />
                  </div>
                  {authTab !== 'magic' && (
                    <div>
                      <label htmlFor="auth-password" className="block text-xs font-semibold mb-1">
                        Kata Sandi
                      </label>
                      <input
                        id="auth-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-sm text-brand-navy bg-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="auth-role" className="block text-xs font-semibold mb-1">
                    Peran Pengguna
                  </label>
                  <select
                    id="auth-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'nakes')}
                    className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-sm text-brand-navy bg-white"
                  >
                    <option value="user">Pengguna / Pasangan (Pria / Istri)</option>
                    <option value="nakes">Tenaga Kesehatan (Dokter / Konselor — Mode Nakes)</option>
                  </select>
                </div>

                {authError && <p className="text-xs text-status-urgent font-medium">{authError}</p>}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-brand-navy/70 dark:text-white/70">
                    Akun demo: <code>rendra@demo.id</code>, <code>sari@demo.id</code>, <code>maya@puskesmas.id</code> (Sandi: <code>DemoAman123!</code>)
                  </div>
                  <button
                    type="submit"
                    className="touch-target px-5 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold hover:bg-brand-teal-dark transition"
                  >
                    {authTab === 'magic'
                      ? 'Kirim Magic Link'
                      : authTab === 'register'
                      ? 'Daftar & Masuk'
                      : 'Masuk Sekarang'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Onboarding Privasi & Persetujuan Granular ("Data Anda", Default OFF) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 space-y-4 border border-brand-navy/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">
              Data Anda & Persetujuan Granular
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75 mt-0.5">
              Semua opsi di bawah ini bernilai <strong>NONAKTIF (OFF) secara default</strong>. Anda memegang kendali penuh kapan saja.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark">
            <div className="font-bold text-brand-teal mb-1">Data Apa yang Disimpan?</div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Hanya pilihan jawaban Cek Awal, catatan hasil lab yang Anda ketik sendiri, dan jadwal pengingat. Tidak ada pelacak iklan atau lokasi paksa.
            </p>
          </div>
          <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark">
            <div className="font-bold text-brand-teal mb-1">Untuk Apa Digunakan?</div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Memberikan panduan langkah pemeriksaan berikutnya, menampilkan grafik tren pribadi, dan membantu Anda menyusun rencana bersama pasangan.
            </p>
          </div>
          <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark">
            <div className="font-bold text-brand-teal mb-1">Siapa yang Bisa Melihat?</div>
            <p className="text-brand-navy/80 dark:text-white/80 leading-relaxed">
              Hanya Anda sendiri di perangkat ini. Pasangan atau dokter tidak dapat melihat isi hasil Anda kecuali Anda menyalakan izinnya sendiri.
            </p>
          </div>
        </div>

        <div className="divide-y divide-brand-navy/10 border-t border-brand-navy/10 pt-2">
          <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-semibold">1. Penyimpanan Riwayat Hasil & Tren</div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Izinkan aplikasi menyimpan riwayat hasil Cek Awal dan analisis semen terenkripsi agar Anda dapat melihat grafik tren dari waktu ke waktu.
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.store_results}
              onChange={(e) => updateConsent('store_results', e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded cursor-pointer shrink-0"
              aria-label="Persetujuan penyimpanan hasil"
            />
          </label>

          <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-semibold">2. Berbagi Progres Rencana dengan Pasangan</div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Izinkan sinkronisasi status tahapan di Mode Berdua (tanpa membuka jawaban kuesioner maupun angka laboratorium).
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_partner}
              onChange={(e) => updateConsent('share_partner', e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded cursor-pointer shrink-0"
              aria-label="Persetujuan berbagi dengan pasangan"
            />
          </label>

          <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-semibold">3. Berbagi Ringkasan ke Tenaga Kesehatan (QR 1 Jam)</div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Izinkan pembuatan kode QR sementara (berlaku 1 jam) saat Anda berkonsultasi dengan dokter.
              </p>
            </div>
            <input
              type="checkbox"
              checked={consents.share_nakes}
              onChange={(e) => updateConsent('share_nakes', e.target.checked)}
              className="w-5 h-5 accent-brand-teal rounded cursor-pointer shrink-0"
              aria-label="Persetujuan berbagi dengan tenaga kesehatan"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
