"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canSeeAll = canSeeAll;
exports.resolveEmployeeId = resolveEmployeeId;
exports.employeeFilter = employeeFilter;
exports.requestMeta = requestMeta;
/** ADMIN e MANAGER enxergam toda a operação; EMPLOYEE apenas os próprios dados. */
function canSeeAll(user) {
    return user.role === 'ADMIN' || user.role === 'MANAGER';
}
/** Funcionário dono dos dados de "Meu dia" (dashboard, agenda, rotas). */
function resolveEmployeeId(user, requested) {
    return requested && canSeeAll(user) ? requested : user.id;
}
/** Filtro de funcionário para listagens/relatórios (undefined = todos). */
function employeeFilter(user, requested) {
    if (!canSeeAll(user))
        return user.id;
    return requested ?? undefined;
}
function requestMeta(req) {
    return {
        ipAddress: (req.ip ?? '').toString().slice(0, 64) || null,
        userAgent: (req.headers['user-agent'] ?? '').toString().slice(0, 255) || null,
    };
}
//# sourceMappingURL=auth-user.js.map