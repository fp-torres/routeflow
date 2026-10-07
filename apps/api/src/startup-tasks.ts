import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { findProjectRoot, type AppConfig } from './config/env';

const enabled = (name: string) => (process.env[name] ?? '').trim().toLowerCase() === 'true';

/**
 * Tarefas de inicialização para hospedagens sem terminal nem "hook" de deploy (ex.: Hostinger):
 *  - MIGRATE_ON_START=true: aplica as migrations pendentes (`prisma migrate deploy`) antes de
 *    subir a API. Se falhar, a API NÃO sobe (evita rodar com o banco desatualizado).
 *  - SEED_ON_START=true: cria o usuário inicial, as configurações e importa a planilha
 *    (idempotente). Use no primeiro deploy e depois desligue.
 */
export function runStartupTasks(config: AppConfig): void {
  const logger = new Logger('Inicialização');
  const root = findProjectRoot();
  if (enabled('MIGRATE_ON_START')) {
    let cli: string;
    try {
      cli = require.resolve('prisma/build/index.js', { paths: [root, __dirname] });
    } catch {
      logger.error('Prisma CLI não encontrado: instale as dependências (npm install --omit=dev).');
      process.exit(1);
    }
    const configFile = path.join(root, 'prisma', config.database.provider, 'prisma.config.ts');
    logger.log(`Aplicando migrations (${config.database.provider})...`);
    const result = spawnSync(process.execPath, [cli, 'migrate', 'deploy', '--config', configFile], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: config.database.url },
    });
    if (result.status !== 0) {
      logger.error(
        'Falha ao aplicar as migrations — a API não foi iniciada para não rodar com o banco desatualizado. Confira DATABASE_URL e o log acima.',
      );
      process.exit(1);
    }
  }
  if (enabled('SEED_ON_START')) {
    logger.log('Executando o seed inicial (usuário, configurações e planilha — idempotente)...');
    const result = spawnSync(process.execPath, [path.join(__dirname, 'cli', 'seed.js')], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) {
      logger.error(
        'Seed não concluído (a API continua). Em produção, defina SEED_USER_PASSWORD. Veja o log acima.',
      );
    }
  }
}
