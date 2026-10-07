/** Converte Decimal do Prisma, string ou número em número com 2 casas. */
export function toMoneyNumber(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function toNullableMoney(value: unknown): number | null {
  if (value == null || value === '') return null;
  return toMoneyNumber(value);
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** "R$ 4,70" | "4,70" | "4.70" -> 4.7 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function sumMoney(values: Array<number | null | undefined>): number {
  return Math.round(values.reduce<number>((acc, v) => acc + (v ?? 0), 0) * 100) / 100;
}
