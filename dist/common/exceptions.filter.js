"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const FRIENDLY = [
    [/file too large/i, 'Arquivo muito grande. Reduza o tamanho e tente novamente.'],
    [/too many files/i, 'Muitos arquivos de uma vez. Envie até 10 por vez.'],
    [/unexpected field/i, 'Envio de arquivo inválido.'],
    [
        /too many requests|throttler/i,
        'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.',
    ],
    [/^unauthorized$/i, 'Sessão expirada. Entre novamente.'],
    [/forbidden resource/i, 'Você não tem permissão para esta ação.'],
    [/^cannot (get|post|put|patch|delete) /i, 'Recurso não encontrado.'],
    [/^not found$/i, 'Recurso não encontrado.'],
    [/^bad request$/i, 'Requisição inválida.'],
];
function friendly(message) {
    for (const [regex, text] of FRIENDLY)
        if (regex.test(message))
            return text;
    return message;
}
function prismaCode(error) {
    if (error instanceof Error && 'code' in error) {
        const code = error.code;
        if (typeof code === 'string' && /^P\d{4}$/.test(code))
            return code;
    }
    return null;
}
/** Nunca expõe detalhes técnicos: mensagens em português e detalhes só no log (com requestId). */
let AllExceptionsFilter = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Ocorreu um erro inesperado. Tente novamente em instantes.';
        let errors;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string')
                message = body;
            else if (body && typeof body === 'object') {
                const b = body;
                if (Array.isArray(b.message))
                    message = b.message.join('; ');
                else if (typeof b.message === 'string')
                    message = b.message;
                if (Array.isArray(b.errors))
                    errors = b.errors;
            }
            message = friendly(message);
        }
        else {
            const code = prismaCode(exception);
            if (code === 'P2002') {
                status = common_1.HttpStatus.CONFLICT;
                message = 'Já existe um registro com estes dados.';
            }
            else if (code === 'P2025') {
                status = common_1.HttpStatus.NOT_FOUND;
                message = 'Registro não encontrado.';
            }
            else if (code === 'P2003' || code === 'P2014') {
                status = common_1.HttpStatus.CONFLICT;
                message = 'Operação não permitida: existem registros relacionados.';
            }
        }
        if (status >= 500) {
            this.logger.error(`${request.method} ${request.originalUrl} [${request.requestId ?? '-'}]`, exception instanceof Error ? exception.stack : String(exception));
        }
        if (response.headersSent)
            return;
        response.status(status).json({
            statusCode: status,
            message,
            ...(errors ? { errors } : {}),
            requestId: request.requestId,
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=exceptions.filter.js.map