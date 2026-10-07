import {
  DEFAULT_NETWORK_RULES,
  networkForCode,
  normalizeStoreCode,
  type NetworkRules,
} from './stores';
import { normalizeText } from './text';

/**
 * Cadastro rápido — transforma a lógica da aba "Cadastro Rápido" da planilha
 * em uma função reutilizável. Formato de cada linha:
 *
 *   Código/Loja — Endereço — Bairro
 *
 * Exemplos:
 *   V47 — Av. Nossa Sra. de Copacabana, 872 — Copacabana
 *   Drogaria Malibu (Cristal) — Rua Barata Ribeiro, 450, loja D — Copacabana
 *
 * Separadores aceitos: "—" (travessão), "–", " - ", "|" e TAB.
 */
export interface QuickAddRow {
  line: number;
  raw: string;
  code: string | null;
  name: string;
  network: string;
  address: string;
  neighborhood: string | null;
  region: string | null;
  ok: boolean;
  error?: string;
}

export interface QuickAddOptions {
  rules?: NetworkRules;
  region?: string | null;
}

function splitParts(line: string): string[] {
  const normalized = normalizeText(line);
  if (normalized.includes('\t')) return normalized.split('\t').map((p) => p.trim());
  if (normalized.includes('—')) return normalized.split('—').map((p) => p.trim());
  if (normalized.includes('|')) return normalized.split('|').map((p) => p.trim());
  return normalized.split(/\s+-\s+/).map((p) => p.trim());
}

export function parseQuickAddLine(
  raw: string,
  line: number,
  options: QuickAddOptions = {},
): QuickAddRow {
  const rules = options.rules ?? DEFAULT_NETWORK_RULES;
  const parts = splitParts(raw.replace(/\t/g, '\t'));
  const [first = '', address = '', neighborhood = ''] = parts;
  const base = {
    line,
    raw,
    region: options.region ?? null,
    neighborhood: neighborhood || null,
    address,
  };
  if (!first)
    return {
      ...base,
      code: null,
      name: '',
      network: '',
      ok: false,
      error: 'Informe o código ou o nome da loja.',
    };

  const codeCandidate = normalizeStoreCode(first);
  const codeNetwork = networkForCode(codeCandidate, rules);
  const row: QuickAddRow = codeNetwork
    ? {
        ...base,
        code: codeCandidate,
        name: `${codeNetwork} ${codeCandidate}`,
        network: codeNetwork,
        ok: true,
      }
    : {
        ...base,
        code: null,
        name: first.replace(/\((cristal|rede[^)]*)\)/gi, '').trim(),
        network: /\(cristal\)/i.test(first) ? 'Cristal' : rules.defaultNetworkForNamedStores,
        ok: true,
      };

  if (!address)
    return {
      ...row,
      ok: false,
      error: 'Endereço não informado (use: Código/Loja — Endereço — Bairro).',
    };
  if (!neighborhood)
    return {
      ...row,
      ok: false,
      error: 'Bairro não informado (use: Código/Loja — Endereço — Bairro).',
    };
  return row;
}

export function parseQuickAddText(text: string, options: QuickAddOptions = {}): QuickAddRow[] {
  return text
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter((item) => item.raw.length > 0)
    .map((item) => parseQuickAddLine(item.raw, item.line, options));
}
