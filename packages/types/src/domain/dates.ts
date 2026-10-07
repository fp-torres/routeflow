import { MONTH_LABEL, WEEKDAY_LABEL } from '../labels';

/** Data de negócio sem horário, no formato YYYY-MM-DD. */
export type IsoDate = string;

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) return false;
  const date = isoToUtcDate(value);
  return !Number.isNaN(date.getTime()) && utcDateToIso(date) === value;
}

/** Converte YYYY-MM-DD em Date à meia-noite UTC (formato usado em colunas DATE). */
export function isoToUtcDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

/** Converte Date (meia-noite UTC de coluna DATE) em YYYY-MM-DD. */
export function utcDateToIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** Data de hoje no fuso horário de negócio. */
export function todayIso(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): IsoDate {
  return toIsoInTimeZone(now, timeZone);
}

/** Data (YYYY-MM-DD) de um instante em determinado fuso horário. */
export function toIsoInTimeZone(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): IsoDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  const date = isoToUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToIso(date);
}

/** Diferença em dias (to - from). */
export function diffDaysIso(from: IsoDate, to: IsoDate): number {
  return Math.round((isoToUtcDate(to).getTime() - isoToUtcDate(from).getTime()) / 86_400_000);
}

/** Dia da semana ISO: 1 = segunda ... 7 = domingo. */
export function isoWeekday(iso: IsoDate): number {
  const day = isoToUtcDate(iso).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeekIso(iso: IsoDate): IsoDate {
  return addDaysIso(iso, 1 - isoWeekday(iso));
}

export function endOfWeekIso(iso: IsoDate): IsoDate {
  return addDaysIso(startOfWeekIso(iso), 6);
}

export function startOfMonthIso(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonthIso(iso: IsoDate): IsoDate {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}

export function addMonthsIso(iso: IsoDate, months: number): IsoDate {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return utcDateToIso(target);
}

export function eachDayIso(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let current = from; current <= to; current = addDaysIso(current, 1)) days.push(current);
  return days;
}

/** Semana do mês (1..5) baseada no dia: 1-7 => 1, 8-14 => 2 ... */
export function weekOfMonth(iso: IsoDate): number {
  return Math.ceil(Number(iso.slice(8, 10)) / 7);
}

/** "07/10/2026" -> "2026-10-07" (ou null se inválida). */
export function parseBrDate(value: string): IsoDate | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

export function formatDateBR(iso: IsoDate | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatShortDateBR(iso: IsoDate): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** "quarta-feira, 7 de outubro de 2026" */
export function formatLongDateBR(iso: IsoDate, withYear = true): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAY_LABEL[isoWeekday(iso)]!.toLowerCase();
  return `${weekday}, ${d} de ${MONTH_LABEL[m - 1]}${withYear ? ` de ${y}` : ''}`;
}

export function monthLabel(iso: IsoDate): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return `${MONTH_LABEL[m - 1]} de ${y}`;
}

/** Horário HH:mm de um instante no fuso de negócio. */
export function formatTimeBR(
  instant: string | Date | null | undefined,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (!instant) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    new Date(instant),
  );
}

export function formatDateTimeBR(
  instant: string | Date | null | undefined,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (!instant) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

/** Duração em minutos legível: 75 -> "1h15". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}
