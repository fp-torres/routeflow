import { normalizeText, slugify } from './text';

export const DEFAULT_CITY = 'Rio de Janeiro';
export const DEFAULT_STATE = 'RJ';

/**
 * Regra para inferir a rede a partir do código da loja.
 * Replica (de forma mais estrita) a regra da aba "Cadastro Rápido":
 * "Linhas iniciadas por V são classificadas como Drogaria Venancio".
 */
export interface NetworkCodeRule {
  /** Expressão regular (sem barras) aplicada ao código em maiúsculas. Ex.: "^V\\d+$" */
  pattern: string;
  network: string;
}

export interface NetworkRules {
  codeRules: NetworkCodeRule[];
  /** Rede atribuída a lojas identificadas apenas pelo nome (planilha: "Cristal"). */
  defaultNetworkForNamedStores: string;
}

export const DEFAULT_NETWORK_RULES: NetworkRules = {
  codeRules: [{ pattern: '^V\\d+$', network: 'Drogaria Venancio' }],
  defaultNetworkForNamedStores: 'Cristal',
};

export function normalizeStoreCode(code: string | null | undefined): string {
  return normalizeText(code).toUpperCase().replace(/\s+/g, '');
}

/** Retorna a rede de um código conforme as regras, ou null. */
export function networkForCode(
  code: string,
  rules: NetworkRules = DEFAULT_NETWORK_RULES,
): string | null {
  const normalized = normalizeStoreCode(code);
  for (const rule of rules.codeRules) {
    try {
      if (new RegExp(rule.pattern, 'i').test(normalized)) return rule.network;
    } catch {
      // regra inválida configurada pelo usuário: ignora
    }
  }
  return null;
}

/** Código provisório e estável para lojas sem código na origem (ex.: lojas da rede Cristal). */
export function generateStoreCode(network: string, name: string): string {
  const prefix = slugify(network).replace(/-/g, '').slice(0, 3).toUpperCase() || 'LOJ';
  const body = slugify(name).toUpperCase();
  return `${prefix}-${body}`.slice(0, 40).replace(/-+$/, '');
}

/** Chave estável usada na importação idempotente. */
export function buildStoreImportKey(network: string, codeOrName: string): string {
  return `store:${slugify(network)}:${slugify(codeOrName)}`.slice(0, 191);
}

export interface AddressLike {
  address: string;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

/** "Rua X, 123 — Bairro, Rio de Janeiro - RJ" */
export function formatStoreAddress(store: AddressLike): string {
  const city = [store.city || DEFAULT_CITY, store.state || DEFAULT_STATE]
    .filter(Boolean)
    .join(' - ');
  const tail = [store.neighborhood, city].filter(Boolean).join(', ');
  return tail ? `${store.address} — ${tail}` : store.address;
}

/** Endereço completo para Google Maps/geocodificação: "Rua X, 123, Bairro, Rio de Janeiro, RJ, Brasil" */
export function fullAddressForMaps(store: AddressLike, includeCountry = false): string {
  return [
    store.address,
    store.neighborhood,
    store.city || DEFAULT_CITY,
    store.state || DEFAULT_STATE,
  ]
    .concat(includeCountry ? ['Brasil'] : [])
    .filter((part) => part && String(part).trim())
    .join(', ');
}

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bAv\.?\s/gi, 'Avenida '],
  [/\bR\.\s/gi, 'Rua '],
  [/\bNossa\s+Sra\.?\s/gi, 'Nossa Senhora '],
  [/\bSra\.?\s/gi, 'Senhora '],
  [/\bDr\.?\s/gi, 'Doutor '],
  [/\bPça\.?\s/gi, 'Praça '],
  [/\bEstr\.?\s/gi, 'Estrada '],
];

/** Expande abreviações comuns e remove complementos (loja, sala) para melhorar a geocodificação. */
export function normalizeAddressForGeocoding(address: string): string {
  let result = ` ${normalizeText(address)} `;
  for (const [regex, replacement] of ABBREVIATIONS) result = result.replace(regex, replacement);
  result = result.replace(/,\s*(loja|lj|sala|sl|bloco|apto?)\b[^,]*/gi, '');
  result = result.replace(/(\d)\.(\d{3})\b/g, '$1$2');
  return result.replace(/\s+/g, ' ').trim();
}

/** O endereço tem número? (usado para detectar endereços incompletos) */
export function addressHasNumber(address: string): boolean {
  return /\d/.test(address);
}
