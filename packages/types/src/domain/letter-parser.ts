import type { IsoDate } from './dates';

const MONTHS = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const MONTH_RE = new RegExp(`\\b(${MONTHS.join('|')})\\b`, 'g');
const CODE_RE = /\b([A-Z]{1,3}\d{1,4})\b(?:\s+(\d{1,2})(?!\d))?/g;

const plain = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number): IsoDate => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayNumber = (iso: IsoDate) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

export interface ParsedLetterStore {
  code: string;
  /** Datas da ação listadas para a loja (uma por coluna de mês) */
  dates: IsoDate[];
}

export interface ParsedLetter {
  stores: ParsedLetterStore[];
  /** Meses das colunas, na ordem da carta (1–12) */
  months: number[];
  validFrom: IsoDate | null;
  expirationDate: IsoDate | null;
  network: string | null;
  /** "validade de 3 (três) meses" */
  validityMonths: number | null;
}

/**
 * Lê o texto de uma carta de autorização (ex.: "AUTORIZAÇÃO DE PROMOTOR" da Drogaria Venancio)
 * e extrai as filiais (V78, V126...), as datas da ação por mês e a vigência.
 *
 * Cada linha da tabela traz pares "filial dia" por coluna de mês ("V78 1 V126 2 V78 1"),
 * e o cabeçalho traz os meses ("OUTUBRO NOVEMBRO DEZEMBRO"). A carta não informa o ano:
 * escolhe-se o ano que deixa o período mais próximo de `today` (com virada de ano).
 */
export function parseAuthorizationLetterText(
  input: string | string[],
  today: IsoDate,
): ParsedLetter {
  const lines = (Array.isArray(input) ? input : input.split(/\r?\n/))
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const fullPlain = plain(lines.join('\n'));

  let months: number[] = [];
  for (const line of lines) {
    const found = [...plain(line).matchAll(MONTH_RE)].map((m) => MONTHS.indexOf(m[1]!) + 1);
    if (found.length > months.length) months = found;
  }

  // Ano de cada coluna: o período mais próximo de hoje (considera virada de ano, ex.: NOV DEZ JAN)
  let years: number[] = [];
  if (months.length) {
    const ty = Number(today.slice(0, 4));
    let best: { years: number[]; dist: number } | null = null;
    for (const base of [ty - 1, ty, ty + 1]) {
      const ys: number[] = [];
      let y = base;
      months.forEach((m, i) => {
        if (i > 0 && m < months[i - 1]!) y += 1;
        ys.push(y);
      });
      const start = isoOf(ys[0]!, months[0]!, 1);
      const lastY = ys[ys.length - 1]!;
      const lastM = months[months.length - 1]!;
      const end = isoOf(lastY, lastM, daysInMonth(lastY, lastM));
      const t = dayNumber(today);
      const dist =
        today >= start && today <= end
          ? 0
          : Math.min(Math.abs(t - dayNumber(start)), Math.abs(t - dayNumber(end)));
      if (!best || dist < best.dist) best = { years: ys, dist };
    }
    years = best!.years;
  }

  const byCode = new Map<string, Set<IsoDate>>();
  for (const line of lines) {
    let column = 0;
    for (const match of line.matchAll(CODE_RE)) {
      const code = match[1]!;
      if (!byCode.has(code)) byCode.set(code, new Set());
      const day = match[2] ? Number(match[2]) : null;
      if (day !== null && months.length) {
        const i = column % months.length;
        const y = years[i]!;
        const m = months[i]!;
        if (day >= 1 && day <= daysInMonth(y, m)) byCode.get(code)!.add(isoOf(y, m, day));
      }
      column += 1;
    }
  }

  const stores = [...byCode.entries()].map(([code, dates]) => ({ code, dates: [...dates].sort() }));
  const validity = /validade de (\d{1,2})/.exec(fullPlain);
  const lastY = years[years.length - 1];
  const lastM = months[months.length - 1];
  return {
    stores,
    months,
    validFrom: months.length ? isoOf(years[0]!, months[0]!, 1) : null,
    expirationDate: lastY && lastM ? isoOf(lastY, lastM, daysInMonth(lastY, lastM)) : null,
    network: fullPlain.includes('venancio')
      ? 'Drogaria Venancio'
      : fullPlain.includes('cristal')
        ? 'Cristal'
        : null,
    validityMonths: validity ? Number(validity[1]) : null,
  };
}
