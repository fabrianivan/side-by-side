/**
 * Konten penjelasan risiko berbahasa awam (ID & EN) untuk setiap jawaban Cek Awal.
 * Plain-language explanation content (ID & EN) for every self-check answer.
 *
 * BATAS MEDIS: Tidak ada saran obat, dosis, atau suplemen. Semua tindakan bersifat
 * edukatif dan mengarahkan ke dokter. / MEDICAL BOUNDARY: no medication, dosage or
 * supplement advice. Every action is educational and points back to a clinician.
 */

export type RiskDomainKey = 'medical' | 'timing' | 'lifestyle';
export type Changeability = 'changeable' | 'medical' | 'time';

export interface BilingualText {
  id: string;
  en: string;
}

export interface OptionExplanation {
  /** Judul faktor bila opsi tidak punya factorTitle di aturan / Title when rules have none */
  title?: BilingualText;
  /** Apa yang bisa dilakukan, bahasa awam / What you can do, in plain words */
  action?: BilingualText;
  /** Kabar baik untuk opsi tanpa bobot / Good-news line for zero-weight options */
  goodNews?: BilingualText;
  /** Catatan keselamatan bila ada / Safety note when relevant */
  safetyNote?: BilingualText;
}

export interface QuestionExplanation {
  domain: RiskDomainKey;
  changeability: Changeability;
  options: Record<string, OptionExplanation>;
}

export const RISK_DOMAINS: Record<RiskDomainKey, { title: BilingualText; description: BilingualText }> = {
  medical: {
    title: { id: 'Riwayat medis & keluhan', en: 'Medical history & symptoms' },
    description: {
      id: 'Hal-hal yang perlu diperiksa langsung oleh dokter. Kebiasaan sehari-hari tidak bisa menggantikan pemeriksaan ini.',
      en: 'Things a doctor needs to examine directly. Everyday habits cannot replace this check.',
    },
  },
  timing: {
    title: { id: 'Waktu & konteks program hamil', en: 'Time trying & context' },
    description: {
      id: 'Berapa lama Anda dan pasangan sudah mencoba. Semakin lama, semakin bermanfaat pemeriksaan bersama.',
      en: 'How long you and your partner have been trying. The longer it is, the more a joint check-up helps.',
    },
  },
  lifestyle: {
    title: { id: 'Kebiasaan sehari-hari', en: 'Everyday habits' },
    description: {
      id: 'Faktor yang bisa Anda ubah sendiri. Sel sperma butuh sekitar 74 hari untuk matang, jadi perubahan hari ini terlihat dalam ±3 bulan.',
      en: 'Factors you can change yourself. Sperm take about 74 days to mature, so changes made today show up in roughly 3 months.',
    },
  },
};

