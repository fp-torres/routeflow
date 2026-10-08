"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.randomToken = randomToken;
exports.sha256 = sha256;
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = require("bcryptjs");
function hashPassword(password) {
    return (0, bcryptjs_1.hash)(password, 12);
}
function verifyPassword(password, passwordHash) {
    return (0, bcryptjs_1.compare)(password, passwordHash);
}
function randomToken(bytes = 48) {
    return (0, node_crypto_1.randomBytes)(bytes).toString('base64url');
}
function sha256(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
//# sourceMappingURL=password.js.map