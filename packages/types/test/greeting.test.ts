import { describe, expect, it } from 'vitest';
import { firstName, greetingFor } from '../src';

const at = (time: string) => new Date(`2026-10-07T${time}:00-03:00`);

describe('saudação por horário (America/Sao_Paulo)', () => {
  it.each([
    ['06:00', 'Bom dia'],
    ['09:30', 'Bom dia'],
    ['11:59', 'Bom dia'],
    ['12:00', 'Boa tarde'],
    ['17:59', 'Boa tarde'],
    ['18:00', 'Boa noite'],
    ['23:10', 'Boa noite'],
    ['05:59', 'Boa noite'],
  ])('%s → %s', (time, expected) => {
    expect(greetingFor(at(time)).greeting).toBe(expected);
  });

  it('usa o fuso de Brasília mesmo com o relógio em UTC', () => {
    // 13:30 UTC = 10:30 em Brasília
    expect(greetingFor(new Date('2026-10-07T13:30:00Z')).greeting).toBe('Bom dia');
  });

  it('formata a data como "Quarta-feira, 07 de outubro"', () => {
    expect(greetingFor(at('09:00')).dateLabel).toBe('Quarta-feira, 07 de outubro');
    expect(firstName('  Maria Eduarda de Souza ')).toBe('Maria');
  });
});
