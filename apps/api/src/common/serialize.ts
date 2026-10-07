import { toMoneyNumber, toNullableMoney, utcDateToIso, type IsoDate } from '@routeflow/types';

/** Coluna DATE -> "YYYY-MM-DD" (aceita Date ou string vinda do driver). */
export function isoDate(value: Date | string): IsoDate {
  if (typeof value === 'string') return value.slice(0, 10);
  return utcDateToIso(value);
}

export function isoDateOrNull(value: Date | string | null | undefined): IsoDate | null {
  return value == null ? null : isoDate(value);
}

export function isoInstant(value: Date | string): string;
export function isoInstant(value: Date | string | null | undefined): string | null;
export function isoInstant(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function money(value: unknown): number {
  return toMoneyNumber(value);
}

export function moneyOrNull(value: unknown): number | null {
  return toNullableMoney(value);
}

export function safeJsonParse<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
