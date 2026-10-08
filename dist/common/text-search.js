"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsInsensitive = containsInsensitive;
/**
 * Busca textual sem diferenciar maiúsculas: no PostgreSQL usa mode "insensitive";
 * no MySQL/MariaDB a collation utf8mb4_unicode_ci já é case-insensitive.
 */
function containsInsensitive(provider, value) {
    return provider === 'postgresql'
        ? { contains: value, mode: 'insensitive' }
        : { contains: value };
}
//# sourceMappingURL=text-search.js.map