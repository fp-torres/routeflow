import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  DEFAULT_CITY,
  DEFAULT_STATE,
  fullAddressForMaps,
  isoToUtcDate,
  normalizeAddressForGeocoding,
  todayIso,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';

export interface GeocodeInput {
  address: string;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  source: 'nominatim' | 'google';
}

/** OK | NOT_FOUND (endereço não localizado) | ERROR (falha do serviço) | MANUAL (informado à mão) */
export type GeocodeStatus = 'OK' | 'NOT_FOUND' | 'ERROR' | 'MANUAL';

interface Viewbox {
  west: number;
  north: number;
  east: number;
  south: number;
}

const RETRY_FAILED_AFTER_MS = 7 * 24 * 3600 * 1000;

function parseViewbox(value: string | null): Viewbox | null {
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [x1, y1, x2, y2] = parts as [number, number, number, number];
  return {
    west: Math.min(x1, x2),
    east: Math.max(x1, x2),
    north: Math.max(y1, y2),
    south: Math.min(y1, y2),
  };
}

/**
 * Geocodificação AUTOMÁTICA de lojas e endereços de casa (latitude/longitude):
 *  - nominatim (padrão): OpenStreetMap, gratuito, 1 consulta por segundo (política de uso);
 *  - google: Geocoding API (GOOGLE_MAPS_API_KEY);
 *  - none: desativado.
 * Roda sozinha alguns segundos após a API iniciar e a cada 6 horas, só para o que está sem
 * coordenadas (endereços não localizados são tentados de novo após 7 dias). A busca fica
 * restrita à área configurada (padrão: município do Rio). Nunca inventa coordenadas.
 */
