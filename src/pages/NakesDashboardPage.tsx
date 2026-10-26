import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ClipboardList,
  Activity,
  AlertCircle,
  Clock,
  MessageCircleQuestion,
  Send,
} from 'lucide-react';
import { templatesConfig } from '../config/schemas';
import { useApp, type ShareTokenState } from '../context/AppContext';

export const NakesDashboardPage: React.FC = () => {
  const {
    authMode,
    displayName,
    shareToken,
    tickets,
    loginAccount,
    recordNakesAccess,
    replyToTicket,
    loadRendraDemoScenario,
  } = useApp();
  const [searchParams] = useSearchParams();

  const [nakesName, setNakesName] = useState<string>('dr. Maya (Dokter Umum Puskesmas)');
  const [codeInput, setCodeInput] = useState<string>(() => {
    return searchParams.get('code') || shareToken?.token_code || 'MAYA-RENDRA-1H';
  });
  const [loadedSummary, setLoadedSummary] = useState<ShareTokenState | null>(shareToken);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedTplId, setCopiedTplId] = useState<string>('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shareToken && !loadedSummary) {
      setLoadedSummary(shareToken);
      setCodeInput(shareToken.token_code);
    }
  }, [shareToken, loadedSummary]);

  const handleOpenPatientCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    if (!codeInput.trim()) return;

    const found = await recordNakesAccess(codeInput.trim(), nakesName);
    if (found) {
      setLoadedSummary(found);
    } else {
      if (codeInput.trim().toUpperCase() === 'MAYA-RENDRA-1H') {
        await loadRendraDemoScenario();
        setErrorMsg('');
      } else {
        setErrorMsg(
          'Kode ringkasan tidak ditemukan, sudah dicabut oleh pasien, atau telah melewati batas waktu 1 jam.'
        );
      }
    }
  };

  const handleCopyCounselingTemplate = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Fallback
    }
    setCopiedTplId(id);
    setTimeout(() => setCopiedTplId(''), 2500);
  };

  const handleSendReply = async (ticketId: string) => {
    const text = replyDrafts[ticketId];
    if (!text || text.trim().length < 5) return;
    await replyToTicket(ticketId, text.trim(), nakesName);
    setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
  };

  const activeData = loadedSummary || shareToken;

  return (
    <div className="space-y-6">
      {/* Header Mode Tenaga Kesehatan (dr. Maya) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success bg-status-success-bg px-3 py-1 rounded-full">
            <Stethoscope className="w-4 h-4" />
            <span>Mode Tenaga Kesehatan (Ringan) • Konsultasi Efisien & Bermutu</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
            Dasbor Tenaga Kesehatan — {authMode === 'nakes' ? displayName : nakesName}
          </h1>
          <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75">
            Tinjau ringkasan pasien dari Kode QR (berlaku 1 jam), salin templat konseling terstruktur, dan jawab tiket pertanyaan anonim.
          </p>
        </div>

        {authMode !== 'nakes' && (
          <button
            type="button"
            onClick={() =>
              loginAccount('maya@puskesmas.id', 'nakes', 'dr. Maya (Dokter Umum Puskesmas)')
            }
            className="touch-target px-4 py-2.5 rounded-btn bg-brand-navy text-white text-xs font-bold shrink-0"
          >
            Masuk sebagai dr. Maya (Peran Nakes)
          </button>
        )}
      </section>

      {/* Form Input Kode QR Pasien */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <h2 className="text-base font-bold text-brand-navy dark:text-white flex items-center gap-2">
          <QrCode className="w-5 h-5 text-brand-teal" />
          <span>Buka Ringkasan Pasien (Kode QR / Tautan 1 Jam)</span>
        </h2>

        <form onSubmit={handleOpenPatientCode} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="nakes-viewer-name" className="block text-xs font-bold mb-1">
              Identitas Tenaga Kesehatan Pemeriksa (Tercatat di Log Pasien)
            </label>
            <input
              id="nakes-viewer-name"
              type="text"
              required
              value={nakesName}
              onChange={(e) => setNakesName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
            />
          </div>

          <div>
            <label htmlFor="nakes-token-code" className="block text-xs font-bold mb-1">
              Kode Ringkasan / Token QR Pasien
            </label>
            <input
              id="nakes-token-code"
              type="text"
              required
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Contoh: MAYA-RENDRA-1H"
              className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-bold uppercase font-mono text-brand-navy bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="touch-target w-full py-2.5 px-4 rounded-btn bg-brand-teal text-white text-xs font-bold hover:bg-brand-teal-dark transition"
            >
              Buka & Catat Akses di Log Pasien
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="p-3.5 rounded-btn bg-status-urgent-bg text-status-urgent text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Ringkasan Pasien yang Dibagikan (Hanya Menampilkan Bagian yang Disetujui Pasien) */}
      {activeData && !activeData.revoked ? (
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border-2 border-brand-teal/40 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/10 pb-3">
            <div>
              <span className="text-xs font-bold text-brand-teal flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                Ringkasan Pasien Terverifikasi • Kode: {activeData.token_code}
              </span>
              <h2 className="text-lg font-bold text-brand-navy dark:text-white mt-0.5">
                Pasien: {activeData.snapshot.patientAlias}
              </h2>
            </div>

            <div className="text-xs text-brand-navy/70 dark:text-white/70 flex items-center gap-1">
              <Clock className="w-4 h-4 text-brand-coral" />
              <span>
                Berlaku s.d. {new Date(activeData.expires_at).toLocaleTimeString('id-ID')} WIB
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bagian 1: Ringkasan Riwayat */}
            <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                1. Ringkasan Riwayat & Tingkat Saran
              </h3>
              {activeData.scope.includes('history') ? (
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold">Durasi Program Hamil:</span>{' '}
                    {activeData.snapshot.programDuration}
                  </div>
                  <div>
                    <span className="font-semibold">Hasil Cek Awal Mandiri:</span>{' '}
                    <strong className="text-brand-coral-dark">
                      {activeData.snapshot.assessmentLevel}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-brand-navy/60 dark:text-white/60">
                  Tidak termasuk dalam cakupan persetujuan berbagi pasien.
                </p>
              )}
            </div>

            {/* Bagian 2: Faktor Risiko yang Dilaporkan */}
            <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                2. Faktor Risiko yang Dilaporkan
              </h3>
              {activeData.scope.includes('risk_factors') &&
              activeData.snapshot.reportedRiskFactors ? (
                <ul className="list-disc pl-4 space-y-1 text-xs text-brand-navy/85 dark:text-white/85">
                  {activeData.snapshot.reportedRiskFactors.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-brand-navy/60 dark:text-white/60">
                  Tidak termasuk dalam cakupan persetujuan berbagi pasien.
                </p>
              )}
            </div>
          </div>

          {/* Bagian 3: Hasil Laboratorium yang Dibagikan */}
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal">
              3. Hasil Analisis Semen yang Dibagikan (Acuan Rujukan WHO 2021)
            </h3>
            {activeData.scope.includes('lab_results') &&
            activeData.snapshot.labResults &&
            activeData.snapshot.labResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-brand-navy/15 text-brand-navy/70 dark:text-white/70">
                      <th className="py-2 pr-3">Tanggal Tes</th>
                      <th className="py-2 pr-3">Volume (≥1,4 mL)</th>
                      <th className="py-2 pr-3">Konsentrasi (≥16 jt/mL)</th>
                      <th className="py-2 pr-3">Motilitas Total (≥42%)</th>
                      <th className="py-2 pr-3">Progresif (≥30%)</th>
                      <th className="py-2">Morfologi (≥4%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-navy/10">
                    {activeData.snapshot.labResults.map((lr, idx) => (
                      <tr key={idx} className="font-medium">
                        <td className="py-2 pr-3 font-bold">{lr.testDate}</td>
                        <td className="py-2 pr-3">{lr.volume_ml} mL</td>
                        <td
                          className={`py-2 pr-3 font-bold ${
                            lr.concentration_m_per_ml < 16
                              ? 'text-status-warning'
                              : 'text-status-success'
                          }`}
                        >
                          {lr.concentration_m_per_ml} jt/mL
                        </td>
                        <td
                          className={`py-2 pr-3 font-bold ${
                            lr.total_motility_pct < 42
                              ? 'text-status-warning'
                              : 'text-status-success'
                          }`}
                        >
                          {lr.total_motility_pct}%
                        </td>
                        <td className="py-2 pr-3">{lr.progressive_motility_pct}%</td>
                        <td className="py-2">{lr.morphology_normal_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs italic text-brand-navy/60 dark:text-white/60">
                Belum ada hasil laboratorium yang dibagikan dalam ringkasan ini.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* Templat Konseling Tenaga Kesehatan (4 Topik Wajib: Gaya Hidup, Kecemasan, Komunikasi Pasangan, Rencana Tindak Lanjut) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">
              Templat Konseling Siap Salin (Untuk Edukasi Pasien & Catatan Klinis)
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              Membantu dokter umum di Puskesmas/FKTP memberikan konseling singkat yang empatik, tidak menyalahkan, dan bermutu.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handleCopyCounselingTemplate(
                'all',
                templatesConfig.counselingTemplates.map((t) => t.content).join('\n\n')
              )
            }
            className="touch-target px-4 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            {copiedTplId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>
              {copiedTplId === 'all' ? 'Semua Templat Disalin!' : 'Salin Paket Konseling Lengkap'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templatesConfig.counselingTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal">
                  Topik: {tpl.topic}
                </span>
                <h3 className="font-bold text-sm text-brand-navy dark:text-white">{tpl.title}</h3>
                <pre className="whitespace-pre-wrap font-sans text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed bg-surface dark:bg-surface-dark-card p-3.5 rounded-btn border border-brand-navy/5">
                  {tpl.content}
                </pre>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCounselingTemplate(tpl.id, tpl.content)}
                className="touch-target w-full py-2.5 px-4 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-teal transition"
              >
                {copiedTplId === tpl.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>
                  {copiedTplId === tpl.id
                    ? 'Templat Konseling Disalin!'
                    : 'Salin Templat Konseling'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Antrean Tiket Pertanyaan Anonim (Tanya Nakes — F6 & F7) */}
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-brand-coral" />
            <span>Tiket Pertanyaan Anonim Masuk (Tanya Nakes)</span>
          </h2>
          <p className="text-xs text-brand-navy/70 dark:text-white/70">
            Jawab pertanyaan anonim yang dikirimkan pengguna melalui fitur Tanya Tenaga Kesehatan.
          </p>
        </div>

        <div className="space-y-3">
          {tickets.map((tItem) => (
            <div
              key={tItem.id}
              className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-teal">{tItem.category}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    tItem.status === 'dijawab'
                      ? 'bg-status-success-bg text-status-success'
                      : 'bg-status-warning-bg text-brand-navy'
                  }`}
                >
                  {tItem.status === 'dijawab' ? 'Sudah Dijawab' : 'Menunggu Jawaban Nakes'}
                </span>
              </div>

              <p className="font-bold text-brand-navy dark:text-white">“{tItem.text}”</p>

              {tItem.reply_text ? (
                <div className="p-3 rounded-btn bg-surface dark:bg-surface-dark-card border-l-4 border-brand-teal space-y-1">
                  <div className="font-bold text-brand-teal">{tItem.replied_by}:</div>
                  <p className="text-brand-navy/85 dark:text-white/85 leading-relaxed">
                    {tItem.reply_text}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyDrafts[tItem.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [tItem.id]: e.target.value }))
                    }
                    placeholder="Tulis tanggapan edukasi medis untuk pertanyaan anonim ini..."
                    className="flex-1 px-3 py-2 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendReply(tItem.id)}
                    className="touch-target px-4 py-2 rounded-btn bg-brand-teal text-white font-bold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Jawab
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
