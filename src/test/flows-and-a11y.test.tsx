import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AssessmentPage } from '../pages/AssessmentPage';
import { CoupleModePage } from '../pages/CoupleModePage';
import { ShareNakesPage } from '../pages/ShareNakesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { WelcomePage } from '../pages/WelcomePage';
import { FacilitiesPage } from '../pages/FacilitiesPage';
import { ResultsPage } from '../pages/ResultsPage';
import { NakesDashboardPage } from '../pages/NakesDashboardPage';
import { AccountPage } from '../pages/AccountPage';
import { encryptPayload, decryptPayload, wipeAllLocalData } from '../lib/crypto-storage';
import { designTokens } from '../styles/design-tokens';

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>
  );
}

describe('Uji Alur Utama, Privasi & Aksesibilitas Dasar (Side by Side)', () => {
  beforeEach(async () => {
    await wipeAllLocalData();
  });

  it('Alur 1: Cek Awal berjalan tanpa akun, menampilkan progress bar, dan menyelesaikan hasil dengan disclaimer', async () => {
    renderWithProviders(<AssessmentPage />, ['/cek-awal']);

    // Pastikan progressbar dan pertanyaan pertama muncul
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(
      screen.getByText(/Sudah berapa lama Anda dan pasangan berupaya memiliki anak/i)
    ).toBeInTheDocument();

    // Klik tombol "Isi Contoh Rendra (Selesai Instan)"
    const demoBtn = screen.getByRole('button', { name: /Isi Contoh Rendra/i });
    fireEvent.click(demoBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Sebaiknya periksa dalam 1 sampai 2 bulan')
      ).toBeInTheDocument();
    });

    // Pastikan disclaimer wajib ditampilkan
    expect(
      screen.getByText('Ini bukan diagnosis. Hanya dokter yang dapat menilai kondisi Anda.')
    ).toBeInTheDocument();
  });

  it('Alur 2: Mode Berdua menautkan kode pasangan dan menjaga privasi jawaban/lab secara default (OFF)', async () => {
    renderWithProviders(<CoupleModePage />, ['/berdua']);

    const joinBtn = screen.getByRole('button', { name: /Tautkan \/ Buat Kode 24 Jam/i });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(screen.getByText(/Layar Bersama: “Rencana Kita”/i)).toBeInTheDocument();
    });

    // Pastikan pesan privasi default menegaskan data pribadi disembunyikan
    expect(
      screen.getByText(/hanya melihat status tahapan Rencana Kita di bawah ini/i)
    ).toBeInTheDocument();

    // Pastikan templat pesan "Ajak dengan lembut" tersedia
    expect(
      screen.getByText(/Aku mau kita cek bareng, bukan karena ada yang salah/i)
    ).toBeInTheDocument();
  });

  it('Alur 3: Berbagi dengan Nakes membuat Kode QR berlaku 1 jam hanya dengan cakupan yang disetujui', async () => {
    renderWithProviders(<ShareNakesPage />, ['/bagikan-nakes']);

    const createQrBtn = screen.getByRole('button', {
      name: /Buat Kode QR & Tautan Berlaku 1 Jam/i,
    });
    fireEvent.click(createQrBtn);

    await waitFor(() => {
      expect(screen.getByText(/Kode Akses Ringkasan Pasien:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Kedaluwarsa pada:/i)).toBeInTheDocument();
  });

  it('Alur 4: Enkripsi Web Crypto AES-GCM & Tombol "Hapus semua data saya" dengan konfirmasi 2 langkah', async () => {
    const sampleSecret = { answer: '6_to_12_months', note: 'Rahasia Rendra' };
    const encrypted = await encryptPayload(sampleSecret);
    expect(encrypted).not.toContain('Rahasia Rendra');
    const decrypted = await decryptPayload<typeof sampleSecret>(encrypted);
    expect(decrypted).toEqual(sampleSecret);

    renderWithProviders(<SettingsPage />, ['/pengaturan']);

    // Tombol Hapus semua data saya harus selalu terlihat
    const deleteBtn = screen.getByRole('button', { name: /Hapus semua data saya/i });
    expect(deleteBtn).toBeInTheDocument();

    // Langkah 1 konfirmasi
    fireEvent.click(deleteBtn);
    const step1Confirm = screen.getByRole('button', {
      name: /Ya, Lanjut ke Konfirmasi Akhir \(Langkah 2\)/i,
    });
    expect(step1Confirm).toBeInTheDocument();

    // Langkah 2 konfirmasi
    fireEvent.click(step1Confirm);
    const finalConfirm = screen.getByRole('button', {
      name: /Konfirmasi Hapus Permanen Sekarang/i,
    });
    expect(finalConfirm).toBeInTheDocument();
  });

  it('Uji Aksesibilitas Dasar: Semua toggle persetujuan default OFF, label form jelas, dan token warna sesuai standar', () => {
    renderWithProviders(<WelcomePage />, ['/welcome']);

    // Dua tombol utama sesuai spesifikasi F1
    expect(screen.getByRole('button', { name: /Mulai tanpa akun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat akun/i })).toBeInTheDocument();

    // Semua 3 toggle persetujuan wajib bernilai default OFF (unchecked)
    const storeConsent = screen.getByLabelText('Persetujuan penyimpanan hasil') as HTMLInputElement;
    const partnerConsent = screen.getByLabelText(
      'Persetujuan berbagi dengan pasangan'
    ) as HTMLInputElement;
    const nakesConsent = screen.getByLabelText(
      'Persetujuan berbagi dengan tenaga kesehatan'
    ) as HTMLInputElement;

    expect(storeConsent.checked).toBe(false);
    expect(partnerConsent.checked).toBe(false);
    expect(nakesConsent.checked).toBe(false);

    // Pastikan Design Tokens resmi sesuai spesifikasi
    expect(designTokens.colors.teal).toBe('#0F8B8D');
    expect(designTokens.colors.navy).toBe('#1B2A41');
    expect(designTokens.colors.coral).toBe('#FF7A66');
    expect(designTokens.accessibility.minTouchTargetPx).toBe(44);
  });

  it('Alur 5: Direktori Layanan menampilkan Peta Ringkas, Detail Layanan, dan Daftar Pertanyaan Dokter', async () => {
    renderWithProviders(<FacilitiesPage />, ['/layanan']);

    expect(screen.getByText(/Peta Ringkas Sebaran Layanan/i)).toBeInTheDocument();

    const detailButtons = screen.getAllByRole('button', { name: /Detail/i });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Rincian Skor Kurasi “Ramah Pria”/i)).toBeInTheDocument();
    });
  });

  it('Alur 6: Tindak Lanjut Hasil menampilkan microcopy kosong lalu memuat Grafik Tren SVG dan rujukan WHO 2021', async () => {
    renderWithProviders(<ResultsPage />, ['/hasil']);

    expect(
      screen.getByText(/Belum ada hasil\. Tidak apa-apa, mulai dari mana pun Anda siap\./i)
    ).toBeInTheDocument();

    const loadDemoBtn = screen.getByRole('button', {
      name: /Lihat Contoh Hasil & Grafik Tren Rendra/i,
    });
    fireEvent.click(loadDemoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Grafik Tren Antar Pemeriksaan/i)).toBeInTheDocument();
    });
  });

  it('Alur 7: Dasbor Nakes menampilkan Templat Konseling siap salin dan Tiket Pertanyaan Anonim', () => {
    renderWithProviders(<NakesDashboardPage />, ['/nakes']);

    expect(
      screen.getByText(/Templat Konseling Siap Salin/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tiket Pertanyaan Anonim Masuk/i)
    ).toBeInTheDocument();
  });

  it('Alur 8: Halaman Akun dalam mode akun (login) menyembunyikan tab dan form masuk akun, menampilkan profil & preferensi', async () => {
    // Simulasikan pengguna yang sudah masuk dengan akun Rendra
    localStorage.setItem('sbs_auth_mode', 'account');
    localStorage.setItem('sbs_display_name', 'Rendra Pratama');
    localStorage.setItem('sbs_user_email', 'rendra@demo.id');

    renderWithProviders(<AccountPage />, ['/akun']);

    // Tab "Masuk / Buat Akun" TIDAK boleh muncul ketika pengguna sudah login
    expect(screen.queryByRole('button', { name: /Masuk \/ Buat Akun/i })).not.toBeInTheDocument();

    // Tab yang tersedia saat login adalah Profil, Kata Sandi & Keamanan, Kelola Data
    expect(screen.getByRole('button', { name: /Profil & Tampilan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kata Sandi & Keamanan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kelola Data/i })).toBeInTheDocument();

    // Data profil pengguna terlihat langsung
    expect(screen.getByText('Rendra Pratama')).toBeInTheDocument();
    expect(screen.getByText('rendra@demo.id')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keluar Akun/i })).toBeInTheDocument();
  });
});
