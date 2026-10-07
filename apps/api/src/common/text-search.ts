import type { DatabaseProvider } from '../config/env';

/**
 * Busca textual sem diferenciar maiúsculas: no PostgreSQL usa mode "insensitive";
 * no MySQL/MariaDB a collation utf8mb4_unicode_ci já é case-insensitive.
 */
export function containsInsensitive(provider: DatabaseProvider, value: string) {
  return provider === 'postgresql'
    ? { contains: value, mode: 'insensitive' as const }
    : { contains: value };
}
