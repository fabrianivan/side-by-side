import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  MessageCircleQuestion,
  Send,
  ArrowLeft,
  ShieldCheck,
  HeartHandshake,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  getLocalizedArticles,
  getLocalizedFaqs,
  type SeedArticle,
} from '../config/seed-articles';
import { getLocalizedAssessmentConfig } from '../config/schemas';
import { detectEmotionalDistress } from '../lib/assessment-engine';
import { useApp } from '../context/AppContext';

const CATEGORY_LABELS_EN: Record<string, string> = {
  Semua: 'All Topics',
  'Dasar Kesuburan': 'Fertility Basics',
  'Gaya Hidup': 'Lifestyle',
  'Persiapan Tes': 'Test Prep',
  'Pasangan & Emosi': 'Couple & Emotion',
  'Privasi & Hak': 'Privacy & Rights',
};

export const LibraryPage: React.FC = () => {
  const { locale, tickets, submitQuestionTicket, refreshTickets } = useApp();
  const isEn = locale === 'en';
  const [localizedArticles, setLocalizedArticles] = useState<SeedArticle[]>(() =>
    getLocalizedArticles(locale)
  );
  const localizedFaqs = useMemo(() => getLocalizedFaqs(locale), [locale]);
  const localizedAssessment = getLocalizedAssessmentConfig(locale);

  useEffect(() => {
    setLocalizedArticles(getLocalizedArticles(locale));
    const controller = new AbortController();
    fetch(`/api/articles?locale=${locale}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
        const rows = (await res.json()) as SeedArticle[];
        if (Array.isArray(rows) && rows.length > 0) {
          setLocalizedArticles(rows);
        }
      })
      .catch(() => {
        // Offline cache already initialized
      });
    return () => controller.abort();
  }, [locale]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const activeArticle = useMemo(
    () => (activeArticleId ? localizedArticles.find((a) => a.id === activeArticleId) ?? null : null),
    [activeArticleId, localizedArticles],
  );
  const setActiveArticle = (art: SeedArticle | null) => {
    setActiveArticleId(art?.id ?? null);
    if (!art && searchParams.has('article')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('article');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Buka artikel secara otomatis bila ditautkan dari rujukan Asisten AI (?article=<slug>).
  const requestedArticleSlug = searchParams.get('article');
  useEffect(() => {
    if (!requestedArticleSlug) return;
    const match = localizedArticles.find(
      (a) => a.slug === requestedArticleSlug || a.id === requestedArticleSlug,
    );
    if (match) {
      setActiveArticleId(match.id);
    }
  }, [requestedArticleSlug, localizedArticles]);

  // Membuka atau menutup artikel selalu dimulai dari bagian atas halaman.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeArticle]);
  const [showAskNakesModal, setShowAskNakesModal] = useState<boolean>(false);

  // Form Tiket Pertanyaan Anonim
  const [questionCategory, setQuestionCategory] = useState<string>('Persiapan Tes & JKN');
  const [questionText, setQuestionText] = useState<string>('');
  const [ticketSubmitted, setTicketSubmitted] = useState<boolean>(false);
  const [ticketError, setTicketError] = useState<string>('');
  const [isSendingTicket, setIsSendingTicket] = useState<boolean>(false);

  useEffect(() => {
    if (showAskNakesModal) {
      void refreshTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAskNakesModal]);

  const categories = [
    'Semua',
    'Dasar Kesuburan',
    'Gaya Hidup',
    'Persiapan Tes',
    'Pasangan & Emosi',
    'Privasi & Hak',
  ];

  const hasActiveFilters = selectedCategory !== 'Semua' || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedCategory('Semua');
    setSearchQuery('');
  };

  const filteredArticles = useMemo(() => {
    return localizedArticles.filter((art) => {
      if (selectedCategory !== 'Semua' && art.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          art.title.toLowerCase().includes(q) ||
          art.summary.toLowerCase().includes(q) ||
          art.body_md.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [localizedArticles, selectedCategory, searchQuery]);

  const showDistressAlert = detectEmotionalDistress(questionText);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim().length < 10) return;
    setTicketError('');
    setIsSendingTicket(true);
    const res = await submitQuestionTicket(questionCategory, questionText.trim());
    setIsSendingTicket(false);
    if (res.ok) {
      setQuestionText('');
      setTicketSubmitted(true);
      setTimeout(() => setTicketSubmitted(false), 4000);
    } else {
      setTicketError(
        res.error ||
          (isEn ? 'Unable to submit your question right now.' : 'Gagal mengirim pertanyaan Anda.')
      );
    }
  };

  // Render sederhana untuk teks markdown artikel seed
  const renderMarkdownParagraphs = (md: string) => {
    return md.split('\n\n').map((block, i) => {
      if (block.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg sm:text-xl font-bold text-brand-navy dark:text-white pt-3">
            {block.replace('### ', '')}
          </h3>
        );
      }
      if (block.startsWith('- ') || block.startsWith('1. ')) {
        const lines = block.split('\n');
        return (
          <ul key={i} className="list-disc pl-5 space-y-2 text-base leading-relaxed text-brand-navy/85 dark:text-white/85 marker:text-brand-teal">
            {lines.map((line, j) => (
              <li key={j}>{line.replace(/^(-|\d+\.)\s+/, '').replace(/\*\*/g, '')}</li>
            ))}
          </ul>
        );
      }
      return (
        <p key={i} className="text-base text-brand-navy/85 dark:text-white/85 leading-[1.75]">
          {block.replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  // Tampilan Detail Artikel
  if (activeArticle) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-5">
        <button
          type="button"
          onClick={() => setActiveArticle(null)}
          className="btn btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEn ? 'Back to Education Library' : 'Kembali ke Pustaka Edukasi'}
        </button>

        <article className="card p-6 sm:p-10 space-y-6">
          <div className="space-y-3 border-b border-brand-navy/10 dark:border-white/10 pb-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="badge badge-teal">
                {isEn
                  ? CATEGORY_LABELS_EN[activeArticle.category] || activeArticle.category
                  : activeArticle.category}
              </span>
              <span className="text-xs text-brand-navy/65 dark:text-white/65 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{' '}
                {isEn
                  ? `Estimated read: ${activeArticle.read_minutes} min`
                  : `Estimasi baca: ${activeArticle.read_minutes} menit`}
              </span>
            </div>
            <h1 className="page-title leading-snug">
              {activeArticle.title}
            </h1>
            <p className="text-base leading-relaxed text-brand-navy/70 dark:text-white/70">{activeArticle.summary}</p>
          </div>

          <div className="space-y-4">{renderMarkdownParagraphs(activeArticle.body_md)}</div>

          {/* Bagian Wajib F6: Sumber dan Peninjau */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-muted dark:bg-surface-dark border-l-4 border-brand-teal space-y-1.5">
            <div className="eyebrow">
              {isEn ? 'Medical Source & Reviewer' : 'Sumber dan Peninjau Medis'}
            </div>
            <p className="text-xs text-brand-navy/85 dark:text-white/85 font-medium">
              {activeArticle.reviewer}
            </p>
            <p className="text-2xs text-brand-navy/65 dark:text-white/65">
              {isEn
                ? `Last updated: ${activeArticle.updated_at} • Health education, not a substitute for a doctor consultation.`
                : `Terakhir diperbarui: ${activeArticle.updated_at} • Edukasi kesehatan, bukan pengganti konsultasi dokter.`}
            </p>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Pustaka & Tombol Tanya Tenaga Kesehatan */}
      <section className="page-header flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5">
          <h1 className="page-title">
            {isEn
              ? 'Education Library & Ask a Healthcare Provider'
              : 'Pustaka Edukasi & Tanya Tenaga Kesehatan'}
          </h1>
          <p className="page-lead">
            {isEn
              ? '12 curated short articles (≤ 400 words), myths vs facts, and judgment-free anonymous Q&A.'
              : '12 artikel pendek terkurasi (\u2264 400 kata), mitos vs fakta, dan tanya jawab anonim tanpa penghakiman.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAskNakesModal(!showAskNakesModal)}
          aria-expanded={showAskNakesModal}
          className="btn btn-coral shrink-0 self-start lg:self-auto"
        >
          <MessageCircleQuestion className="w-4 h-4" />
          {isEn ? 'Ask healthcare provider' : 'Tanya tenaga kesehatan'}
        </button>
      </section>

      {/* Formulir Pertanyaan Anonim (Tanya Tenaga Kesehatan — Tiket Database, Tanpa Chatbot AI Bebas) */}
      {showAskNakesModal && (
        <section className="card p-5 sm:p-6 border-brand-coral/50 ring-4 ring-brand-coral/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="eyebrow inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />{' '}
                {isEn
                  ? 'Anonymous Question Form (Counseling Ticket)'
                  : 'Formulir Pertanyaan Anonim (Tiket Konseling)'}
              </span>
              <h2 className="section-title">
                {isEn
                  ? 'Ask a Healthcare Provider Anonymously'
                  : 'Tanya Tenaga Kesehatan Secara Anonim'}
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                {isEn
                  ? 'Your question is saved as an anonymous ticket to be reviewed by a partner healthcare provider (not an automated AI chatbot, for medical safety).'
                  : 'Pertanyaan Anda disimpan sebagai tiket anonim untuk ditinjau tenaga kesehatan mitra (bukan chatbot AI otomatis demi keselamatan medis).'}
              </p>
            </div>
          </div>

          {showDistressAlert && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-brand-coral-light dark:bg-brand-coral/15 border border-brand-coral/60 text-brand-navy dark:text-white space-y-2 text-xs leading-relaxed"
            >
              <div className="font-bold flex items-center gap-2 text-sm">
                <HeartHandshake className="w-5 h-5 text-brand-coral-dark dark:text-brand-coral" />
                {localizedAssessment.emotionalSupportBanner.title}
              </div>
              <p>{localizedAssessment.emotionalSupportBanner.message}</p>
              <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">
                {localizedAssessment.emotionalSupportBanner.contacts[0]?.name}:{' '}
                {localizedAssessment.emotionalSupportBanner.contacts[0]?.contact}
              </div>
            </div>
          )}

          {ticketSubmitted && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-status-success-bg dark:bg-status-success/20 text-[#1F7A50] dark:text-[#7BD9AC] text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isEn
                ? 'Your anonymous question ticket has been submitted and recorded!'
                : 'Tiket pertanyaan anonim Anda berhasil dikirim dan tercatat!'}
            </div>
          )}

          {ticketError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-status-urgent-bg dark:bg-status-urgent/20 text-[#B33834] dark:text-[#FF8A85] text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{ticketError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-3">
            <div>
              <label htmlFor="ticket-cat" className="field-label">
                {isEn ? 'Question Topic' : 'Topik Pertanyaan'}
              </label>
              <select
                id="ticket-cat"
                value={questionCategory}
                onChange={(e) => setQuestionCategory(e.target.value)}
                className="field w-full font-semibold"
              >
                <option value="Persiapan Tes & JKN">
                  {isEn ? 'Test Preparation & JKN Pathway' : 'Persiapan Tes & Alur JKN'}
                </option>
                <option value="Membaca Hasil Lab">
                  {isEn ? 'Understanding Lab Result Terms' : 'Memahami Istilah Hasil Lab'}
                </option>
                <option value="Gaya Hidup & Kebiasaan">
                  {isEn ? 'Lifestyle & Daily Habits' : 'Gaya Hidup & Kebiasaan Harian'}
                </option>
                <option value="Komunikasi Pasangan">
                  {isEn ? 'Partner Communication & Support' : 'Komunikasi & Pendampingan Pasangan'}
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-text" className="field-label">
                {isEn
                  ? 'Write Your Question (Min. 10 characters, No Name/Identity)'
                  : 'Tulis Pertanyaan Anda (Minimal 10 karakter, Tanpa Nama/Identitas)'}
              </label>
              <textarea
                id="ticket-text"
                rows={3}
                required
                minLength={10}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder={
                  isEn
                    ? 'Example: Doctor, is it okay to go for a run the day before my semen analysis sample collection?'
                    : 'Contoh: Dok, apakah saya boleh olahraga lari sehari sebelum jadwal pengambilan sampel analisis semen?'
                }
                className="field w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAskNakesModal(false)}
                className="btn btn-secondary"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
              <button
                type="submit"
                disabled={isSendingTicket}
                className="btn btn-primary"
              >
                <Send className="w-4 h-4" />
                {isSendingTicket
                  ? isEn
                    ? 'Sending...'
                    : 'Mengirim...'
                  : isEn
                  ? 'Submit Anonymous Ticket'
                  : 'Kirim Tiket Anonim'}
              </button>
            </div>
          </form>

          {/* Daftar Tiket Pertanyaan Anonim & Balasan Nakes */}
          <div className="pt-4 border-t border-brand-navy/10 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="eyebrow !text-brand-navy/60 dark:!text-white/60">
                {isEn
                  ? `Your Anonymous Question Ticket History (${tickets.length})`
                  : `Riwayat Tiket Pertanyaan Anonim Anda (${tickets.length})`}
              </h3>
              <button
                type="button"
                onClick={() => void refreshTickets()}
                className="text-2xs font-bold text-brand-teal flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isEn ? 'Check Replies' : 'Cek Balasan'}</span>
              </button>
            </div>
            {tickets.length === 0 && (
              <p className="text-xs text-brand-navy/65 dark:text-white/65 italic">
                {isEn
                  ? 'No question tickets submitted yet. Send a question above when you are ready.'
                  : 'Belum ada tiket pertanyaan yang dikirim. Kirim pertanyaan di atas kapan pun Anda siap.'}
              </p>
            )}
            {tickets.map((tItem) => (
              <div
                key={tItem.id}
                className="well p-4 space-y-2.5 text-xs leading-relaxed"
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
                    {tItem.status === 'dijawab'
                      ? isEn
                        ? 'Answered by Provider'
                        : 'Sudah Dijawab Nakes'
                      : isEn
                      ? 'Awaiting Provider Review'
                      : 'Menunggu Tinjauan Nakes'}
                  </span>
                </div>
                <p className="font-semibold text-brand-navy dark:text-white">“{tItem.text}”</p>
                {tItem.reply_text && (
                  <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark-card border-l-4 border-brand-teal space-y-1">
                    <div className="font-bold text-brand-teal-dark dark:text-[#7FDADB]">{tItem.replied_by}:</div>
                    <p className="text-brand-navy/85 dark:text-white/85 leading-relaxed">
                      {tItem.reply_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pencarian & Filter Kategori Artikel */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-navy/50 dark:text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEn
                  ? 'Search topic: varicocele, abstinence, myths, smoking, partner...'
                  : 'Cari topik: varikokel, masa pantang, mitos, rokok, pasangan...'
              }
              aria-label={isEn ? 'Search educational articles' : 'Cari artikel edukasi'}
              className="field w-full pl-10 pr-4"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Reset Filters' : 'Reset Filter'}</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${
                selectedCategory === cat
                  ? 'bg-brand-teal-strong text-white shadow-xs'
                  : 'bg-brand-navy/[0.05] dark:bg-white/[0.07] text-brand-navy/75 dark:text-white/75 hover:bg-brand-teal-light dark:hover:bg-white/15'
              }`}
            >
              {isEn ? CATEGORY_LABELS_EN[cat] || cat : cat}
            </button>
          ))}
        </div>

        {/* Grid 12 Artikel atau Empty State */}
        {filteredArticles.length === 0 ? (
          <div className="well p-8 text-center space-y-3">
            <p className="text-sm font-bold text-brand-navy dark:text-white">
              {isEn
                ? 'No articles match your search or category filter.'
                : 'Belum ada artikel yang cocok dengan kata kunci atau kategori ini.'}
            </p>
            <p className="text-xs text-brand-navy/70 dark:text-white/70">
              {isEn
                ? 'Try clearing your search or selecting "All Topics".'
                : 'Coba hapus kata kunci pencarian atau pilih kategori "Semua".'}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary btn-sm mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Show All 12 Articles' : 'Tampilkan Semua 12 Artikel'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1">
            {filteredArticles.map((art) => (
              <article
                key={art.id}
                className="well p-5 flex flex-col justify-between space-y-4 transition duration-200 hover:border-brand-teal/50 hover:shadow-soft"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge badge-teal">
                      {isEn ? CATEGORY_LABELS_EN[art.category] || art.category : art.category}
                    </span>
                    <span className="text-2xs font-medium text-brand-navy/65 dark:text-white/65 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />{' '}
                      {isEn ? `${art.read_minutes} min read` : `${art.read_minutes} menit baca`}
                    </span>
                  </div>
                  <h2 className="text-base font-bold leading-snug text-brand-navy dark:text-white">
                    {art.title}
                  </h2>
                  <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-brand-navy/10 dark:border-white/10 flex items-center justify-between gap-3">
                  <span className="text-2xs text-brand-navy/60 dark:text-white/60 truncate min-w-0">
                    {art.reviewer}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveArticle(art)}
                    className="btn btn-soft btn-sm shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {isEn ? 'Read Article' : 'Baca Artikel'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Seksi FAQ (Tanya Jawab Umum) */}
      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="section-title">
          {isEn ? 'Frequently Asked Questions (FAQ)' : 'Pertanyaan yang Sering Diajukan (FAQ)'}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {localizedFaqs.map((faq) => (
            <details
              key={faq.id}
              className="group well px-4 py-3.5 open:border-brand-teal/40"
            >
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-start justify-between gap-3">
                <span className="space-y-1">
                  <span className="eyebrow block">{faq.category}</span>
                  <span className="block font-bold text-sm leading-snug text-brand-navy dark:text-white">{faq.question}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-5 h-5 mt-0.5 shrink-0 text-brand-navy/50 dark:text-white/50 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed mt-3 pt-3 border-t border-brand-navy/10 dark:border-white/10">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};
