import { describe, expect, it } from 'vitest';
import { buildUrl, friendlyMessage } from './api';

describe('cliente da API', () => {
  it('monta URLs com query string ignorando vazios', () => {
    expect(
      buildUrl('/visits', { date: '2026-10-07', status: ['PENDING', 'COMPLETED'], search: '' }),
    ).toBe('/api/visits?date=2026-10-07&status=PENDING%2CCOMPLETED');
  });
  it('nunca expõe erros técnicos ao usuário', () => {
    expect(friendlyMessage(500, 'AxiosError 500')).toBe(
      'Não foi possível concluir agora. Tente novamente em instantes.',
    );
    expect(friendlyMessage(0)).toMatch(/Sem conexão/);
    expect(friendlyMessage(400, 'Informe a data.')).toBe('Informe a data.');
  });
});
