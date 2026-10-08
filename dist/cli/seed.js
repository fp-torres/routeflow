"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seed do RouteFlow (PostgreSQL ou MySQL/MariaDB, conforme DATABASE_PROVIDER):
 *  1. usuário inicial (SEED_USER_*), papel ADMIN;
 *  2. configurações padrão da operação;
 *  3. tarifas de transporte de referência (marcadas como "não confirmadas");
 *  4. importação idempotente da planilha real (SEED_SPREADSHEET_PATH).
 * Pode ser executado várias vezes sem duplicar dados.
 */
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const password_1 = require("../modules/auth/password");
const spreadsheet_importer_1 = require("../modules/importer/spreadsheet-importer");
const settings_defaults_1 = require("../modules/settings/settings.defaults");
const context_1 = require("./context");
async function main() {
    const { config, db, close } = (0, context_1.createCliContext)();
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
                console.warn('⚠ SEED_USER_PASSWORD vazia: usando a senha de desenvolvimento "RouteFlow@2026". Troque após o primeiro login.');
            }
            if (password.length < 10)
                throw new Error('SEED_USER_PASSWORD precisa ter ao menos 10 caracteres.');
            user = await db.user.create({
                data: { name, email, passwordHash: await (0, password_1.hashPassword)(password), role: 'ADMIN' },
            });
            console.log(`✔ Usuário criado: ${email} (ADMIN)`);
        }
        else
            console.log(`• Usuário ${email} já existe (mantido).`);
        let settingsCreated = 0;
        for (const [field, value] of Object.entries(settings_defaults_1.DEFAULT_SETTINGS)) {
            const key = `settings.${field}`;
            if (!(await db.companySetting.findUnique({ where: { key } }))) {
                await db.companySetting.create({ data: { key, value: JSON.stringify(value) } });
                settingsCreated += 1;
            }
        }
        console.log(`✔ Configurações: ${settingsCreated} criada(s).`);
        if ((await db.transportFare.count()) === 0) {
            await db.transportFare.createMany({
                data: settings_defaults_1.REFERENCE_FARES.map((fare) => ({
                    type: fare.type,
                    operator: fare.operator,
                    description: 'Valor de referência — confirme a tarifa vigente em Configurações > Tarifas.',
                    value: fare.value,
                    effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
                    active: true,
                    verified: false,
                })),
            });
            console.log(`✔ Tarifas de referência criadas (${settings_defaults_1.REFERENCE_FARES.length}) — marcadas como NÃO confirmadas.`);
        }
        else
            console.log('• Tarifas já cadastradas (mantidas).');
        const file = node_path_1.default.resolve(config.projectRoot, process.env.SEED_SPREADSHEET_PATH || 'data/Controle_Profissional_de_Visitas.xlsx');
        if (!node_fs_1.default.existsSync(file)) {
            console.warn(`⚠ Planilha não encontrada em ${file}. Importação ignorada.`);
            return;
        }
        const result = await new spreadsheet_importer_1.SpreadsheetImporter(db).run(node_fs_1.default.readFileSync(file), {
            employeeId: user.id,
            fileName: node_path_1.default.basename(file),
            userId: user.id,
        });
        (0, context_1.printImportResult)(result);
    }
    finally {
        await close();
    }
}
main().catch((error) => {
    console.error('✖ Seed falhou:', error instanceof Error ? error.message : error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map