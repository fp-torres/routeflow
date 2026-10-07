/**
 * Importa a planilha XLSX (idempotente).
 *   npm run import:xlsx -- --file data/minha-planilha.xlsx [--dry-run] [--update] [--email usuario@dominio]
 */
import fs from 'node:fs';
import path from 'node:path';
import { SpreadsheetImporter } from '../modules/importer/spreadsheet-importer';
import { argValue, createCliContext, hasFlag, printImportResult } from './context';

async function main(): Promise<void> {
  const { config, db, close } = createCliContext();
  try {
    const file = path.resolve(
      process.cwd(),
      argValue('--file') ??
        path.resolve(
          config.projectRoot,
          process.env.SEED_SPREADSHEET_PATH || 'data/Controle_Profissional_de_Visitas.xlsx',
        ),
    );
    if (!fs.existsSync(file)) throw new Error(`Arquivo não encontrado: ${file}`);
    const email = (argValue('--email') ?? process.env.SEED_USER_EMAIL ?? '').toLowerCase();
    const user = email
      ? await db.user.findUnique({ where: { email } })
      : await db.user.findFirst({
          where: { role: 'ADMIN', active: true },
          orderBy: { createdAt: 'asc' },
        });
    if (!user)
      throw new Error('Usuário não encontrado. Rode o seed (npm run db:seed) ou informe --email.');
    const result = await new SpreadsheetImporter(db).run(fs.readFileSync(file), {
      employeeId: user.id,
      fileName: path.basename(file),
      userId: user.id,
      dryRun: hasFlag('--dry-run'),
      updateExisting: hasFlag('--update'),
    });
    printImportResult(result);
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error('✖ Importação falhou:', error instanceof Error ? error.message : error);
  process.exit(1);
});
