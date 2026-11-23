/**
 * Pembuat berkas kalender iCalendar (RFC 5545 .ics) untuk Google Calendar, Apple Calendar, dan Outlook.
 */

export interface IcsEventInput {
  uid?: string;
  title: string;
  start: string; // YYYY-MM-DDTHH:mm atau ISO string
  durationMinutes?: number;
  location?: string;
  description?: string;
  alarmMinutesBefore?: number;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatUtcTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatFloatingLocalTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  );
}

/**
 * Menghasilkan konten string .ics sesuai RFC 5545 dengan UID, DTSTAMP, dan alarm pengingat opsional.
 * Untuk input `YYYY-MM-DDTHH:mm` (waktu lokal perangkat), dipakai waktu lokal mengambang agar
 * kalender pengguna di WIB/WITA/WIT menampilkan jam yang persis sama.
 */
export function buildIcsEvent(input: IcsEventInput, now: Date = new Date()): string {
  const isFloatingLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(input.start.trim());
  const startDt = new Date(input.start.trim());
  const validStart = Number.isNaN(startDt.getTime()) ? now : startDt;
  const durationMs = Math.max(15, input.durationMinutes ?? 60) * 60 * 1000;
  const endDt = new Date(validStart.getTime() + durationMs);

  const uid =
    input.uid ||
    `sbs-${validStart.getTime().toString(36)}-${Math.abs(input.title.length * 31).toString(36)}@side-by-side.app`;
  const dtStamp = formatUtcTimestamp(now);
  const dtStart = isFloatingLocal ? formatFloatingLocalTimestamp(validStart) : formatUtcTimestamp(validStart);
  const dtEnd = isFloatingLocal ? formatFloatingLocalTimestamp(endDt) : formatUtcTimestamp(endDt);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Side by Side//Better Together//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.title.trim())}`,
  ];

  if (input.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(input.location.trim())}`);
  }
  if (input.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description.trim())}`);
  }
  if (input.alarmMinutesBefore && input.alarmMinutesBefore > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(input.title.trim())}`,
      `TRIGGER:-PT${Math.round(input.alarmMinutesBefore)}M`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

export function downloadIcsEvent(input: IcsEventInput, filename: string): void {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const content = buildIcsEvent(input);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName.endsWith('.ics') ? safeName : `${safeName}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
