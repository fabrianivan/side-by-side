import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { requestVisitBrief, useAiStatus } from '../lib/ai-client';

/** Ringkasan pra-konsultasi berbasis AI untuk Nakes (hanya bila pasien mengizinkan). */
export const AiVisitBrief: React.FC<{ tokenCode: string; locale: 'id' | 'en' }> = ({ tokenCode, locale }) => {
  const isEn = locale === 'en';
  const status = useAiStatus();
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!status.enabled) return null;

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await requestVisitBrief(tokenCode, locale);
      setBrief(res.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal-light/40 dark:bg-brand-teal/10 p-4 sm:p-5 space-y-3" data-testid="ai-visit-brief">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="eyebrow flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          {isEn ? 'AI visit brief (patient allowed)' : 'Ringkasan kunjungan AI (diizinkan pasien)'}
        </h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {brief ? (isEn ? 'Regenerate' : 'Buat ulang') : isEn ? 'Generate brief' : 'Buat ringkasan'}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-[#B33834] dark:text-[#FF8A85]">
          {error}
        </p>
      )}
      {brief ? (
        <div className="text-xs leading-relaxed whitespace-pre-wrap text-brand-navy/90 dark:text-white/90">{brief}</div>
      ) : (
        <p className="text-xs text-brand-navy/70 dark:text-white/70">
          {isEn
            ? 'A short draft: what the patient shared, gaps to clarify, suggested history questions and counselling points. Self-reported data; verify in the consultation. No diagnosis or treatment suggestions.'
            : 'Draf singkat: apa yang dibagikan pasien, hal yang perlu diperjelas, usulan pertanyaan anamnesis, dan poin konseling. Data dilaporkan sendiri; verifikasi saat konsultasi. Tanpa saran diagnosis atau terapi.'}
        </p>
      )}
      {brief && (
        <p className="text-2xs text-brand-navy/60 dark:text-white/60">
          {isEn ? 'Drafted by AI from patient-shared data. Logged in the patient’s access log.' : 'Disusun AI dari data yang dibagikan pasien. Tercatat di log akses pasien.'}
        </p>
      )}
    </div>
  );
};
