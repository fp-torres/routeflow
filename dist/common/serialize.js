"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoDate = isoDate;
exports.isoDateOrNull = isoDateOrNull;
exports.isoInstant = isoInstant;
exports.money = money;
exports.moneyOrNull = moneyOrNull;
exports.safeJsonParse = safeJsonParse;
exports.paginate = paginate;
const types_1 = require("@routeflow/types");
/** Coluna DATE -> "YYYY-MM-DD" (aceita Date ou string vinda do driver). */
function isoDate(value) {
    if (typeof value === 'string')
        return value.slice(0, 10);
    return (0, types_1.utcDateToIso)(value);
}
function isoDateOrNull(value) {
    return value == null ? null : isoDate(value);
}
function isoInstant(value) {
    if (value == null)
        return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function money(value) {
    return (0, types_1.toMoneyNumber)(value);
}
function moneyOrNull(value) {
    return (0, types_1.toNullableMoney)(value);
}
function safeJsonParse(value, fallback) {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function paginate(items, total, page, pageSize) {
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
//# sourceMappingURL=serialize.js.map