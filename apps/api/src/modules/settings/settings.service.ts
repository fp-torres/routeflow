import { Inject, Injectable } from '@nestjs/common';
import {
  companySettingsSchema,
  type CompanySettings,
  type CompanySettingsUpdate,
  type NetworkRules,
  type ValidityThresholds,
} from '@routeflow/types';
import { DEFAULT_SETTINGS } from './settings.defaults';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { safeJsonParse } from '../../common/serialize';

export { DEFAULT_SETTINGS };

const PREFIX = 'settings.';

/** Configurações da operação (tabela company_settings, chave/valor JSON). */
@Injectable()
export class SettingsService {
  private cache: { value: CompanySettings; at: number } | null = null;

  constructor(@Inject(DB) private readonly db: Db) {}

  async get(): Promise<CompanySettings> {
    if (this.cache && Date.now() - this.cache.at < 30_000) return this.cache.value;
    const rows = await this.db.companySetting.findMany({ where: { key: { startsWith: PREFIX } } });
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    const shape = companySettingsSchema.shape as Record<
      string,
      { safeParse: (v: unknown) => { success: boolean; data?: unknown } }
    >;
    for (const row of rows) {
      const field = row.key.slice(PREFIX.length);
      const schema = shape[field];
      if (!schema) continue;
      const parsed = schema.safeParse(safeJsonParse(row.value, undefined));
      if (parsed.success) merged[field] = parsed.data;
    }
    const value = merged as CompanySettings;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async update(input: CompanySettingsUpdate): Promise<CompanySettings> {
    for (const [field, value] of Object.entries(input)) {
      if (value === undefined) continue;
      const key = `${PREFIX}${field}`;
      await this.db.companySetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      });
    }
    this.cache = null;
    return this.get();
  }

  /** Grava os valores padrão que ainda não existem (seed). */
  async ensureDefaults(): Promise<number> {
    const existing = new Set(
      (
        await this.db.companySetting.findMany({
          where: { key: { startsWith: PREFIX } },
          select: { key: true },
        })
      ).map((r) => r.key),
    );
    const missing = Object.entries(DEFAULT_SETTINGS).filter(
      ([field]) => !existing.has(`${PREFIX}${field}`),
    );
    for (const [field, value] of missing) {
      await this.db.companySetting.create({
        data: { key: `${PREFIX}${field}`, value: JSON.stringify(value) },
      });
    }
    this.cache = null;
    return missing.length;
  }

  async getRaw(key: string): Promise<string | null> {
    return (await this.db.companySetting.findUnique({ where: { key } }))?.value ?? null;
  }

  async setRaw(key: string, value: string): Promise<void> {
    await this.db.companySetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async thresholds(): Promise<ValidityThresholds> {
    const s = await this.get();
    return { warningDays: s.authorizationWarningDays, criticalDays: s.authorizationCriticalDays };
  }

  async networkRules(): Promise<NetworkRules> {
    const s = await this.get();
    return {
      codeRules: s.networkCodeRules,
      defaultNetworkForNamedStores: s.defaultNetworkForNamedStores,
    };
  }
}
