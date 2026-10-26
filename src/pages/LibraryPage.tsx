import React, { useState, useMemo } from 'react';
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
          <h3 key={i} className="text-base sm:text-lg font-bold text-brand-navy dark:text-white pt-2">
            {block.replace('### ', '')}
          </h3>
        );
      }
      if (block.startsWith('- ') || block.startsWith('1. ')) {
        const lines = block.split('\n');
        return (
          <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm text-brand-navy/85 dark:text-white/85">
            {lines.map((line, j) => (
              <li key={j}>{line.replace(/^(-|\d+\.)\s+/, '').replace(/\*\*/g, '')}</li>
            ))}
          </ul>
        );
      }
      return (
        <p key={i} className="text-sm text-brand-navy/85 dark:text-white/85 leading-relaxed">
          {block.replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  // Tampilan Detail Artikel
  if (activeArticle) {
    return (
      <div className="w-full space-y-5">
        <button
          type="button"
          onClick={() => setActiveArticle(null)}
          className="touch-target px-4 py-2 rounded-btn bg-surface dark:bg-surface-dark-card border border-brand-navy/15 text-xs font-bold flex items-center gap-1.5 hover:border-brand-teal transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Pustaka Edukasi
        </button>

        <article className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 sm:p-8 border border-brand-navy/5 space-y-5">
          <div className="space-y-2 border-b border-brand-navy/10 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-teal-light text-brand-teal">
                {activeArticle.category}
              </span>
              <span className="text-xs text-brand-navy/65 dark:text-white/65 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Estimasi baca: {activeArticle.read_minutes} menit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white leading-snug">
              {activeArticle.title}
            </h1>
            <p className="text-sm text-brand-navy/75 dark:text-white/75">{activeArticle.summary}</p>
          </div>

          <div className="space-y-4">{renderMarkdownParagraphs(activeArticle.body_md)}</div>

          {/* Bagian Wajib F6: Sumber dan Peninjau */}
          <div className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border-l-4 border-brand-teal space-y-1">
            <div className="text-xs font-bold text-brand-teal uppercase tracking-wider">
              Sumber dan Peninjau Medis
            </div>
            <p className="text-xs text-brand-navy/85 dark:text-white/85 font-medium">
              {activeArticle.reviewer}
            </p>
            <p className="text-[11px] text-brand-navy/65 dark:text-white/65">
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
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white">
            Pustaka Edukasi & Tanya Tenaga Kesehatan
          </h1>
          <p className="text-xs sm:text-sm text-brand-navy/75 dark:text-white/75">
            12 artikel pendek terkurasi (&le; 400 kata), mitos vs fakta, dan tanya jawab anonim tanpa penghakiman.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAskNakesModal(!showAskNakesModal)}
          className="touch-target px-4 py-3 rounded-btn bg-brand-coral text-white font-bold text-xs shadow-soft hover:bg-brand-coral-dark transition flex items-center gap-2 shrink-0"
        >
          <MessageCircleQuestion className="w-4 h-4" />
          Tanya tenaga kesehatan
        </button>
      </section>

      {/* Formulir Pertanyaan Anonim (Tanya Tenaga Kesehatan — Tiket Database, Tanpa Chatbot AI Bebas) */}
      {showAskNakesModal && (
        <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border-2 border-brand-coral/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-teal">
                <ShieldCheck className="w-4 h-4" /> Formulir Pertanyaan Anonim (Tiket Konseling)
              </span>
              <h2 className="text-lg font-bold text-brand-navy dark:text-white">
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
              className="p-4 rounded-card bg-brand-coral-light border border-brand-coral text-brand-navy space-y-2 text-xs"
            >
              <div className="font-bold flex items-center gap-2 text-sm">
                <HeartHandshake className="w-5 h-5 text-brand-coral-dark" />
                {assessmentRulesConfig.emotionalSupportBanner.title}
              </div>
              <p>{assessmentRulesConfig.emotionalSupportBanner.message}</p>
              <div className="font-bold text-brand-teal">
                Layanan Konseling SEJIWA Kemenkes: 119 ext 8
              </div>
            </div>
          )}

          {ticketSubmitted && (
            <div
              role="status"
              className="p-3.5 rounded-btn bg-status-success-bg text-status-success text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Tiket pertanyaan anonim Anda berhasil dikirim dan tercatat!
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-3">
            <div>
              <label htmlFor="ticket-cat" className="block text-xs font-bold mb-1">
                Topik Pertanyaan
              </label>
              <select
                id="ticket-cat"
                value={questionCategory}
                onChange={(e) => setQuestionCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-btn border border-brand-navy/20 text-xs font-semibold text-brand-navy bg-white"
              >
                <option value="Persiapan Tes & JKN">Persiapan Tes & Alur JKN</option>
                <option value="Membaca Hasil Lab">Memahami Istilah Hasil Lab</option>
                <option value="Gaya Hidup & Kebiasaan">Gaya Hidup & Kebiasaan Harian</option>
                <option value="Komunikasi Pasangan">Komunikasi & Pendampingan Pasangan</option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-text" className="block text-xs font-bold mb-1">
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
                className="w-full p-3.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAskNakesModal(false)}
                className="touch-target px-4 py-2 rounded-btn border border-brand-navy/20 text-xs font-semibold"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="touch-target px-5 py-2 rounded-btn bg-brand-teal text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Kirim Tiket Anonim
              </button>
            </div>
          </form>

          {/* Daftar Tiket Pertanyaan Anonim & Balasan Nakes */}
          <div className="pt-3 border-t border-brand-navy/10 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/70 dark:text-white/70">
              Riwayat Tiket Pertanyaan Anonim Anda ({tickets.length})
            </h3>
            {tickets.map((tItem) => (
              <div
                key={tItem.id}
                className="p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-teal">{tItem.category}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      tItem.status === 'dijawab'
                        ? 'bg-status-success-bg text-status-success'
                        : 'bg-status-warning-bg text-brand-navy'
                    }`}
                  >
                    {tItem.status === 'dijawab' ? 'Sudah Dijawab Nakes' : 'Menunggu Tinjauan Nakes'}
                  </span>
                </div>
                <p className="font-semibold text-brand-navy dark:text-white">“{tItem.text}”</p>
                {tItem.reply_text && (
                  <div className="p-3 rounded-btn bg-surface dark:bg-surface-dark-card border-l-4 border-brand-teal space-y-1">
                    <div className="font-bold text-brand-teal">{tItem.replied_by}:</div>
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
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-navy/50 absolute left-3.5 top-3" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik: varikokel, masa pantang, mitos, rokok, pasangan..."
              aria-label="Cari artikel edukasi"
              className="w-full pl-10 pr-4 py-2.5 rounded-btn border border-brand-navy/20 text-xs text-brand-navy bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${
                selectedCategory === cat
                  ? 'bg-brand-teal text-white'
                  : 'bg-surface-muted dark:bg-surface-dark text-brand-navy/75 dark:text-white/75 hover:bg-brand-teal/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid 12 Artikel */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="p-5 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10 flex flex-col justify-between space-y-3 hover:border-brand-teal transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal">
                    {art.category}
                  </span>
                  <span className="text-[11px] font-medium text-brand-navy/65 dark:text-white/65 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {art.read_minutes} menit baca
                  </span>
                </div>
                <h2 className="font-bold text-base text-brand-navy dark:text-white leading-snug">
                  {art.title}
                </h2>
                <p className="text-xs text-brand-navy/75 dark:text-white/75 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-brand-navy/10 flex items-center justify-between gap-2">
                <span className="text-[10px] text-brand-navy/60 dark:text-white/60 truncate max-w-[200px]">
                  {art.reviewer}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveArticle(art)}
                  className="touch-target px-3.5 py-1.5 rounded-btn bg-brand-navy text-white text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-brand-teal transition"
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
      <section className="bg-surface dark:bg-surface-dark-card rounded-card shadow-soft p-6 border border-brand-navy/5 space-y-4">
        <h2 className="text-lg font-bold text-brand-navy dark:text-white">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {seedFaqs.map((faq) => (
            <details
              key={faq.id}
              className="group p-4 rounded-card bg-surface-muted dark:bg-surface-dark border border-brand-navy/10"
            >
              <summary className="font-bold text-sm text-brand-navy dark:text-white cursor-pointer flex items-center justify-between">
                <span>{faq.question}</span>
                <span className="text-xs text-brand-teal font-semibold ml-2">{faq.category}</span>
              </summary>
              <p className="text-xs text-brand-navy/80 dark:text-white/80 leading-relaxed mt-2.5 pt-2.5 border-t border-brand-navy/10">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};
