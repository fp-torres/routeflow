/**
 * Importador da planilha XLSX (atalho na raiz do monorepo).
 * Uso: npx tsx scripts/import-spreadsheet.ts --file data/Controle_Profissional_de_Visitas.xlsx [--dry-run] [--update]
 * Equivalente a: npm run import:xlsx -- --file ...
 * Implementação: apps/api/src/modules/importer (parser + importador idempotente).
 */
import '../apps/api/src/cli/import-spreadsheet';
