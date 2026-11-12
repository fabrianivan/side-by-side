import React, { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { seedArticles, seedFaqs, type SeedArticle } from '../config/seed-articles';
import { assessmentRulesConfig } from '../config/schemas';
import { detectEmotionalDistress } from '../lib/assessment-engine';
import { useApp } from '../context/AppContext';

export const LibraryPage: React.FC = () => {
  const { tickets, submitQuestionTicket } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [activeArticle, setActiveArticle] = useState<SeedArticle | null>(null);

  // Membuka atau menutup artikel selalu dimulai dari bagian atas halaman.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeArticle]);
  const [showAskNakesModal, setShowAskNakesModal] = useState<boolean>(false);

  // Form Tiket Pertanyaan Anonim
  const [questionCategory, setQuestionCategory] = useState<string>('Persiapan Tes & JKN');
  const [questionText, setQuestionText] = useState<string>('');
  const [ticketSubmitted, setTicketSubmitted] = useState<boolean>(false);

  const categories = [
    'Semua',
    'Dasar Kesuburan',
    'Gaya Hidup',
    'Persiapan Tes',
    'Pasangan & Emosi',
    'Privasi & Hak',
  ];

  const filteredArticles = useMemo(() => {
    return seedArticles.filter((art) => {
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
  }, [selectedCategory, searchQuery]);

  const showDistressAlert = detectEmotionalDistress(questionText);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim().length < 10) return;
    await submitQuestionTicket(questionCategory, questionText.trim());
    setQuestionText('');
    setTicketSubmitted(true);
    setTimeout(() => setTicketSubmitted(false), 4000);
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
          Kembali ke Pustaka Edukasi
        </button>

        <article className="card p-6 sm:p-10 space-y-6">
          <div className="space-y-3 border-b border-brand-navy/10 dark:border-white/10 pb-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="badge badge-teal">
                {activeArticle.category}
              </span>
              <span className="text-xs text-brand-navy/65 dark:text-white/65 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Estimasi baca: {activeArticle.read_minutes} menit
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
              Sumber dan Peninjau Medis
            </div>
            <p className="text-xs text-brand-navy/85 dark:text-white/85 font-medium">
              {activeArticle.reviewer}
            </p>
            <p className="text-2xs text-brand-navy/65 dark:text-white/65">
              Terakhir diperbarui: {activeArticle.updated_at} • Edukasi kesehatan, bukan pengganti konsultasi dokter.
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
            Pustaka Edukasi & Tanya Tenaga Kesehatan
          </h1>
          <p className="page-lead">
            12 artikel pendek terkurasi (&le; 400 kata), mitos vs fakta, dan tanya jawab anonim tanpa penghakiman.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAskNakesModal(!showAskNakesModal)}
          aria-expanded={showAskNakesModal}
          className="btn btn-coral shrink-0 self-start lg:self-auto"
        >
          <MessageCircleQuestion className="w-4 h-4" />
          Tanya tenaga kesehatan
        </button>
      </section>

      {/* Formulir Pertanyaan Anonim (Tanya Tenaga Kesehatan — Tiket Database, Tanpa Chatbot AI Bebas) */}
      {showAskNakesModal && (
        <section className="card p-5 sm:p-6 border-brand-coral/50 ring-4 ring-brand-coral/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="eyebrow inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Formulir Pertanyaan Anonim (Tiket Konseling)
              </span>
              <h2 className="section-title">
                Tanya Tenaga Kesehatan Secara Anonim
              </h2>
              <p className="text-xs text-brand-navy/70 dark:text-white/70">
                Pertanyaan Anda disimpan sebagai tiket anonim untuk ditinjau tenaga kesehatan mitra (bukan chatbot AI otomatis demi keselamatan medis).
              </p>
            </div>
          </div>

          {showDistressAlert && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-brand-coral-light border border-brand-coral/60 text-brand-navy space-y-2 text-xs leading-relaxed"
            >
              <div className="font-bold flex items-center gap-2 text-sm">
                <HeartHandshake className="w-5 h-5 text-brand-coral-dark" />
                {assessmentRulesConfig.emotionalSupportBanner.title}
              </div>
              <p>{assessmentRulesConfig.emotionalSupportBanner.message}</p>
              <div className="font-bold text-brand-teal-dark">
                Layanan Konseling SEJIWA Kemenkes: 119 ext 8
              </div>
            </div>
          )}

          {ticketSubmitted && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-status-success-bg text-[#1F7A50] text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Tiket pertanyaan anonim Anda berhasil dikirim dan tercatat!
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-3">
            <div>
              <label htmlFor="ticket-cat" className="field-label">
                Topik Pertanyaan
              </label>
              <select
                id="ticket-cat"
                value={questionCategory}
                onChange={(e) => setQuestionCategory(e.target.value)}
                className="field w-full font-semibold"
              >
                <option value="Persiapan Tes & JKN">Persiapan Tes & Alur JKN</option>
                <option value="Membaca Hasil Lab">Memahami Istilah Hasil Lab</option>
                <option value="Gaya Hidup & Kebiasaan">Gaya Hidup & Kebiasaan Harian</option>
                <option value="Komunikasi Pasangan">Komunikasi & Pendampingan Pasangan</option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-text" className="field-label">
                Tulis Pertanyaan Anda (Minimal 10 karakter, Tanpa Nama/Identitas)
              </label>
              <textarea
                id="ticket-text"
                rows={3}
                required
                minLength={10}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Contoh: Dok, apakah saya boleh olahraga lari sehari sebelum jadwal pengambilan sampel analisis semen?"
                className="field w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAskNakesModal(false)}
                className="btn btn-secondary"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Send className="w-4 h-4" />
                Kirim Tiket Anonim
              </button>
            </div>
          </form>

          {/* Daftar Tiket Pertanyaan Anonim & Balasan Nakes */}
          <div className="pt-4 border-t border-brand-navy/10 dark:border-white/10 space-y-2.5">
            <h3 className="eyebrow !text-brand-navy/60 dark:!text-white/60">
              Riwayat Tiket Pertanyaan Anonim Anda ({tickets.length})
            </h3>
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
                    {tItem.status === 'dijawab' ? 'Sudah Dijawab Nakes' : 'Menunggu Tinjauan Nakes'}
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
              placeholder="Cari topik: varikokel, masa pantang, mitos, rokok, pasangan..."
              aria-label="Cari artikel edukasi"
              className="field w-full pl-10 pr-4"
            />
          </div>
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
              {cat}
            </button>
          ))}
        </div>

        {/* Grid 12 Artikel */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="well p-5 flex flex-col justify-between space-y-4 transition duration-200 hover:border-brand-teal/50 hover:shadow-soft"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-teal">
                    {art.category}
                  </span>
                  <span className="text-2xs font-medium text-brand-navy/65 dark:text-white/65 flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5" /> {art.read_minutes} menit baca
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
                  Baca Artikel
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Seksi FAQ (Tanya Jawab Umum) */}
      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="section-title">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {seedFaqs.map((faq) => (
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
