import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { AppRequest } from './auth-user';

export function requestIdMiddleware(req: AppRequest, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.requestId =
    typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
