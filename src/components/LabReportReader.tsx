import React, { useRef, useState } from 'react';
import { FileScan, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AiConsentGate } from './AiConsentGate';
import { MAX_AI_UPLOAD_BYTES, readFileAsDataUrl, readLabReport, useAiStatus, type LabReadResult } from '../lib/ai-client';

const LABELS: Record<string, { id: string; en: string }> = {
  test_date: { id: 'Tanggal tes', en: 'Test date' },
  volume_ml: { id: 'Volume', en: 'Volume' },
  concentration_million_per_ml: { id: 'Konsentrasi', en: 'Concentration' },
  total_motility_pct: { id: 'Motilitas total', en: 'Total motility' },
  progressive_motility_pct: { id: 'Motilitas progresif', en: 'Progressive motility' },
  normal_morphology_pct: { id: 'Morfologi normal', en: 'Normal morphology' },
};

/**
 * Pembaca hasil lab berbasis AI: foto/PDF lembar analisis semen → angka yang mengisi formulir.
 * Pengguna WAJIB memeriksa setiap angka sebelum menyimpan; berkas tidak disimpan di server.
 */
export const LabReportReader: React.FC<{
  onValues: (values: LabReadResult['values'], file: { name: string; mimeType: string; dataUrl: string; size: number }) => void;
}> = ({ onValues }) => {
  const { locale } = useApp();
  const aiStatus = useAiStatus();
  const supportsPdf = aiStatus.supportsPdf;
  const isEn = locale === 'en';
  const loc: 'id' | 'en' = isEn ? 'en' : 'id';
  const inputRef = useRef<HTMLInputElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LabReadResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResult(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const allowedPattern = supportsPdf ? /^(image\/(jpeg|png|webp)|application\/pdf)$/ : /^image\/(jpeg|png|webp)$/;
    if (!allowedPattern.test(file.type)) {
      setError(
        supportsPdf
          ? isEn
            ? 'Use a JPG, PNG, WEBP or PDF file.'
            : 'Gunakan berkas JPG, PNG, WEBP, atau PDF.'
          : isEn
          ? 'Use a JPG, PNG or WEBP photo (PDF is not supported by the current AI provider).'
          : 'Gunakan foto JPG, PNG, atau WEBP (PDF belum didukung penyedia AI saat ini).',
      );
      return;
    }
    if (file.size > MAX_AI_UPLOAD_BYTES) {
      setError(isEn ? 'The file is larger than 5 MB.' : 'Ukuran berkas lebih dari 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await readLabReport(dataUrl, loc);
      setResult(res);
      onValues(res.values, { name: file.name, mimeType: file.type, dataUrl, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Could not read the file.' : 'Berkas tidak dapat dibaca.');
    } finally {
      setBusy(false);
    }
  };

  const filled = result ? Object.keys(result.values).length : 0;

  return (
    <AiConsentGate
      compact
      whatIsSent={
        isEn
          ? 'For the lab reader: the photo or PDF you choose, only to read the six semen-analysis values.'
          : 'Untuk pembaca lab: foto atau PDF yang Anda pilih, hanya untuk membaca enam nilai analisis semen.'
      }
    >
      <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal-light/40 dark:bg-brand-teal/10 p-4 space-y-3" data-testid="lab-report-reader">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-brand-teal shrink-0" />
          <div className="space-y-1">
            <div className="text-sm font-bold text-brand-navy dark:text-white">
              {isEn ? 'Fill the form from your lab report (AI)' : 'Isi formulir dari lembar hasil lab (AI)'}
            </div>
            <p className="text-xs text-brand-navy/80 dark:text-white/80">
              {isEn
                ? 'Take a photo or choose the PDF. AI reads the numbers into the form below; you check each one before saving.'
                : 'Foto atau pilih PDF hasil lab. AI menyalin angkanya ke formulir di bawah; Anda memeriksa setiap angka sebelum menyimpan.'}
            </p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs cursor-pointer text-brand-navy/85 dark:text-white/85">
          <input type="checkbox" className="check mt-0.5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
          <span>
            <ShieldAlert className="inline w-3.5 h-3.5 text-brand-coral-dark mr-1" />
            {isEn
              ? 'I have covered or cropped my name and ID number. I understand the file is sent to the AI provider only to read the values and is not stored.'
              : 'Saya sudah menutup atau memotong nama dan nomor identitas saya. Saya memahami berkas dikirim ke penyedia AI hanya untuk membaca angka dan tidak disimpan.'}
          </span>
        </label>
        <input
          ref={inputRef}
          type="file"
          accept={supportsPdf ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp'}
          className="hidden"
          onChange={handleFile}
          aria-label={isEn ? 'Lab report file' : 'Berkas hasil lab'}
          data-testid="lab-report-input"
        />
        <button type="button" className="btn btn-primary btn-sm" disabled={!acknowledged || busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileScan className="w-4 h-4" />}
          {busy
            ? isEn
              ? 'Reading…'
              : 'Membaca…'
            : supportsPdf
            ? isEn
              ? 'Choose photo or PDF'
              : 'Pilih foto atau PDF'
            : isEn
            ? 'Choose lab photo'
            : 'Pilih foto hasil lab'}
        </button>
        {error && (
          <p role="alert" className="text-xs font-semibold text-[#B33834] dark:text-[#FF8A85]">
            {error}
          </p>
        )}
        {result && (
          <div role="status" className="text-xs space-y-1 text-brand-navy/85 dark:text-white/85">
            <p className="font-bold">
              {isEn
                ? `AI filled ${filled} of 6 values. Check each one against your report before saving.`
                : `AI mengisi ${filled} dari 6 nilai. Periksa setiap angka dengan lembar hasil Anda sebelum menyimpan.`}
            </p>
            {result.missing.length > 0 && (
              <p>
                {isEn ? 'Not found or unclear: ' : 'Tidak ditemukan atau kurang jelas: '}
                {result.missing.map((m) => LABELS[m]?.[loc] ?? m).join(', ')}
              </p>
            )}
            {result.note && <p className="italic">{result.note}</p>}
          </div>
        )}
      </div>
    </AiConsentGate>
  );
};
