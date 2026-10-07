import { createHash } from 'node:crypto';
import {
  comparableKey,
  DEFAULT_NETWORK_RULES,
  generateStoreCode,
  isoToUtcDate,
  type ImportEntityCount,
  type ImportIssue,
  type ImportResultDto,
  type NetworkRules,
} from '@routeflow/types';
import type { Db } from '../../database/prisma.types';
import {
  normalizeBaseAddress,
  parseSpreadsheet,
  type ParsedSpreadsheet,
} from './spreadsheet-parser';

export interface ImportOptions {
  employeeId: string;
  fileName: string;
  dryRun?: boolean;
  /** Atualiza registros existentes com os dados da planilha (padrão: não sobrescreve o que foi alterado no sistema). */
  updateExisting?: boolean;
  userId?: string | null;
  rules?: NetworkRules;
}

const counter = (): ImportEntityCount => ({ created: 0, updated: 0, unchanged: 0 });

/**
 * Importação IDEMPOTENTE da planilha "Controle Profissional de Visitas".
 * Reexecutar não duplica registros: lojas, rotas, visitas e roteiros são
 * identificados por chaves estáveis (importKey) e, para lojas, também por
 * código e por rede + nome. O banco é a fonte oficial: por padrão, dados já
 * existentes não são sobrescritos (use updateExisting para isso).
 */
export class SpreadsheetImporter {
  constructor(private readonly db: Db) {}

