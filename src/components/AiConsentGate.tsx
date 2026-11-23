import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAiStatus } from '../lib/ai-client';

/**
 * Gerbang persetujuan AI: fitur AI hanya muncul bila server mengaktifkannya DAN pengguna
 * menyetujui (consent `ai_assist`, default OFF). Menjelaskan dengan jujur apa yang dikirim.
 */
export const AiConsentGate: React.FC<{
  children: React.ReactNode;
  compact?: boolean;
  /** Teks tambahan tentang data yang dikirim untuk fitur ini. */
  whatIsSent?: string;
}> = ({ children, compact, whatIsSent }) => {
  const { locale, consents, updateConsent } = useApp();
  const status = useAiStatus();
  const isEn = locale === 'en';

  if (status.loading) return null;
  if (!status.enabled) {
    return compact ? null : (
      <div className="well p-4 text-xs text-brand-navy/75 dark:text-white/75 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        {isEn
          ? 'AI features are not switched on for this server. Everything else in Side by Side works without them.'
          : 'Fitur AI belum diaktifkan di server ini. Semua fitur lain Side by Side tetap berjalan tanpa AI.'}
      </div>
    );
  }
  if (consents.ai_assist) return <>{children}</>;

  return (
    <div
      className={`rounded-2xl border border-brand-teal/30 bg-brand-teal-light/40 dark:bg-brand-teal/10 ${compact ? 'p-3' : 'p-4 sm:p-5'} space-y-2.5`}
      data-testid="ai-consent-gate"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="w-5 h-5 text-brand-teal shrink-0" />
        <div className="space-y-1">
          <div className="text-sm font-bold text-brand-navy dark:text-white">
            {isEn ? 'Turn on the AI assistant?' : 'Aktifkan asisten AI?'}
          </div>
          <p className="text-xs leading-relaxed text-brand-navy/80 dark:text-white/80">
            {isEn
              ? `AI features send only what each task needs to our AI provider (${status.provider === 'anthropic' ? 'Anthropic Claude' : 'the configured provider'}) through our server. Never your name, email, phone, ID number, partner details or private notes. Nothing is stored by Side by Side, and AI never diagnoses or suggests medicines.`
              : `Fitur AI hanya mengirim data yang dibutuhkan tiap tugas ke penyedia AI kami (${status.provider === 'anthropic' ? 'Anthropic Claude' : 'penyedia yang dikonfigurasi'}) melalui server kami. Tidak pernah nama, email, telepon, NIK, data pasangan, atau catatan pribadi. Side by Side tidak menyimpannya, dan AI tidak pernah mendiagnosis atau menyarankan obat.`}
            {whatIsSent ? ` ${whatIsSent}` : ''}
          </p>
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => updateConsent('ai_assist', true)}>
        <Lock className="w-4 h-4" />
        {isEn ? 'Turn on AI assistant' : 'Aktifkan asisten AI'}
      </button>
    </div>
  );
};
