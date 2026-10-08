"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Importa a planilha XLSX (idempotente).
 *   npm run import:xlsx -- --file data/minha-planilha.xlsx [--dry-run] [--update] [--email usuario@dominio]
 */
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const spreadsheet_importer_1 = require("../modules/importer/spreadsheet-importer");
const context_1 = require("./context");
async function main() {
    const { config, db, close } = (0, context_1.createCliContext)();
    try {
        const file = node_path_1.default.resolve(process.cwd(), (0, context_1.argValue)('--file') ??
            node_path_1.default.resolve(config.projectRoot, process.env.SEED_SPREADSHEET_PATH || 'data/Controle_Profissional_de_Visitas.xlsx'));
        if (!node_fs_1.default.existsSync(file))
            throw new Error(`Arquivo não encontrado: ${file}`);
        const email = ((0, context_1.argValue)('--email') ?? process.env.SEED_USER_EMAIL ?? '').toLowerCase();
        const user = email
            ? await db.user.findUnique({ where: { email } })
            : await db.user.findFirst({
                where: { role: 'ADMIN', active: true },
                orderBy: { createdAt: 'asc' },
            });
        if (!user)
            throw new Error('Usuário não encontrado. Rode o seed (npm run db:seed) ou informe --email.');
        const result = await new spreadsheet_importer_1.SpreadsheetImporter(db).run(node_fs_1.default.readFileSync(file), {
            employeeId: user.id,
            fileName: node_path_1.default.basename(file),
            userId: user.id,
            dryRun: (0, context_1.hasFlag)('--dry-run'),
            updateExisting: (0, context_1.hasFlag)('--update'),
        });
        (0, context_1.printImportResult)(result);
    }
    finally {
        await close();
    }
}
main().catch((error) => {
    console.error('✖ Importação falhou:', error instanceof Error ? error.message : error);
    process.exit(1);
});
//# sourceMappingURL=import-spreadsheet.js.map