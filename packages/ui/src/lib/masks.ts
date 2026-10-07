/**
 * Máscaras de digitação (pt-BR). Valores em reais usam centavos à direita, como em apps
 * de banco: digitar 4-7-0 mostra "R$ 4,70"; 5-0-0 mostra "R$ 5,00"; 5-0-0-0-0 mostra "R$ 500,00".
 */
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Texto digitado → valor em reais (só os dígitos contam; até R$ 9.999.999,99). */
export function moneyFromInput(text: string): number | null {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
  return digits && Number(digits) > 0 ? Number(digits) / 100 : null;
}

/** Valor em reais → texto do campo ("R$ 4,70"). */
export function moneyToInput(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '' : money.format(value);
}

/** CEP: 00000-000 */
export function maskCep(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** UF: duas letras maiúsculas */
export const maskUf = (text: string) =>
  text
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 2)
    .toUpperCase();

/** Código de loja: maiúsculas, números e hífen (V47, CRI-DROGARIA-MALIBU) */
export const maskStoreCode = (text: string) =>
  text
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 40);

/** Coordenada decimal: aceita vírgula ou ponto e sinal negativo (-22.9711) */
export function maskCoordinate(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^\d.-]/g, '');
  const negative = cleaned.startsWith('-');
  const [int = '', ...rest] = cleaned.replace(/-/g, '').split('.');
  const value = rest.length ? `${int.slice(0, 3)}.${rest.join('').slice(0, 7)}` : int.slice(0, 3);
  return `${negative ? '-' : ''}${value}`;
}
