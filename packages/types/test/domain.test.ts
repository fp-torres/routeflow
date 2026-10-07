import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  buildFullRouteLinks,
  buildLegLinks,
  computeLetterValidity,
  endOfMonthIso,
  estimateLeg,
  formatLongDateBR,
  generateStoreCode,
  getNationalHolidays,
  holidayOn,
  isIsoDate,
  isoWeekday,
  normalizeAddressForGeocoding,
  optimizeClosedTour,
  parseBrDate,
  parseMoney,
  parseQuickAddText,
  startOfWeekIso,
  summarizeStoreAuthorization,
  todayIso,
  weekOfMonth,
} from '../src';

describe('datas', () => {
  it('valida e manipula datas ISO', () => {
    expect(isIsoDate('2026-10-07')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(addDaysIso('2026-10-07', 6)).toBe('2026-10-13');
    expect(isoWeekday('2026-10-07')).toBe(3);
    expect(startOfWeekIso('2026-10-07')).toBe('2026-10-05');
    expect(endOfMonthIso('2026-02-10')).toBe('2026-02-28');
    expect(weekOfMonth('2026-10-13')).toBe(2);
    expect(parseBrDate('07/10/2026')).toBe('2026-10-07');
    expect(formatLongDateBR('2026-10-07')).toBe('quarta-feira, 7 de outubro de 2026');
  });

  it('calcula "hoje" no fuso de negócio', () => {
    expect(todayIso('America/Sao_Paulo', new Date('2026-10-08T02:30:00Z'))).toBe('2026-10-07');
  });

  it('conhece feriados nacionais (12/10/2026)', () => {
    expect(holidayOn('2026-10-12')?.name).toBe('Nossa Senhora Aparecida');
    expect(
      getNationalHolidays(2026).some(
        (h) => h.name === 'Sexta-feira Santa' && h.date === '2026-04-03',
      ),
    ).toBe(true);
  });
});

describe('vencimento das autorizações', () => {
  const today = '2026-10-07';
  const letter = (expirationDate: string | null) => ({ status: 'ACTIVE' as const, expirationDate });

  it('aplica as faixas verde / amarelo / vermelho / crítico', () => {
    expect(computeLetterValidity(letter('2026-11-30'), today).validity).toBe('VALID');
    expect(computeLetterValidity(letter('2026-11-06'), today)).toEqual({
      validity: 'EXPIRING',
      daysLeft: 30,
    });
    expect(computeLetterValidity(letter('2026-10-15'), today)).toEqual({
      validity: 'EXPIRING',
      daysLeft: 8,
    });
    expect(computeLetterValidity(letter('2026-10-14'), today)).toEqual({
      validity: 'CRITICAL',
      daysLeft: 7,
    });
    expect(computeLetterValidity(letter('2026-10-07'), today)).toEqual({
      validity: 'CRITICAL',
      daysLeft: 0,
    });
    expect(computeLetterValidity(letter('2026-10-06'), today)).toEqual({
      validity: 'EXPIRED',
      daysLeft: -1,
    });
    expect(computeLetterValidity(letter(null), today).validity).toBe('NO_EXPIRATION');
    expect(
      computeLetterValidity({ status: 'REVOKED', expirationDate: '2027-01-01' }, today).validity,
    ).toBe('REVOKED');
  });

  it('resume a melhor carta vigente da loja', () => {
    const summary = summarizeStoreAuthorization(
      [letter('2026-10-01'), letter('2026-12-31')],
      today,
    );
    expect(summary).toMatchObject({ hasValid: true, validity: 'VALID', letterCount: 2 });
    expect(summarizeStoreAuthorization([letter('2026-10-01')], today)).toMatchObject({
      hasValid: false,
      validity: 'EXPIRED',
    });
    expect(summarizeStoreAuthorization([], today)).toBeNull();
  });
});

describe('cadastro rápido (aba "Cadastro Rápido")', () => {
  it('replica a regra: código V => Drogaria Venancio; nome => Cristal', () => {
    const rows = parseQuickAddText(
      [
        'V47 — Av. Nossa Sra. de Copacabana, 872 — Copacabana',
        'Drogaria Malibu (Cristal) — Rua Barata Ribeiro, 450, loja D — Copacabana',
        'V9 — Rua General Roca, 836',
      ].join('\n'),
      { region: 'Zona Sul' },
    );
    expect(rows[0]).toMatchObject({
      code: 'V47',
      network: 'Drogaria Venancio',
      neighborhood: 'Copacabana',
      ok: true,
    });
    expect(rows[1]).toMatchObject({
      code: null,
      name: 'Drogaria Malibu',
      network: 'Cristal',
      region: 'Zona Sul',
      ok: true,
    });
    expect(rows[2]).toMatchObject({ ok: false });
  });

  it('gera códigos provisórios estáveis', () => {
    expect(generateStoreCode('Cristal', 'G5 Drogarias Arco Verde')).toBe(
      'CRI-G5-DROGARIAS-ARCO-VERDE',
    );
  });
});

describe('Google Maps', () => {
  const home = {
    label: 'Casa',
    address: 'Rua Barão de Petrópolis, 572, Rio Comprido, Rio de Janeiro, RJ',
  };
  const stops = Array.from({ length: 10 }, (_, i) => ({
    label: `Loja ${i + 1}`,
    address: `Endereço ${i + 1}`,
  }));

  it('divide a rota completa respeitando o limite de 9 paradas', () => {
    const links = buildFullRouteLinks(home, stops);
    expect(links).toHaveLength(2);
    expect(links[0]!.stops).toBe(9);
    expect(links[1]).toMatchObject({ from: 'Loja 10', to: 'Casa' });
    expect(links[0]!.url).toContain('travelmode=driving');
  });

  it('gera um link de transporte público por trecho (Casa -> ... -> Casa)', () => {
    const legs = buildLegLinks(home, stops.slice(0, 2));
    expect(legs).toHaveLength(3);
    expect(legs[0]!.url).toContain('travelmode=transit');
    expect(legs[2]!.to.label).toBe('Casa');
  });
});

describe('rotas e custos', () => {
  const home = { latitude: -22.9235, longitude: -43.2112 };
  it('estima trechos curtos a pé e longos em ônibus', () => {
    expect(estimateLeg(home, { latitude: -22.9245, longitude: -43.2122 }).mode).toBe('WALKING');
    expect(estimateLeg(home, { latitude: -22.9711, longitude: -43.1863 }).mode).toBe('BUS');
  });

  it('otimiza a ordem sem piorar a distância', () => {
    const points = [
      { id: 'c', latitude: -22.98, longitude: -43.19 },
      { id: 'a', latitude: -22.93, longitude: -43.21 },
      { id: 'b', latitude: -22.95, longitude: -43.2 },
    ];
    const result = optimizeClosedTour(home, points);
    expect(result.distanceKm).toBeLessThanOrEqual(result.originalDistanceKm + 1e-9);
    expect(result.order[0]).toBe('a');
  });

  it('normaliza endereços e valores monetários', () => {
    expect(normalizeAddressForGeocoding('Av. Nossa Sra. de Copacabana, 791-793, loja A')).toBe(
      'Avenida Nossa Senhora de Copacabana, 791-793',
    );
    expect(parseMoney('R$ 4,70')).toBe(4.7);
  });
});
