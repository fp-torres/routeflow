import { describe, expect, it } from 'vitest';
import {
  isAuthorizationRequired,
  optimizePath,
  parseAuthorizationLetterText,
  pathCost,
} from '../src';

// Tabela "Lojas e datas da ação" da carta da Drogaria Venancio (sem dados pessoais)
const LETTER = [
  'AUTORIZAÇÃO DE PROMOTOR',
  'Lojas e datas da ação:',
  'Filial: OUTUBRO Filial: NOVEMBRO Filial: DEZEMBRO',
  'V78 1 V126 2 V78 1',
  'V38 2 V81 3 V38 2',
  'V41 3 V112 4 V41 3',
  'V5 5 V63 5 V5 4',
  'V37 6 V32 6 V37 5',
  'V132 7 V92 7 V132 7',
  'V9 8 V127 9 V9 8',
  'V65 9 V102 10 V65 9',
  'V21 10 V135 11 V112 10',
  'V26 12 V116 12 V63 11',
  'V139 13 V133 13 V32 12',
  'V140 14 V110 14 V92 14',
  'V25 15 V16 16 V127 15',
  'V49 16 V57 17 V102 16',
  'V59 17 V23 18 V135 17',
  'V72 19 V136 19 V116 18',
  'V104 20 V47 20 V104 19',
  'V100 21 V121 21 V100 21',
  'V138 22 V138 23 V138 22',
  'V131 21 V131 24 V131 23',
  'V7 24 V7 25 V7 24',
  'V141 26 V141 26 V141 25',
  'V28 27 V28 27 V28 26',
  'OBS: Essa autorização tem validade de 3 (três) meses.',
  'Marketing - Drogaria Venancio',
];

describe('leitura da carta de autorização', () => {
  const parsed = parseAuthorizationLetterText(LETTER, '2026-10-07');

  it('extrai filiais, meses, vigência e rede', () => {
    expect(parsed.months).toEqual([10, 11, 12]);
    expect(parsed.stores).toHaveLength(41);
    expect(parsed.validFrom).toBe('2026-10-01');
    expect(parsed.expirationDate).toBe('2026-12-31');
    expect(parsed.network).toBe('Drogaria Venancio');
    expect(parsed.validityMonths).toBe(3);
  });

  it('associa cada data à coluna do mês certo', () => {
    const dates = (code: string) => parsed.stores.find((s) => s.code === code)?.dates;
    expect(dates('V78')).toEqual(['2026-10-01', '2026-12-01']);
    expect(dates('V131')).toEqual(['2026-10-21', '2026-11-24', '2026-12-23']);
    expect(dates('V126')).toEqual(['2026-11-02']);
    expect(dates('V108')).toBeUndefined();
  });

  it('resolve a virada de ano e cartas antigas', () => {
    const wrap = parseAuthorizationLetterText(
      ['NOVEMBRO DEZEMBRO JANEIRO', 'V1 5 V2 6 V3 7'],
      '2026-10-20',
    );
    expect(wrap.validFrom).toBe('2026-11-01');
    expect(wrap.expirationDate).toBe('2027-01-31');
    expect(wrap.stores.find((s) => s.code === 'V3')?.dates).toEqual(['2027-01-07']);
    const old = parseAuthorizationLetterText(
      ['OUTUBRO NOVEMBRO DEZEMBRO', 'V1 1 V1 2 V1 3'],
      '2027-01-15',
    );
    expect(old.validFrom).toBe('2026-10-01');
  });
});

describe('exigência de carta por rede', () => {
  it('segue a rede e respeita a exceção da loja', () => {
    const rule = ['Drogaria Venancio'];
    expect(isAuthorizationRequired({ network: 'Drogaria Venâncio' }, rule)).toBe(true);
    expect(isAuthorizationRequired({ network: 'Cristal' }, rule)).toBe(false);
    expect(isAuthorizationRequired({ network: 'Cristal', authorizationRequired: true }, rule)).toBe(
      true,
    );
    expect(
      isAuthorizationRequired({ network: 'Drogaria Venancio', authorizationRequired: false }, rule),
    ).toBe(false);
  });
});

describe('otimização exata de rota', () => {
  // 0 = casa; tempos assimétricos (ida e volta diferentes)
  const cost = [
    [0, 30, 32, 40, 38],
    [28, 0, 5, 12, 9],
    [30, 6, 0, 7, 11],
    [36, 13, 8, 0, 6],
    [35, 8, 12, 5, 0],
  ];

  it('encontra o ótimo global (comparado com força bruta)', () => {
    const result = optimizePath(cost, 0, 0, [1, 2, 3, 4]);
    const perms = (a: number[]): number[][] =>
      a.length <= 1
        ? [a]
        : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
    const best = Math.min(...perms([1, 2, 3, 4]).map((p) => pathCost(cost, 0, 0, p)));
    expect(result.method).toBe('exact');
    expect(result.cost).toBe(best);
    expect(pathCost(cost, 0, 0, result.order)).toBe(best);
  });

  it('mantém o ponto de partida no meio do dia (última loja visitada)', () => {
    const result = optimizePath(cost, 2, 0, [3, 4]);
    expect(result.order).toEqual([3, 4]);
    expect(result.cost).toBe(7 + 6 + 35);
  });

  it('usa heurística consistente para rotas grandes', () => {
    const n = 16;
    const pts = Array.from({ length: n + 1 }, (_, i) => [
      Math.cos(i * 1.3) * 10,
      Math.sin(i * 0.7) * 10,
    ]);
    const m = pts.map((a) => pts.map((b) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)));
    const nodes = Array.from({ length: n }, (_, i) => i + 1);
    const result = optimizePath(m, 0, 0, nodes);
    expect(result.method).toBe('heuristic');
    expect(new Set(result.order).size).toBe(n);
    expect(result.cost).toBeLessThanOrEqual(pathCost(m, 0, 0, nodes) + 1e-9);
  });
});
