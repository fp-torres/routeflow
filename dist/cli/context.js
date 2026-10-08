"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCliContext = createCliContext;
exports.argValue = argValue;
exports.hasFlag = hasFlag;
exports.printImportResult = printImportResult;
const env_1 = require("../config/env");
const database_factory_1 = require("../database/database.factory");
function createCliContext() {
    const config = (0, env_1.loadConfig)();
    const db = (0, database_factory_1.createDatabaseClient)(config.database);
    return { config, db, close: () => db.$disconnect() };
}
function argValue(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}
function hasFlag(name) {
    return process.argv.includes(name);
}
function printImportResult(result) {
    console.log(`\nImportação ${result.dryRun ? '(SIMULAÇÃO — nada foi gravado) ' : ''}de ${result.fileName}: ${result.status}`);
    console.log('Entidade'.padEnd(16), 'criados'.padStart(8), 'atualiz.'.padStart(9), 'inalter.'.padStart(9));
    for (const [entity, count] of Object.entries(result.summary)) {
        console.log(entity.padEnd(16), String(count.created).padStart(8), String(count.updated).padStart(9), String(count.unchanged).padStart(9));
    }
    if (result.issues.length) {
        console.log(`\nInconsistências e observações (${result.issues.length}):`);
        for (const issue of result.issues) {
            const where = issue.sheet ? ` [${issue.sheet}${issue.row ? `!${issue.row}` : ''}]` : '';
            console.log(` - ${issue.severity.toUpperCase().padEnd(7)} ${issue.code}${where}: ${issue.message}`);
        }
    }
    console.log(`\nRegistro da importação: import_runs.id = ${result.importRunId}`);
}
//# sourceMappingURL=context.js.map