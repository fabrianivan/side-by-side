import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Link2,
  Unlink,
  Copy,
  Check,
  ShieldCheck,
  HeartHandshake,
  MessageSquareHeart,
  Lock,
  Calendar,
  CheckSquare,
  ExternalLink,
  QrCode,
  MessageCircle,
  Clock,
  Sparkles,
  Heart,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { templatesConfig } from '../config/schemas';
import { useApp } from '../context/AppContext';

export const CoupleModePage: React.FC = () => {
  const {
    activePersona,
    pairing,
    assessmentResult,
    labResults,
    reminders,
    createNewPairing,
    updatePlanStep,
    updatePairingSharedItems,
    revokePairing,
  } = useApp();

  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code');

  const [joinCodeInput, setJoinCodeInput] = useState<string>(urlCode ? urlCode.toUpperCase() : 'BERSAMA24');
  const [selectedTone, setSelectedTone] = useState<string>('Semua');
  const [copiedId, setCopiedId] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [confirmRevoke, setConfirmRevoke] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [pairSuccessMsg, setPairSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (urlCode && (!pairing || pairing.status !== 'active')) {
      setJoinCodeInput(urlCode.toUpperCase());
    }
  }, [urlCode, pairing]);

  // Linimasa Persiapan Bersama (Checklist Default yang Dibagikan)
  const [sharedPrepChecklist, setSharedPrepChecklist] = useState([
    {
      id: 'prep-1',
      text: 'Sepakati jendela masa pantang (abstinensia 2–7 hari) sebelum jadwal analisis semen',
      checked: true,
    },
    {
      id: 'prep-2',
      text: 'Siapkan kartu identitas & rujukan JKN/asuransi untuk kunjungan klinik',
      checked: true,
    },
    {
      id: 'prep-3',
      text: 'Susun daftar pertanyaan bersama untuk ditanyakan saat konsultasi dokter',
      checked: false,
    },
    {
      id: 'prep-4',
      text: 'Jadwalkan waktu santai berdua setelah kunjungan klinik (zona bebas stres)',
      checked: false,
    },
  ]);

  const togglePrepItem = (id: string) => {
    setSharedPrepChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2500);
  };

  const handleCreateNewInvite = async () => {
    setIsCreating(true);
    await createNewPairing('Rendra (Suami)', 'Sari (Istri)');
    setIsCreating(false);
    setPairSuccessMsg('Kode tautan pasangan 24 jam berhasil dibuat!');
    setTimeout(() => setPairSuccessMsg(''), 4000);
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setIsCreating(true);
    await createNewPairing('Rendra (Suami)', 'Sari (Istri)', joinCodeInput.trim());
    setIsCreating(false);
    setPairSuccessMsg(`Berhasil terhubung dengan pasangan menggunakan kode ${joinCodeInput.trim().toUpperCase()}!`);
    setTimeout(() => setPairSuccessMsg(''), 4000);
  };

  const handleShareWhatsApp = () => {
    if (!pairing) return;
    const shareUrl = `${window.location.origin}/berdua?code=${pairing.invite_code}`;
    const text = `Hai sayang, yuk kita buka linimasa persiapan & jadwal pemeriksaan kita di Side by Side. Gunakan kode tautan kita: *${pairing.invite_code}*\n\nBuka langsung di sini:\n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredTemplates = templatesConfig.partnerInviteTemplates.filter(
    (tpl) => selectedTone === 'Semua' || tpl.tone === selectedTone
  );

  const statusLabels: Record<'not_started' | 'in_progress' | 'done', string> = {
    not_started: 'Belum mulai',
    in_progress: 'Sedang berjalan',
    done: 'Selesai',
  };

  const statusColors: Record<'not_started' | 'in_progress' | 'done', string> = {
    not_started:
      'bg-brand-navy/[0.07] text-brand-navy/75 border border-brand-navy/10 dark:bg-white/10 dark:text-white/80 dark:border-white/15',
    in_progress:
      'bg-status-warning-bg text-[#7A5600] border border-status-warning/50 dark:bg-status-warning/20 dark:text-[#F3C64D]',
    done: 'bg-status-success-bg text-[#1F7A50] border border-status-success/40 dark:bg-status-success/20 dark:text-[#7BD9AC]',
  };

  return (
    <div className="space-y-6">
      {/* Header Mode Berdua */}
      <section className="page-header space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="badge badge-teal">
            <Users className="w-4 h-4" />
            Mode Berdua — “Better together.”
          </span>
          {activePersona === 'sari' && (
            <span className="badge badge-coral">
              Tampilan Sudut Pandang Pasangan: Sari (Istri)
            </span>
          )}
        </div>
        <h1 className="page-title">
          Rencana Kita & Pendampingan Pasangan
        </h1>
        <p className="page-lead">
          Melangkah bersama pasangan tanpa kehilangan ruang privasi. Secara default hanya progres tahapan, checklist persiapan, dan pengingat yang terlihat bersama—isi kuesioner dan hasil lab Anda tetap tertutup kecuali Anda memilih membagikannya.
        </p>
      </section>

      {/* Seksi 1: Tautkan Pasangan (Tiket Kode Tautan 24 Jam, QR Code & WhatsApp) */}
      <section className="card p-5 sm:p-7 space-y-6">
        {pairSuccessMsg && (
          <div className="p-3.5 rounded-card bg-status-success-bg text-status-success text-xs font-bold flex items-center gap-2 border border-status-success/30 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pairSuccessMsg}</span>
          </div>
        )}

        {pairing && pairing.status === 'active' ? (
          /* TAMPILAN TERTAUT (PAIRED TICKET) */
          <div className="space-y-6">
            {/* Top Bar: Status Hubungan & Expiry */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-navy/10">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse shrink-0" />
                <h2 className="section-title flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-coral fill-brand-coral" />
                  <span>Tautan Pasangan Aktif</span>
                </h2>
                <span className="badge badge-success">
                  Mode Berdua Siap
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-brand-navy/60 dark:text-white/60 font-medium">
                <Clock className="w-3.5 h-3.5 text-brand-teal" />
                <span>Berlaku 24 jam sejak dibuat</span>
              </div>
            </div>

            {/* Visualizer Pasangan: Suami <---> Istri */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-brand-teal/[0.07] via-surface to-brand-coral/[0.08] dark:via-transparent border border-brand-navy/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Partner A */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-teal to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs ring-2 ring-brand-teal/20">
                  {pairing.partner_a_alias.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-brand-navy dark:text-white">
                    {pairing.partner_a_alias}
                  </div>
                  <div className="text-2xs font-semibold text-brand-teal-dark dark:text-[#7FDADB]">
                    Pengundang Utama
                  </div>
                </div>
              </div>

              {/* Connecting badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface dark:bg-surface-dark border border-brand-coral/40 text-[#B93E2B] dark:text-[#FFA596] text-xs font-bold shadow-xs">
                <HeartHandshake className="w-4 h-4" />
                <span>Saling Terhubung</span>
              </div>

              {/* Partner B */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="text-right">
                  <div className="text-sm font-extrabold text-brand-navy dark:text-white">
                    {pairing.partner_b_alias}
                  </div>
                  <div className="text-2xs font-semibold text-[#B93E2B] dark:text-[#FFA596]">
                    Pasangan Pendamping
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-coral to-orange-600 text-white font-black text-sm flex items-center justify-center shadow-xs ring-2 ring-brand-coral/20">
                  {pairing.partner_b_alias.charAt(0)}
                </div>
              </div>
            </div>

            {/* Digital Voucher / Ticket Box for Invite Code */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-brand-teal/40 bg-brand-teal-soft dark:bg-brand-teal/10 p-4 sm:p-7 text-center space-y-4">
              <div className="space-y-1.5">
                <span className="eyebrow">
                  Kode Tautan Undangan Pasangan (24 Jam)
                </span>
                <p className="text-xs text-brand-navy/70 dark:text-white/70">
                  Bagikan kode ini atau kirim langsung agar pasangan dapat membuka linimasa bersama di HP-nya
                </p>
              </div>

              {/* Segmented Code Display */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 py-1">
                {pairing.invite_code.split('').map((char, idx) => (
                  <span
                    key={idx}
                    className="w-[1.625rem] h-10 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl bg-white dark:bg-surface-dark border sm:border-2 border-brand-teal/35 flex items-center justify-center text-base sm:text-2xl font-black font-mono text-brand-teal-dark dark:text-[#7FDADB] shadow-xs tracking-normal"
                  >
                    {char}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center gap-2 pt-2">
                {/* 1. Bagikan via WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="btn btn-whatsapp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp</span>
                </button>

                {/* 2. Salin Tautan Langsung */}
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      'invite-url',
                      `${window.location.origin}/berdua?code=${pairing.invite_code}`
                    )
                  }
                  className="btn btn-primary"
                >
                  {copiedId === 'invite-url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'invite-url' ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
                </button>

                {/* 3. Salin Kode Saja */}
                <button
                  type="button"
                  onClick={() => handleCopyText('invite-code', pairing.invite_code)}
                  className="btn btn-secondary"
                >
                  {copiedId === 'invite-code' ? <Check className="w-4 h-4 text-brand-teal" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'invite-code' ? 'Kode Disalin!' : 'Salin Kode'}</span>
                </button>

                {/* 4. Tampilkan QR Code */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(!showQrModal)}
                  aria-expanded={showQrModal}
                  className={`btn ${showQrModal ? 'btn-soft' : 'btn-secondary'}`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>{showQrModal ? 'Tutup QR' : 'Tampilkan QR'}</span>
                </button>
              </div>

              {/* QR Code Container (Inline expander) */}
              {showQrModal && (
                <div className="pt-4 mt-4 border-t border-brand-teal/20 space-y-3 animate-fade-in">
                  <div className="p-3.5 bg-white rounded-2xl inline-block border-2 border-brand-teal/40 shadow-sm mx-auto">
                    <QRCodeSVG
                      value={`${window.location.origin}/berdua?code=${pairing.invite_code}`}
                      size={150}
                      fgColor="#1B2A41"
                      level="M"
                    />
                  </div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 max-w-sm mx-auto">
                    Arahkan kamera HP pasangan Anda langsung ke kode QR ini untuk menghubungkan linimasa secara otomatis.
                  </p>
                </div>
              )}
            </div>

            {/* Cabut Tautan Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-2xs text-brand-navy/60 dark:text-white/60">
                Tautan dapat dicabut kapan saja jika Anda ingin membatalkan akses pasangan.
              </span>
              {confirmRevoke ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-status-urgent">Yakin cabut tautan?</span>
                  <button
                    type="button"
                    onClick={() => {
                      revokePairing();
                      setConfirmRevoke(false);
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Ya, Cabut
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  className="text-xs font-semibold text-status-urgent hover:underline flex items-center gap-1.5"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Cabut Tautan Pasangan</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* TAMPILAN BELUM TERTAUT (TWO-SIDED CONNECTION HUB) */
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-brand-teal" />
                <h2 className="section-title">
                  Tautkan Pasangan (Mode Berdua)
                </h2>
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Pilih apakah Anda ingin membuat kode undangan baru untuk dikirimkan ke pasangan, atau memasukkan kode yang Anda terima dari pasangan.
              </p>
            </div>

            {/* URL Code Detected Banner */}
            {urlCode && (
              <div className="p-4 rounded-2xl bg-brand-teal/10 border-2 border-brand-teal flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Kode Undangan Terdeteksi dari Pasangan:</span>
                  </div>
                  <div className="text-sm font-black font-mono text-brand-navy dark:text-white">
                    {urlCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => createNewPairing('Rendra (Suami)', 'Sari (Istri)', urlCode)}
                  className="btn btn-primary shrink-0"
                >
                  Hubungkan Sekarang →
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OPSI 1: Buat Kode Undangan Baru */}
              <div className="well p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                    1. Buat Kode Undangan Baru
                  </h3>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    Buat kode tautan sekali pakai berlaku 24 jam. Anda dapat membagikannya ke WhatsApp pasangan atau menunjukkan kode QR.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Tautkan / Buat Kode 24 Jam"
                  onClick={handleCreateNewInvite}
                  disabled={isCreating}
                  className="btn btn-primary w-full"
                >
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  <span>{isCreating ? 'Membuat Kode...' : 'Buat Kode Undangan 24 Jam'}</span>
                </button>
              </div>

              {/* OPSI 2: Masukkan Kode dari Pasangan */}
              <div className="well p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                    2. Punya Kode dari Pasangan?
                  </h3>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    Masukkan kode 6–8 karakter yang dikirimkan oleh pasangan Anda untuk langsung menghubungkan rencana berdua.
                  </p>
                </div>

                <form onSubmit={handleJoinWithCode} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Mis: BERSAMA24"
                      aria-label="Kode undangan pasangan"
                      className="field flex-1 font-mono font-bold uppercase"
                    />
                    <button
                      type="submit"
                      disabled={!joinCodeInput.trim()}
                      className="btn btn-coral shrink-0"
                    >
                      Hubungkan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Batas Privasi Pasangan & Kendali Per Item (Kriteria Penerimaan #3) */}
        {pairing && pairing.status === 'active' && (
          <div className="well p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5">
              <h3 className="eyebrow flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Kendali Privasi Per Item (Default: TIDAK Dibagikan ke Pasangan)
              </h3>
              <span className="text-2xs text-brand-navy/60 dark:text-white/60">
                Hanya Rendra yang dapat mengubah izin berbagi datanya
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold">Jawaban Kuesioner Cek Awal</div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                    {pairing.shared_items.shareAssessmentAnswers
                      ? 'Terbuka untuk pasangan'
                      : 'Tertutup rapat (Privat)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={activePersona === 'sari'}
                  checked={Boolean(pairing.shared_items.shareAssessmentAnswers)}
                  onChange={(e) =>
                    updatePairingSharedItems({ shareAssessmentAnswers: e.target.checked })
                  }
                  className="switch"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold">Tingkat Saran Hasil Cek Awal</div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                    {pairing.shared_items.shareAssessmentLevel
                      ? 'Terbuka untuk pasangan'
                      : 'Tertutup rapat (Privat)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={activePersona === 'sari'}
                  checked={Boolean(pairing.shared_items.shareAssessmentLevel)}
                  onChange={(e) =>
                    updatePairingSharedItems({ shareAssessmentLevel: e.target.checked })
                  }
                  className="switch"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold">Angka Hasil Laboratorium</div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                    {pairing.shared_items.shareLabSummary
                      ? 'Terbuka untuk pasangan'
                      : 'Tertutup rapat (Privat)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={activePersona === 'sari'}
                  checked={Boolean(pairing.shared_items.shareLabSummary)}
                  onChange={(e) =>
                    updatePairingSharedItems({ shareLabSummary: e.target.checked })
                  }
                  className="switch"
                />
              </label>
            </div>

            {/* Bukti Visual Privasi Saat Dilihat oleh Pasangan (Sari) */}
            <div className="p-3.5 rounded-xl bg-brand-navy/5 dark:bg-white/5 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-brand-navy dark:text-white">
                <Lock className="w-3.5 h-3.5 text-brand-teal" />
                Apa yang Dilihat Pasangan ({pairing.partner_b_alias}) Saat Ini:
              </div>
              {!pairing.shared_items.shareAssessmentAnswers &&
              !pairing.shared_items.shareAssessmentLevel &&
              !pairing.shared_items.shareLabSummary ? (
                <p className="text-brand-navy/75 dark:text-white/75">
                  Pasangan <strong>hanya melihat status tahapan Rencana Kita di bawah ini</strong>. Isi jawaban kuesioner dan hasil laboratorium Rendra disembunyikan sepenuhnya.
                </p>
              ) : (
                <div className="space-y-1 text-brand-navy/85 dark:text-white/85">
                  {pairing.shared_items.shareAssessmentLevel && assessmentResult && (
                    <div>
                      • Saran Cek Awal yang dibagikan: <strong>{assessmentResult.levelLabel}</strong>
                    </div>
                  )}
                  {pairing.shared_items.shareLabSummary && (
                    <div>
                      • Jumlah catatan hasil lab yang dibagikan: <strong>{labResults.length} hasil tes</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Seksi 2: Layar Bersama "Rencana Kita" (6 Tahapan Tanpa Membuka Isi Hasil) */}
      {pairing && pairing.status === 'active' && (
        <section className="card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="section-title">
                Layar Bersama: “Rencana Kita”
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                Klik status pada tiap tahapan untuk memperbarui progres masing-masing tanpa menampilkan detail medis pribadi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pairing.plan_steps.map((step) => (
              <div
                key={step.step_key}
                className="well p-4 flex flex-col justify-between gap-3.5"
              >
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-teal-strong text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {step.step_order}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-brand-navy dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-2xs text-brand-navy/65 dark:text-white/65">
                      Status tahapan bersama (tanpa menampilkan isi hasil)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Status Suami (Rendra) */}
                  <div className="space-y-1">
                    <label
                      htmlFor={`step-a-${step.step_key}`}
                      className="block text-3xs font-bold uppercase tracking-wide text-brand-navy/65 dark:text-white/65 truncate"
                    >
                      {pairing.partner_a_alias}
                    </label>
                    <select
                      id={`step-a-${step.step_key}`}
                      value={step.status_a}
                      onChange={(e) =>
                        updatePlanStep(
                          step.step_key,
                          'a',
                          e.target.value as 'not_started' | 'in_progress' | 'done'
                        )
                      }
                      className={`status-select ${statusColors[step.status_a]}`}
                    >
                      <option value="not_started">{statusLabels.not_started}</option>
                      <option value="in_progress">{statusLabels.in_progress}</option>
                      <option value="done">{statusLabels.done}</option>
                    </select>
                  </div>

                  {/* Status Istri (Sari) */}
                  <div className="space-y-1">
                    <label
                      htmlFor={`step-b-${step.step_key}`}
                      className="block text-3xs font-bold uppercase tracking-wide text-brand-navy/65 dark:text-white/65 truncate"
                    >
                      {pairing.partner_b_alias}
                    </label>
                    <select
                      id={`step-b-${step.step_key}`}
                      value={step.status_b}
                      onChange={(e) =>
                        updatePlanStep(
                          step.step_key,
                          'b',
                          e.target.value as 'not_started' | 'in_progress' | 'done'
                        )
                      }
                      className={`status-select ${statusColors[step.status_b]}`}
                    >
                      <option value="not_started">{statusLabels.not_started}</option>
                      <option value="in_progress">{statusLabels.in_progress}</option>
                      <option value="done">{statusLabels.done}</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Linimasa Persiapan Bersama (Checklist) & Jadwal Pemeriksaan Berdua */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-brand-navy/10 dark:border-white/10">
            <div className="well p-4 sm:p-5 space-y-3">
              <h3 className="eyebrow flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                Linimasa Persiapan Bersama (Checklist)
              </h3>
              <div className="space-y-2">
                {sharedPrepChecklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => togglePrepItem(item.id)}
                      className="check mt-0.5 shrink-0"
                    />
                    <span className={item.checked ? 'line-through opacity-65' : ''}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="well p-4 sm:p-5 space-y-3">
              <h3 className="eyebrow !text-[#B93E2B] dark:!text-[#FFA596] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Jadwal & Pengingat Pemeriksaan Keduanya
              </h3>
              {reminders.length === 0 ? (
                <p className="text-xs text-brand-navy/70 dark:text-white/70">
                  Belum ada pengingat pemeriksaan bersama yang terjadwal.
                </p>
              ) : (
                <div className="space-y-2">
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 rounded-xl bg-surface dark:bg-surface-dark-card text-xs border border-brand-navy/5 dark:border-white/10"
                    >
                      <div className="font-bold text-brand-navy dark:text-white">{rem.title}</div>
                      {rem.facilityName && (
                        <div className="text-brand-teal font-medium">{rem.facilityName}</div>
                      )}
                      <div className="text-2xs opacity-75">
                        Waktu: {rem.remindAt.replace('T', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pesan Semangat Singkat yang Disediakan */}
          <div className="pt-1 space-y-2.5">
            <h3 className="eyebrow flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4" />
              Kirim Pesan Semangat Singkat ke Pasangan
            </h3>
            <div className="flex flex-wrap gap-2">
              {templatesConfig.supportiveQuickNotes.map((note, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    updatePairingSharedItems(
                      activePersona === 'sari' ? { noteFromB: note } : { noteFromA: note }
                    )
                  }
                  className="px-3.5 py-2.5 rounded-2xl bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 dark:border-white/10 hover:border-brand-teal hover:bg-brand-teal-soft dark:hover:bg-white/5 text-xs text-left transition"
                >
                  “{note}”
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seksi 3: "Ajak dengan Lembut" (3 Gaya Nada: Hangat, Santai, Praktis) */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title flex items-start gap-2">
              <MessageSquareHeart className="w-5 h-5 text-brand-coral shrink-0 mt-1" />
              <span>“Ajak dengan Lembut” — Templat Pesan Tanpa Menyalahkan</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Pilih gaya nada yang paling cocok dengan keseharian Anda berdua, lalu salin ke WhatsApp atau aplikasi chat.
            </p>
          </div>

          {/* Filter 3 Gaya Nada */}
          <div className="flex gap-1 p-1 rounded-full bg-brand-navy/[0.05] dark:bg-white/[0.06] self-start shrink-0">
            {['Semua', 'Hangat', 'Santai', 'Praktis'].map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setSelectedTone(tone)}
                aria-pressed={selectedTone === tone}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${
                  selectedTone === tone
                    ? 'bg-brand-teal-strong text-white shadow-xs'
                    : 'text-brand-navy/70 dark:text-white/70 hover:text-brand-navy dark:hover:text-white'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="well p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge badge-coral">
                    Nada: {tpl.tone}
                  </span>
                  <span className="text-2xs font-semibold text-brand-navy/60 dark:text-white/60">
                    {tpl.senderRole}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-brand-navy dark:text-white">{tpl.title}</h3>
                <p className="text-sm text-brand-navy/85 dark:text-white/85 leading-relaxed italic bg-surface dark:bg-surface-dark-card p-4 rounded-xl border border-brand-navy/5 dark:border-white/10">
                  “{tpl.message}”
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(tpl.id, tpl.message)}
                  className="btn btn-navy flex-1"
                >
                  {copiedId === tpl.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>
                    {copiedId === tpl.id ? 'Pesan Disalin!' : 'Salin ke Aplikasi Chat'}
                  </span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(tpl.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp shrink-0"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
