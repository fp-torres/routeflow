import { Controller, Get, Global, Module, Query } from '@nestjs/common';
import { auditQuerySchema, type AuditQuery } from '@routeflow/types';
import { Roles } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  list(@Query(new ZodPipe(auditQuerySchema)) query: AuditQuery) {
    return this.audit.list(query);
  }
}

@Global()
@Module({ providers: [AuditService], controllers: [AuditController], exports: [AuditService] })
export class AuditModule {}
