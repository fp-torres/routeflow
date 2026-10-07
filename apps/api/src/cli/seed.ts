/**
 * Seed do RouteFlow (PostgreSQL ou MySQL/MariaDB, conforme DATABASE_PROVIDER):
 *  1. usuário inicial (SEED_USER_*), papel ADMIN;
 *  2. configurações padrão da operação;
 *  3. tarifas de transporte de referência (marcadas como "não confirmadas");
 *  4. importação idempotente da planilha real (SEED_SPREADSHEET_PATH).
 * Pode ser executado várias vezes sem duplicar dados.
 */
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from '../modules/auth/password';
import { SpreadsheetImporter } from '../modules/importer/spreadsheet-importer';
import { DEFAULT_SETTINGS, REFERENCE_FARES } from '../modules/settings/settings.defaults';
import { createCliContext, printImportResult } from './context';

async function main(): Promise<void> {
  const { config, db, close } = createCliContext();
  try {
    console.log(`RouteFlow seed — banco ${config.database.provider} (${config.env})`);
    const email = (process.env.SEED_USER_EMAIL || 'felipe@routeflow.local').trim().toLowerCase();
    const name = process.env.SEED_USER_NAME || 'Felipe';
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      let password = process.env.SEED_USER_PASSWORD;
      if (!password) {
        if (config.isProduction)
          throw new Error('Defina SEED_USER_PASSWORD para criar o usuário inicial em produção.');
        password = 'RouteFlow@2026';
        console.warn(
          '⚠ SEED_USER_PASSWORD vazia: usando a senha de desenvolvimento "RouteFlow@2026". Troque após o primeiro login.',
        );
      }
      if (password.length < 10)
        throw new Error('SEED_USER_PASSWORD precisa ter ao menos 10 caracteres.');
      user = await db.user.create({
        data: { name, email, passwordHash: await hashPassword(password), role: 'ADMIN' },
      });
      console.log(`✔ Usuário criado: ${email} (ADMIN)`);
    } else console.log(`• Usuário ${email} já existe (mantido).`);

    let settingsCreated = 0;
    for (const [field, value] of Object.entries(DEFAULT_SETTINGS)) {
      const key = `settings.${field}`;
      if (!(await db.companySetting.findUnique({ where: { key } }))) {
        await db.companySetting.create({ data: { key, value: JSON.stringify(value) } });
        settingsCreated += 1;
      }
    }
    console.log(`✔ Configurações: ${settingsCreated} criada(s).`);

    if ((await db.transportFare.count()) === 0) {
      await db.transportFare.createMany({
        data: REFERENCE_FARES.map((fare) => ({
          type: fare.type,
          operator: fare.operator,
          description:
            'Valor de referência — confirme a tarifa vigente em Configurações > Tarifas.',
          value: fare.value,
          effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
          active: true,
          verified: false,
        })),
      });
      console.log(
        `✔ Tarifas de referência criadas (${REFERENCE_FARES.length}) — marcadas como NÃO confirmadas.`,
      );
    } else console.log('• Tarifas já cadastradas (mantidas).');

    const file = path.resolve(
      config.projectRoot,
      process.env.SEED_SPREADSHEET_PATH || 'data/Controle_Profissional_de_Visitas.xlsx',
    );
    if (!fs.existsSync(file)) {
      console.warn(`⚠ Planilha não encontrada em ${file}. Importação ignorada.`);
      return;
    }
    const result = await new SpreadsheetImporter(db).run(fs.readFileSync(file), {
      employeeId: user.id,
      fileName: path.basename(file),
      userId: user.id,
    });
    printImportResult(result);
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error('✖ Seed falhou:', error instanceof Error ? error.message : error);
  process.exit(1);
});
