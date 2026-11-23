import React, { useState } from 'react';
import { CheckCircle2, ClipboardPen, Send } from 'lucide-react';
import {
  localDateString,
  LIFESTYLE_FOCUS,
  ORDERED_TESTS,
  SPECIALISTS,
  type LifestyleFocusKey,
  type OrderedTestKey,
  type SpecialistKey,
} from '../lib/care-pathway';

/**
 * Formulir rencana pasca-konsultasi untuk Nakes: menutup lingkaran rujukan dengan
 * mengirim langkah lanjutan langsung ke Jalur Perawatan pasien (terenkripsi at rest).
 */
export const ClinicianCarePlanForm: React.FC<{
  tokenCode: string;
  defaultClinicianName: string;
  locale: 'id' | 'en';
  alreadyWrittenAt?: string | null;
}> = ({ tokenCode, defaultClinicianName, locale, alreadyWrittenAt }) => {
  const isEn = locale === 'en';
  const [clinicianName, setClinicianName] = useState(defaultClinicianName);
  const [specialty, setSpecialty] = useState<SpecialistKey>('andrology');
  const [visitDate, setVisitDate] = useState(localDateString());
  const [summary, setSummary] = useState('');
  const [tests, setTests] = useState<OrderedTestKey[]>([]);
  const [focus, setFocus] = useState<LifestyleFocusKey[]>([]);
  const [referralTo, setReferralTo] = useState<SpecialistKey | ''>('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentAt, setSentAt] = useState<string | null>(alreadyWrittenAt ?? null);

  const toggle = <T extends string>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const insertTemplate = () =>
    setSummary(
      isEn
        ? 'Thank you for coming in today. What we found: … What it means in plain words: … What happens next: … Please contact us sooner if: …'
        : 'Terima kasih sudah datang hari ini. Yang kami temukan: … Artinya dalam bahasa sederhana: … Langkah berikutnya: … Segera hubungi kami bila: …',
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (summary.trim().length < 10) {
      setError(isEn ? 'Write at least a short summary for the patient.' : 'Tuliskan setidaknya ringkasan singkat untuk pasien.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/share-tokens/${encodeURIComponent(tokenCode)}/care-plan`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicianName: clinicianName.trim() || undefined,
          specialty,
          visitDate,
          summaryForPatient: summary.trim(),
          orderedTests: tests,
          lifestyleFocus: focus,
          ...(referralTo ? { referralTo } : {}),
          ...(nextFollowUp ? { nextFollowUpDate: nextFollowUp } : {}),
        }),
      });
      const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
      if (!res.ok) {
        setError((data as { error?: string }).error || (isEn ? 'Failed to send care plan.' : 'Gagal mengirim rencana perawatan.'));
        return;
      }
      setSentAt((data as { written_at?: string }).written_at || new Date().toISOString());
    } catch {
      setError(isEn ? 'Network error sending the care plan.' : 'Gangguan jaringan saat mengirim rencana.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6 space-y-4 border-brand-teal/40" aria-labelledby="care-plan-form-title">
      <div className="space-y-1">
        <h2 id="care-plan-form-title" className="section-title flex items-center gap-2">
          <ClipboardPen className="w-5 h-5 text-brand-teal" />
          {isEn ? 'Send a post-visit care plan to the patient' : 'Kirim rencana pasca-kunjungan ke pasien'}
        </h2>
        <p className="text-xs text-brand-navy/70 dark:text-white/70">
          {isEn
            ? 'Closes the referral loop: your plan appears in the patient’s Care Pathway as tasks with reminders. Stored encrypted; allowed up to 24 hours after the patient created this code.'
            : 'Menutup lingkaran rujukan: rencana Anda muncul di Jalur Perawatan pasien sebagai langkah dengan pengingat. Tersimpan terenkripsi; dapat dikirim hingga 24 jam setelah pasien membuat kode ini.'}
        </p>
      </div>

      {sentAt && (
        <div role="status" className="p-3.5 rounded-xl bg-status-success-bg dark:bg-status-success/15 text-[#1F7A50] dark:text-[#7BD9AC] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {isEn
            ? `Care plan sent ${new Date(sentAt).toLocaleString('en-GB')}. Sending again replaces it.`
            : `Rencana terkirim ${new Date(sentAt).toLocaleString('id-ID')}. Mengirim ulang akan menggantikannya.`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="cp-clinician" className="field-label">
              {isEn ? 'Clinician name' : 'Nama pemeriksa'}
            </label>
            <input id="cp-clinician" className="field w-full" maxLength={80} value={clinicianName} onChange={(e) => setClinicianName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cp-specialty" className="field-label">
              {isEn ? 'Your role' : 'Peran Anda'}
            </label>
            <select id="cp-specialty" className="field w-full" value={specialty} onChange={(e) => setSpecialty(e.target.value as SpecialistKey)}>
              {(Object.keys(SPECIALISTS) as SpecialistKey[]).map((k) => (
                <option key={k} value={k}>
                  {isEn ? SPECIALISTS[k].shortName.en : SPECIALISTS[k].shortName.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cp-visit" className="field-label">
              {isEn ? 'Visit date' : 'Tanggal kunjungan'}
            </label>
            <input id="cp-visit" type="date" className="field w-full" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="cp-summary" className="field-label">
              {isEn ? 'Summary for the patient (plain language)' : 'Ringkasan untuk pasien (bahasa awam)'}
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={insertTemplate}>
              {isEn ? 'Insert template' : 'Sisipkan templat'}
            </button>
          </div>
          <textarea
            id="cp-summary"
            className="field w-full min-h-[6rem]"
            maxLength={1500}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <fieldset>
            <legend className="field-label">{isEn ? 'Tests requested' : 'Pemeriksaan yang diminta'}</legend>
            <div className="space-y-1.5">
              {(Object.keys(ORDERED_TESTS) as OrderedTestKey[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="check" checked={tests.includes(k)} onChange={() => toggle(tests, k, setTests)} />
                  {isEn ? ORDERED_TESTS[k].en : ORDERED_TESTS[k].id}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="field-label">{isEn ? 'Lifestyle focus (74-day plan)' : 'Fokus gaya hidup (rencana 74 hari)'}</legend>
            <div className="space-y-1.5">
              {(Object.keys(LIFESTYLE_FOCUS) as LifestyleFocusKey[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="check" checked={focus.includes(k)} onChange={() => toggle(focus, k, setFocus)} />
                  {isEn ? LIFESTYLE_FOCUS[k].en : LIFESTYLE_FOCUS[k].id}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cp-referral" className="field-label">
              {isEn ? 'Refer onward to (optional)' : 'Rujuk lanjut ke (opsional)'}
            </label>
            <select id="cp-referral" className="field w-full" value={referralTo} onChange={(e) => setReferralTo(e.target.value as SpecialistKey | '')}>
              <option value="">{isEn ? 'No onward referral' : 'Tidak dirujuk lanjut'}</option>
              {(Object.keys(SPECIALISTS) as SpecialistKey[]).map((k) => (
                <option key={k} value={k}>
                  {isEn ? SPECIALISTS[k].shortName.en : SPECIALISTS[k].shortName.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cp-next" className="field-label">
              {isEn ? 'Next follow-up (optional)' : 'Kontrol berikutnya (opsional)'}
            </label>
            <input id="cp-next" type="date" className="field w-full" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-[#B33834] dark:text-[#FF8A85]">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>
          <Send className="w-4 h-4" />
          {busy ? (isEn ? 'Sending…' : 'Mengirim…') : isEn ? 'Send to patient’s Care Pathway' : 'Kirim ke Jalur Perawatan pasien'}
        </button>
      </form>
    </section>
  );
};
