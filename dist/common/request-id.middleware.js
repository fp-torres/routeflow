"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const node_crypto_1 = require("node:crypto");
function requestIdMiddleware(req, res, next) {
    const incoming = req.headers['x-request-id'];
    req.requestId =
        typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : (0, node_crypto_1.randomUUID)();
    res.setHeader('X-Request-Id', req.requestId);
    next();
}
//# sourceMappingURL=request-id.middleware.js.map