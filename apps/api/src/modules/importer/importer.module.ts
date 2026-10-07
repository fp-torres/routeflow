import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Module,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { booleanQuery } from '@routeflow/types';
import { loadConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { isoInstant, safeJsonParse } from '../../common/serialize';
import { isXlsx, safeFileName, type UploadedFile as UploadedFileType } from '../../common/uploads';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { PlannerService } from '../routes/planner.service';
import { RoutesModule } from '../routes/routes.module';
import { SettingsService } from '../settings/settings.service';
import { SpreadsheetImporter } from './spreadsheet-importer';

const importBody = z.object({
  dryRun: booleanQuery,
  updateExisting: booleanQuery,
  employeeId: z.string().uuid().optional(),
});

@Controller('import')
export class ImporterController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
    private readonly planner: PlannerService,
    private readonly audit: AuditService,
  ) {}

  /** Importa (ou simula, com dryRun) a planilha XLSX — idempotente. */
  @Post('spreadsheet')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: loadConfig().files.maxSpreadsheetBytes, files: 1 },
    }),
  )
  async importSpreadsheet(
    @UploadedFile() file: UploadedFileType | undefined,
    @Body(new ZodPipe(importBody)) body: z.infer<typeof importBody>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file || !isXlsx(file.buffer))
      throw new BadRequestException('Envie um arquivo .xlsx válido.');
    const result = await new SpreadsheetImporter(this.db).run(file.buffer, {
      employeeId: body.employeeId ?? user.id,
      fileName: safeFileName(file.originalname, 'planilha.xlsx'),
      dryRun: body.dryRun,
      updateExisting: body.updateExisting,
      userId: user.id,
      rules: await this.settings.networkRules(),
    });
    this.planner.resetCache();
    void this.audit.log({
      userId: user.id,
      entity: 'import',
      entityId: result.importRunId,
      action: 'import.spreadsheet',
      metadata: { dryRun: result.dryRun, status: result.status, summary: result.summary },
    });
    return result;
  }

  @Get('runs')
  @Roles('MANAGER')
  async runs() {
    const rows = await this.db.importRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { id: true, name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      dryRun: r.dryRun,
      status: r.status,
      summary: safeJsonParse(r.summary, {}),
      issues: safeJsonParse(r.issues, []),
      user: r.user,
      createdAt: isoInstant(r.createdAt),
    }));
  }
}

@Module({ imports: [RoutesModule], controllers: [ImporterController] })
export class ImporterModule {}
