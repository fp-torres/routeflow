import { Controller, Get, Module, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import {
  REPORT_TYPES,
  reportQuerySchema,
  type ReportQuery,
  type ReportType,
} from '@routeflow/types';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { renderPdf } from './pdf-renderer';
import { ReportsService } from './reports.service';
import { renderXlsx } from './xlsx-renderer';

const typePipe = new ZodPipe(z.enum(REPORT_TYPES, { error: 'Tipo de relatório inválido.' }));

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly audit: AuditService,
  ) {}

  @Get(':type/preview')
  preview(
    @Param('type', typePipe) type: ReportType,
    @Query(new ZodPipe(reportQuerySchema)) query: ReportQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reports.preview(type, query, user);
  }

  @Get(':type/pdf')
  async pdf(
    @Param('type', typePipe) type: ReportType,
    @Query(new ZodPipe(reportQuerySchema)) query: ReportQuery,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const data = await this.reports.build(type, query, user);
    const buffer = await renderPdf(data);
    void this.audit.log({
      userId: user.id,
      entity: 'report',
      action: 'report.generate',
      metadata: { type, format: 'pdf', from: data.from, to: data.to },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="routeflow-${type}-${data.from}_${data.to}.pdf"`,
    );
    res.send(buffer);
  }

  @Get(':type/xlsx')
  async xlsx(
    @Param('type', typePipe) type: ReportType,
    @Query(new ZodPipe(reportQuerySchema)) query: ReportQuery,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const data = await this.reports.build(type, query, user);
    const buffer = await renderXlsx(data);
    void this.audit.log({
      userId: user.id,
      entity: 'report',
      action: 'report.generate',
      metadata: { type, format: 'xlsx', from: data.from, to: data.to },
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="routeflow-${type}-${data.from}_${data.to}.xlsx"`,
    );
    res.send(buffer);
  }
}

@Module({
  imports: [DashboardModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
