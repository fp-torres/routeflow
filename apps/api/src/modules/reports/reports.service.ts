import { Inject, Injectable } from '@nestjs/common';
import {
  AUTHORIZATION_VALIDITY_LABEL,
  endOfMonthIso,
  formatBRL,
  formatDistance,
  formatDuration,
  isoToUtcDate,
  PHOTO_CATEGORY_LABEL,
  REPORT_TYPE_LABEL,
  ROUTE_STATUS_LABEL,
  startOfMonthIso,
  todayIso,
  TRANSPORT_TYPE_LABEL,
  VISIT_STATUS_LABEL,
  WEEKDAY_SHORT_LABEL,
  isoWeekday,
  type ReportPreviewDto,
  type ReportQuery,
  type ReportType,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import { employeeFilter, type AuthUser } from '../../common/auth-user';
import { isoDate, isoInstant, money, moneyOrNull } from '../../common/serialize';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { FaresService } from '../transport/fares.service';
import type { ReportData, ReportSection } from './report.types';

const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly dashboard: DashboardService,
    private readonly letters: AuthorizationsService,
    private readonly fares: FaresService,
  ) {}

  period(query: ReportQuery) {
    const today = todayIso(this.config.timeZone);
    return { from: query.from ?? startOfMonthIso(today), to: query.to ?? endOfMonthIso(today) };
  }

  private visitWhere(
    query: ReportQuery,
    employeeId: string | undefined,
    from: string,
    to: string,
  ): Prisma.VisitWhereInput {
    return {
      scheduledDate: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) },
      ...(employeeId ? { employeeId } : {}),
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.network || query.region
        ? {
            store: {
              ...(query.network ? { network: query.network } : {}),
              ...(query.region ? { region: query.region } : {}),
            },
          }
        : {}),
    };
  }

  private async visitsSection(
    where: Prisma.VisitWhereInput,
    history: boolean,
  ): Promise<{ section: ReportSection; rows: Array<{ status: string }> }> {
    const visits = await this.db.visit.findMany({
      where,
      include: { store: true, _count: { select: { photos: true, activities: true } } },
      orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
      take: 5000,
    });
    const rows = visits.map((v) => {
      const date = isoDate(v.scheduledDate);
      const minutes =
        v.startedAt && v.finishedAt
          ? Math.round((v.finishedAt.getTime() - v.startedAt.getTime()) / 60000)
          : null;
      return {
        date,
        weekday: WEEKDAY_SHORT_LABEL[isoWeekday(date)] ?? '',
        order: v.order,
        code: v.store.code,
        store: v.store.name,
        network: v.store.network,
        region: v.store.region,
        neighborhood: v.store.neighborhood,
        status: VISIT_STATUS_LABEL[v.status],
        startedAt: v.startedAt ? isoInstant(v.startedAt) : null,
        finishedAt: v.finishedAt ? isoInstant(v.finishedAt) : null,
        duration: minutes == null ? null : formatDuration(minutes * 60),
        photos: v._count.photos,
        activities: v._count.activities,
        reason: v.statusReason,
        notes: v.notes,
      };
    });
    const columns = [
      { key: 'date', header: 'Data', width: 9, format: 'date' as const },
      { key: 'weekday', header: 'Dia', width: 5 },
      {
        key: 'order',
        header: 'Ordem',
        width: 5,
        format: 'number' as const,
        align: 'right' as const,
      },
      { key: 'code', header: 'Código', width: 9 },
      { key: 'store', header: 'Loja', width: 22 },
      { key: 'network', header: 'Rede', width: 14 },
      { key: 'region', header: 'Região', width: 12 },
      { key: 'neighborhood', header: 'Bairro', width: 12 },
      { key: 'status', header: 'Status', width: 11, format: 'status' as const },
      { key: 'startedAt', header: 'Início', width: 12, format: 'datetime' as const },
      { key: 'finishedAt', header: 'Fim', width: 12, format: 'datetime' as const },
      { key: 'duration', header: 'Duração', width: 7 },
      {
        key: 'photos',
        header: 'Fotos',
        width: 5,
        format: 'number' as const,
        align: 'right' as const,
      },
      ...(history
        ? [
            {
              key: 'activities',
              header: 'Registros',
              width: 6,
              format: 'number' as const,
              align: 'right' as const,
            },
            { key: 'reason', header: 'Motivo', width: 16 },
          ]
        : []),
      { key: 'notes', header: 'Observações', width: 20 },
    ];
    return {
      section: {
        title: history ? 'Histórico de visitas' : 'Visitas',
        sheetName: history ? 'Histórico' : 'Visitas',
        columns,
        rows,
      },
      rows,
    };
  }

  private async routesSection(
    employeeId: string | undefined,
    from: string,
    to: string,
  ): Promise<ReportSection> {
    const routes = await this.db.route.findMany({
      where: {
        date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) },
        ...(employeeId ? { employeeId } : {}),
      },
      include: { stops: { select: { visit: { select: { status: true } } } } },
      orderBy: { date: 'asc' },
    });
    return {
      title: 'Rotas',
      sheetName: 'Rotas',
      columns: [
        { key: 'date', header: 'Data', width: 9, format: 'date' },
        { key: 'region', header: 'Região', width: 14 },
        { key: 'status', header: 'Status', width: 11, format: 'status' },
        { key: 'stops', header: 'Paradas', width: 6, format: 'number', align: 'right' },
        { key: 'completed', header: 'Concluídas', width: 7, format: 'number', align: 'right' },
        { key: 'distance', header: 'Distância', width: 9, align: 'right' },
        { key: 'duration', header: 'Deslocamento', width: 9, align: 'right' },
        {
          key: 'estimatedCost',
          header: 'Custo estimado',
          width: 10,
          format: 'money',
          align: 'right',
        },
        { key: 'actualCost', header: 'Custo real', width: 10, format: 'money', align: 'right' },
      ],
      rows: routes.map((r) => ({
        date: isoDate(r.date),
        region: r.region,
        status: ROUTE_STATUS_LABEL[r.status],
        stops: r.stops.length,
        completed: r.stops.filter((s) => s.visit?.status === 'COMPLETED').length,
        distance: r.estimatedDistance == null ? null : formatDistance(r.estimatedDistance),
        duration: r.estimatedDuration == null ? null : formatDuration(r.estimatedDuration),
        estimatedCost: moneyOrNull(r.estimatedTransportCost),
        actualCost: moneyOrNull(r.actualTransportCost),
      })),
    };
  }

  private async expensesSection(
    employeeId: string | undefined,
    from: string,
    to: string,
  ): Promise<ReportSection> {
    const rows = await this.db.transportExpense.findMany({
      where: {
        date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) },
        ...(employeeId ? { employeeId } : {}),
      },
      include: { visit: { select: { store: { select: { name: true } } } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      title: 'Despesas de transporte',
      sheetName: 'Despesas',
      columns: [
        { key: 'date', header: 'Data', width: 9, format: 'date' },
        { key: 'type', header: 'Tipo', width: 10 },
        { key: 'description', header: 'Descrição', width: 24 },
        { key: 'store', header: 'Visita', width: 18 },
        { key: 'estimated', header: 'Estimado', width: 9, format: 'money', align: 'right' },
        { key: 'actual', header: 'Pago', width: 9, format: 'money', align: 'right' },
        { key: 'value', header: 'Considerado', width: 9, format: 'money', align: 'right' },
      ],
      rows: rows.map((e) => ({
        date: isoDate(e.date),
        type: TRANSPORT_TYPE_LABEL[e.type],
        description: e.description,
        store: e.visit?.store.name ?? null,
        estimated: moneyOrNull(e.estimatedValue),
        actual: moneyOrNull(e.actualValue),
        value: money(e.value),
      })),
    };
  }

  private async authorizationsSection(query: ReportQuery): Promise<ReportSection> {
    const letters = await this.letters.list({ storeId: query.storeId, network: query.network });
    return {
      title: 'Cartas de autorização',
      sheetName: 'Autorizações',
      columns: [
        { key: 'code', header: 'Código', width: 9 },
        { key: 'store', header: 'Loja', width: 22 },
        { key: 'network', header: 'Rede', width: 14 },
        { key: 'title', header: 'Título', width: 20 },
        { key: 'issueDate', header: 'Emissão', width: 9, format: 'date' },
        { key: 'validFrom', header: 'Início', width: 9, format: 'date' },
        { key: 'expirationDate', header: 'Vencimento', width: 9, format: 'date' },
        { key: 'validity', header: 'Situação', width: 12, format: 'status' },
        { key: 'daysLeft', header: 'Dias', width: 5, format: 'number', align: 'right' },
      ],
      rows: letters.map((l) => ({
        code: l.store?.code ?? null,
        store: l.store?.name ?? null,
        network: l.store?.network ?? null,
        title: l.title,
        issueDate: l.issueDate,
        validFrom: l.validFrom,
        expirationDate: l.expirationDate,
        validity: AUTHORIZATION_VALIDITY_LABEL[l.validity],
        daysLeft: l.daysLeft,
      })),
    };
  }

  private async storesSection(query: ReportQuery): Promise<ReportSection> {
    const stores = await this.db.store.findMany({
      where: {
        ...(query.network ? { network: query.network } : {}),
        ...(query.region ? { region: query.region } : {}),
        ...(query.storeId ? { id: query.storeId } : {}),
      },
      orderBy: [{ network: 'asc' }, { code: 'asc' }],
    });
    const auth = await this.letters.summaries(stores.map((s) => s.id));
    return {
      title: 'Lojas',
      sheetName: 'Lojas',
      pdf: false,
      columns: [
        { key: 'code', header: 'Código', width: 10 },
        { key: 'name', header: 'Loja', width: 26 },
        { key: 'network', header: 'Rede', width: 16 },
        { key: 'region', header: 'Região', width: 14 },
        { key: 'neighborhood', header: 'Bairro', width: 14 },
        { key: 'address', header: 'Endereço', width: 36 },
        { key: 'coordinates', header: 'Coordenadas', width: 10 },
        { key: 'authorization', header: 'Autorização', width: 14, format: 'status' },
        { key: 'status', header: 'Status', width: 8 },
      ],
      rows: stores.map((s) => ({
        code: s.code,
        name: s.name,
        network: s.network,
        region: s.region,
        neighborhood: s.neighborhood,
        address: s.address,
        coordinates: s.latitude != null && s.longitude != null ? 'Sim' : 'Não',
        authorization: auth.get(s.id)?.validity
          ? AUTHORIZATION_VALIDITY_LABEL[auth.get(s.id)!.validity!]
          : 'Sem carta',
        status: s.active ? 'Ativa' : 'Inativa',
      })),
    };
  }

  private async evidencesSection(where: Prisma.VisitWhereInput): Promise<ReportSection> {
    const photos = await this.db.visitPhoto.findMany({
      where: { visit: where },
      include: {
        visit: { select: { scheduledDate: true, store: { select: { code: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 3000,
    });
    return {
      title: 'Evidências (fotos)',
      sheetName: 'Evidências',
      columns: [
        { key: 'date', header: 'Data', width: 9, format: 'date' },
        { key: 'code', header: 'Código', width: 9 },
        { key: 'store', header: 'Loja', width: 22 },
        { key: 'category', header: 'Categoria', width: 12 },
        { key: 'file', header: 'Arquivo', width: 22 },
        { key: 'original', header: 'Original (KB)', width: 9, format: 'number', align: 'right' },
        { key: 'optimized', header: 'Otimizada (KB)', width: 9, format: 'number', align: 'right' },
        { key: 'size', header: 'Dimensões', width: 9 },
      ],
      rows: photos.map((p) => ({
        date: isoDate(p.visit.scheduledDate),
        code: p.visit.store.code,
        store: p.visit.store.name,
        category: PHOTO_CATEGORY_LABEL[p.category],
        file: p.fileName,
        original: Math.round(p.originalSize / 1024),
        optimized: Math.round(p.optimizedSize / 1024),
        size: `${p.width}×${p.height}`,
      })),
    };
  }

  async build(type: ReportType, query: ReportQuery, user: AuthUser): Promise<ReportData> {
    const { from, to } = this.period(query);
    const employeeId = employeeFilter(user, query.employeeId);
    const where = this.visitWhere(query, employeeId, from, to);
    const metrics = await this.dashboard.metrics(from, to, employeeId);
    const sections: ReportSection[] = [];
    let visitRows: Array<{ status: string }> = [];

    if (type === 'visits' || type === 'consolidated' || type === 'history') {
      const { section, rows } = await this.visitsSection(where, type === 'history');
      sections.push(section);
      visitRows = rows;
    }
    if (type === 'routes' || type === 'consolidated')
      sections.push(await this.routesSection(employeeId, from, to));
    if (type === 'visits' || type === 'consolidated' || type === 'authorizations')
      sections.push(await this.storesSection(query));
    if (type === 'expenses' || type === 'consolidated')
      sections.push(await this.expensesSection(employeeId, from, to));
    if (type === 'authorizations' || type === 'consolidated')
      sections.push(await this.authorizationsSection(query));
    if (type === 'consolidated' || type === 'history')
      sections.push(await this.evidencesSection(where));

    const counted = visitRows.length ? visitRows : null;
    const totalVisits = counted
      ? counted.filter(
          (r) =>
            r.status !== VISIT_STATUS_LABEL.CANCELLED &&
            r.status !== VISIT_STATUS_LABEL.RESCHEDULED,
        ).length
      : metrics.totals.scheduled;
    const completed = counted
      ? counted.filter((r) => r.status === VISIT_STATUS_LABEL.COMPLETED).length
      : metrics.totals.completed;
    const pending = counted
      ? counted.filter(
          (r) =>
            r.status === VISIT_STATUS_LABEL.PENDING || r.status === VISIT_STATUS_LABEL.IN_PROGRESS,
        ).length
      : metrics.totals.pending + metrics.totals.inProgress;
    const notCompleted = counted
      ? counted.filter((r) => r.status === VISIT_STATUS_LABEL.NOT_COMPLETED).length
      : metrics.totals.notCompleted;
    const rate = totalVisits ? completed / totalVisits : 0;

    const kpis =
      type === 'authorizations'
        ? [
            { label: 'Lojas com carta válida', value: String(metrics.authorizations.valid) },
            { label: 'Vencendo (30 dias)', value: String(metrics.authorizations.expiring) },
            { label: 'Vencendo (7 dias)', value: String(metrics.authorizations.critical) },
            { label: 'Expiradas', value: String(metrics.authorizations.expired) },
            { label: 'Sem carta', value: String(metrics.authorizations.withoutLetter) },
          ]
        : type === 'expenses'
          ? [
              { label: 'Total de despesas', value: formatBRL(metrics.expenses.total) },
              {
                label: 'Custo por visita concluída',
                value:
                  metrics.expenses.perVisit == null ? '—' : formatBRL(metrics.expenses.perVisit),
              },
              { label: 'Visitas concluídas', value: String(metrics.totals.completed) },
              { label: 'Dias trabalhados', value: String(metrics.workingDays) },
            ]
          : [
              { label: 'Visitas', value: String(totalVisits) },
              { label: 'Concluídas', value: String(completed) },
              { label: 'Pendentes', value: String(pending) },
              { label: 'Não realizadas', value: String(notCompleted) },
              { label: 'Taxa de conclusão', value: pct(rate) },
              { label: 'Despesas', value: formatBRL(metrics.expenses.total) },
            ];

    const conclusions: string[] = [];
    if (type === 'consolidated') {
      conclusions.push(
        `Taxa de conclusão de ${pct(rate)} (${completed} de ${totalVisits} visitas válidas).`,
      );
      if (notCompleted)
        conclusions.push(
          `${notCompleted} visita(s) não realizada(s) — os motivos estão no histórico.`,
        );
      if (pending && to < todayIso(this.config.timeZone))
        conclusions.push(`${pending} visita(s) permaneceram pendentes ao fim do período.`);
      if (metrics.authorizations.critical || metrics.authorizations.expired) {
        conclusions.push(
          `${metrics.authorizations.critical} carta(s) vencem em até 7 dias e ${metrics.authorizations.expired} loja(s) estão com autorização expirada.`,
        );
      }
      if (metrics.authorizations.withoutLetter)
        conclusions.push(
          `${metrics.authorizations.withoutLetter} loja(s) ainda sem carta de autorização cadastrada.`,
        );
      conclusions.push(
        `Despesas de transporte: ${formatBRL(metrics.expenses.total)}${metrics.expenses.perVisit != null ? ` (${formatBRL(metrics.expenses.perVisit)} por visita concluída)` : ''}.`,
      );
      if (metrics.distance.totalMeters != null)
        conclusions.push(
          `Distância estimada percorrida: ${formatDistance(metrics.distance.totalMeters)} em ${metrics.distance.routesWithEstimate} rota(s) calculada(s).`,
        );
      if (await this.fares.needsReview())
        conclusions.push(
          'As tarifas de transporte cadastradas ainda são valores de referência não confirmados.',
        );
    }

    return {
      type,
      title: `${REPORT_TYPE_LABEL[type]}`,
      from,
      to,
      generatedAt: new Date(),
      timeZone: this.config.timeZone,
      kpis,
      chart:
        type === 'expenses' || type === 'authorizations'
          ? null
          : {
              title: 'Visitas por dia',
              points: metrics.byDay.map((p) => ({
                label: p.label,
                total: p.total,
                completed: p.completed ?? 0,
              })),
            },
      sections,
      conclusions,
    };
  }

  async preview(type: ReportType, query: ReportQuery, user: AuthUser): Promise<ReportPreviewDto> {
    const data = await this.build(type, query, user);
    return {
      type,
      title: data.title,
      from: data.from,
      to: data.to,
      kpis: data.kpis,
      sections: data.sections.map((s) => ({ title: s.title, rows: s.rows.length })),
    };
  }
}
