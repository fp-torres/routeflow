import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from './auth-user';

const FRIENDLY: Array<[RegExp, string]> = [
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

function friendly(message: string): string {
  for (const [regex, text] of FRIENDLY) if (regex.test(message)) return text;
  return message;
}

function prismaCode(error: unknown): string | null {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && /^P\d{4}$/.test(code)) return code;
  }
  return null;
}

/** Nunca expõe detalhes técnicos: mensagens em português e detalhes só no log (com requestId). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AppRequest>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocorreu um erro inesperado. Tente novamente em instantes.';
    let errors: Array<{ path: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object') {
        const b = body as { message?: unknown; errors?: unknown };
        if (Array.isArray(b.message)) message = b.message.join('; ');
        else if (typeof b.message === 'string') message = b.message;
        if (Array.isArray(b.errors)) errors = b.errors as typeof errors;
      }
      message = friendly(message);
    } else {
      const code = prismaCode(exception);
      if (code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Já existe um registro com estes dados.';
      } else if (code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado.';
      } else if (code === 'P2003' || code === 'P2014') {
        status = HttpStatus.CONFLICT;
        message = 'Operação não permitida: existem registros relacionados.';
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} [${request.requestId ?? '-'}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    if (response.headersSent) return;
    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      requestId: request.requestId,
    });
  }
}
