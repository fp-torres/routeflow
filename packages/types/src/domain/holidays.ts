import { addDaysIso, type IsoDate } from './dates';

export interface Holiday {
  date: IsoDate;
  name: string;
  /** national = feriado nacional; optional = ponto facultativo nacional */
  kind: 'national' | 'optional';
}

/** Domingo de Páscoa (algoritmo gregoriano anônimo / Meeus). */
export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Feriados nacionais (Lei 662/1949, Lei 6.802/1980 e Lei 14.759/2023) e
 * pontos facultativos nacionais. Feriados estaduais/municipais podem ser
 * tratados futuramente via configurações.
 */
export function getNationalHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (md: string, name: string): Holiday => ({
    date: `${year}-${md}`,
    name,
    kind: 'national',
  });
  const list: Holiday[] = [
    fixed('01-01', 'Confraternização Universal'),
    { date: addDaysIso(easter, -48), name: 'Carnaval', kind: 'optional' },
    { date: addDaysIso(easter, -47), name: 'Carnaval', kind: 'optional' },
    { date: addDaysIso(easter, -2), name: 'Sexta-feira Santa', kind: 'national' },
    fixed('04-21', 'Tiradentes'),
    fixed('05-01', 'Dia do Trabalho'),
    { date: addDaysIso(easter, 60), name: 'Corpus Christi', kind: 'optional' },
    fixed('09-07', 'Independência do Brasil'),
    fixed('10-12', 'Nossa Senhora Aparecida'),
    fixed('11-02', 'Finados'),
    fixed('11-15', 'Proclamação da República'),
    fixed('12-25', 'Natal'),
  ];
  if (year >= 2024) list.push(fixed('11-20', 'Dia Nacional de Zumbi e da Consciência Negra'));
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function holidayOn(date: IsoDate): Holiday | undefined {
  return getNationalHolidays(Number(date.slice(0, 4))).find((h) => h.date === date);
}
