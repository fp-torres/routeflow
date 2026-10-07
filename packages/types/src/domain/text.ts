/** Remove acentos, normaliza espaços e travessões. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFC')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Chave de comparação: minúsculas, sem acentos e sem pontuação redundante. */
export function comparableKey(value: string | null | undefined): string {
  return stripAccents(normalizeText(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(value: string): string {
  return stripAccents(normalizeText(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
