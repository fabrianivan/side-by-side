import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { getLocalizedTemplates } from '../config/schemas';
import { PLAN_STEPS_EN } from '../config/localization-en';
import { useApp, type PrepChecklistItem } from '../context/AppContext';

const DEFAULT_PREP_CHECKLIST: PrepChecklistItem[] = [
  {
    id: 'prep-1',
    text: 'Sepakati jendela masa pantang (abstinensia 2–7 hari) sebelum jadwal analisis semen',
    textEn: 'Agree on the 2–7 day abstinence window before your semen analysis appointment',
    checked: false,
  },
  {
    id: 'prep-2',
    text: 'Siapkan kartu identitas & rujukan JKN/asuransi untuk kunjungan klinik',
    textEn: 'Prepare ID cards and insurance / JKN referral paperwork for the clinic visit',
    checked: false,
  },
  {
    id: 'prep-3',
    text: 'Susun daftar pertanyaan bersama untuk ditanyakan saat konsultasi dokter',
    textEn: 'Prepare a shared list of questions to bring to the doctor consultation',
    checked: false,
  },
  {
    id: 'prep-4',
    text: 'Jadwalkan waktu santai berdua setelah kunjungan klinik (zona bebas stres)',
    textEn: 'Schedule relaxing time together after the clinic visit (stress-free zone)',
    checked: false,
  },
];