  async run(buffer: Buffer, options: ImportOptions): Promise<ImportResultDto> {
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const dryRun = !!options.dryRun;
    let parsed: ParsedSpreadsheet;
    try {
      parsed = await parseSpreadsheet(buffer, options.rules ?? DEFAULT_NETWORK_RULES);
    } catch (error) {
      const issues: ImportIssue[] = [
        {
          severity: 'error',
          code: 'PARSE_ERROR',
          message: `Não foi possível ler a planilha: ${String(error instanceof Error ? error.message : error)}`,
        },
      ];
      return this.record(
        {
          dryRun,
          fileName: options.fileName,
          fileHash,
          status: 'FAILED',
          summary: {},
          issues,
          importRunId: null,
        },
        options,
      );
    }
    const summary = {
      settings: counter(),
      stores: counter(),
      homeAddress: counter(),
      templates: counter(),
      templateStops: counter(),
      routes: counter(),
      visits: counter(),
    };
    const issues = [...parsed.issues];

    // 1) Catálogos (redes, regiões) e anotações de planejamento
    await this.mergeListSetting(
      'settings.networks',
      parsed.catalogs.networks,
      summary.settings,
      dryRun,
    );
    await this.mergeListSetting(
      'settings.regions',
      parsed.catalogs.regions,
      summary.settings,
      dryRun,
    );
    if (parsed.planningNote)
      await this.setRawOnce(
        'operation.planningNote',
        parsed.planningNote,
        summary.settings,
        dryRun,
      );
    if (parsed.planningStartDate)
      await this.setRawOnce(
        'operation.planningStartDate',
        parsed.planningStartDate,
        summary.settings,
        dryRun,
      );

    // 2) Lojas
    const storeIds = new Map<string, string>();
    for (const draft of parsed.stores.values())
      storeIds.set(
        draft.key,
        await this.upsertStore(draft, summary.stores, dryRun, !!options.updateExisting),
      );

    // 3) Endereço de casa (base de saída e retorno)
    let home = await this.db.homeAddress.findFirst({
      where: { employeeId: options.employeeId, active: true },
    });
    if (!home && parsed.baseAddress) {
      summary.homeAddress.created += 1;
      if (!dryRun) {
        home = await this.db.homeAddress.create({
          data: {
            employeeId: options.employeeId,
            label: 'Casa',
            address: normalizeBaseAddress(parsed.baseAddress),
            active: true,
          },
        });
      }
    } else if (home) summary.homeAddress.unchanged += 1;
    if (!parsed.baseAddress)
      issues.push({
        severity: 'warning',
        code: 'BASE_ADDRESS_NOT_FOUND',
        sheet: 'Rotas',
        message: 'Endereço base (casa) não encontrado na aba Rotas.',
      });

    // 4) Roteiro padrão (dia da semana -> lojas em ordem)
    const templateKey = `template:standard:${options.employeeId}`;
    let template = await this.db.routeTemplate.findUnique({ where: { importKey: templateKey } });
    if (!template && parsed.weekdayTemplate.size) {
      summary.templates.created += 1;
      if (!dryRun) {
        template = await this.db.routeTemplate.create({
          data: {
            employeeId: options.employeeId,
            name: 'Roteiro padrão (importado da planilha)',
            kind: 'STANDARD',
            importKey: templateKey,
            notes:
              'Gerado a partir da aba Rotas: cada dia da semana repete as lojas e a ordem da planilha.',
          },
        });
      }
      for (const [weekday, keys] of parsed.weekdayTemplate) {
        summary.templateStops.created += keys.length;
        if (!dryRun && template) {
          await this.db.routeTemplateStop.createMany({
            data: keys.map((key, index) => ({
              templateId: template!.id,
              storeId: storeIds.get(key)!,
              weekday,
              weekIndex: 0,
              order: index + 1,
            })),
          });
        }
      }
    } else if (template) {
      summary.templates.unchanged += 1;
      if (options.updateExisting && !dryRun) {
        await this.db.routeTemplateStop.deleteMany({ where: { templateId: template.id } });
        for (const [weekday, keys] of parsed.weekdayTemplate) {
          await this.db.routeTemplateStop.createMany({
            data: keys.map((key, index) => ({
              templateId: template!.id,
              storeId: storeIds.get(key)!,
              weekday,
              weekIndex: 0,
              order: index + 1,
            })),
          });
          summary.templateStops.updated += keys.length;
        }
      }
    }

    // 5) Rotas e visitas por data (ordem da aba Rotas)
    for (const routeDraft of parsed.routes) {
      const routeKey = `route:${options.employeeId}:${routeDraft.date}`;
      let route = await this.db.route.findUnique({
        where: {
          employeeId_date: { employeeId: options.employeeId, date: isoToUtcDate(routeDraft.date) },
        },
      });
      if (!route) {
        summary.routes.created += 1;
        if (!dryRun) {
          route = await this.db.route.create({
            data: {
              employeeId: options.employeeId,
              date: isoToUtcDate(routeDraft.date),
              region: routeDraft.region,
              startAddress:
                home?.address ??
                (parsed.baseAddress ? normalizeBaseAddress(parsed.baseAddress) : ''),
              startLatitude: home?.latitude ?? null,
              startLongitude: home?.longitude ?? null,
              templateId: template?.id ?? null,
              importKey: routeKey,
            },
          });
        }
      } else summary.routes.unchanged += 1;

      for (const [index, storeKey] of routeDraft.storeKeys.entries()) {
        const draft = parsed.visits.find(
          (v) => v.date === routeDraft.date && v.storeKey === storeKey,
        );
        const visitKey = `visit:${options.employeeId}:${routeDraft.date}:${storeKey}`.slice(0, 191);
        const storeId = storeIds.get(storeKey)!;
        const existing = await this.db.visit.findUnique({ where: { importKey: visitKey } });
        if (existing) {
          if (
            options.updateExisting &&
            existing.status === 'PENDING' &&
            draft &&
            draft.status !== 'PENDING'
          ) {
            summary.visits.updated += 1;
            if (!dryRun)
              await this.db.visit.update({
                where: { id: existing.id },
                data: { status: draft.status },
              });
          } else summary.visits.unchanged += 1;
          continue;
        }
        if (dryRun || !route) {
          summary.visits.created += 1;
          continue;
        }
        const sameStore = await this.db.visit.findFirst({
          where: { routeId: route.id, storeId, importKey: null },
        });
        if (sameStore) {
          summary.visits.updated += 1;
          await this.db.visit.update({
            where: { id: sameStore.id },
            data: { importKey: visitKey },
          });
          continue;
        }
        const order = (await this.db.routeStop.count({ where: { routeId: route.id } })) + 1;
        const visit = await this.db.visit.create({
          data: {
            routeId: route.id,
            storeId,
            employeeId: options.employeeId,
            scheduledDate: route.date,
            order: Math.max(order, index + 1),
            status: draft?.status ?? 'PENDING',
            notes: draft?.notes ?? null,
            importKey: visitKey,
          },
        });
        await this.db.routeStop.create({
          data: { routeId: route.id, storeId, visitId: visit.id, order: visit.order },
        });
        summary.visits.created += 1;
      }
    }

    const hasProblems = issues.some((i) => i.severity !== 'info');
    return this.record(
      {
        dryRun,
        fileName: options.fileName,
        fileHash,
        status: hasProblems ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS',
        summary,
        issues,
        importRunId: null,
      },
      options,
    );
  }

