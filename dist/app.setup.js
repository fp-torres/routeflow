"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWebDist = resolveWebDist;
exports.configureApp = configureApp;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const common_1 = require("@nestjs/common");
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const exceptions_filter_1 = require("./common/exceptions.filter");
const request_id_middleware_1 = require("./common/request-id.middleware");
/** Localiza o build do frontend: WEB_DIST_PATH, monorepo (apps/web/dist) ou release (public/). */
function resolveWebDist(config) {
    const candidates = [
        config.webDistPath,
        node_path_1.default.resolve(__dirname, '../../web/dist'),
        node_path_1.default.resolve(__dirname, '../public'),
        node_path_1.default.resolve(config.projectRoot, 'apps/web/dist'),
        node_path_1.default.resolve(config.projectRoot, 'public'),
    ].filter((p) => !!p);
    return candidates.find((dir) => node_fs_1.default.existsSync(node_path_1.default.join(dir, 'index.html'))) ?? null;
}
function configureApp(app, config) {
    app.set('trust proxy', config.trustProxy ? 1 : false);
    app.disable('x-powered-by');
    app.use(request_id_middleware_1.requestIdMiddleware);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'default-src': ["'self'"],
                'script-src': ["'self'"],
                'style-src': ["'self'", "'unsafe-inline'"],
                'img-src': ["'self'", 'data:', 'blob:'],
                'font-src': ["'self'", 'data:'],
                'connect-src': ["'self'"],
                'frame-src': ["'self'", 'https://www.openstreetmap.org'],
                'worker-src': ["'self'", 'blob:'],
                'manifest-src': ["'self'"],
                'object-src': ["'none'"],
                'frame-ancestors': ["'self'"],
                'upgrade-insecure-requests': config.isProduction ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'same-origin' },
    }));
    app.use((0, compression_1.default)());
    app.use((0, cookie_parser_1.default)());
    app.enableCors({ origin: config.corsOrigins, credentials: true });
    app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: common_1.RequestMethod.GET }] });
    app.useGlobalFilters(new exceptions_filter_1.AllExceptionsFilter());
    app.enableShutdownHooks();
    const webDist = resolveWebDist(config);
    if (!webDist) {
        new common_1.Logger('Web').warn('Build do frontend não encontrado: servindo apenas a API (rode npm run build).');
        return;
    }
    const indexHtml = node_path_1.default.join(webDist, 'index.html');
    app.useStaticAssets(webDist, {
        index: false,
        setHeaders: (res, filePath) => {
            const immutable = filePath.includes(`${node_path_1.default.sep}assets${node_path_1.default.sep}`);
            res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
    });
    // Fallback da SPA: rotas do React (ex.: /visitas/123) recebem o index.html
    app.use((req, res, next) => {
        if ((req.method !== 'GET' && req.method !== 'HEAD') ||
            req.path.startsWith('/api') ||
            req.path === '/health' ||
            node_path_1.default.extname(req.path)) {
            next();
            return;
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexHtml);
    });
    new common_1.Logger('Web').log(`Servindo frontend de ${webDist}`);
}
//# sourceMappingURL=app.setup.js.map