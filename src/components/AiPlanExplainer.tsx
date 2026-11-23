import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AiConsentGate } from './AiConsentGate';
import { explainPlan } from '../lib/ai-client';
import { LIFESTYLE_FOCUS, ORDERED_TESTS, SPECIALISTS, type ConsultationLog } from '../lib/care-pathway';

/** Menjelaskan ulang rencana dari dokter dengan bahasa awam (AI), tanpa menambah saran medis. */
export const AiPlanExplainer: React.FC<{ consult: ConsultationLog; locale: 'id' | 'en' }> = ({ consult, locale }) => {
  const isEn = locale === 'en';
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const pick = (b: { id: string; en: string }) => (isEn ? b.en : b.id);
      const res = await explainPlan(
        {
          specialty: pick(SPECIALISTS[consult.clinicianType].shortName),
          summary: consult.advice,
          orderedTests: (consult.orderedTests ?? []).map((t) => pick(ORDERED_TESTS[t])),
          lifestyleFocus: (consult.lifestyleFocus ?? []).map((f) => pick(LIFESTYLE_FOCUS[f])),
          referralTo: consult.referralTo ? pick(SPECIALISTS[consult.referralTo].shortName) : undefined,
          nextVisitDate: consult.nextVisitDate,
        },
        locale,
      );
      setText(res.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AiConsentGate compact>
      <div className="space-y-2" data-testid="ai-plan-explainer">
        {!text && (
          <button type="button" className="btn btn-soft btn-sm" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isEn ? 'Explain this plan in plain words (AI)' : 'Jelaskan rencana ini dengan bahasa sederhana (AI)'}
          </button>
        )}
        {error && (
          <p role="alert" className="text-xs font-semibold text-[#B33834] dark:text-[#FF8A85]">
            {error}
          </p>
        )}
        {text && (
          <div className="p-3.5 rounded-xl bg-brand-teal-light/50 dark:bg-brand-teal/10 text-xs leading-relaxed whitespace-pre-wrap text-brand-navy/90 dark:text-white/90">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
              {isEn ? 'In plain words (AI, not medical advice)' : 'Dengan bahasa sederhana (AI, bukan saran medis)'}
            </div>
            {text}
          </div>
        )}
      </div>
    </AiConsentGate>
  );
};
