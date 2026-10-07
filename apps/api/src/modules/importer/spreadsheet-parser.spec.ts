import fs from 'node:fs';
import path from 'node:path';
import { normalizeBaseAddress, parseSpreadsheet, splitRouteAddress } from './spreadsheet-parser';

const file = path.resolve(__dirname, '../../../../../data/Controle_Profissional_de_Visitas.xlsx');

describe('parser da planilha real', () => {
  it('lê lojas, visitas, rotas e roteiro padrão da planilha anexada', async () => {
    const parsed = await parseSpreadsheet(fs.readFileSync(file));
    expect(parsed.stores.size).toBe(43);
    expect(parsed.visits).toHaveLength(43);
    expect(parsed.routes.map((r) => r.date)).toEqual([
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-12',
      '2026-10-13',
    ]);
    expect(parsed.routes.find((r) => r.date === '2026-10-08')?.storeKeys).toHaveLength(12);
    expect(parsed.weekdayTemplate.get(3)).toHaveLength(8);
    expect(parsed.baseAddress).toContain('Barão de Petrópolis, 572');
    expect(parsed.catalogs.networks).toEqual(['Drogaria Venancio', 'Cristal']);
    const v47 = [...parsed.stores.values()].find((s) => s.code === 'V47');
    expect(v47).toMatchObject({
      network: 'Drogaria Venancio',
      neighborhood: 'Copacabana',
      region: 'Zona Sul',
    });
    const codes = parsed.issues.map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'STORE_MISSING_IN_ROUTE',
        'ADDRESS_WITHOUT_NUMBER',
        'HOLIDAY',
        'TRANSIT_WAYPOINTS_UNSUPPORTED',
        'CHARTS_IGNORED',
      ]),
    );
  });

  it('normaliza endereços no formato da planilha', () => {
    expect(
      splitRouteAddress('Rua Barata Ribeiro, 147, loja B — Copacabana, Rio de Janeiro'),
    ).toEqual({
      address: 'Rua Barata Ribeiro, 147, loja B',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
    });
    expect(
      normalizeBaseAddress('Rua Barão de Petrópolis, 572 — Rio Comprido, Rio de Janeiro — RJ'),
    ).toBe('Rua Barão de Petrópolis, 572, Rio Comprido, Rio de Janeiro - RJ');
  });
});
