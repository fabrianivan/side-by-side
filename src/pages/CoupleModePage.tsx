import React, { useState } from 'react';
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

  const [joinCodeInput, setJoinCodeInput] = useState<string>('BERSAMA24');
  const [selectedTone, setSelectedTone] = useState<string>('Semua');
  const [copiedId, setCopiedId] = useState<string>('');

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

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    await createNewPairing('Rendra (Suami)', 'Sari (Istri)');
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
    not_started: 'bg-brand-navy/10 text-brand-navy/70 dark:bg-white/10 dark:text-white/70',
    in_progress: 'bg-status-warning-bg text-brand-navy border border-status-warning/40',
    done: 'bg-status-success-bg text-status-success border border-status-success/30',
  };

  return (
    <div className="space-y-6">
      {/* Header Mode Berdua */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal bg-brand-teal-light px-3 py-1 rounded-full">
            <Users className="w-4 h-4" />
            Mode Berdua — “Better together.”
          </span>
          {activePersona === 'sari' && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-coral text-white">
              Tampilan Sudut Pandang Pasangan: Sari (Istri)
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
          Rencana Kita & Pendampingan Pasangan
        </h1>
        <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75 leading-relaxed">
          Melangkah bersama pasangan tanpa kehilangan ruang privasi. Secara default hanya progres tahapan, checklist persiapan, dan pengingat yang terlihat bersama—isi kuesioner dan hasil lab Anda tetap tertutup kecuali Anda memilih membagikannya.
        </p>
      </section>

      {/* Seksi 1: Tautkan Pasangan (Kode Undangan 24 Jam & Cabut Kapan Saja) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-brand-teal" />
              <span>Status Tautan Pasangan</span>
            </h2>
            {pairing && pairing.status === 'active' ? (
              <p className="text-xs text-brand-navy/75 dark:text-white/75">
                Terhubung antara <strong>{pairing.partner_a_alias}</strong> &{' '}
                <strong>{pairing.partner_b_alias}</strong> • Kode Undangan Sekali Pakai (24 Jam):{' '}
                <code className="font-bold text-brand-teal bg-brand-teal-light px-2 py-0.5 rounded">
                  {pairing.invite_code}
                </code>
              </p>
            ) : (
              <p className="text-xs text-brand-navy/75 dark:text-white/75">
                Belum ada pasangan tertaut atau tautan telah dicabut. Buat kode undangan sekali pakai (berlaku 24 jam) di bawah ini.
              </p>
            )}
          </div>

          {pairing && pairing.status === 'active' ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    'invite-link',
                    `Yuk kita susun rencana pemeriksaan bersama di Side by Side. Gunakan kode undangan berlaku 24 jam: ${pairing.invite_code}`
                  )
                }
                className="touch-target px-3.5 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5"
              >
                {copiedId === 'invite-link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === 'invite-link' ? 'Kode Disalin' : 'Salin Kode & Tautan'}</span>
              </button>

              <button
                type="button"
                onClick={revokePairing}
                className="touch-target px-3.5 py-2 rounded-btn bg-status-urgent-bg text-status-urgent border border-status-urgent/30 text-xs font-bold flex items-center gap-1.5 hover:bg-status-urgent hover:text-white transition"
              >
                <Unlink className="w-4 h-4" />
                <span>Cabut Tautan</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinWithCode} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Kode undangan (mis: BERSAMA24)"
                aria-label="Kode undangan pasangan"
                className="px-3.5 py-2 rounded-btn border border-brand-navy/20 text-xs font-bold uppercase text-brand-navy bg-white"
              />
              <button
                type="submit"
                className="touch-target px-4 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold"
              >
                Tautkan / Buat Kode 24 Jam
              </button>
            </form>
          )}
        </div>

        {/* Batas Privasi Pasangan & Kendali Per Item (Kriteria Penerimaan #3) */}
        {pairing && pairing.status === 'active' && (
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Kendali Privasi Per Item (Default: TIDAK Dibagikan ke Pasangan)
              </h3>
              <span className="text-[11px] text-brand-navy/60 dark:text-white/60">
                Hanya Rendra yang dapat mengubah izin berbagi datanya
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label className="p-3 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-navy/10 flex items-start justify-between gap-2 cursor-pointer">
                <div>
                  <div className="font-bold">Jawaban Kuesioner Cek Awal</div>
                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 mt-0.5">
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
                  className="w-4 h-4 accent-brand-teal mt-0.5"
                />
              </label>

              <label className="p-3 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-navy/10 flex items-start justify-between gap-2 cursor-pointer">
                <div>
                  <div className="font-bold">Tingkat Saran Hasil Cek Awal</div>
                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 mt-0.5">
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
                  className="w-4 h-4 accent-brand-teal mt-0.5"
                />
              </label>

              <label className="p-3 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-navy/10 flex items-start justify-between gap-2 cursor-pointer">
                <div>
                  <div className="font-bold">Angka Hasil Laboratorium</div>
                  <p className="text-[11px] text-brand-navy/70 dark:text-white/70 mt-0.5">
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
                  className="w-4 h-4 accent-brand-teal mt-0.5"
                />
              </label>
            </div>

            {/* Bukti Visual Privasi Saat Dilihat oleh Pasangan (Sari) */}
            <div className="p-3 rounded-btn bg-brand-navy/5 dark:bg-white/5 text-xs space-y-1">
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
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-brand-navy dark:text-white">
                Layar Bersama: “Rencana Kita”
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Klik status pada tiap tahapan untuk memperbarui progres masing-masing tanpa menampilkan detail medis pribadi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {pairing.plan_steps.map((step) => (
              <div
                key={step.step_key}
                className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-brand-teal text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {step.step_order}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-brand-navy dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
                      Status tahapan bersama (tanpa menampilkan isi hasil)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:w-80">
                  {/* Status Suami (Rendra) */}
                  <div className="space-y-1">
                    <label
                      htmlFor={`step-a-${step.step_key}`}
                      className="block text-[10px] font-bold uppercase text-brand-navy/70 dark:text-white/70"
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
                      className={`w-full px-2.5 py-1.5 rounded-btn text-xs font-bold ${statusColors[step.status_a]}`}
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
                      className="block text-[10px] font-bold uppercase text-brand-navy/70 dark:text-white/70"
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
                      className={`w-full px-2.5 py-1.5 rounded-btn text-xs font-bold ${statusColors[step.status_b]}`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-brand-navy/10">
            <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                Linimasa Persiapan Bersama (Checklist)
              </h3>
              <div className="space-y-2">
                {sharedPrepChecklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => togglePrepItem(item.id)}
                      className="w-4 h-4 accent-brand-teal mt-0.5 shrink-0"
                    />
                    <span className={item.checked ? 'line-through opacity-65' : ''}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-coral flex items-center gap-1.5">
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
                      className="p-2.5 rounded bg-surface dark:bg-surface-dark-card text-xs border border-brand-navy/5"
                    >
                      <div className="font-bold text-brand-navy dark:text-white">{rem.title}</div>
                      {rem.facilityName && (
                        <div className="text-brand-teal font-medium">{rem.facilityName}</div>
                      )}
                      <div className="text-[11px] opacity-75">
                        Waktu: {rem.remindAt.replace('T', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pesan Semangat Singkat yang Disediakan */}
          <div className="pt-2 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
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
                  className="px-3 py-2 rounded-btn bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 hover:border-brand-teal text-xs text-left transition"
                >
                  “{note}”
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seksi 3: "Ajak dengan Lembut" (3 Gaya Nada: Hangat, Santai, Praktis) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-brand-coral" />
              <span>“Ajak dengan Lembut” — Templat Pesan Tanpa Menyalahkan</span>
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Pilih gaya nada yang paling cocok dengan keseharian Anda berdua, lalu salin ke WhatsApp atau aplikasi chat.
            </p>
          </div>

          {/* Filter 3 Gaya Nada */}
          <div className="flex gap-1.5">
            {['Semua', 'Hangat', 'Santai', 'Praktis'].map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setSelectedTone(tone)}
                className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${
                  selectedTone === tone
                    ? 'bg-brand-teal text-white'
                    : 'bg-surface-muted dark:bg-surface-dark text-brand-navy/75 dark:text-white/75'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-coral/15 text-brand-coral-dark">
                    Nada: {tpl.tone}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-navy/60 dark:text-white/60">
                    {tpl.senderRole}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-brand-navy dark:text-white">{tpl.title}</h3>
                <p className="text-xs sm:text-sm text-brand-navy/85 dark:text-white/85 leading-relaxed italic bg-surface dark:bg-surface-dark-card p-3.5 rounded-btn border border-brand-navy/5">
                  “{tpl.message}”
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(tpl.id, tpl.message)}
                  className="touch-target flex-1 py-2.5 px-4 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-navy-light transition"
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
                  className="touch-target py-2.5 px-3.5 rounded-btn bg-status-success text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 transition"
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
