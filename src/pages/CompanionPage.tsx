import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellPlus,
  BookOpen,
  Bot,
  CheckCircle2,
  HeartHandshake,
  ListPlus,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/ui';
import { AiConsentGate } from '../components/AiConsentGate';
import {
  askCompanion,
  buildCompanionContext,
  COMPANION_ROUTES,
  type CompanionAction,
  type CompanionMessage,
} from '../lib/ai-client';
import { getLocalizedAssessmentConfig } from '../config/schemas';
import { localDateString, localDateTimeString, type CarePlanItem } from '../lib/care-pathway';

interface ChatTurn extends CompanionMessage {
  actions?: CompanionAction[];
  sources?: Array<{ slug: string; title: string }>;
  showSupport?: boolean;
}

/**
 * Pendamping AI (agen): menjawab dengan bahasa awam, berlandaskan pustaka yang ditinjau,
 * rujukan WHO 2021, dan direktori fasilitas; mengusulkan langkah yang hanya dijalankan
 * setelah pengguna menekan tombolnya. Percakapan hanya di memori (tidak disimpan).
 */
export const CompanionPage: React.FC = () => {
  const {
    locale,
    assessmentAnswers,
    assessmentResult,
    healthJournal,
    labResults,
    updateHealthJournal,
    addReminder,
  } = useApp();
  const isEn = locale === 'en';
  const loc: 'id' | 'en' = isEn ? 'en' : 'id';
  const navigate = useNavigate();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneActions, setDoneActions] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const support = useMemo(() => getLocalizedAssessmentConfig(loc).emotionalSupportBanner, [loc]);

  const starters = isEn
    ? [
        assessmentResult ? 'Explain my self-check result in simple words' : 'What does a male fertility check-up involve?',
        'How do I prepare for a semen analysis?',
        'Which clinic accepts JKN in Jakarta for an andrologist?',
        'What habits can help over the next 74 days?',
      ]
    : [
        assessmentResult ? 'Jelaskan hasil Cek Awal saya dengan bahasa sederhana' : 'Apa saja yang diperiksa saat cek kesuburan pria?',
        'Bagaimana persiapan sebelum analisis semen?',
        'Klinik mana di Jakarta yang menerima JKN untuk dokter andrologi?',
        'Kebiasaan apa yang membantu dalam 74 hari ke depan?',
      ];

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError('');
    const previousTurns = turns;
    const history: ChatTurn[] = [...previousTurns, { role: 'user', content }];
    setTurns(history);
    setDraft('');
    setBusy(true);
    try {
      const context = buildCompanionContext({ locale: loc, assessmentAnswers, assessmentResult, healthJournal, labResults });
      const res = await askCompanion(
        history.map((t) => ({ role: t.role, content: t.content.slice(0, 2000) })),
        context,
        loc,
      );
      setTurns([
        ...history,
        { role: 'assistant', content: res.reply, actions: res.actions, sources: res.sources, showSupport: res.showSupport },
      ]);
    } catch (e) {
      // Kembalikan teks ke kotak input agar pengguna dapat mencoba lagi tanpa membuat dua giliran user berturut-turut.
      setTurns(previousTurns);
      setDraft(content);
      setError(e instanceof Error ? e.message : isEn ? 'Something went wrong.' : 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (typeof listRef.current?.scrollTo === 'function') {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const runAction = async (key: string, action: CompanionAction) => {
    if (action.type === 'open_page') {
      const r = COMPANION_ROUTES[action.page];
      navigate(isEn ? r.en : r.id);
      return;
    }
    if (action.type === 'care_plan_task') {
      const due = action.dueInDays ? new Date(Date.now() + action.dueInDays * 864e5) : undefined;
      const item: CarePlanItem = {
        id: `ai-${Date.now()}`,
        title: action.title.slice(0, 200),
        dueDate: due ? localDateString(due) : undefined,
        done: false,
        source: 'suggested',
      };
      await updateHealthJournal((j) => ({ ...j, carePathway: { ...j.carePathway, carePlan: [...j.carePathway.carePlan, item] } }));
    }
    if (action.type === 'reminder') {
      await addReminder({
        type: action.kind,
        title: action.title.slice(0, 200),
        remindAt: localDateTimeString(new Date(Date.now() + action.daysFromNow * 864e5)),
      });
    }
    setDoneActions((d) => ({ ...d, [key]: true }));
  };

  const actionLabel = (a: CompanionAction) => {
    if (a.type === 'open_page') return a.label;
    if (a.type === 'care_plan_task') return isEn ? `Add to my care plan: ${a.title}` : `Tambahkan ke rencana: ${a.title}`;
    return isEn ? `Remind me in ${a.daysFromNow} days: ${a.title}` : `Ingatkan ${a.daysFromNow} hari lagi: ${a.title}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isEn ? 'AI · opt-in · not a diagnosis' : 'AI · opsional · bukan diagnosis'}
        icon={Sparkles}
        title={isEn ? 'AI Companion' : 'Asisten AI'}
        description={
          isEn
            ? 'Ask anything about male reproductive health, your result or your next step. Answers come from Side by Side’s reviewed library, the WHO 2021 reference and our clinic directory. The companion can suggest steps; nothing happens until you press the button.'
            : 'Tanyakan apa pun tentang kesehatan reproduksi pria, hasil Anda, atau langkah berikutnya. Jawaban berlandaskan pustaka Side by Side yang telah ditinjau, rujukan WHO 2021, dan direktori klinik kami. Asisten dapat menyarankan langkah; tidak ada yang terjadi sebelum Anda menekan tombolnya.'
        }
        actions={
          turns.length > 0 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setTurns([]);
                setDoneActions({});
                setError('');
              }}
            >
              <RotateCcw className="w-4 h-4 text-brand-teal" />
              {isEn ? 'New conversation' : 'Percakapan baru'}
            </button>
          ) : undefined
        }
      />

      <AiConsentGate
        whatIsSent={
          isEn
            ? 'For the companion: your questions plus a short summary of your self-check reasons, pathway stage, trends and recent lab values.'
            : 'Untuk asisten: pertanyaan Anda serta ringkasan singkat alasan Cek Awal, tahap jalur, tren, dan hasil lab terbaru.'
        }
      >
        <section className="card p-4 sm:p-6 space-y-4" aria-label={isEn ? 'Conversation' : 'Percakapan'}>
          <div ref={listRef} className="space-y-4 max-h-[60vh] overflow-y-auto thin-scroll pr-1" aria-live="polite">
            {turns.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-full bg-brand-teal-light dark:bg-brand-teal/20 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-brand-teal" />
                  </span>
                  <p className="text-sm leading-relaxed text-brand-navy/85 dark:text-white/85">
                    {isEn
                      ? 'Hi, I’m here to help you understand and plan, privately and without judgment. What would you like to know?'
                      : 'Halo, saya di sini untuk membantu Anda memahami dan merencanakan langkah—secara privat dan tanpa penghakiman. Apa yang ingin Anda ketahui?'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:pl-12">
                  {starters.map((s) => (
                    <button key={s} type="button" className="btn btn-soft btn-sm" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) =>
              t.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-teal-strong text-white px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3" data-testid="companion-reply">
                  <span className="w-9 h-9 rounded-full bg-brand-teal-light dark:bg-brand-teal/20 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-brand-teal" />
                  </span>
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {t.showSupport && (
                      <div role="alert" className="p-3.5 rounded-xl bg-brand-coral-light dark:bg-brand-coral/15 border border-brand-coral text-xs text-brand-navy dark:text-white space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-brand-coral-dark" />
                          {support.title}
                        </div>
                        <p>{support.message}</p>
                        <p className="font-semibold">
                          {support.contacts.map((c) => `${c.name}: ${c.contact}`).join(' · ')}
                        </p>
                      </div>
                    )}
                    <div className="well px-4 py-3 text-sm leading-relaxed text-brand-navy/90 dark:text-white/90 whitespace-pre-wrap">
                      {t.content}
                    </div>
                    {t.sources && t.sources.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                        <BookOpen className="w-3.5 h-3.5 text-brand-teal" />
                        <span className="font-semibold text-brand-navy/70 dark:text-white/70">{isEn ? 'From the library:' : 'Dari pustaka:'}</span>
                        {t.sources.map((s) => (
                          <button
                            key={s.slug}
                            type="button"
                            className="badge badge-teal hover:underline"
                            onClick={() => navigate(`${isEn ? '/library' : '/pustaka'}?article=${encodeURIComponent(s.slug)}`)}
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    )}
                    {t.actions && t.actions.length > 0 && (
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                        {t.actions.map((a, ai) => {
                          const key = `${i}-${ai}`;
                          const done = doneActions[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`btn btn-sm ${done ? 'btn-soft' : 'btn-secondary'} justify-start`}
                              disabled={done}
                              onClick={() => runAction(key, a)}
                            >
                              {done ? (
                                <CheckCircle2 className="w-4 h-4 text-status-success" />
                              ) : a.type === 'open_page' ? (
                                <ArrowRight className="w-4 h-4 text-brand-teal" />
                              ) : a.type === 'care_plan_task' ? (
                                <ListPlus className="w-4 h-4 text-brand-teal" />
                              ) : (
                                <BellPlus className="w-4 h-4 text-brand-teal" />
                              )}
                              <span className="text-left">{done ? (isEn ? 'Done' : 'Selesai') : actionLabel(a)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div role="status" className="flex items-center gap-2 text-xs text-brand-navy/70 dark:text-white/70 sm:pl-12">
                <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                {isEn ? 'Checking the library and your plan…' : 'Memeriksa pustaka dan rencana Anda…'}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-[#B33834] dark:text-[#FF8A85]">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex gap-2"
          >
            <label htmlFor="companion-input" className="sr-only">
              {isEn ? 'Your question' : 'Pertanyaan Anda'}
            </label>
            <input
              id="companion-input"
              className="field flex-1"
              maxLength={2000}
              placeholder={isEn ? 'Type your question…' : 'Ketik pertanyaan Anda…'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>
              <Send className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only">{isEn ? 'Send' : 'Kirim'}</span>
            </button>
          </form>

          <p className="text-2xs text-brand-navy/60 dark:text-white/60 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
            {isEn
              ? 'AI can make mistakes and is not a diagnosis. This conversation is not saved. In an emergency (sudden severe testicular pain), go to the nearest IGD or call 119.'
              : 'AI bisa keliru dan bukan diagnosis. Percakapan ini tidak disimpan. Dalam keadaan darurat (nyeri hebat mendadak di testis), segera ke IGD terdekat atau hubungi 119.'}
          </p>
        </section>
      </AiConsentGate>
    </div>
  );
};

export default CompanionPage;
