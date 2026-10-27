import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  Clock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Copy,
  Check,
  Printer,
  BellPlus,
  Compass,
  Info,
  Building2,
  Map as MapIcon,
  CalendarPlus,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { seedFacilities, type SeedFacility } from '../config/seed-facilities';
import { templatesConfig } from '../config/schemas';
import { useApp } from '../context/AppContext';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const FacilitiesPage: React.FC = () => {
  const { assessmentResult, addReminder, updatePlanStep } = useApp();
  const navigate = useNavigate();

  // Filter & Sort State
  const [selectedCity, setSelectedCity] = useState<string>('Semua');
  const [onlyJkn, setOnlyJkn] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('Semua');
  const [maxBudget, setMaxBudget] = useState<number>(1500000);
  const [sortBy, setSortBy] = useState<'friendliness' | 'price' | 'distance'>('friendliness');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('');
  const [showCompactMap, setShowCompactMap] = useState<boolean>(true);

  // Detail Layanan Modal
  const [detailTarget, setDetailTarget] = useState<SeedFacility | null>(null);

  // Modal Daftar Pertanyaan untuk Dokter
  const [showQuestionsModal, setShowQuestionsModal] = useState<boolean>(false);
  const [copiedQuestions, setCopiedQuestions] = useState<boolean>(false);

  // Pertanyaan yang dipersonalisasi dari hasil Cek Awal pengguna
  const personalizedQuestions = useMemo(() => {
    if (!assessmentResult || assessmentResult.factors.length === 0) return [];
    return assessmentResult.factors.map(
      (f) =>
        `Terkait faktor "${f.factorTitle}" yang saya alami, langkah pemeriksaan atau perbaikan gaya hidup apa yang Dokter sarankan?`
    );
  }, [assessmentResult]);

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(() =>
    templatesConfig.doctorQuestionsList.flatMap((cat) => cat.questions)
  );

  // Modal Pengingat Pemeriksaan
  const [reminderTarget, setReminderTarget] = useState<SeedFacility | null>(null);
  const [remindDate, setRemindDate] = useState<string>(() =>
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [reminderSavedBanner, setReminderSavedBanner] = useState<string>('');

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Lokasi otomatis tidak didukung di perangkat ini. Silakan pilih kota secara manual.');
      return;
    }
    setGeoStatus('Mencari lokasi...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy('distance');
        setGeoStatus('Mengurutkan berdasarkan jarak terdekat dari lokasi Anda.');
      },
      () => {
        setGeoStatus('Izin lokasi tidak diberikan. Anda tetap dapat memilih kota secara manual.');
      }
    );
  };

  const filteredFacilities = useMemo(() => {
    return seedFacilities
      .filter((f) => {
        if (selectedCity !== 'Semua' && f.city !== selectedCity) return false;
        if (onlyJkn && !f.accepts_jkn) return false;
        if (selectedService !== 'Semua' && !f.services.includes(selectedService as 'Andrologi')) {
          return false;
        }
        if (f.price_min > maxBudget) return false;
        return true;
      })
      .map((f) => ({
        ...f,
        distanceKm: userCoords
          ? calculateDistanceKm(userCoords.lat, userCoords.lng, f.latitude, f.longitude)
          : null,
      }))
      .sort((a, b) => {
        if (sortBy === 'price') return a.price_min - b.price_min;
        if (sortBy === 'distance' && a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return b.friendliness_score - a.friendliness_score;
      });
  }, [selectedCity, onlyJkn, selectedService, maxBudget, sortBy, userCoords]);

  const toggleDoctorQuestion = (q: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((item) => item !== q) : [...prev, q]
    );
  };

  const handleCopyDoctorQuestions = async () => {
    const allChosen = [...personalizedQuestions, ...selectedQuestions];
    const text = [
      'DAFTAR PERTANYAAN UNTUK DOKTER — SIDE BY SIDE',
      '------------------------------------------------',
      ...allChosen.map((q, idx) => `${idx + 1}. ${q}`),
      '',
      'Catatan: Dibuat dari aplikasi Side by Side (Panduan Kesehatan Reproduksi Pria).',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    setCopiedQuestions(true);
    setTimeout(() => setCopiedQuestions(false), 2500);
  };

  const handleDownloadQuestionsPdf = () => {
    window.print();
  };

  const handleDownloadIcs = (fac: SeedFacility, dateIso: string) => {
    const dt = new Date(dateIso);
    const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDt = new Date(dt.getTime() + 60 * 60 * 1000);
    const endStr = endDt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Side by Side//Better Together//ID',
      'BEGIN:VEVENT',
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Pemeriksaan Kesehatan — ${fac.name}`,
      `LOCATION:${fac.address}`,
      'DESCRIPTION:Persiapan masa pantang (abstinensia) 2-7 hari sebelum tes analisis semen. Bawa daftar pertanyaan dokter dari Side by Side.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jadwal-periksa-${fac.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTarget) return;
    await addReminder({
      type: 'semen_analysis',
      title: `Jadwal Pemeriksaan & Persiapan Masa Pantang (2–7 Hari)`,
      facilityName: reminderTarget.name,
      remindAt: remindDate,
      notes: `Lokasi: ${reminderTarget.address}. Ingat masa pantang 2–7 hari sebelum pengambilan sampel.`,
    });
    await updatePlanStep('pilih_layanan', 'a', 'done');
    await updatePlanStep('jadwalkan', 'a', 'in_progress');
    setReminderSavedBanner(`Pengingat untuk ${reminderTarget.name} berhasil dijadwalkan!`);
    setReminderTarget(null);
    setTimeout(() => setReminderSavedBanner(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tombol Buat Daftar Pertanyaan Dokter */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
            Navigasi Pemeriksaan & Direktori Layanan Ramah Pria
          </h1>
          <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75">
            Pahami alur pemeriksaan langkah demi langkah, jelajahi peta ringkas, dan pilih fasilitas yang nyaman.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/checklist-dokter')}
            className="touch-target px-4 py-3 rounded-btn bg-brand-coral text-white font-bold text-xs shadow-soft hover:bg-brand-coral-dark transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Checklist Pertanyaan Dokter (Lengkap)
          </button>
        </div>
      </section>

      {reminderSavedBanner && (
        <div
          role="status"
          className="p-4 rounded-card bg-status-success-bg text-status-success border border-status-success/30 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reminderSavedBanner}</span>
        </div>
      )}

      {/* Panduan Langkah Demi Langkah (5 Tahap Analisis Semen) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-brand-navy dark:text-white">
          Panduan Langkah demi Langkah: Pemeriksaan Analisis Semen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {templatesConfig.examinationGuide.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/5 flex flex-col justify-between space-y-2"
            >
              <div className="space-y-1.5">
                <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-teal text-white">
                  Langkah {step.stepNumber}
                </span>
                <h3 className="font-bold text-sm text-brand-navy dark:text-white leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs font-semibold text-brand-teal leading-relaxed">
                  {step.summary}
                </p>
                <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
                  {step.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Informasi Estimasi Biaya & Cakupan JKN */}
        <div className="p-4 rounded-card bg-brand-teal-light/50 dark:bg-brand-teal/15 border border-brand-teal/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-brand-navy dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-teal" />
              Estimasi Biaya & Cakupan JKN / Asuransi
            </h3>
            <span className="text-xs font-bold text-brand-teal">
              {templatesConfig.examinationGuide.costAndInsuranceInfo.rangeSummary}
            </span>
          </div>
          <p className="text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed">
            {templatesConfig.examinationGuide.costAndInsuranceInfo.jknSummary}
          </p>
          <p className="text-[11px] italic text-brand-navy/70 dark:text-white/70">
            Catatan: {templatesConfig.examinationGuide.costAndInsuranceInfo.disclaimer}
          </p>
        </div>
      </section>

      {/* Filter, Peta Ringkas Interaktif & Direktori Layanan */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">
              Direktori Layanan Terkurasi ({filteredFacilities.length} Fasilitas)
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Skor “Ramah Pria” diisi melalui kurasi privasi ruang sampel, keramahan konseling, dan kejelasan alur (bukan ulasan bebas).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCompactMap(!showCompactMap)}
              className="touch-target px-3.5 py-2 rounded-btn bg-brand-teal/15 text-brand-teal text-xs font-bold flex items-center gap-1.5 hover:bg-brand-teal/25 transition"
            >
              <MapIcon className="w-4 h-4" />
              <span>{showCompactMap ? 'Sembunyikan Peta Ringkas' : 'Tampilkan Peta Ringkas'}</span>
            </button>

            <button
              type="button"
              onClick={handleRequestGeolocation}
              className="touch-target px-3.5 py-2 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/15 text-xs font-semibold flex items-center gap-1.5 hover:border-brand-teal transition"
            >
              <Compass className="w-4 h-4 text-brand-teal" />
              Urutkan Jarak Terdekat
            </button>
          </div>
        </div>

        {geoStatus && (
          <p className="text-xs text-brand-teal font-medium bg-brand-teal-light/40 px-3 py-2 rounded-btn">
            {geoStatus}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Filter Kota */}
          <div>
            <label htmlFor="filter-city" className="block text-xs font-semibold mb-1">
              Pilih Kota
            </label>
            <select
              id="filter-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
            >
              <option value="Semua">Semua Kota (Jakarta, Bandung, Surabaya)</option>
              <option value="Jakarta">Jakarta (6 Lokasi)</option>
              <option value="Bandung">Bandung (5 Lokasi)</option>
              <option value="Surabaya">Surabaya (5 Lokasi)</option>
            </select>
          </div>

          {/* Filter Layanan */}
          <div>
            <label htmlFor="filter-service" className="block text-xs font-semibold mb-1">
              Jenis Layanan
            </label>
            <select
              id="filter-service"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
            >
              <option value="Semua">Semua Layanan</option>
              <option value="Andrologi">Spesialis Andrologi (Sp.And)</option>
              <option value="Urologi">Spesialis Urologi (Sp.U)</option>
              <option value="Laboratorium">Laboratorium Analisis Semen</option>
            </select>
          </div>

          {/* Filter Biaya Maksimal */}
          <div>
            <label htmlFor="filter-budget" className="block text-xs font-semibold mb-1">
              Rentang Biaya Awal Maks: Rp {maxBudget.toLocaleString('id-ID')}
            </label>
            <input
              id="filter-budget"
              type="range"
              min={100000}
              max={1500000}
              step={50000}
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="w-full accent-brand-teal mt-2"
            />
          </div>

          {/* Sortir */}
          <div>
            <label htmlFor="sort-by" className="block text-xs font-semibold mb-1">
              Urutkan Berdasarkan
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'friendliness' | 'price' | 'distance')}
              className="w-full px-3 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
            >
              <option value="friendliness">Skor Ramah Pria Tertinggi</option>
              <option value="price">Estimasi Biaya Terendah</option>
              <option value="distance">Jarak Terdekat</option>
            </select>
          </div>

          {/* Toggle Menerima JKN */}
          <div className="flex items-end">
            <label className="touch-target w-full px-3 py-2 rounded-btn border border-brand-navy/20 bg-surface-muted dark:bg-surface-dark flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={onlyJkn}
                onChange={(e) => setOnlyJkn(e.target.checked)}
                className="w-4 h-4 accent-brand-teal rounded"
              />
              <span>Hanya yang Menerima JKN</span>
            </label>
          </div>
        </div>

        {/* Peta Ringkas Visual Interaktif (Sesuai Arsitektur Layar #5) */}
        {showCompactMap && (
          <div className="p-4 rounded-card bg-brand-navy text-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <MapPin className="w-4 h-4 text-brand-coral" />
                <span>
                  Peta Ringkas Sebaran Layanan ({selectedCity === 'Semua' ? 'Jakarta • Bandung • Surabaya' : selectedCity})
                </span>
              </div>
              <span className="text-[11px] text-white/75">
                Klik titik fasilitas untuk melihat Detail Layanan & Skor Ramah Pria
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['Jakarta', 'Bandung', 'Surabaya'] as const)
                .filter((c) => selectedCity === 'Semua' || selectedCity === c)
                .map((cityGroup) => {
                  const cityFacs = filteredFacilities.filter((f) => f.city === cityGroup);
                  return (
                    <div
                      key={cityGroup}
                      className="p-3 rounded-btn bg-white/10 border border-white/15 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-brand-coral">{cityGroup}</span>
                        <span className="text-[11px] text-white/80">{cityFacs.length} lokasi</span>
                      </div>
                      <div className="space-y-1.5">
                        {cityFacs.map((cf) => (
                          <button
                            key={cf.id}
                            type="button"
                            onClick={() => setDetailTarget(cf)}
                            className="w-full text-left px-2.5 py-1.5 rounded bg-white/10 hover:bg-brand-teal transition flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="truncate font-medium">📍 {cf.name}</span>
                            <span className="shrink-0 font-bold text-brand-coral bg-brand-navy/60 px-1.5 py-0.5 rounded">
                              ★ {cf.friendliness_score.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Daftar Kartu Fasilitas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-2">
          {filteredFacilities.map((fac) => (
            <article
              key={fac.id}
              className="p-5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-navy text-white">
                        {fac.type}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-teal/15 text-brand-teal">
                        {fac.city}
                      </span>
                      {fac.accepts_jkn ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-status-success-bg text-status-success">
                          Menerima JKN
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-brand-navy/10 text-brand-navy/70 dark:text-white/70">
                          Layanan Mandiri/Umum
                        </span>
                      )}
                      {fac.distanceKm !== null && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-coral/20 text-brand-coral-dark">
                          ~{fac.distanceKm} km
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-brand-navy dark:text-white leading-snug">
                      {fac.name}
                    </h3>
                  </div>

                  {/* Skor Kurasi Ramah Pria */}
                  <div
                    title="Skor kurasi keramahan & privasi layanan bagi pria"
                    className="px-2.5 py-1.5 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-teal/30 text-center shrink-0"
                  >
                    <div className="flex items-center gap-1 text-brand-teal font-bold text-sm">
                      <Star className="w-4 h-4 fill-brand-teal" />
                      <span>{fac.friendliness_score.toFixed(1)}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-brand-navy/70 dark:text-white/70">
                      Ramah Pria
                    </div>
                  </div>
                </div>

                <p className="text-xs text-brand-navy/75 dark:text-white/75 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                  <span>{fac.address}</span>
                </p>

                <p className="text-xs text-brand-navy/75 dark:text-white/75 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-teal shrink-0" />
                  <span>{fac.hours}</span>
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  {fac.services.map((srv) => (
                    <span
                      key={srv}
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface dark:bg-surface-dark-card border border-brand-navy/10"
                    >
                      {srv}
                    </span>
                  ))}
                  <span className="text-xs font-bold text-brand-teal ml-auto">
                    Rp {fac.price_min.toLocaleString('id-ID')} – Rp{' '}
                    {fac.price_max.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-3 rounded-btn bg-surface dark:bg-surface-dark-card text-xs text-brand-navy/85 dark:text-white/85 border-l-4 border-brand-teal">
                  <strong>Catatan Kurasi Ramah Pria:</strong> {fac.friendliness_notes}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-navy/10">
                <button
                  type="button"
                  onClick={() => setDetailTarget(fac)}
                  className="touch-target py-2.5 px-3 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-navy/20 text-xs font-bold flex items-center gap-1.5 hover:border-brand-teal transition"
                >
                  <Eye className="w-4 h-4 text-brand-teal" />
                  <span>Detail</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReminderTarget(fac)}
                  className="touch-target flex-1 py-2.5 px-3 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand-teal-dark transition"
                >
                  <BellPlus className="w-4 h-4" />
                  Ingatkan saya
                </button>

                <a
                  href={fac.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target py-2.5 px-3 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-navy/20 text-xs font-semibold flex items-center gap-1 hover:border-brand-teal transition"
                >
                  <Building2 className="w-4 h-4 text-brand-teal" />
                  <span>Peta</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Modal Detail Layanan Lengkap (Arsitektur Layar #5: Detail Layanan) */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy/60 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="facility-detail-title"
        >
          <div className="bg-surface dark:bg-surface-dark-card rounded-card max-w-xl w-full p-6 shadow-soft-lg space-y-4 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-brand-navy/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-brand-navy text-white">
                    {detailTarget.type} • {detailTarget.city}
                  </span>
                  {detailTarget.accepts_jkn && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-status-success-bg text-status-success">
                      Menerima JKN / BPJS
                    </span>
                  )}
                </div>
                <h2 id="facility-detail-title" className="font-bold text-lg text-brand-navy dark:text-white">
                  {detailTarget.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-btn bg-surface-muted"
              >
                Tutup
              </button>
            </div>

            {/* Rincian Indikator Kurasi Ramah Pria */}
            <div className="p-4 rounded-card bg-brand-teal-light/50 dark:bg-brand-teal/15 border border-brand-teal/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Rincian Skor Kurasi “Ramah Pria”
                </span>
                <span className="text-sm font-bold text-brand-teal">
                  ★ {detailTarget.friendliness_score.toFixed(1)} / 5.0
                </span>
              </div>
              <p className="text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed">
                {detailTarget.friendliness_notes}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded bg-surface dark:bg-surface-dark text-center">
                  <div className="font-bold text-brand-teal">Privasi Ruang Sampel</div>
                  <div>Tertutup & Terkunci</div>
                </div>
                <div className="p-2 rounded bg-surface dark:bg-surface-dark text-center">
                  <div className="font-bold text-brand-teal">Alur Pendaftaran</div>
                  <div>Diskret & Cepat</div>
                </div>
                <div className="p-2 rounded bg-surface dark:bg-surface-dark text-center">
                  <div className="font-bold text-brand-teal">Sikap Konseling</div>
                  <div>Tanpa Penghakiman</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <strong>Alamat Lengkap:</strong> {detailTarget.address}
              </div>
              <div>
                <strong>Jam Operasional:</strong> {detailTarget.hours}
              </div>
              <div>
                <strong>Layanan Tersedia:</strong> {detailTarget.services.join(', ')}
              </div>
              <div>
                <strong>Estimasi Rentang Biaya:</strong> Rp{' '}
                {detailTarget.price_min.toLocaleString('id-ID')} – Rp{' '}
                {detailTarget.price_max.toLocaleString('id-ID')}{' '}
                <span className="italic opacity-75">(dapat berbeda per fasilitas)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark text-xs space-y-1">
              <div className="font-bold text-brand-navy dark:text-white">
                Checklist Persiapan Sebelum Kunjungan:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-brand-navy/80 dark:text-white/80">
                <li>Lakukan masa pantang (abstinensia) selama 2 hingga 7 hari bila berencana tes analisis semen.</li>
                <li>Bawa KTP dan kartu JKN/asuransi (beserta surat rujukan FKTP bila menggunakan jalur JKN).</li>
                <li>Siapkan daftar pertanyaan dokter dari tombol “Buat daftar pertanyaan untuk dokter”.</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-navy/10">
              <button
                type="button"
                onClick={() => {
                  const target = detailTarget;
                  setDetailTarget(null);
                  setReminderTarget(target);
                }}
                className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <BellPlus className="w-4 h-4" />
                Jadwalkan Pengingat di Sini
              </button>

              <button
                type="button"
                onClick={() => handleDownloadIcs(detailTarget, remindDate)}
                className="touch-target py-2.5 px-4 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4" />
                Simpan ke Kalender (.ics)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pembuat Daftar Pertanyaan untuk Dokter */}
      {showQuestionsModal && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy/60 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doctor-questions-title"
        >
          <div className="bg-surface dark:bg-surface-dark-card rounded-card max-w-2xl w-full p-6 shadow-soft-lg space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
              <div>
                <h2 id="doctor-questions-title" className="font-bold text-lg text-brand-navy dark:text-white">
                  Daftar Pertanyaan Siap Bawa untuk Dokter
                </h2>
                <p className="text-xs text-brand-navy/70 dark:text-white/70">
                  Pilih pertanyaan yang relevan bagi Anda, lalu salin atau cetak/unduh sebagai PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionsModal(false)}
                className="text-xs font-bold px-3 py-1.5 rounded-btn bg-surface-muted"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {personalizedQuestions.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-card bg-brand-teal-light/50 border border-brand-teal/30">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal">
                    Pertanyaan Khusus Berdasarkan Hasil Cek Awal Anda
                  </h3>
                  {personalizedQuestions.map((pq, i) => (
                    <div key={i} className="text-xs font-semibold text-brand-navy flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                      <span>{pq}</span>
                    </div>
                  ))}
                </div>
              )}

              {templatesConfig.doctorQuestionsList.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal">
                    {group.category}
                  </h3>
                  {group.questions.map((q) => (
                    <label
                      key={q}
                      className="p-3 rounded-btn bg-surface-muted dark:bg-surface-dark flex items-start gap-3 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(q)}
                        onChange={() => toggleDoctorQuestion(q)}
                        className="w-4 h-4 accent-brand-teal mt-0.5 shrink-0"
                      />
                      <span className="leading-relaxed">{q}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-brand-navy/10">
              <button
                type="button"
                onClick={handleCopyDoctorQuestions}
                className="touch-target px-4 py-2.5 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5"
              >
                {copiedQuestions ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedQuestions ? 'Berhasil Disalin!' : 'Salin Daftar Pertanyaan'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQuestionsPdf}
                className="touch-target px-4 py-2.5 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh / Cetak PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Jadwalkan Pengingat Pemeriksaan */}
      {reminderTarget && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-modal-title"
        >
          <div className="bg-surface dark:bg-surface-dark-card rounded-card max-w-md w-full p-6 shadow-soft-lg space-y-4">
            <h2 id="reminder-modal-title" className="font-bold text-lg text-brand-navy dark:text-white">
              Jadwalkan Pengingat Pemeriksaan
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75">
              Fasilitas pilihan: <strong>{reminderTarget.name}</strong>
            </p>
            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label htmlFor="remind-datetime" className="block text-xs font-semibold mb-1">
                  Pilih Tanggal & Waktu Rencana Kunjungan
                </label>
                <input
                  id="remind-datetime"
                  type="datetime-local"
                  required
                  value={remindDate}
                  onChange={(e) => setRemindDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                />
              </div>
              <div className="p-3 rounded-btn bg-brand-teal-light/50 text-xs text-brand-navy">
                <strong>Tips Persiapan:</strong> Bila berencana melakukan analisis semen, jadwalkan masa pantang (tidak mengeluarkan sperma) selama <strong>2 hingga 7 hari</strong> sebelum tanggal kunjungan ini.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReminderTarget(null)}
                  className="touch-target py-2.5 px-4 rounded-btn border border-brand-navy/20 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadIcs(reminderTarget, remindDate)}
                  className="touch-target py-2.5 px-3 rounded-btn bg-brand-navy text-white text-xs font-semibold flex items-center gap-1"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> .ics
                </button>
                <button
                  type="submit"
                  className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-brand-teal text-white text-xs font-bold"
                >
                  Simpan Pengingat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