export const QUESTION_EXPLANATIONS: Record<string, QuestionExplanation> = {
  ttc_duration: {
    domain: 'timing',
    changeability: 'time',
    options: {
      under_6_months: {
        goodNews: {
          id: 'Anda masih di tahap awal program hamil—waktu yang baik untuk membangun kebiasaan sehat bersama.',
          en: 'You are early in trying to conceive—a good time to build healthy habits together.',
        },
      },
      '6_to_12_months': {
        action: {
          id: 'Belum ada yang perlu dikhawatirkan. Catat tanggal mulai program hamil agar mudah dibicarakan dengan dokter bila sudah mendekati 12 bulan.',
          en: 'Nothing to worry about yet. Note when you started trying so it is easy to discuss with a doctor if you approach 12 months.',
        },
      },
      '12_to_24_months': {
        action: {
          id: 'Jadwalkan pemeriksaan untuk Anda berdua; bagi pria, analisis semen dasar biasanya menjadi langkah pertama. Ini langkah wajar, bukan tanda ada yang salah.',
          en: 'Book a check-up for both of you; for men, a basic semen analysis is usually the first step. This is a normal step, not a sign that something is wrong.',
        },
      },
      over_24_months: {
        action: {
          id: 'Setelah lebih dari 2 tahun, evaluasi bersama oleh dokter spesialis adalah cara tercepat mendapat kejelasan. Jadwalkan dalam waktu dekat.',
          en: 'After more than 2 years, a joint evaluation by a specialist is the fastest way to get clarity. Schedule it soon.',
        },
      },
    },
  },
  prior_pregnancy: {
    domain: 'timing',
    changeability: 'time',
    options: {
      yes_together: {
        goodNews: {
          id: 'Pernah hamil bersama pasangan saat ini adalah informasi yang menenangkan dan berguna bagi dokter.',
          en: 'A previous pregnancy with your current partner is reassuring and useful information for a doctor.',
        },
      },
      yes_previous: {
        title: { id: 'Riwayat kehamilan dari hubungan sebelumnya', en: 'Pregnancy in a previous relationship' },
        action: {
          id: 'Ini hanya konteks, bukan masalah. Sampaikan ke dokter karena membantu memahami gambaran utuh.',
          en: 'This is context, not a problem. Mention it to your doctor as it helps complete the picture.',
        },
      },
      never: {
        title: { id: 'Belum pernah ada kehamilan', en: 'No previous pregnancy yet' },
        action: {
          id: 'Ini sangat umum dan hanya menjadi konteks. Dokter biasanya akan menanyakannya di awal konsultasi.',
          en: 'This is very common and only serves as context. Doctors usually ask about it at the start of a visit.',
        },
      },
    },
  },
  reproductive_history: {
    domain: 'medical',
    changeability: 'medical',
    options: {
      none: {
        goodNews: {
          id: 'Tidak ada riwayat tindakan atau kondisi di area reproduksi.',
          en: 'No history of procedures or conditions in the reproductive area.',
        },
      },
      hernia_or_minor: {
        action: {
          id: 'Bawa catatan operasi atau surat dokter lama bila ada. Dokter umum atau urolog dapat memeriksa apakah ada pengaruhnya.',
          en: 'Bring any old surgery notes or doctor letters. A GP or urologist can check whether it has any effect.',
        },
      },
      varicocele_or_infection: {
        action: {
          id: 'Kondisi ini umum dan sering dapat ditangani. Konsultasikan ke dokter spesialis andrologi atau urologi untuk pemeriksaan fisik dan analisis semen.',
          en: 'This is common and often treatable. See an andrologist or urologist for a physical exam and semen analysis.',
        },
      },
      undescended_testis_or_surgery: {
        action: {
          id: 'Riwayat ini perlu dievaluasi langsung oleh dokter spesialis. Bawa catatan medis masa kecil bila ada.',
          en: 'This history needs a direct specialist evaluation. Bring any childhood medical records if available.',
        },
      },
    },
  },
  physical_symptoms: {
    domain: 'medical',
    changeability: 'medical',
    options: {
      none: {
        goodNews: {
          id: 'Tidak ada keluhan fisik di area reproduksi.',
          en: 'No physical discomfort in the reproductive area.',
        },
      },
      mild_occasional: {
        action: {
          id: 'Catat kapan rasa berat/pegal muncul (mis. setelah berdiri lama). Sampaikan ke dokter saat pemeriksaan.',
          en: 'Note when the heaviness or ache appears (e.g. after standing long). Mention it at your check-up.',
        },
      },
      frequent_pain_or_swelling: {
        action: {
          id: 'Benjolan, nyeri berulang, atau bengkak sebaiknya diperiksa dokter dalam waktu dekat—jangan ditunda.',
          en: 'A lump, recurring pain or swelling should be checked by a doctor soon—do not put it off.',
        },
        safetyNote: {
          id: 'Nyeri hebat yang muncul tiba-tiba di testis adalah kondisi darurat. Segera ke IGD terdekat.',
          en: 'Sudden, severe testicular pain is an emergency. Go to the nearest emergency department right away.',
        },
      },
    },
  },
  smoking_habit: {
    domain: 'lifestyle',
    changeability: 'changeable',
    options: {
      never_or_quit: {
        goodNews: { id: 'Tidak merokok atau sudah berhenti.', en: 'Not smoking, or already quit.' },
      },
      occasional_or_vape: {
        action: {
          id: 'Mengurangi atau berhenti (termasuk vape) adalah salah satu perubahan paling berdampak. Layanan berhenti merokok tersedia di Puskesmas.',
          en: 'Cutting down or quitting (vapes included) is one of the most impactful changes. Puskesmas offer free quit-smoking support.',
        },
      },
      daily_heavy: {
        action: {
          id: 'Mulai dengan mengurangi jumlah harian, lalu tetapkan tanggal berhenti. Minta dukungan layanan berhenti merokok di Puskesmas atau dokter.',
          en: 'Start by reducing your daily amount, then set a quit date. Ask a Puskesmas or doctor for quit-smoking support.',
        },
      },
    },
  },
  alcohol_habit: {
    domain: 'lifestyle',
    changeability: 'changeable',
    options: {
      none: { goodNews: { id: 'Tidak mengonsumsi alkohol.', en: 'No alcohol.' } },
      social_occasional: { goodNews: { id: 'Konsumsi alkohol jarang.', en: 'Alcohol only rarely.' } },
      weekly_regular: {
        action: {
          id: 'Kurangi menjadi sesekali dan dalam jumlah kecil selama program hamil. Coba minggu bebas alkohol sebagai awal.',
          en: 'Cut back to occasional, small amounts while trying to conceive. Try alcohol-free weeks as a start.',
        },
      },
    },
  },
  heat_exposure: {
    domain: 'lifestyle',
    changeability: 'changeable',
    options: {
      rarely: { goodNews: { id: 'Jarang terpapar panas berlebih.', en: 'Rarely exposed to excess heat.' } },
      moderate_laptop_sitting: {
        action: {
          id: 'Letakkan laptop di meja, berdiri atau berjalan sebentar tiap jam, dan pilih pakaian dalam yang longgar.',
          en: 'Keep the laptop on a desk, stand or walk briefly every hour, and choose loose underwear.',
        },
      },
      high_occupational_sauna: {
        action: {
          id: 'Hindari sauna dan berendam air panas selama program hamil. Bila panas berasal dari pekerjaan, ambil jeda di tempat sejuk.',
          en: 'Avoid saunas and hot tubs while trying to conceive. If heat comes from work, take breaks somewhere cool.',
        },
      },
    },
  },
  physical_activity: {
    domain: 'lifestyle',
    changeability: 'changeable',
    options: {
      active_moderate: { goodNews: { id: 'Rutin bergerak dan berolahraga.', en: 'Regularly active.' } },
      sedentary: {
        action: {
          id: 'Targetkan sekitar 150 menit aktivitas sedang per minggu (mis. jalan cepat 30 menit, 5 hari).',
          en: 'Aim for about 150 minutes of moderate activity a week (e.g. a 30-minute brisk walk, 5 days).',
        },
      },
      extreme_cycling: {
        action: {
          id: 'Gunakan celana berbantalan dan sadel yang pas, serta sisipkan hari istirahat di antara sesi panjang.',
          en: 'Use padded shorts and a well-fitted saddle, and add rest days between long rides.',
        },
      },
    },
  },
  bmi_category: {
    domain: 'lifestyle',
    changeability: 'changeable',
    options: {
      normal: { goodNews: { id: 'Berat badan proporsional.', en: 'Healthy weight range.' } },
      overweight_or_underweight: {
        action: {
          id: 'Perubahan bertahap pada pola makan dan aktivitas sudah cukup. Dokter atau ahli gizi dapat membantu menetapkan target aman.',
          en: 'Gradual changes to eating and activity are enough. A doctor or dietitian can help set a safe target.',
        },
      },
      obese: {
        action: {
          id: 'Penurunan berat badan yang bertahap dapat membantu keseimbangan hormon. Diskusikan target yang realistis dengan dokter atau ahli gizi.',
          en: 'Gradual weight loss can help hormone balance. Discuss a realistic target with a doctor or dietitian.',
        },
      },
    },
  },
  medications_supplements: {
    domain: 'medical',
    changeability: 'medical',
    options: {
      none_or_vitamins: {
        goodNews: { id: 'Tidak ada obat rutin yang perlu ditinjau.', en: 'No regular medicines to review.' },
      },
      chronic_meds: {
        action: {
          id: 'Jangan menghentikan atau mengubah obat sendiri. Bawa daftar obat ke dokter dan tanyakan apakah ada yang memengaruhi kesuburan.',
          en: 'Do not stop or change any medicine on your own. Bring a list to your doctor and ask whether any affect fertility.',
        },
      },
      testosterone_or_steroids: {
        action: {
          id: 'Testosteron atau steroid dari luar dapat menekan produksi sperma. Ceritakan dengan jujur ke dokter—jangan menghentikan mendadak tanpa pendampingan medis.',
          en: 'Testosterone or steroids taken from outside can suppress sperm production. Tell your doctor openly—do not stop abruptly without medical guidance.',
        },
      },
    },
  },
  sleep_and_stress: {
    domain: 'lifestyle',
    changeability: 'changeable',
    options: {
      good_rest: { goodNews: { id: 'Tidur cukup dan stres terkendali.', en: 'Good sleep and manageable stress.' } },
      moderate_stress_lack_sleep: {
        action: {
          id: 'Usahakan tidur 7–8 jam dengan jam tidur yang konsisten, dan sisihkan waktu santai berdua tanpa membahas program hamil.',
          en: 'Aim for 7–8 hours of sleep at consistent times, and set aside relaxed time together that is not about trying to conceive.',
        },
      },
      high_stress_insomnia: {
        action: {
          id: 'Anda tidak harus menanggungnya sendiri. Bicarakan dengan orang yang Anda percaya atau konselor; SEJIWA 119 ext 8 siap mendengarkan.',
          en: 'You do not have to carry this alone. Talk to someone you trust or a counsellor; SEJIWA 119 ext 8 is there to listen.',
        },
      },
    },
  },
};

export const TIMING_RULE_TEXT: Record<string, BilingualText> = {
  ttc_over_12_months: {
    id: 'Anda sudah mencoba lebih dari 12 bulan. Pedoman WHO menyarankan kedua pasangan diperiksa pada titik ini—alasan ini saja sudah cukup untuk menyarankan pemeriksaan dalam 1–2 bulan.',
    en: 'You have been trying for more than 12 months. WHO guidance recommends both partners get checked at this point—this reason alone is enough to recommend a check-up within 1–2 months.',
  },
  ttc_over_6_months_partner_35: {
    id: 'Berdasarkan rentang waktu program hamil bersama, evaluasi lebih awal disarankan—alasan ini saja sudah cukup untuk menyarankan pemeriksaan dalam 1–2 bulan.',
    en: 'Based on your shared timeline, an earlier evaluation is recommended—this reason alone is enough to recommend a check-up within 1–2 months.',
  },
};
