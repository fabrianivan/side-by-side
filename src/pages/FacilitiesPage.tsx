import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Search,
  RotateCcw,
  Route,
} from 'lucide-react';
import {
  getLocalizedFacilities,
  type LocalizedSeedFacility,
} from '../config/seed-facilities';
import { getLocalizedTemplates } from '../config/schemas';
import { SERVICE_LABELS_EN } from '../config/localization-en';
import { downloadIcsEvent } from '../lib/ics';
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
  const { locale, assessmentResult, addReminder, updatePlanStep, updateHealthJournal, healthJournal } = useApp();
  const isEn = locale === 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPathway = searchParams.get('from') === 'pathway';
  const presetService = searchParams.get('service');
  const pathwayFacilityId = healthJournal.carePathway.facility?.id;
  const [localizedFacilities, setLocalizedFacilities] = useState<LocalizedSeedFacility[]>(() =>
    getLocalizedFacilities(locale)
  );
  const localizedTemplates = useMemo(() => getLocalizedTemplates(locale), [locale]);

  useEffect(() => {
    setLocalizedFacilities(getLocalizedFacilities(locale));
    const controller = new AbortController();
    fetch(`/api/facilities?locale=${locale}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
        const rows = (await res.json()) as LocalizedSeedFacility[];
        if (Array.isArray(rows) && rows.length > 0) {
          setLocalizedFacilities(rows);
        }
      })
      .catch(() => {
        // Offline cache already initialized from curated directory
      });
    return () => controller.abort();
  }, [locale]);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Semua');
  const [onlyJkn, setOnlyJkn] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>(() =>
    presetService && ['Andrologi', 'Urologi', 'Laboratorium'].includes(presetService) ? presetService : 'Semua'
  );
  const [maxBudget, setMaxBudget] = useState<number>(1500000);
  const [sortBy, setSortBy] = useState<'friendliness' | 'price' | 'distance'>('friendliness');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('');
  const [showCompactMap, setShowCompactMap] = useState<boolean>(true);

  // Detail Layanan Modal
  const [detailTarget, setDetailTarget] = useState<LocalizedSeedFacility | null>(null);

  // Modal Daftar Pertanyaan untuk Dokter
  const [showQuestionsModal, setShowQuestionsModal] = useState<boolean>(false);
  const [copiedQuestions, setCopiedQuestions] = useState<boolean>(false);

  // Pertanyaan yang dipersonalisasi dari hasil Cek Awal pengguna
  const personalizedQuestions = useMemo(() => {
    if (!assessmentResult || assessmentResult.factors.length === 0) return [];
    return assessmentResult.factors.map((f) =>
      isEn
        ? `Regarding "${f.factorTitle}" from my self-check, what diagnostic steps or lifestyle changes do you recommend?`
        : `Terkait faktor "${f.factorTitle}" yang saya alami, langkah pemeriksaan atau perbaikan gaya hidup apa yang Dokter sarankan?`
    );
  }, [assessmentResult, isEn]);

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(() =>
    localizedTemplates.doctorQuestionsList.flatMap((cat) => cat.questions)
  );

  useEffect(() => {
    setSelectedQuestions(localizedTemplates.doctorQuestionsList.flatMap((cat) => cat.questions));
  }, [localizedTemplates]);

  // Modal Pengingat Pemeriksaan
  const [reminderTarget, setReminderTarget] = useState<LocalizedSeedFacility | null>(null);
  const [remindDate, setRemindDate] = useState<string>(() =>
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [reminderSavedBanner, setReminderSavedBanner] = useState<string>('');

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCity !== 'Semua' ||
    onlyJkn ||
    selectedService !== 'Semua' ||
    maxBudget < 1500000;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('Semua');
    setOnlyJkn(false);
    setSelectedService('Semua');
    setMaxBudget(1500000);
    setSortBy('friendliness');
  };

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus(
        isEn
          ? 'Automatic location is not supported on this device. Please select a city manually.'
          : 'Lokasi otomatis tidak didukung di perangkat ini. Silakan pilih kota secara manual.'
      );
      return;
    }
    setGeoStatus(isEn ? 'Locating...' : 'Mencari lokasi...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy('distance');
        setGeoStatus(
          isEn
            ? 'Sorting by nearest distance from your current location.'
            : 'Mengurutkan berdasarkan jarak terdekat dari lokasi Anda.'
        );
      },
      () => {
        setGeoStatus(
          isEn
            ? 'Location permission declined. You can still filter by city manually.'
            : 'Izin lokasi tidak diberikan. Anda tetap dapat memilih kota secara manual.'
        );
      }
    );
  };

  const filteredFacilities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return localizedFacilities
      .filter((f) => {
        if (selectedCity !== 'Semua' && f.city !== selectedCity) return false;
        if (onlyJkn && !f.accepts_jkn) return false;
        if (selectedService !== 'Semua' && !f.services.includes(selectedService as 'Andrologi')) {
          return false;
        }
        if (f.price_min > maxBudget) return false;
        if (
          q &&
          !f.name.toLowerCase().includes(q) &&
          !f.address.toLowerCase().includes(q) &&
          !f.city.toLowerCase().includes(q) &&
          !f.friendliness_notes.toLowerCase().includes(q)
        ) {
          return false;
        }
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
  }, [localizedFacilities, searchQuery, selectedCity, onlyJkn, selectedService, maxBudget, sortBy, userCoords]);

  const toggleDoctorQuestion = (q: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((item) => item !== q) : [...prev, q]
    );
  };

  const handleCopyDoctorQuestions = async () => {
    const allChosen = [...personalizedQuestions, ...selectedQuestions];
    const text = [
      isEn
        ? 'DOCTOR CONSULTATION QUESTIONS — SIDE BY SIDE'
        : 'DAFTAR PERTANYAAN UNTUK DOKTER — SIDE BY SIDE',
      '------------------------------------------------',
      ...allChosen.map((q, idx) => `${idx + 1}. ${q}`),
      '',
      isEn
        ? 'Note: Generated from Side by Side (Men’s Reproductive Health Companion).'
        : 'Catatan: Dibuat dari aplikasi Side by Side (Panduan Kesehatan Reproduksi Pria).',
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

  const handleDownloadIcs = (fac: LocalizedSeedFacility, dateIso: string) => {
    downloadIcsEvent(
      {
        uid: `sbs-fac-${fac.id}-${Date.parse(dateIso) || Date.now()}@side-by-side.app`,
        title: `${isEn ? 'Reproductive Check-Up' : 'Pemeriksaan Kesehatan'} — ${fac.name}`,
        start: dateIso,
        durationMinutes: 60,
        location: fac.address,
        description: isEn
          ? 'Maintain a 2-7 day abstinence window prior to semen analysis. Bring your doctor questions from Side by Side.'
          : 'Persiapan masa pantang (abstinensia) 2-7 hari sebelum tes analisis semen. Bawa daftar pertanyaan dokter dari Side by Side.',
        alarmMinutesBefore: 24 * 60,
      },
      `jadwal-periksa-${fac.id}.ics`,
    );
  };

  // Menghubungkan pilihan fasilitas ke Jalur Perawatan (rujukan terhubung)
  const handleChooseForPathway = async (fac: LocalizedSeedFacility) => {
    await updateHealthJournal((j) => ({
      ...j,
      carePathway: {
        ...j.carePathway,
        facility: { id: fac.id, name: fac.name, city: fac.city, type: fac.displayType, acceptsJkn: fac.accepts_jkn },
      },
    }));
    await updatePlanStep('pilih_layanan', 'a', 'done');
    navigate(isEn ? '/care-pathway#stage-book_prepare' : '/jalur-perawatan#stage-book_prepare');
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTarget) return;
    await addReminder({
      type: 'semen_analysis',
      title: isEn
        ? 'Check-Up Schedule & Abstinence Prep (2–7 Days)'
        : 'Jadwal Pemeriksaan & Persiapan Masa Pantang (2–7 Hari)',
      facilityName: reminderTarget.name,
      remindAt: remindDate,
      notes: isEn
        ? `Location: ${reminderTarget.address}. Remember 2–7 days abstinence before sample collection.`
        : `Lokasi: ${reminderTarget.address}. Ingat masa pantang 2–7 hari sebelum pengambilan sampel.`,
    });
    await updatePlanStep('pilih_layanan', 'a', 'done');
    await updatePlanStep('jadwalkan', 'a', 'in_progress');
    setReminderSavedBanner(
      isEn
        ? `Reminder for ${reminderTarget.name} has been scheduled!`
        : `Pengingat untuk ${reminderTarget.name} berhasil dijadwalkan!`
    );
    setReminderTarget(null);
    setTimeout(() => setReminderSavedBanner(''), 4000);
  };

  return (
    <div className="space-y-6">
      {fromPathway && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-brand-teal-light/60 dark:bg-brand-teal/15 border border-brand-teal/30 text-xs text-brand-navy dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <span className="flex items-start gap-2">
            <Route className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            {isEn
              ? 'You are choosing a facility for your Care Pathway. Filters are pre-set to the specialist you picked; tap “Choose for my care pathway” on any facility.'
              : 'Anda sedang memilih fasilitas untuk Jalur Perawatan. Filter sudah disesuaikan dengan spesialis pilihan Anda; ketuk “Pilih untuk jalur perawatan saya” pada fasilitas mana pun.'}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm shrink-0"
            onClick={() => navigate(isEn ? '/care-pathway' : '/jalur-perawatan')}
          >
            {isEn ? 'Back to pathway' : 'Kembali ke jalur'}
          </button>
        </div>
      )}

      {/* Header & Tombol Buat Daftar Pertanyaan Dokter */}
      <section className="page-header flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="badge badge-teal">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {isEn
                ? '16 Curated Men-Friendly Facilities • JKN & Cost Transparency'
                : '16 Fasilitas Terkurasi Ramah Pria • Transparansi Biaya & JKN'}
            </span>
          </div>
          <h1 className="page-title">
            {isEn
              ? 'Care Navigation & Men-Friendly Clinic Directory'
              : 'Navigasi Pemeriksaan & Direktori Layanan Ramah Pria'}
          </h1>
          <p className="page-lead">
            {isEn
              ? 'Understand the examination workflow step-by-step, explore the compact coverage map, and choose a comfortable clinic.'
              : 'Pahami alur pemeriksaan langkah demi langkah, jelajahi peta ringkas, dan pilih fasilitas yang nyaman.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(isEn ? '/doctor-checklist' : '/checklist-dokter')}
            className="btn btn-coral"
          >
            <FileText className="w-4 h-4" />
            {isEn
              ? 'Doctor Question Checklist (Full Builder)'
              : 'Checklist Pertanyaan Dokter (Lengkap)'}
          </button>
        </div>
      </section>

      {reminderSavedBanner && (
        <div
          role="status"
          className="p-4 rounded-card bg-status-success-bg dark:bg-status-success/15 text-[#1F7A50] dark:text-[#7BD9AC] border border-status-success/30 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reminderSavedBanner}</span>
        </div>
      )}

      {/* Panduan Langkah Demi Langkah (5 Tahap Analisis Semen) */}
      <section className="card p-5 sm:p-6 space-y-5">
        <h2 className="section-title">
          {isEn
            ? 'Step-by-Step Guide: Semen Analysis Examination'
            : 'Panduan Langkah demi Langkah: Pemeriksaan Analisis Semen'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {localizedTemplates.examinationGuide.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="well p-4 sm:p-5 space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-teal-strong text-white text-xs font-extrabold shrink-0">
                  {step.stepNumber}
                </span>
                <span className="eyebrow">
                  {isEn ? `Step ${step.stepNumber}` : `Langkah ${step.stepNumber}`}
                </span>
              </div>
              <h3 className="font-bold text-base text-brand-navy dark:text-white leading-snug">
                {step.title}
              </h3>
              <p className="text-xs font-semibold text-brand-teal-dark dark:text-[#7FDADB] leading-relaxed">
                {step.summary}
              </p>
              <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
                {step.details}
              </p>
            </div>
          ))}

          {/* Informasi Estimasi Biaya & Cakupan JKN */}
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-teal-light/60 dark:bg-brand-teal/15 border border-brand-teal/25 space-y-2.5">
            <h3 className="font-bold text-base text-brand-navy dark:text-white flex items-center gap-2 leading-snug">
              <Info className="w-4 h-4 text-brand-teal shrink-0" />
              {isEn
                ? 'Estimated Cost & JKN / Insurance Coverage'
                : 'Estimasi Biaya & Cakupan JKN / Asuransi'}
            </h3>
            <p className="text-xs font-bold text-brand-teal-dark dark:text-[#7FDADB] leading-relaxed">
              {localizedTemplates.examinationGuide.costAndInsuranceInfo.rangeSummary}
            </p>
            <p className="text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed">
              {localizedTemplates.examinationGuide.costAndInsuranceInfo.jknSummary}
            </p>
            <p className="text-2xs italic text-brand-navy/70 dark:text-white/70 leading-relaxed">
              {isEn ? 'Note:' : 'Catatan:'} {localizedTemplates.examinationGuide.costAndInsuranceInfo.disclaimer}
            </p>
          </div>
        </div>
      </section>

      {/* Filter, Peta Ringkas Interaktif & Direktori Layanan */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="section-title">
              {isEn
                ? `Curated Care Directory (${filteredFacilities.length} Facilities)`
                : `Direktori Layanan Terkurasi (${filteredFacilities.length} Fasilitas)`}
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed max-w-2xl">
              {isEn
                ? 'The “Men-Friendly” score is curated based on private sample collection rooms, non-judgmental counseling, and clear registration workflows.'
                : 'Skor “Ramah Pria” diisi melalui kurasi privasi ruang sampel, keramahan konseling, dan kejelasan alur (bukan ulasan bebas).'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCompactMap(!showCompactMap)}
              aria-pressed={showCompactMap}
              className="btn btn-soft"
            >
              <MapIcon className="w-4 h-4" />
              <span>
                {showCompactMap
                  ? isEn
                    ? 'Hide Compact Map'
                    : 'Sembunyikan Peta Ringkas'
                  : isEn
                  ? 'Show Compact Map'
                  : 'Tampilkan Peta Ringkas'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRequestGeolocation}
              className="btn btn-secondary"
            >
              <Compass className="w-4 h-4 text-brand-teal" />
              {isEn ? 'Sort by Nearest' : 'Urutkan Jarak Terdekat'}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-ghost"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isEn ? 'Reset Filters' : 'Reset Filter'}</span>
              </button>
            )}
          </div>
        </div>

        {geoStatus && (
          <p role="status" className="text-xs text-brand-teal-dark dark:text-[#7FDADB] font-semibold bg-brand-teal-light/60 dark:bg-brand-teal/15 px-3.5 py-2.5 rounded-btn">
            {geoStatus}
          </p>
        )}

        <div className="well p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3.5">
          {/* Pencarian Nama Klinik / Alamat */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="filter-search" className="field-label">
              {isEn ? 'Search Facility Name or Area' : 'Cari Nama Fasilitas atau Area'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-brand-navy/45 dark:text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="filter-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isEn
                    ? 'Search hospital, clinic, lab, Tebet, Cipto, Hasan Sadikin, Airlangga...'
                    : 'Cari RS, klinik, lab, Tebet, Cipto, Hasan Sadikin, Airlangga...'
                }
                className="field w-full pl-10 pr-4"
              />
            </div>
          </div>

          {/* Filter Kota */}
          <div>
            <label htmlFor="filter-city" className="field-label">
              {isEn ? 'Select City' : 'Pilih Kota'}
            </label>
            <select
              id="filter-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="field w-full font-semibold"
            >
              <option value="Semua">
                {isEn
                  ? 'All Cities (Jakarta, Bandung, Surabaya)'
                  : 'Semua Kota (Jakarta, Bandung, Surabaya)'}
              </option>
              <option value="Jakarta">{isEn ? 'Jakarta (6 Locations)' : 'Jakarta (6 Lokasi)'}</option>
              <option value="Bandung">{isEn ? 'Bandung (5 Locations)' : 'Bandung (5 Lokasi)'}</option>
              <option value="Surabaya">{isEn ? 'Surabaya (5 Locations)' : 'Surabaya (5 Lokasi)'}</option>
            </select>
          </div>

          {/* Filter Layanan */}
          <div>
            <label htmlFor="filter-service" className="field-label">
              {isEn ? 'Service Type' : 'Jenis Layanan'}
            </label>
            <select
              id="filter-service"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="field w-full font-semibold"
            >
              <option value="Semua">{isEn ? 'All Services' : 'Semua Layanan'}</option>
              <option value="Andrologi">
                {isEn ? 'Andrology Specialist (Sp.And)' : 'Spesialis Andrologi (Sp.And)'}
              </option>
              <option value="Urologi">
                {isEn ? 'Urology Specialist (Sp.U)' : 'Spesialis Urologi (Sp.U)'}
              </option>
              <option value="Laboratorium">
                {isEn ? 'Semen Analysis Laboratory' : 'Laboratorium Analisis Semen'}
              </option>
            </select>
          </div>

          {/* Sortir */}
          <div>
            <label htmlFor="sort-by" className="field-label">
              {isEn ? 'Sort By' : 'Urutkan Berdasarkan'}
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'friendliness' | 'price' | 'distance')}
              className="field w-full font-semibold"
            >
              <option value="friendliness">
                {isEn ? 'Highest Men-Friendly Score' : 'Skor Ramah Pria Tertinggi'}
              </option>
              <option value="price">
                {isEn ? 'Lowest Estimated Cost' : 'Estimasi Biaya Terendah'}
              </option>
              <option value="distance">{isEn ? 'Nearest Distance' : 'Jarak Terdekat'}</option>
            </select>
          </div>

          {/* Filter Biaya Maksimal */}
          <div className="lg:col-span-2">
            <label htmlFor="filter-budget" className="field-label flex flex-wrap items-baseline justify-between gap-x-3">
              <span>{isEn ? 'Max Initial Budget' : 'Rentang Biaya Awal Maks'}</span>
              <span className="tabular font-bold text-brand-teal-dark dark:text-[#7FDADB]">
                Rp {maxBudget.toLocaleString('id-ID')}
              </span>
            </label>
            <input
              id="filter-budget"
              type="range"
              min={100000}
              max={1500000}
              step={50000}
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="w-full accent-brand-teal mt-2.5 cursor-pointer"
            />
          </div>

          {/* Toggle Menerima JKN */}
          <div className="flex items-end">
            <label className="field w-full flex items-center gap-2.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={onlyJkn}
                onChange={(e) => setOnlyJkn(e.target.checked)}
                className="check"
              />
              <span>{isEn ? 'JKN Accepted Only' : 'Hanya yang Menerima JKN'}</span>
            </label>
          </div>
        </div>

        {/* Peta Ringkas Visual Interaktif (Sesuai Arsitektur Layar #5) */}
        {showCompactMap && (
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-navy-deep text-white space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <MapPin className="w-4 h-4 text-brand-coral" />
                <span>
                  {isEn ? 'Compact Care Coverage Map' : 'Peta Ringkas Sebaran Layanan'} (
                  {selectedCity === 'Semua' ? 'Jakarta • Bandung • Surabaya' : selectedCity})
                </span>
              </div>
              <span className="text-2xs text-white/75">
                {isEn
                  ? 'Click any facility pin to view Service Details & Men-Friendly Score'
                  : 'Klik titik fasilitas untuk melihat Detail Layanan & Skor Ramah Pria'}
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
                      className="p-3 rounded-xl bg-white/[0.07] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#FFA596]">{cityGroup}</span>
                        <span className="text-2xs text-white/80">
                          {cityFacs.length} {isEn ? 'locations' : 'lokasi'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {cityFacs.map((cf) => (
                          <button
                            key={cf.id}
                            type="button"
                            onClick={() => setDetailTarget(cf)}
                            className="w-full text-left px-2.5 py-2 rounded-lg bg-white/[0.08] hover:bg-brand-teal transition flex items-center justify-between gap-2 text-2xs"
                          >
                            <span className="truncate font-medium">📍 {cf.name}</span>
                            <span className="tabular shrink-0 font-bold text-[#FFA596] bg-black/25 px-1.5 py-0.5 rounded-md">
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

        {/* Daftar Kartu Fasilitas atau Empty State */}
        {filteredFacilities.length === 0 ? (
          <div className="well px-6 py-10 text-center space-y-3">
            <MapPin className="w-10 h-10 text-brand-teal mx-auto opacity-60" />
            <h3 className="font-bold text-base text-brand-navy dark:text-white">
              {isEn
                ? 'No facilities match your current filter criteria'
                : 'Tidak ada fasilitas yang sesuai dengan filter saat ini'}
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-white/70 max-w-md mx-auto">
              {isEn
                ? 'Try increasing the maximum budget range, clearing the search term, or resetting filters.'
                : 'Coba naikkan batas biaya maksimal, ubah kata kunci pencarian, atau atur ulang filter.'}
            </p>
            <button type="button" onClick={handleResetFilters} className="btn btn-primary">
              <RotateCcw className="w-4 h-4" />
              <span>{isEn ? 'Reset All Filters' : 'Atur Ulang Semua Filter'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFacilities.map((fac) => (
              <article
                key={fac.id}
                className="well p-5 flex flex-col justify-between space-y-4 transition duration-200 hover:border-brand-teal/40 hover:shadow-soft"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-2xs font-bold px-2 py-1 rounded-md leading-none bg-brand-navy text-white dark:bg-white/15">
                          {fac.displayType}
                        </span>
                        <span className="text-2xs font-bold px-2 py-1 rounded-md leading-none bg-brand-teal/15 text-brand-teal-dark dark:text-[#7FDADB]">
                          {fac.city}
                        </span>
                        {fac.accepts_jkn ? (
                          <span className="text-2xs font-bold px-2 py-1 rounded-md leading-none bg-status-success-bg text-[#1F7A50] dark:bg-status-success/20 dark:text-[#7BD9AC]">
                            {isEn ? 'JKN Accepted' : 'Menerima JKN'}
                          </span>
                        ) : (
                          <span className="text-2xs font-medium px-2 py-1 rounded-md leading-none bg-brand-navy/10 text-brand-navy/70 dark:bg-white/10 dark:text-white/70">
                            {isEn ? 'Self-Pay / General' : 'Layanan Mandiri/Umum'}
                          </span>
                        )}
                        {fac.distanceKm !== null && (
                          <span className="text-2xs font-bold px-2 py-1 rounded-md leading-none bg-brand-coral/20 text-[#B93E2B] dark:text-[#FFA596]">
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
                      title={
                        isEn
                          ? 'Curated score for male privacy & non-judgmental care'
                          : 'Skor kurasi keramahan & privasi layanan bagi pria'
                      }
                      className="px-3 py-2 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-teal/30 text-center shrink-0"
                    >
                      <div className="flex items-center gap-1 text-brand-teal font-bold text-sm">
                        <Star className="w-4 h-4 fill-brand-teal" />
                        <span>{fac.friendliness_score.toFixed(1)}</span>
                      </div>
                      <div className="text-3xs font-semibold text-brand-navy/70 dark:text-white/70">
                        {isEn ? 'Men-Friendly' : 'Ramah Pria'}
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
                        className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10"
                      >
                        {isEn ? SERVICE_LABELS_EN[srv] || srv : srv}
                      </span>
                    ))}
                    <span className="text-xs font-bold text-brand-teal dark:text-[#7FDADB] ml-auto">
                      Rp {fac.price_min.toLocaleString('id-ID')} – Rp{' '}
                      {fac.price_max.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card text-xs leading-relaxed text-brand-navy/85 dark:text-white/85 border-l-4 border-brand-teal">
                    <strong>
                      {isEn ? 'Men-Friendly Curation Note:' : 'Catatan Kurasi Ramah Pria:'}
                    </strong>{' '}
                    {fac.friendliness_notes}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-brand-navy/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setDetailTarget(fac)}
                    className="btn btn-secondary"
                  >
                    <Eye className="w-4 h-4 text-brand-teal" />
                    <span>Detail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReminderTarget(fac)}
                    className="btn btn-primary flex-1"
                  >
                    <BellPlus className="w-4 h-4" />
                    {isEn ? 'Remind me' : 'Ingatkan saya'}
                  </button>

                  {(fromPathway || pathwayFacilityId === fac.id) && (
                    <button
                      type="button"
                      onClick={() => handleChooseForPathway(fac)}
                      disabled={pathwayFacilityId === fac.id}
                      className="btn btn-navy w-full"
                    >
                      <Route className="w-4 h-4" />
                      {pathwayFacilityId === fac.id
                        ? isEn
                          ? 'In my care pathway'
                          : 'Ada di jalur perawatan saya'
                        : isEn
                        ? 'Choose for my care pathway'
                        : 'Pilih untuk jalur perawatan saya'}
                    </button>
                  )}

                  <a
                    href={fac.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary flex"
                  >
                    <Building2 className="w-4 h-4 text-brand-teal" />
                    <span>{isEn ? 'Map' : 'Peta'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal Detail Layanan Lengkap (Arsitektur Layar #5: Detail Layanan) */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy-deep/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="facility-detail-title"
        >
          <div className="card max-w-xl w-full p-6 shadow-soft-lg space-y-4 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-brand-navy/10 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-brand-navy text-white dark:bg-white/15">
                    {detailTarget.displayType} • {detailTarget.city}
                  </span>
                  {detailTarget.accepts_jkn && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-status-success-bg text-[#1F7A50] dark:bg-status-success/20 dark:text-[#7BD9AC]">
                      {isEn ? 'JKN / BPJS Accepted' : 'Menerima JKN / BPJS'}
                    </span>
                  )}
                </div>
                <h2 id="facility-detail-title" className="section-title">
                  {detailTarget.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="btn btn-secondary btn-sm shrink-0"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
            </div>

            {/* Rincian Indikator Kurasi Ramah Pria */}
            <div className="p-4 rounded-card bg-brand-teal-light/50 dark:bg-brand-teal/15 border border-brand-teal/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-teal dark:text-[#7FDADB] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {isEn
                    ? 'Curated “Men-Friendly” Score Breakdown'
                    : 'Rincian Skor Kurasi “Ramah Pria”'}
                </span>
                <span className="text-sm font-bold text-brand-teal dark:text-[#7FDADB]">
                  ★ {detailTarget.friendliness_score.toFixed(1)} / 5.0
                </span>
              </div>
              <p className="text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed">
                {detailTarget.friendliness_notes}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-2xs">
                <div className="p-2 rounded bg-surface dark:bg-surface-dark text-center">
                  <div className="font-bold text-brand-teal dark:text-[#7FDADB]">
                    {isEn ? 'Sample Room Privacy' : 'Privasi Ruang Sampel'}
                  </div>
                  <div>{isEn ? 'Private & Locked' : 'Tertutup & Terkunci'}</div>
                </div>
                <div className="p-2 rounded bg-surface dark:bg-surface-dark text-center">
                  <div className="font-bold text-brand-teal dark:text-[#7FDADB]">
                    {isEn ? 'Registration Flow' : 'Alur Pendaftaran'}
                  </div>
                  <div>{isEn ? 'Discreet & Fast' : 'Diskret & Cepat'}</div>
                </div>
                <div className="p-2 rounded bg-surface dark:bg-surface-dark text-center">
                  <div className="font-bold text-brand-teal dark:text-[#7FDADB]">
                    {isEn ? 'Counseling Attitude' : 'Sikap Konseling'}
                  </div>
                  <div>{isEn ? 'Judgment-Free' : 'Tanpa Penghakiman'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <strong>{isEn ? 'Full Address:' : 'Alamat Lengkap:'}</strong> {detailTarget.address}
              </div>
              <div>
                <strong>{isEn ? 'Operating Hours:' : 'Jam Operasional:'}</strong> {detailTarget.hours}
              </div>
              <div>
                <strong>{isEn ? 'Available Services:' : 'Layanan Tersedia:'}</strong>{' '}
                {detailTarget.services
                  .map((s) => (isEn ? SERVICE_LABELS_EN[s] || s : s))
                  .join(', ')}
              </div>
              <div>
                <strong>{isEn ? 'Estimated Cost Range:' : 'Estimasi Rentang Biaya:'}</strong> Rp{' '}
                {detailTarget.price_min.toLocaleString('id-ID')} – Rp{' '}
                {detailTarget.price_max.toLocaleString('id-ID')}{' '}
                <span className="italic opacity-75">
                  {isEn ? '(may vary by facility)' : '(dapat berbeda per fasilitas)'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-surface-muted dark:bg-surface-dark text-xs space-y-1">
              <div className="font-bold text-brand-navy dark:text-white">
                {isEn
                  ? 'Pre-Visit Preparation Checklist:'
                  : 'Checklist Persiapan Sebelum Kunjungan:'}
              </div>
              <ul className="list-disc pl-4 space-y-1 text-brand-navy/80 dark:text-white/80">
                <li>
                  {isEn
                    ? 'Maintain a 2 to 7 day sexual abstinence window if planning a semen analysis test.'
                    : 'Lakukan masa pantang (abstinensia) selama 2 hingga 7 hari bila berencana tes analisis semen.'}
                </li>
                <li>
                  {isEn
                    ? 'Bring your ID card and JKN/insurance card (plus primary care referral if using JKN).'
                    : 'Bawa KTP dan kartu JKN/asuransi (beserta surat rujukan FKTP bila menggunakan jalur JKN).'}
                </li>
                <li>
                  {isEn
                    ? 'Prepare your doctor questions list using the “Doctor Question Checklist” button.'
                    : 'Siapkan daftar pertanyaan dokter dari tombol “Buat daftar pertanyaan untuk dokter”.'}
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-navy/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  const target = detailTarget;
                  setDetailTarget(null);
                  setReminderTarget(target);
                }}
                className="btn btn-primary flex-1"
              >
                <BellPlus className="w-4 h-4" />
                {isEn ? 'Schedule Reminder Here' : 'Jadwalkan Pengingat di Sini'}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadIcs(detailTarget, remindDate)}
                className="btn btn-navy"
              >
                <CalendarPlus className="w-4 h-4" />
                {isEn ? 'Save to Calendar (.ics)' : 'Simpan ke Kalender (.ics)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pembuat Daftar Pertanyaan untuk Dokter */}
      {showQuestionsModal && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy-deep/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doctor-questions-title"
        >
          <div className="card max-w-2xl w-full p-6 shadow-soft-lg space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-brand-navy/10 dark:border-white/10 pb-3">
              <div>
                <h2 id="doctor-questions-title" className="section-title">
                  {isEn
                    ? 'Ready-to-Bring Doctor Questions List'
                    : 'Daftar Pertanyaan Siap Bawa untuk Dokter'}
                </h2>
                <p className="text-xs text-brand-navy/70 dark:text-white/70">
                  {isEn
                    ? 'Select the questions relevant to you, then copy or print/download as PDF.'
                    : 'Pilih pertanyaan yang relevan bagi Anda, lalu salin atau cetak/unduh sebagai PDF.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionsModal(false)}
                className="btn btn-secondary btn-sm shrink-0"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {personalizedQuestions.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-card bg-brand-teal-light/50 dark:bg-brand-teal/15 border border-brand-teal/30">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal dark:text-[#7FDADB]">
                    {isEn
                      ? 'Personalized Questions Based on Your Self-Check'
                      : 'Pertanyaan Khusus Berdasarkan Hasil Cek Awal Anda'}
                  </h3>
                  {personalizedQuestions.map((pq, i) => (
                    <div key={i} className="text-xs font-semibold text-brand-navy dark:text-white flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                      <span>{pq}</span>
                    </div>
                  ))}
                </div>
              )}

              {localizedTemplates.doctorQuestionsList.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal dark:text-[#7FDADB]">
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
                        className="check mt-0.5 shrink-0"
                      />
                      <span className="leading-relaxed">{q}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-brand-navy/10 dark:border-white/10">
              <button
                type="button"
                onClick={handleCopyDoctorQuestions}
                className="btn btn-primary"
              >
                {copiedQuestions ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>
                  {copiedQuestions
                    ? isEn
                      ? 'Copied!'
                      : 'Berhasil Disalin!'
                    : isEn
                    ? 'Copy Questions List'
                    : 'Salin Daftar Pertanyaan'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQuestionsPdf}
                className="btn btn-navy"
              >
                <Printer className="w-4 h-4" />
                <span>{isEn ? 'Download / Print PDF' : 'Unduh / Cetak PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Jadwalkan Pengingat Pemeriksaan */}
      {reminderTarget && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy-deep/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-modal-title"
        >
          <div className="card max-w-md w-full p-6 shadow-soft-lg space-y-4">
            <h2 id="reminder-modal-title" className="section-title">
              {isEn ? 'Schedule Check-Up Reminder' : 'Jadwalkan Pengingat Pemeriksaan'}
            </h2>
            <p className="text-xs text-brand-navy/75 dark:text-white/75">
              {isEn ? 'Selected facility:' : 'Fasilitas pilihan:'}{' '}
              <strong>{reminderTarget.name}</strong>
            </p>
            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label htmlFor="remind-datetime" className="field-label">
                  {isEn
                    ? 'Select Planned Visit Date & Time'
                    : 'Pilih Tanggal & Waktu Rencana Kunjungan'}
                </label>
                <input
                  id="remind-datetime"
                  type="datetime-local"
                  required
                  value={remindDate}
                  onChange={(e) => setRemindDate(e.target.value)}
                  className="field w-full"
                />
              </div>
              <div className="p-3 rounded-btn bg-brand-teal-light/50 dark:bg-brand-teal/15 text-xs text-brand-navy dark:text-white">
                <strong>{isEn ? 'Preparation Tip:' : 'Tips Persiapan:'}</strong>{' '}
                {isEn ? (
                  <>
                    If planning a semen analysis, schedule a sexual abstinence window of{' '}
                    <strong>2 to 7 days</strong> prior to this visit date.
                  </>
                ) : (
                  <>
                    Bila berencana melakukan analisis semen, jadwalkan masa pantang (tidak mengeluarkan sperma) selama{' '}
                    <strong>2 hingga 7 hari</strong> sebelum tanggal kunjungan ini.
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReminderTarget(null)}
                  className="btn btn-secondary"
                >
                  {isEn ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadIcs(reminderTarget, remindDate)}
                  className="btn btn-navy"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> .ics
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {isEn ? 'Save Reminder' : 'Simpan Pengingat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