  private async record(result: ImportResultDto, options: ImportOptions): Promise<ImportResultDto> {
    const run = await this.db.importRun.create({
      data: {
        fileName: result.fileName.slice(0, 255),
        fileHash: result.fileHash,
        dryRun: result.dryRun,
        status: result.status,
        summary: JSON.stringify(result.summary),
        issues: JSON.stringify(result.issues),
        userId: options.userId ?? null,
      },
    });
    return { ...result, importRunId: run.id };
  }

  private async findStore(draft: {
    key: string;
    code: string | null;
    name: string;
    network: string;
  }) {
    const byKey = await this.db.store.findUnique({ where: { importKey: draft.key } });
    if (byKey) return byKey;
    if (draft.code) {
      const byCode = await this.db.store.findUnique({ where: { code: draft.code } });
      if (byCode) return byCode;
    }
    const sameNetwork = await this.db.store.findMany({ where: { network: draft.network } });
    return sameNetwork.find((s) => comparableKey(s.name) === comparableKey(draft.name)) ?? null;
  }

  private async upsertStore(
    draft: ParsedSpreadsheet['stores'] extends Map<string, infer T> ? T : never,
    count: ImportEntityCount,
    dryRun: boolean,
    updateExisting: boolean,
  ): Promise<string> {
    const existing = await this.findStore(draft);
    if (existing) {
      const fill: Record<string, unknown> = {};
      if (!existing.importKey) fill.importKey = draft.key;
      if (!existing.neighborhood && draft.neighborhood) fill.neighborhood = draft.neighborhood;
      if (!existing.region && draft.region) fill.region = draft.region;
      if (updateExisting)
        Object.assign(fill, {
          name: draft.name,
          network: draft.network,
          address: draft.address,
          neighborhood: draft.neighborhood,
          region: draft.region,
        });
      if (Object.keys(fill).length) {
        count.updated += 1;
        if (!dryRun) await this.db.store.update({ where: { id: existing.id }, data: fill });
      } else count.unchanged += 1;
      return existing.id;
    }
    count.created += 1;
    if (dryRun) return `dry-run:${draft.key}`;
    let code = draft.code ?? generateStoreCode(draft.network, draft.name);
    for (let i = 2; await this.db.store.findUnique({ where: { code } }); i += 1)
      code = `${(draft.code ?? generateStoreCode(draft.network, draft.name)).slice(0, 36)}-${i}`;
    const created = await this.db.store.create({
      data: {
        code,
        importKey: draft.key,
        name: draft.name,
        network: draft.network,
        address: draft.address,
        neighborhood: draft.neighborhood,
        city: draft.city,
        state: 'RJ',
        region: draft.region,
        observations: draft.code
          ? null
          : 'Loja sem código na planilha de origem: código provisório gerado na importação.',
      },
    });
    return created.id;
  }

  private async mergeListSetting(
    key: string,
    values: string[],
    count: ImportEntityCount,
    dryRun: boolean,
  ): Promise<void> {
    if (!values.length) return;
    const row = await this.db.companySetting.findUnique({ where: { key } });
    let current: string[] = [];
    try {
      current = row ? (JSON.parse(row.value) as string[]) : [];
    } catch {
      current = [];
    }
    const merged = [...current];
    for (const v of values)
      if (!merged.some((m) => comparableKey(m) === comparableKey(v))) merged.push(v);
    if (row && merged.length === current.length) {
      count.unchanged += 1;
      return;
    }
    if (row) count.updated += 1;
    else count.created += 1;
    if (!dryRun)
      await this.db.companySetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(merged) },
        update: { value: JSON.stringify(merged) },
      });
  }

  private async setRawOnce(
    key: string,
    value: string,
    count: ImportEntityCount,
    dryRun: boolean,
  ): Promise<void> {
    const row = await this.db.companySetting.findUnique({ where: { key } });
    if (row) {
      count.unchanged += 1;
      return;
    }
    count.created += 1;
    if (!dryRun) await this.db.companySetting.create({ data: { key, value } });
  }
}
