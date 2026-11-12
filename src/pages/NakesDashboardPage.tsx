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
      <section className="page-header flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5 min-w-0">
          <div className="badge badge-success">
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>Mode Tenaga Kesehatan (Ringan) • Konsultasi Efisien & Bermutu</span>
          </div>
          <h1 className="page-title">
            Dasbor Tenaga Kesehatan — {authMode === 'nakes' ? displayName : nakesName}
          </h1>
          <p className="page-lead">
            Tinjau ringkasan pasien dari Kode QR (berlaku 1 jam), salin templat konseling terstruktur, dan jawab tiket pertanyaan anonim.
          </p>
        </div>

        {authMode !== 'nakes' && (
          <button
            type="button"
            onClick={() =>
              loginAccount('maya@puskesmas.id', 'nakes', 'dr. Maya (Dokter Umum Puskesmas)')
            }
            className="btn btn-navy shrink-0 self-start lg:self-auto"
          >
            Masuk sebagai dr. Maya (Peran Nakes)
          </button>
        )}
      </section>

      {/* Form Input Kode QR Pasien */}
      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="section-title flex items-start gap-2">
          <QrCode className="w-5 h-5 text-brand-teal shrink-0 mt-1" />
          <span>Buka Ringkasan Pasien (Kode QR / Tautan 1 Jam)</span>
        </h2>

        <form onSubmit={handleOpenPatientCode} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="nakes-viewer-name" className="field-label">
              Identitas Tenaga Kesehatan Pemeriksa (Tercatat di Log Pasien)
            </label>
            <input
              id="nakes-viewer-name"
              type="text"
              required
              value={nakesName}
              onChange={(e) => setNakesName(e.target.value)}
              className="field w-full"
            />
          </div>

          <div>
            <label htmlFor="nakes-token-code" className="field-label">
              Kode Ringkasan / Token QR Pasien
            </label>
            <input
              id="nakes-token-code"
              type="text"
              required
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Contoh: MAYA-RENDRA-1H"
              className="field w-full font-bold uppercase font-mono"
            />
          </div>

          <div className="flex items-end md:col-span-2 xl:col-span-1">
            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Buka & Catat Akses di Log Pasien
            </button>
          </div>
        </form>

        {errorMsg && (
          <div role="alert" className="p-3.5 rounded-xl bg-status-urgent-bg text-[#B33834] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Ringkasan Pasien yang Dibagikan (Hanya Menampilkan Bagian yang Disetujui Pasien) */}
      {activeData && !activeData.revoked ? (
        <section className="card p-5 sm:p-6 border-brand-teal/50 ring-4 ring-brand-teal/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/10 dark:border-white/10 pb-4">
            <div className="space-y-1">
              <span className="eyebrow flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Ringkasan Pasien Terverifikasi • Kode: {activeData.token_code}
              </span>
              <h2 className="text-xl font-extrabold text-brand-navy dark:text-white">
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
            <div className="well p-4 sm:p-5 space-y-2.5">
              <h3 className="eyebrow flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                1. Ringkasan Riwayat & Tingkat Saran
              </h3>
              {activeData.scope.includes('history') ? (
                <div className="space-y-1.5 text-xs leading-relaxed">
                  <div>
                    <span className="font-semibold">Durasi Program Hamil:</span>{' '}
                    {activeData.snapshot.programDuration}
                  </div>
                  <div>
                    <span className="font-semibold">Hasil Cek Awal Mandiri:</span>{' '}
                    <strong className="text-[#B93E2B] dark:text-[#FFA596]">
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
            <div className="well p-4 sm:p-5 space-y-2.5">
              <h3 className="eyebrow flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                2. Faktor Risiko yang Dilaporkan
              </h3>
              {activeData.scope.includes('risk_factors') &&
              activeData.snapshot.reportedRiskFactors ? (
                <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed text-brand-navy/85 dark:text-white/85 marker:text-brand-teal">
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
          <div className="well p-4 sm:p-5 space-y-3">
            <h3 className="eyebrow">
              3. Hasil Analisis Semen yang Dibagikan (Acuan Rujukan WHO 2021)
            </h3>
            {activeData.scope.includes('lab_results') &&
            activeData.snapshot.labResults &&
            activeData.snapshot.labResults.length > 0 ? (
              <div className="overflow-x-auto thin-scroll -mx-1 px-1">
                <table className="w-full min-w-[36rem] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-brand-navy/15 dark:border-white/15 text-2xs text-brand-navy/65 dark:text-white/65 whitespace-nowrap">
                      <th className="py-2 pr-3">Tanggal Tes</th>
                      <th className="py-2 pr-3">Volume (≥1,4 mL)</th>
                      <th className="py-2 pr-3">Konsentrasi (≥16 jt/mL)</th>
                      <th className="py-2 pr-3">Motilitas Total (≥42%)</th>
                      <th className="py-2 pr-3">Progresif (≥30%)</th>
                      <th className="py-2">Morfologi (≥4%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
                    {activeData.snapshot.labResults.map((lr, idx) => (
                      <tr key={idx} className="font-medium">
                        <td className="py-2.5 pr-3 font-bold whitespace-nowrap">{lr.testDate}</td>
                        <td className="py-2 pr-3">{lr.volume_ml} mL</td>
                        <td
                          className={`py-2 pr-3 font-bold ${
                            lr.concentration_m_per_ml < 16
                              ? 'text-[#946A00] dark:text-[#F3C64D]'
                              : 'text-[#1F7A50] dark:text-[#7BD9AC]'
                          }`}
                        >
                          {lr.concentration_m_per_ml} jt/mL
                        </td>
                        <td
                          className={`py-2 pr-3 font-bold ${
                            lr.total_motility_pct < 42
                              ? 'text-[#946A00] dark:text-[#F3C64D]'
                              : 'text-[#1F7A50] dark:text-[#7BD9AC]'
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
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="section-title">
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
            className="btn btn-primary shrink-0 self-start lg:self-auto"
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
              className="well p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <span className="badge badge-teal">
                  Topik: {tpl.topic}
                </span>
                <h3 className="font-bold text-base leading-snug text-brand-navy dark:text-white">{tpl.title}</h3>
                <pre className="whitespace-pre-wrap font-sans text-xs text-brand-navy/85 dark:text-white/85 leading-relaxed bg-surface dark:bg-surface-dark-card p-4 rounded-xl border border-brand-navy/5 dark:border-white/10">
                  {tpl.content}
                </pre>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCounselingTemplate(tpl.id, tpl.content)}
                className="btn btn-secondary w-full"
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
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="section-title flex items-start gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-brand-coral shrink-0 mt-1" />
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
              className="well p-4 sm:p-5 space-y-3 text-xs leading-relaxed"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">{tItem.category}</span>
                <span
                  className={`badge ${
                    tItem.status === 'dijawab'
                      ? 'badge-success'
                      : 'bg-status-warning-bg text-[#7A5600] dark:bg-status-warning/20 dark:text-[#F3C64D]'
                  }`}
                >
                  {tItem.status === 'dijawab' ? 'Sudah Dijawab' : 'Menunggu Jawaban Nakes'}
                </span>
              </div>

              <p className="font-bold text-sm leading-relaxed text-brand-navy dark:text-white">“{tItem.text}”</p>

              {tItem.reply_text ? (
                <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border-l-4 border-brand-teal space-y-1">
                  <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">{tItem.replied_by}:</div>
                  <p className="text-brand-navy/85 dark:text-white/85 leading-relaxed">
                    {tItem.reply_text}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    aria-label="Tanggapan untuk tiket pertanyaan"
                    value={replyDrafts[tItem.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [tItem.id]: e.target.value }))
                    }
                    placeholder="Tulis tanggapan edukasi medis untuk pertanyaan anonim ini..."
                    className="field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendReply(tItem.id)}
                    className="btn btn-primary"
                  >
                    <Send className="w-4 h-4" /> Jawab
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