export const CoupleModePage: React.FC = () => {
  const {
    locale,
    userId,
    displayName,
    pairing,
    assessmentAnswers,
    assessmentResult,
    labResults,
    reminders,
    createNewPairing,
    joinPairing,
    refreshPairing,
    updatePlanStep,
    updatePairingSharedItems,
    updatePrepChecklist,
    revokePairing,
  } = useApp();
  const isEn = locale === 'en';
  const isPartnerB = Boolean(pairing && pairing.user_b && userId && userId === pairing.user_b);
  const hasPartnerJoined = Boolean(pairing && pairing.user_b);

  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code');

  const [joinCodeInput, setJoinCodeInput] = useState<string>(urlCode ? urlCode.toUpperCase() : '');
  const [selectedTone, setSelectedTone] = useState<string>('Semua');
  const [copiedId, setCopiedId] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [confirmRevoke, setConfirmRevoke] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [pairSuccessMsg, setPairSuccessMsg] = useState<string>('');
  const [pairErrorMsg, setPairErrorMsg] = useState<string>('');
  const [newPrepText, setNewPrepText] = useState<string>('');

  useEffect(() => {
    if (urlCode && (!pairing || pairing.status !== 'active')) {
      setJoinCodeInput(urlCode.toUpperCase());
    }
  }, [urlCode, pairing]);

  // Live sync polling with partner device
  const handleManualRefresh = useCallback(async () => {
    if (!pairing || pairing.status !== 'active') return;
    setIsRefreshing(true);
    await refreshPairing();
    setIsRefreshing(false);
  }, [pairing, refreshPairing]);

  useEffect(() => {
    if (!pairing || pairing.status !== 'active') return;
    void refreshPairing();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshPairing();
      }
    }, 8000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing?.invite_code, pairing?.status]);

  const sharedPrepChecklist =
    pairing?.prep_checklist && pairing.prep_checklist.length > 0
      ? pairing.prep_checklist
      : DEFAULT_PREP_CHECKLIST;

  const togglePrepItem = async (id: string) => {
    const next = sharedPrepChecklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    const res = await updatePrepChecklist(next);
    if (!res.ok && res.error) {
      setPairErrorMsg(res.error);
    }
  };

  const handleAddPrepItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPrepText.trim();
    if (!trimmed) return;
    const next: PrepChecklistItem[] = [
      ...sharedPrepChecklist,
      {
        id: 'prep-' + Date.now(),
        text: trimmed,
        textEn: trimmed,
        checked: false,
      },
    ];
    const res = await updatePrepChecklist(next);
    if (res.ok) {
      setNewPrepText('');
    } else if (res.error) {
      setPairErrorMsg(res.error);
    }
  };

  const resolvePairingAliases = (): [string, string] => {
    const a =
      displayName && !displayName.includes('Anonim') && !displayName.includes('Anonymous')
        ? displayName
        : isEn
        ? 'Partner A'
        : 'Pasangan A';
    const b = isEn ? 'Partner B' : 'Pasangan B';
    return [a, b];
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard fallback
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2500);
  };

  const handleCreateNewInvite = async () => {
    setPairErrorMsg('');
    setPairSuccessMsg('');
    setIsCreating(true);
    const [aliasA, aliasB] = resolvePairingAliases();
    const res = await createNewPairing(aliasA, aliasB);
    setIsCreating(false);
    if (res.ok) {
      setPairSuccessMsg(
        isEn ? '24-hour partner invite link created!' : 'Kode tautan pasangan 24 jam berhasil dibuat!'
      );
      setTimeout(() => setPairSuccessMsg(''), 4000);
    } else {
      setPairErrorMsg(
        res.error ||
          (isEn ? 'Failed to create partner invite code.' : 'Gagal membuat kode undangan pasangan.')
      );
    }
  };

  const handleJoinCode = async (code: string) => {
    if (!code.trim()) return;
    setPairErrorMsg('');
    setPairSuccessMsg('');
    setIsCreating(true);
    const [, aliasB] = resolvePairingAliases();
    const res = await joinPairing(code.trim(), aliasB);
    setIsCreating(false);
    if (res.ok) {
      setPairSuccessMsg(
        isEn
          ? `Connected with your partner using code ${code.trim().toUpperCase()}!`
          : `Berhasil terhubung dengan pasangan menggunakan kode ${code.trim().toUpperCase()}!`
      );
      setTimeout(() => setPairSuccessMsg(''), 4000);
    } else {
      setPairErrorMsg(
        res.error ||
          (isEn ? 'Unable to connect using that partner code.' : 'Gagal menautkan kode pasangan.')
      );
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleJoinCode(joinCodeInput);
  };

  const handleShareWhatsApp = () => {
    if (!pairing) return;
    const shareUrl = `${window.location.origin}${isEn ? '/couple' : '/berdua'}?code=${pairing.invite_code}`;
    const text = isEn
      ? `Hey, let's open our shared preparation timeline and appointment reminders on Side by Side. Use our partner code: *${pairing.invite_code}*\n\nOpen here:\n${shareUrl}`
      : `Hai sayang, yuk kita buka linimasa persiapan & jadwal pemeriksaan kita di Side by Side. Gunakan kode tautan kita: *${pairing.invite_code}*\n\nBuka langsung di sini:\n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const localizedTemplates = getLocalizedTemplates(locale);
  const TONE_MAP_ID: Record<string, string> = {
    Warm: 'Hangat',
    Casual: 'Santai',
    Practical: 'Praktis',
  };
  const filteredTemplates = localizedTemplates.partnerInviteTemplates.filter(
    (tpl) => selectedTone === 'Semua' || tpl.tone === selectedTone || TONE_MAP_ID[tpl.tone] === selectedTone
  );

  const statusLabels: Record<'not_started' | 'in_progress' | 'done', string> = {
    not_started: isEn ? 'Not started' : 'Belum mulai',
    in_progress: isEn ? 'In progress' : 'Sedang berjalan',
    done: isEn ? 'Completed' : 'Selesai',
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
            {isEn ? 'Couple Mode — “Better together.”' : 'Mode Berdua — “Better together.”'}
          </span>
          {isPartnerB && pairing && (
            <span className="badge badge-coral">
              {isEn
                ? `Viewing as Partner: ${pairing.partner_b_alias}`
                : `Tampilan Sudut Pandang Pasangan: ${pairing.partner_b_alias}`}
            </span>
          )}
        </div>
        <h1 className="page-title">
          {isEn ? 'Our Plan & Partner Support' : 'Rencana Kita & Pendampingan Pasangan'}
        </h1>
        <p className="page-lead">
          {isEn
            ? 'Move forward together without losing personal privacy. By default, only shared milestone steps, prep checklist, and reminders are visible—your questionnaire answers and lab numbers remain private unless you explicitly choose to share them.'
            : 'Melangkah bersama pasangan tanpa kehilangan ruang privasi. Secara default hanya progres tahapan, checklist persiapan, dan pengingat yang terlihat bersama—isi kuesioner dan hasil lab Anda tetap tertutup kecuali Anda memilih membagikannya.'}
        </p>
      </section>

      {/* Seksi 1: Tautkan Pasangan */}
      <section className="card p-5 sm:p-7 space-y-6">
        {pairSuccessMsg && (
          <div
            role="status"
            className="p-3.5 rounded-card bg-status-success-bg text-[#1F7A50] text-xs font-bold flex items-center gap-2 border border-status-success/30 shadow-xs animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pairSuccessMsg}</span>
          </div>
        )}

        {pairErrorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-card bg-status-urgent-bg text-[#B33834] text-xs font-bold flex items-center gap-2 border border-status-urgent/30"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pairErrorMsg}</span>
          </div>
        )}

        {pairing && pairing.status === 'active' ? (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-brand-navy/10 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="section-title flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-brand-teal shrink-0" />
                  <span>{isEn ? 'Partner Link Active' : 'Tautan Pasangan Aktif'}</span>
                </h2>
                <span className="badge badge-success">
                  {hasPartnerJoined
                    ? isEn
                      ? 'Both Partners Connected'
                      : 'Keduanya Terhubung'
                    : isEn
                    ? 'Awaiting Partner Join'
                    : 'Menunggu Pasangan Bergabung'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-brand-navy/65 dark:text-white/65">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                  <span>{isEn ? 'Valid 24 hours' : 'Berlaku 24 jam'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isEn ? 'Sync Status' : 'Segarkan'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="well p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-brand-navy/55 dark:text-white/55">
                    {isEn ? 'Primary Inviter' : 'Pengundang Utama'}
                  </div>
                  <div className="text-sm font-bold text-brand-navy dark:text-white mt-0.5">
                    {pairing.partner_a_alias}
                  </div>
                </div>
                <span className="badge badge-teal">{isEn ? 'Partner A' : 'Pasangan A'}</span>
              </div>

              <div className="well p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-brand-navy/55 dark:text-white/55">
                    {isEn ? 'Support Partner' : 'Pasangan Pendamping'}
                  </div>
                  <div className="text-sm font-bold text-brand-navy dark:text-white mt-0.5">
                    {pairing.partner_b_alias}
                  </div>
                </div>
                <span className="badge badge-coral">{isEn ? 'Partner B' : 'Pasangan B'}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-surface-muted/60 dark:bg-surface-dark p-4 sm:p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-teal-dark dark:text-[#7FDADB]">
                    {isEn
                      ? 'Partner Invite Code (24 Hours)'
                      : 'Kode Tautan Undangan Pasangan (24 Jam)'}
                  </div>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Share this random code or send the direct link so your partner can open the shared timeline on their phone.'
                      : 'Bagikan kode acak ini atau kirim tautan langsung agar pasangan dapat membuka linimasa bersama di HP-nya.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <code className="inline-block whitespace-nowrap select-all rounded-xl bg-white dark:bg-surface-dark-card border border-brand-teal/40 px-4 py-2.5 text-xl sm:text-2xl font-extrabold font-mono tracking-[0.22em] text-brand-navy dark:text-white shadow-xs">
                    {pairing.invite_code}
                  </code>
                  {!isPartnerB && (
                    <button
                      type="button"
                      onClick={handleCreateNewInvite}
                      disabled={isCreating}
                      title={isEn ? 'Generate new random code' : 'Buat kode acak baru'}
                      aria-label={isEn ? 'Generate new random code' : 'Buat kode acak baru'}
                      className="btn btn-secondary px-3 py-2.5"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCreating ? 'animate-spin' : ''}`} />
                      <span className="text-xs">{isEn ? 'New Code' : 'Acak Baru'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-navy/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleCopyText('invite-code', pairing.invite_code)}
                  className="btn btn-secondary"
                >
                  {copiedId === 'invite-code' ? <Check className="w-4 h-4 text-brand-teal" /> : <Copy className="w-4 h-4" />}
                  <span>
                    {copiedId === 'invite-code'
                      ? isEn
                        ? 'Code Copied!'
                        : 'Kode Disalin!'
                      : isEn
                      ? 'Copy Code'
                      : 'Salin Kode'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      'invite-url',
                      `${window.location.origin}${isEn ? '/couple' : '/berdua'}?code=${pairing.invite_code}`
                    )
                  }
                  className="btn btn-primary"
                >
                  {copiedId === 'invite-url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>
                    {copiedId === 'invite-url'
                      ? isEn
                        ? 'Link Copied!'
                        : 'Tautan Disalin!'
                      : isEn
                      ? 'Copy Link'
                      : 'Salin Tautan'}
                  </span>
                </button>

                <button type="button" onClick={handleShareWhatsApp} className="btn btn-whatsapp">
                  <MessageCircle className="w-4 h-4" />
                  <span>{isEn ? 'Send via WhatsApp' : 'Kirim ke WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(!showQrModal)}
                  aria-expanded={showQrModal}
                  className={`btn ${showQrModal ? 'btn-soft' : 'btn-secondary'}`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {showQrModal ? (isEn ? 'Hide QR' : 'Tutup QR') : isEn ? 'Show QR' : 'Tampilkan QR'}
                  </span>
                </button>
              </div>

              {showQrModal && (
                <div className="pt-4 border-t border-brand-navy/10 dark:border-white/10 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 bg-white rounded-xl border border-brand-navy/15 shrink-0">
                    <QRCodeSVG
                      value={`${window.location.origin}${isEn ? '/couple' : '/berdua'}?code=${pairing.invite_code}`}
                      size={136}
                      fgColor="#1B2A41"
                      level="M"
                    />
                  </div>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Point your partner’s phone camera directly at this QR code to link your shared timeline automatically.'
                      : 'Arahkan kamera HP pasangan Anda langsung ke kode QR ini untuk menghubungkan linimasa secara otomatis.'}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-2xs text-brand-navy/60 dark:text-white/60">
                {isEn
                  ? 'You can revoke the partner link anytime if you want to end shared access.'
                  : 'Tautan dapat dicabut kapan saja jika Anda ingin membatalkan akses pasangan.'}
              </span>
              {confirmRevoke ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-status-urgent">
                    {isEn ? 'Revoke partner link?' : 'Yakin cabut tautan?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void revokePairing();
                      setConfirmRevoke(false);
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    {isEn ? 'Yes, Revoke' : 'Ya, Cabut'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    {isEn ? 'Cancel' : 'Batal'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  className="text-xs font-semibold text-status-urgent hover:underline flex items-center gap-1.5"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Revoke Partner Link' : 'Cabut Tautan Pasangan'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-brand-teal" />
                <h2 className="section-title">
                  {isEn ? 'Link Your Partner (Couple Mode)' : 'Tautkan Pasangan (Mode Berdua)'}
                </h2>
              </div>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Choose whether you want to create a new 24-hour invite code to send to your partner, or enter a code you received from them.'
                  : 'Pilih apakah Anda ingin membuat kode undangan baru untuk dikirimkan ke pasangan, atau memasukkan kode yang Anda terima dari pasangan.'}
              </p>
            </div>

            {urlCode && (
              <div className="p-4 rounded-2xl bg-brand-teal/10 border-2 border-brand-teal flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                    <Link2 className="w-4 h-4" />
                    <span>
                      {isEn ? 'Partner Invite Code Detected:' : 'Kode Undangan Terdeteksi dari Pasangan:'}
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-brand-navy dark:text-white">
                    {urlCode.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleJoinCode(urlCode)}
                  disabled={isCreating}
                  className="btn btn-primary shrink-0"
                >
                  {isEn ? 'Connect Now →' : 'Hubungkan Sekarang →'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="well p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                    {isEn ? '1. Create New Invite Code' : '1. Buat Kode Undangan Baru'}
                  </h3>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Create a one-time invite link valid for 24 hours. Share it via WhatsApp or show the QR code.'
                      : 'Buat kode tautan sekali pakai berlaku 24 jam. Anda dapat membagikannya ke WhatsApp pasangan atau menunjukkan kode QR.'}
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
                  <span>
                    {isCreating
                      ? isEn
                        ? 'Creating Code...'
                        : 'Membuat Kode...'
                      : isEn
                      ? 'Create 24-Hour Invite Code'
                      : 'Buat Kode Undangan 24 Jam'}
                  </span>
                </button>
              </div>

              <div className="well p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral-dark dark:text-brand-coral flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                    {isEn ? '2. Have a Partner Code?' : '2. Punya Kode dari Pasangan?'}
                  </h3>
                  <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                    {isEn
                      ? 'Enter the 6-character code sent by your partner to connect your shared plan right away.'
                      : 'Masukkan kode 6 karakter yang dikirimkan oleh pasangan Anda untuk langsung menghubungkan rencana berdua.'}
                  </p>
                </div>

                <form onSubmit={handleJoinWithCode} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder={isEn ? 'e.g., K7M4P9' : 'Contoh: K7M4P9'}
                      aria-label={isEn ? 'Partner invite code' : 'Kode undangan pasangan'}
                      className="field flex-1 font-mono font-bold uppercase"
                    />
                    <button
                      type="submit"
                      disabled={!joinCodeInput.trim() || isCreating}
                      className="btn btn-coral shrink-0"
                    >
                      {isEn ? 'Connect' : 'Hubungkan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Kendali Privasi Per Item */}
        {pairing && pairing.status === 'active' && (
          <div className="well p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5">
              <h3 className="eyebrow flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {isEn
                  ? 'Per-Item Privacy Controls (Default: NOT Shared with Partner)'
                  : 'Kendali Privasi Per Item (Default: TIDAK Dibagikan ke Pasangan)'}
              </h3>
              <span className="text-2xs text-brand-navy/60 dark:text-white/60">
                {isEn
                  ? `Only ${pairing.partner_a_alias} can change data sharing permissions`
                  : `Hanya ${pairing.partner_a_alias} yang dapat mengubah izin berbagi datanya`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold">
                    {isEn ? 'Self-Check Answers' : 'Jawaban Kuesioner Cek Awal'}
                  </div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                    {pairing.shared_items.shareAssessmentAnswers
                      ? isEn
                        ? 'Visible to partner'
                        : 'Terbuka untuk pasangan'
                      : isEn
                      ? 'Strictly private'
                      : 'Tertutup rapat (Privat)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPartnerB}
                  checked={Boolean(pairing.shared_items.shareAssessmentAnswers)}
                  onChange={(e) =>
                    void updatePairingSharedItems({ shareAssessmentAnswers: e.target.checked })
                  }
                  className="switch"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold">
                    {isEn ? 'Self-Check Guidance Level' : 'Tingkat Saran Hasil Cek Awal'}
                  </div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                    {pairing.shared_items.shareAssessmentLevel
                      ? isEn
                        ? 'Visible to partner'
                        : 'Terbuka untuk pasangan'
                      : isEn
                      ? 'Strictly private'
                      : 'Tertutup rapat (Privat)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPartnerB}
                  checked={Boolean(pairing.shared_items.shareAssessmentLevel)}
                  onChange={(e) =>
                    void updatePairingSharedItems({ shareAssessmentLevel: e.target.checked })
                  }
                  className="switch"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold">
                    {isEn ? 'Semen Lab Numbers' : 'Angka Hasil Laboratorium'}
                  </div>
                  <p className="text-2xs text-brand-navy/70 dark:text-white/70 mt-0.5">
                    {pairing.shared_items.shareLabSummary
                      ? isEn
                        ? 'Visible to partner'
                        : 'Terbuka untuk pasangan'
                      : isEn
                      ? 'Strictly private'
                      : 'Tertutup rapat (Privat)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPartnerB}
                  checked={Boolean(pairing.shared_items.shareLabSummary)}
                  onChange={(e) =>
                    void updatePairingSharedItems({ shareLabSummary: e.target.checked })
                  }
                  className="switch"
                />
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-navy/5 dark:bg-white/5 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-brand-navy dark:text-white">
                <Lock className="w-3.5 h-3.5 text-brand-teal" />
                {isPartnerB
                  ? isEn
                    ? `Data Shared by ${pairing.partner_a_alias || 'Partner A'} With You:`
                    : `Data yang Dibagikan ${pairing.partner_a_alias || 'Pasangan A'} kepada Anda:`
                  : isEn
                  ? `What Partner (${pairing.partner_b_alias}) Currently Sees:`
                  : `Apa yang Dilihat Pasangan (${pairing.partner_b_alias}) Saat Ini:`}
              </div>
              {!pairing.shared_items.shareAssessmentAnswers &&
              !pairing.shared_items.shareAssessmentLevel &&
              !pairing.shared_items.shareLabSummary ? (
                <p className="text-brand-navy/75 dark:text-white/75">
                  {isEn ? (
                    <>
                      Partner <strong>only sees the Our Plan milestone statuses below</strong>.{' '}
                      {pairing.partner_a_alias}’s questionnaire answers and lab results remain completely hidden.
                    </>
                  ) : (
                    <>
                      Pasangan <strong>hanya melihat status tahapan Rencana Kita di bawah ini</strong>. Isi
                      jawaban kuesioner dan hasil laboratorium {pairing.partner_a_alias} disembunyikan
                      sepenuhnya.
                    </>
                  )}
                </p>
              ) : (
                <div className="space-y-1 text-brand-navy/85 dark:text-white/85">
                  {pairing.shared_items.shareAssessmentAnswers && (
                    <div>
                      • {isEn ? 'Shared self-check answers:' : 'Jawaban Cek Awal yang dibagikan:'}{' '}
                      <strong>
                        {isPartnerB
                          ? (pairing.partner_shared_preview?.answeredTopicsCount ?? 0) > 0
                            ? isEn
                              ? `${pairing.partner_shared_preview?.answeredTopicsCount} topics answered`
                              : `${pairing.partner_shared_preview?.answeredTopicsCount} topik dijawab`
                            : isEn
                            ? 'No answers recorded yet'
                            : 'Belum ada jawaban tersimpan'
                          : Object.keys(assessmentAnswers).length > 0
                          ? isEn
                            ? `${Object.keys(assessmentAnswers).length} topics answered`
                            : `${Object.keys(assessmentAnswers).length} topik dijawab`
                          : isEn
                          ? 'No answers recorded yet'
                          : 'Belum ada jawaban tersimpan'}
                      </strong>
                    </div>
                  )}
                  {pairing.shared_items.shareAssessmentLevel &&
                    (isPartnerB
                      ? pairing.partner_shared_preview?.assessmentLevel
                      : assessmentResult?.levelLabel) && (
                      <div>
                        • {isEn ? 'Shared self-check guidance level:' : 'Saran Cek Awal yang dibagikan:'}{' '}
                        <strong>
                          {isPartnerB
                            ? ({
                                routine: isEn
                                  ? 'Consider a routine check-up'
                                  : 'Pertimbangkan pemeriksaan rutin',
                                within_1_2_months: isEn
                                  ? 'Recommended to consult within 1 to 2 months'
                                  : 'Sebaiknya periksa dalam 1 sampai 2 bulan',
                                immediate: isEn
                                  ? 'Recommended to consult promptly'
                                  : 'Sebaiknya periksa segera',
                              }[pairing.partner_shared_preview?.assessmentLevel || ''] ||
                              pairing.partner_shared_preview?.assessmentLevel)
                            : assessmentResult?.levelLabel}
                        </strong>
                      </div>
                    )}
                  {pairing.shared_items.shareLabSummary && (
                    <div>
                      • {isEn ? 'Shared lab log count:' : 'Jumlah catatan hasil lab yang dibagikan:'}{' '}
                      <strong>
                        {isPartnerB
                          ? isEn
                            ? `${pairing.partner_shared_preview?.labCount ?? 0} test entries`
                            : `${pairing.partner_shared_preview?.labCount ?? 0} hasil tes`
                          : isEn
                          ? `${labResults.length} test entries`
                          : `${labResults.length} hasil tes`}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Seksi 2: Layar Bersama "Rencana Kita" */}
      {pairing && pairing.status === 'active' && (
        <section className="card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="section-title">
                {isEn ? 'Shared Screen: “Our Plan”' : 'Layar Bersama: “Rencana Kita”'}
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70 leading-relaxed">
                {isEn
                  ? 'Update your own status for each milestone step without exposing private medical details.'
                  : 'Perbarui status tahapan Anda masing-masing tanpa menampilkan detail medis pribadi.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pairing.plan_steps.map((step) => (
              <div key={step.step_key} className="well p-4 flex flex-col justify-between gap-3.5">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-teal-strong text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {step.step_order}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-brand-navy dark:text-white">
                      {isEn ? PLAN_STEPS_EN[step.step_key] || step.title : step.title}
                    </h3>
                    <p className="text-2xs text-brand-navy/65 dark:text-white/65">
                      {isEn
                        ? 'Shared milestone status (private lab numbers hidden)'
                        : 'Status tahapan bersama (tanpa menampilkan isi hasil)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Status Pasangan A */}
                  <div className="space-y-1">
                    <label
                      htmlFor={`step-a-${step.step_key}`}
                      className="block text-3xs font-bold uppercase tracking-wide text-brand-navy/65 dark:text-white/65 truncate"
                    >
                      {pairing.partner_a_alias} {!isPartnerB ? `(${isEn ? 'You' : 'Anda'})` : ''}
                    </label>
                    <select
                      id={`step-a-${step.step_key}`}
                      disabled={isPartnerB}
                      value={step.status_a}
                      onChange={(e) =>
                        void updatePlanStep(
                          step.step_key,
                          'a',
                          e.target.value as 'not_started' | 'in_progress' | 'done'
                        )
                      }
                      className={`status-select ${statusColors[step.status_a]} disabled:opacity-75`}
                    >
                      <option value="not_started">{statusLabels.not_started}</option>
                      <option value="in_progress">{statusLabels.in_progress}</option>
                      <option value="done">{statusLabels.done}</option>
                    </select>
                  </div>

                  {/* Status Pasangan B */}
                  <div className="space-y-1">
                    <label
                      htmlFor={`step-b-${step.step_key}`}
                      className="block text-3xs font-bold uppercase tracking-wide text-brand-navy/65 dark:text-white/65 truncate"
                    >
                      {pairing.partner_b_alias} {isPartnerB ? `(${isEn ? 'You' : 'Anda'})` : ''}
                    </label>
                    <select
                      id={`step-b-${step.step_key}`}
                      disabled={hasPartnerJoined && !isPartnerB}
                      value={step.status_b}
                      onChange={(e) =>
                        void updatePlanStep(
                          step.step_key,
                          'b',
                          e.target.value as 'not_started' | 'in_progress' | 'done'
                        )
                      }
                      className={`status-select ${statusColors[step.status_b]} disabled:opacity-75`}
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

          {/* Linimasa Persiapan Bersama (DB-synced Checklist) & Jadwal Pemeriksaan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-brand-navy/10 dark:border-white/10">
            <div className="well p-4 sm:p-5 space-y-3">
              <h3 className="eyebrow flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                {isEn
                  ? 'Shared Preparation Timeline (Synced Checklist)'
                  : 'Linimasa Persiapan Bersama (Checklist Tersinkron)'}
              </h3>
              <div className="space-y-2">
                {sharedPrepChecklist.map((item) => (
                  <label key={item.id} className="flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => void togglePrepItem(item.id)}
                      className="check mt-0.5 shrink-0"
                    />
                    <span className={item.checked ? 'line-through opacity-65' : ''}>
                      {isEn ? item.textEn : item.text}
                    </span>
                  </label>
                ))}
              </div>
              <form onSubmit={handleAddPrepItem} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newPrepText}
                  onChange={(e) => setNewPrepText(e.target.value)}
                  placeholder={isEn ? 'Add a shared prep item...' : 'Tambah item persiapan bersama...'}
                  className="field flex-1 text-xs"
                />
                <button type="submit" disabled={!newPrepText.trim()} className="btn btn-secondary btn-sm shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Add' : 'Tambah'}</span>
                </button>
              </form>
            </div>

            <div className="well p-4 sm:p-5 space-y-3">
              <h3 className="eyebrow !text-[#B93E2B] dark:!text-[#FFA596] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {isEn ? 'Shared Appointment Schedule & Reminders' : 'Jadwal & Pengingat Pemeriksaan Keduanya'}
              </h3>
              {reminders.length === 0 ? (
                <p className="text-xs text-brand-navy/70 dark:text-white/70">
                  {isEn
                    ? 'No shared appointment reminders scheduled yet.'
                    : 'Belum ada pengingat pemeriksaan bersama yang terjadwal.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 rounded-xl bg-surface dark:bg-surface-dark-card text-xs border border-brand-navy/5 dark:border-white/10"
                    >
                      <div className="font-bold text-brand-navy dark:text-white">{rem.title}</div>
                      {rem.facilityName && <div className="text-brand-teal font-medium">{rem.facilityName}</div>}
                      <div className="text-2xs opacity-75">
                        {isEn ? 'Time:' : 'Waktu:'} {rem.remindAt.replace('T', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(pairing.shared_items.noteFromA || pairing.shared_items.noteFromB) && (
                <div className="pt-2 border-t border-brand-navy/10 dark:border-white/10 space-y-2 text-xs">
                  {pairing.shared_items.noteFromA && (
                    <div className="p-2.5 rounded-xl bg-brand-teal-light/40 dark:bg-brand-teal/15">
                      <span className="font-bold">{pairing.partner_a_alias}:</span> “{pairing.shared_items.noteFromA}”
                    </div>
                  )}
                  {pairing.shared_items.noteFromB && (
                    <div className="p-2.5 rounded-xl bg-brand-coral-light/40 dark:bg-brand-coral/15">
                      <span className="font-bold">{pairing.partner_b_alias}:</span> “{pairing.shared_items.noteFromB}”
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-1 space-y-2.5">
            <h3 className="eyebrow flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4" />
              {isEn
                ? 'Send a Quick Encouragement Note to Your Partner'
                : 'Kirim Pesan Semangat Singkat ke Pasangan'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {localizedTemplates.supportiveQuickNotes.map((note, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    void updatePairingSharedItems(
                      isPartnerB ? { noteFromB: note } : { noteFromA: note }
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

      {/* Seksi 3: "Ajak dengan Lembut" */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title flex items-start gap-2">
              <MessageSquareHeart className="w-5 h-5 text-brand-coral shrink-0 mt-1" />
              <span>
                {isEn
                  ? '“Invite Gently” — Non-Blaming Message Templates'
                  : '“Ajak dengan Lembut” — Templat Pesan Tanpa Menyalahkan'}
              </span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Pick a tone that fits how you two talk every day, then copy it to WhatsApp or your chat app.'
                : 'Pilih gaya nada yang paling cocok dengan keseharian Anda berdua, lalu salin ke WhatsApp atau aplikasi chat.'}
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-full bg-brand-navy/[0.05] dark:bg-white/[0.06] self-start shrink-0">
            {(['Semua', 'Hangat', 'Santai', 'Praktis'] as const).map((tone) => {
              const toneLabelEn: Record<string, string> = {
                Semua: 'All',
                Hangat: 'Warm',
                Santai: 'Casual',
                Praktis: 'Practical',
              };
              return (
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
                  {isEn ? toneLabelEn[tone] : tone}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => (
            <div key={tpl.id} className="well p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge badge-coral">
                    {isEn ? `Tone: ${tpl.tone}` : `Nada: ${tpl.tone}`}
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
                    {copiedId === tpl.id
                      ? isEn
                        ? 'Message Copied!'
                        : 'Pesan Disalin!'
                      : isEn
                      ? 'Copy to Chat App'
                      : 'Salin ke Aplikasi Chat'}
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