@Injectable()
export class GeocodingService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Geocoding');
  private lastNominatimCall = 0;
  private running = false;
  private readonly viewbox: Viewbox | null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Db,
  ) {
    this.viewbox = parseViewbox(config.geocoding.viewbox);
  }

  onApplicationBootstrap(): void {
    if (this.config.env === 'test' || !this.isConfigured()) return;
    setTimeout(() => void this.autoGeocode(), 15_000).unref();
  }

  @Cron('0 */6 * * *', { name: 'routeflow-geocoding' })
  async scheduled(): Promise<void> {
    if (this.config.env !== 'test' && this.isConfigured()) await this.autoGeocode();
  }

  isConfigured(): boolean {
    const { provider, googleApiKey } = this.config.geocoding;
    return provider === 'nominatim' || (provider === 'google' && !!googleApiKey);
  }

  describe(): { provider: string; configured: boolean; description: string } {
    const configured = this.isConfigured();
    const area = this.viewbox
      ? ' Busca limitada à área configurada (padrão: município do Rio).'
      : '';
    const descriptions: Record<string, string> = {
      none: 'Desativada. Configure GEOCODING_PROVIDER=nominatim (gratuito) ou google.',
      nominatim: `Automática via OpenStreetMap (gratuito, 1 consulta por segundo).${area}`,
      google: configured
        ? `Automática via Google Geocoding API.${area}`
        : 'Google selecionado, mas GOOGLE_MAPS_API_KEY não foi informada.',
    };
    return {
      provider: this.config.geocoding.provider,
      configured,
      description: descriptions[this.config.geocoding.provider]!,
    };
  }

  get isRunning(): boolean {
    return this.running;
  }

  private inside(lat: number, lng: number): boolean {
    const v = this.viewbox;
    return !v || (lat <= v.north && lat >= v.south && lng >= v.west && lng <= v.east);
  }

  /** Lança erro em falhas do serviço; retorna null quando o endereço não é encontrado. */
  private async lookup(input: GeocodeInput): Promise<GeocodeResult | null> {
    const result =
      this.config.geocoding.provider === 'google'
        ? await this.google(input)
        : await this.nominatim(input);
    if (result && !this.inside(result.latitude, result.longitude)) return null;
    return result;
  }

  async geocode(input: GeocodeInput): Promise<GeocodeResult | null> {
    if (!this.isConfigured()) return null;
    try {
      return await this.lookup(input);
    } catch (error) {
      this.logger.warn(`Falha ao geocodificar "${input.address}": ${String(error)}`);
      return null;
    }
  }

  private async nominatimThrottle(): Promise<void> {
    const wait = this.lastNominatimCall + 1100 - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastNominatimCall = Date.now();
  }

  private async nominatim(input: GeocodeInput): Promise<GeocodeResult | null> {
    const base = this.config.geocoding.nominatimBaseUrl;
    const headers = {
      'User-Agent': `RouteFlow/1.0 (${this.config.appUrl}${this.config.geocoding.nominatimEmail ? `; ${this.config.geocoding.nominatimEmail}` : ''})`,
      'Accept-Language': 'pt-BR',
    };
    const street = normalizeAddressForGeocoding(input.address);
    const city = input.city || DEFAULT_CITY;
    const state = input.state || DEFAULT_STATE;
    const common = { format: 'jsonv2', limit: '1', countrycodes: 'br' };
    const attempts = [
      new URLSearchParams({ ...common, street, city, state, country: 'Brasil' }),
      new URLSearchParams({
        ...common,
        q: fullAddressForMaps({ ...input, address: street }, true),
      }),
      // último recurso: só o logradouro (endereços sem número — localização aproximada da rua)
      new URLSearchParams({
        ...common,
        street: street.replace(/,?\s*\d+.*$/, ''),
        city,
        state,
        country: 'Brasil',
      }),
    ];
    for (const params of attempts) {
      if (this.viewbox) {
        const v = this.viewbox;
        params.set('viewbox', `${v.west},${v.north},${v.east},${v.south}`);
        params.set('bounded', '1');
      }
      if (this.config.geocoding.nominatimEmail)
        params.set('email', this.config.geocoding.nominatimEmail);
      await this.nominatimThrottle();
      const response = await fetch(`${base}/search?${params.toString()}`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
      const body = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (body[0])
        return {
          latitude: Number(body[0].lat),
          longitude: Number(body[0].lon),
          source: 'nominatim',
        };
    }
    return null;
  }

  private async google(input: GeocodeInput): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      address: fullAddressForMaps(input, true),
      region: 'br',
      language: 'pt-BR',
      key: this.config.geocoding.googleApiKey!,
    });
    if (this.viewbox) {
      const v = this.viewbox;
      params.set('bounds', `${v.south},${v.west}|${v.north},${v.east}`);
    }
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`Google Geocoding HTTP ${response.status}`);
    const body = (await response.json()) as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS')
      throw new Error(`Google Geocoding ${body.status}`);
    const location = body.results?.[0]?.geometry.location;
    return location ? { latitude: location.lat, longitude: location.lng, source: 'google' } : null;
  }

  /** Rotas de hoje em diante com a loja voltam a calcular os trechos com a nova localização. */
  async invalidateRoutesForStore(storeId: string): Promise<void> {
    await this.db.route.updateMany({
      where: {
        date: { gte: isoToUtcDate(todayIso(this.config.timeZone)) },
        stops: { some: { storeId } },
      },
      data: { legsComputedAt: null },
    });
  }

  async geocodeStore(storeId: string): Promise<boolean> {
    const store = await this.db.store.findUnique({ where: { id: storeId } });
    if (!store || !this.isConfigured()) return false;
    let result: GeocodeResult | null = null;
    let status: GeocodeStatus = 'NOT_FOUND';
    try {
      result = await this.lookup(store);
      status = result ? 'OK' : 'NOT_FOUND';
    } catch (error) {
      status = 'ERROR';
      this.logger.warn(`Falha ao geocodificar ${store.code}: ${String(error)}`);
    }
    const now = new Date();
    await this.db.store.update({
      where: { id: storeId },
      data: result
        ? {
            latitude: result.latitude,
            longitude: result.longitude,
            geocodeSource: result.source,
            geocodedAt: now,
            geocodeStatus: 'OK',
            geocodeAttemptedAt: now,
          }
        : { geocodeStatus: status, geocodeAttemptedAt: now },
    });
    if (result) await this.invalidateRoutesForStore(storeId);
    return !!result;
  }

  /** Endereços de casa sem coordenadas (origem/destino das rotas). */
  async geocodeMissingHomes(): Promise<number> {
    const homes = await this.db.homeAddress.findMany({ where: { active: true, latitude: null } });
    let updated = 0;
    for (const home of homes) {
      const result = await this.geocode({ address: home.address });
      if (!result) continue;
      await this.db.homeAddress.update({
        where: { id: home.id },
        data: { latitude: result.latitude, longitude: result.longitude },
      });
      await this.db.route.updateMany({
        where: {
          employeeId: home.employeeId,
          date: { gte: isoToUtcDate(todayIso(this.config.timeZone)) },
          startAddress: home.address,
        },
        data: {
          startLatitude: result.latitude,
          startLongitude: result.longitude,
          legsComputedAt: null,
        },
      });
      updated += 1;
    }
    return updated;
  }

  /**
   * Geocodifica lojas sem coordenadas (sequencial, respeitando o limite do provedor).
   * No modo automático, endereços que falharam recentemente só são tentados após 7 dias.
   */
  async geocodeMissingStores(
    onProgress?: (message: string) => void,
    options: { auto?: boolean } = {},
  ): Promise<{ processed: number; updated: number; failed: string[] }> {
    if (this.running || !this.isConfigured()) return { processed: 0, updated: 0, failed: [] };
    this.running = true;
    const failed: string[] = [];
    let updated = 0;
    try {
      const retryBefore = new Date(Date.now() - RETRY_FAILED_AFTER_MS);
      const stores = await this.db.store.findMany({
        where: {
          active: true,
          OR: [{ latitude: null }, { longitude: null }],
          ...(options.auto
            ? {
                AND: [
                  {
                    OR: [{ geocodeAttemptedAt: null }, { geocodeAttemptedAt: { lt: retryBefore } }],
                  },
                ],
              }
            : {}),
        },
        orderBy: { code: 'asc' },
      });
      for (const store of stores) {
        const ok = await this.geocodeStore(store.id);
        if (ok) updated += 1;
        else failed.push(`${store.code} — ${store.address}`);
        onProgress?.(`${ok ? '✔' : '✖'} ${store.code} ${store.address}`);
      }
      return { processed: stores.length, updated, failed };
    } finally {
      this.running = false;
    }
  }

  async autoGeocode(): Promise<void> {
    try {
      const homes = await this.geocodeMissingHomes();
      const result = await this.geocodeMissingStores(undefined, { auto: true });
      if (result.processed || homes) {
        this.logger.log(
          `Geocodificação automática: ${result.updated}/${result.processed} loja(s) e ${homes} endereço(s) de casa localizados.`,
        );
      }
    } catch (error) {
      this.logger.warn(`Geocodificação automática interrompida: ${String(error)}`);
    }
  }

  startBackgroundGeocoding(): { started: boolean } {
    if (this.running || !this.isConfigured()) return { started: false };
    void this.geocodeMissingHomes()
      .then(() => this.geocodeMissingStores())
      .then((result) =>
        this.logger.log(
          `Geocodificação concluída: ${result.updated}/${result.processed} lojas atualizadas.`,
        ),
      );
    return { started: true };
  }
}
