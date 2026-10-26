import { describe, it, expect } from 'vitest';
import {
  evaluateAssessment,
  detectEmotionalDistress,
  RENDRA_DEMO_ANSWERS,
} from '../lib/assessment-engine';
import { assessmentRulesConfig, semenReferenceConfig } from '../config/schemas';

describe('Mesin Penilaian Risiko Mandiri (Rule-Based Assessment Engine — 18 Kasus Uji)', () => {
  it('Kasus 1: Jawaban kosong menghasilkan saran "Pertimbangkan pemeriksaan rutin"', () => {
    const res = evaluateAssessment({});
    expect(res.levelCode).toBe('routine');
    expect(res.levelLabel).toBe('Pertimbangkan pemeriksaan rutin');
    expect(res.factors).toHaveLength(0);
  });

  it('Kasus 2: Semua pertanyaan dilewati (skipped/unknown) menghasilkan "Pertimbangkan pemeriksaan rutin"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'unknown',
      partner_context: 'unknown',
      smoking_habit: 'skipped',
      heat_exposure: 'unknown',
    });
    expect(res.levelCode).toBe('routine');
    expect(res.factors).toHaveLength(0);
  });

  it('Kasus 3: Profil sehat dengan program hamil < 6 bulan menghasilkan "Pertimbangkan pemeriksaan rutin"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      partner_context: 'under_35',
      prior_pregnancy: 'yes_together',
      reproductive_history: 'none',
      physical_symptoms: 'none',
      smoking_habit: 'never_or_quit',
      alcohol_habit: 'none',
      heat_exposure: 'rarely',
      physical_activity: 'active_moderate',
      bmi_category: 'normal',
      medications_supplements: 'none_or_vitamins',
      sleep_and_stress: 'good_rest',
    });
    expect(res.levelCode).toBe('routine');
    expect(res.badgeColor).toBe('success');
  });

  it('Kasus 4: Aturan wajib — lama program hamil > 12 bulan (12–24 bulan) tanpa faktor risiko lain minimal menghasilkan "Sebaiknya periksa dalam 1 sampai 2 bulan"', () => {
    const res = evaluateAssessment({
      ttc_duration: '12_to_24_months',
      partner_context: 'under_35',
      smoking_habit: 'never_or_quit',
    });
    expect(res.levelCode).toBe('within_1_2_months');
    expect(res.levelLabel).toBe('Sebaiknya periksa dalam 1 sampai 2 bulan');
  });

  it('Kasus 5: Aturan wajib — lama program hamil > 6 bulan (6–12 bulan) dengan usia pasangan >= 35 tahun minimal menghasilkan "Sebaiknya periksa dalam 1 sampai 2 bulan"', () => {
    const res = evaluateAssessment({
      ttc_duration: '6_to_12_months',
      partner_context: 'over_35',
    });
    expect(res.levelCode).toBe('within_1_2_months');
    expect(res.levelLabel).toBe('Sebaiknya periksa dalam 1 sampai 2 bulan');
  });

  it('Kasus 6: Privasi pasangan — aturan usia pasangan >= 35 tahun TIDAK mengungkap data pasangan di daftar faktor hasil', () => {
    const res = evaluateAssessment({
      ttc_duration: '6_to_12_months',
      partner_context: 'over_35',
    });
    const hasPartnerFactor = res.factors.some((f) => f.questionId === 'partner_context');
    expect(hasPartnerFactor).toBe(false);
    const serialized = JSON.stringify(res.factors).toLowerCase();
    expect(serialized).not.toContain('35 tahun');
  });

  it('Kasus 7: Usia pasangan >= 35 tahun tetapi durasi program hamil masih < 6 bulan tanpa faktor lain tetap menghasilkan "Pertimbangkan pemeriksaan rutin"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      partner_context: 'over_35',
    });
    expect(res.levelCode).toBe('routine');
  });

  it('Kasus 8: Skenario Demo Rendra (8 bulan promil + faktor gaya hidup) menghasilkan "Sebaiknya periksa dalam 1 sampai 2 bulan"', () => {
    const res = evaluateAssessment(RENDRA_DEMO_ANSWERS);
    expect(res.levelCode).toBe('within_1_2_months');
    expect(res.levelLabel).toBe('Sebaiknya periksa dalam 1 sampai 2 bulan');
    expect(res.factors.length).toBeGreaterThanOrEqual(3);
  });

  it('Kasus 9: Akumulasi faktor gaya hidup (merokok harian + sauna/panas rutin = bobot 6) menghasilkan "Sebaiknya periksa dalam 1 sampai 2 bulan"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      smoking_habit: 'daily_heavy', // 3
      heat_exposure: 'high_occupational_sauna', // 3
    });
    expect(res.levelCode).toBe('within_1_2_months');
  });

  it('Kasus 10: Red flag medis — riwayat testis tidak turun atau operasi testis menghasilkan "Sebaiknya periksa segera"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      reproductive_history: 'undescended_testis_or_surgery',
    });
    expect(res.levelCode).toBe('immediate');
    expect(res.levelLabel).toBe('Sebaiknya periksa segera');
    expect(res.badgeColor).toBe('urgent');
  });

  it('Kasus 11: Red flag medis — riwayat varikokel atau infeksi berulang menghasilkan "Sebaiknya periksa segera"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      reproductive_history: 'varicocele_or_infection',
    });
    expect(res.levelCode).toBe('immediate');
  });

  it('Kasus 12: Red flag fisik — keluhan nyeri sering atau bengkak di area skrotum menghasilkan "Sebaiknya periksa segera"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      physical_symptoms: 'frequent_pain_or_swelling',
    });
    expect(res.levelCode).toBe('immediate');
  });

  it('Kasus 13: Red flag hormon — penggunaan testosteron luar atau steroid menghasilkan "Sebaiknya periksa segera"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'under_6_months',
      medications_supplements: 'testosterone_or_steroids',
    });
    expect(res.levelCode).toBe('immediate');
  });

  it('Kasus 14: Durasi program hamil > 2 tahun (over_24_months) menghasilkan "Sebaiknya periksa segera"', () => {
    const res = evaluateAssessment({
      ttc_duration: 'over_24_months',
    });
    expect(res.levelCode).toBe('immediate');
  });

  it('Kasus 15: Akumulasi skor tinggi (>= 10 tanpa single red flag) menghasilkan "Sebaiknya periksa segera"', () => {
    const res = evaluateAssessment({
      ttc_duration: '12_to_24_months', // 5
      reproductive_history: 'hernia_or_minor', // 3
      physical_symptoms: 'mild_occasional', // 3 -> total 11
    });
    expect(res.levelCode).toBe('immediate');
  });

  it('Kasus 16: Deteksi tekanan emosional berat pada teks bebas menampilkan banner dukungan profesional', () => {
    expect(detectEmotionalDistress('Saya merasa putus asa dan tidak berguna')).toBe(true);
    expect(detectEmotionalDistress('Hari ini cuaca cerah dan saya siap periksa')).toBe(false);

    const res = evaluateAssessment(
      { ttc_duration: 'under_6_months' },
      'Kadang saya merasa putus asa menghadapi pertanyaan keluarga'
    );
    expect(res.showEmotionalSupport).toBe(true);
    expect(res.emotionalSupportBanner.contacts.length).toBeGreaterThan(0);
  });

  it('Kasus 17: Keluhan sulit tidur kronis & sangat tertekan (high_stress_insomnia) juga menampilkan banner dukungan emosional', () => {
    const res = evaluateAssessment({
      sleep_and_stress: 'high_stress_insomnia',
    });
    expect(res.showEmotionalSupport).toBe(true);
  });

  it('Kasus 18: Batas medis & etika — wajib menyertakan disclaimer bukan diagnosis dan tanpa saran obat/dosis di konfigurasi', () => {
    const res = evaluateAssessment(RENDRA_DEMO_ANSWERS);
    expect(res.disclaimer).toBe('Ini bukan diagnosis. Hanya dokter yang dapat menilai kondisi Anda.');
    const allConfigText = JSON.stringify({
      assessmentRulesConfig,
      semenReferenceConfig,
    }).toLowerCase();
    expect(allConfigText).not.toContain('dijamin hamil');
    expect(allConfigText).not.toContain('dosis mg');
  });
});
