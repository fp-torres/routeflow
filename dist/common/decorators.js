"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.Roles = exports.Public = exports.ROLES_KEY = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = 'routeflow:isPublic';
exports.ROLES_KEY = 'routeflow:roles';
/** Rota acessível sem login (login, refresh, health, arquivos assinados, painel público). */
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
/** Restringe a rota a determinados papéis (ADMIN sempre tem acesso). */
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    return ctx.switchToHttp().getRequest().user;
});
//# sourceMappingURL=decorators.js.map