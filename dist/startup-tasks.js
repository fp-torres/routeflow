"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStartupTasks = runStartupTasks;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const common_1 = require("@nestjs/common");
const env_1 = require("./config/env");
const enabled = (name) => (process.env[name] ?? '').trim().toLowerCase() === 'true';
/**
 * Tarefas de inicialização para hospedagens sem terminal nem "hook" de deploy (ex.: Hostinger):
 *  - MIGRATE_ON_START=true: aplica as migrations pendentes (`prisma migrate deploy`) antes de
 *    subir a API. Se falhar, a API NÃO sobe (evita rodar com o banco desatualizado).
 *  - SEED_ON_START=true: cria o usuário inicial, as configurações e importa a planilha
 *    (idempotente). Use no primeiro deploy e depois desligue.
 */
function runStartupTasks(config) {
    const logger = new common_1.Logger('Inicialização');
    const root = (0, env_1.findProjectRoot)();
    if (enabled('MIGRATE_ON_START')) {
        let cli;
        try {
            cli = require.resolve('prisma/build/index.js', { paths: [root, __dirname] });
        }
        catch {
            logger.error('Prisma CLI não encontrado: instale as dependências (npm install --omit=dev).');
            process.exit(1);
        }
        const configFile = node_path_1.default.join(root, 'prisma', config.database.provider, 'prisma.config.ts');
        logger.log(`Aplicando migrations (${config.database.provider})...`);
        const result = (0, node_child_process_1.spawnSync)(process.execPath, [cli, 'migrate', 'deploy', '--config', configFile], {
            cwd: root,
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: config.database.url },
        });
        if (result.status !== 0) {
            logger.error('Falha ao aplicar as migrations — a API não foi iniciada para não rodar com o banco desatualizado. Confira DATABASE_URL e o log acima.');
            process.exit(1);
        }
    }
    if (enabled('SEED_ON_START')) {
        logger.log('Executando o seed inicial (usuário, configurações e planilha — idempotente)...');
        const result = (0, node_child_process_1.spawnSync)(process.execPath, [node_path_1.default.join(__dirname, 'cli', 'seed.js')], {
            cwd: root,
            stdio: 'inherit',
            env: process.env,
        });
        if (result.status !== 0) {
            logger.error('Seed não concluído (a API continua). Em produção, defina SEED_USER_PASSWORD. Veja o log acima.');
        }
    }
}
//# sourceMappingURL=startup-tasks.js.map