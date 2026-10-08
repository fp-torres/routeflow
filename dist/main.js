"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const app_setup_1 = require("./app.setup");
const env_1 = require("./config/env");
const startup_tasks_1 = require("./startup-tasks");
const LEVELS = {
    error: ['error', 'fatal'],
    warn: ['error', 'fatal', 'warn'],
    log: ['error', 'fatal', 'warn', 'log'],
    debug: ['error', 'fatal', 'warn', 'log', 'debug'],
    verbose: ['error', 'fatal', 'warn', 'log', 'debug', 'verbose'],
};
async function bootstrap() {
    const config = (0, env_1.loadConfig)();
    (0, startup_tasks_1.runStartupTasks)(config);
    const app = await core_1.NestFactory.create(app_module_1.AppModule.forRoot(config), {
        logger: LEVELS[config.logLevel],
    });
    (0, app_setup_1.configureApp)(app, config);
    await app.listen(config.port, config.host);
    common_1.Logger.log(`RouteFlow pronto em ${config.appUrl} (porta ${config.port}, banco ${config.database.provider}, ${config.env})`, 'Bootstrap');
}
bootstrap().catch((error) => {
    console.error('Falha ao iniciar o RouteFlow:', error instanceof Error ? error.message : error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map