export type Greeting = 'Bom dia' | 'Boa tarde' | 'Boa noite';

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/**
 * Saudação pelo horário (padrão: America/Sao_Paulo):
 * 06:00–11:59 "Bom dia" · 12:00–17:59 "Boa tarde" · 18:00–05:59 "Boa noite".
 * Data no formato "Quarta-feira, 07 de outubro".
 */
export function greetingFor(
  date: Date,
  timeZone = 'America/Sao_Paulo',
): { greeting: Greeting; dateLabel: string } {
  const hourPart = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(date)
    .find((p) => p.type === 'hour');
  const hour = Number(hourPart?.value ?? 0) % 24;
  const greeting: Greeting = hour >= 6 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long' }).format(date);
  const dayMonth = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: 'long' }).format(date);
  return { greeting, dateLabel: `${capitalize(weekday)}, ${dayMonth}` };
}

/** Primeiro nome para saudações ("Maria Eduarda de Souza" → "Maria"). */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';
