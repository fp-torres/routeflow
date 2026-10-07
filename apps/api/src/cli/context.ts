import type { ImportResultDto } from '@routeflow/types';
import { loadConfig } from '../config/env';
import { createDatabaseClient } from '../database/database.factory';

export function createCliContext() {
  const config = loadConfig();
  const db = createDatabaseClient(config.database);
  return { config, db, close: () => db.$disconnect() };
}

export function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

export function printImportResult(result: ImportResultDto): void {
  console.log(
    `\nImportação ${result.dryRun ? '(SIMULAÇÃO — nada foi gravado) ' : ''}de ${result.fileName}: ${result.status}`,
  );
  console.log(
    'Entidade'.padEnd(16),
    'criados'.padStart(8),
    'atualiz.'.padStart(9),
    'inalter.'.padStart(9),
  );
  for (const [entity, count] of Object.entries(result.summary)) {
    console.log(
      entity.padEnd(16),
      String(count.created).padStart(8),
      String(count.updated).padStart(9),
      String(count.unchanged).padStart(9),
    );
  }
  if (result.issues.length) {
    console.log(`\nInconsistências e observações (${result.issues.length}):`);
    for (const issue of result.issues) {
      const where = issue.sheet ? ` [${issue.sheet}${issue.row ? `!${issue.row}` : ''}]` : '';
      console.log(
        ` - ${issue.severity.toUpperCase().padEnd(7)} ${issue.code}${where}: ${issue.message}`,
      );
    }
  }
  console.log(`\nRegistro da importação: import_runs.id = ${result.importRunId}`);
}
