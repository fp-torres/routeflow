import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_CITY,
  DEFAULT_STATE,
  fullAddressForMaps,
  normalizeAddressForGeocoding,
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

/**
 * Geocodificação de endereços (latitude/longitude).
 *  - nominatim: OpenStreetMap, gratuito, máx. 1 requisição/s (política de uso);
 *  - google: Geocoding API (exige GOOGLE_MAPS_API_KEY);
 *  - none: desativado (coordenadas manuais).
 * Nunca simula resultado: se não estiver configurado, retorna null.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger('Geocoding');
  private lastNominatimCall = 0;
  private running = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Db,
  ) {}

  isConfigured(): boolean {
    const { provider, googleApiKey } = this.config.geocoding;
    return provider === 'nominatim' || (provider === 'google' && !!googleApiKey);
  }

  describe(): { provider: string; configured: boolean; description: string } {
    const configured = this.isConfigured();
    const descriptions: Record<string, string> = {
      none: 'Desativada. Informe latitude/longitude manualmente ou configure GEOCODING_PROVIDER.',
      nominatim: 'OpenStreetMap Nominatim (gratuito, 1 consulta por segundo).',
      google: configured
        ? 'Google Geocoding API.'
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

  async geocode(input: GeocodeInput): Promise<GeocodeResult | null> {
    if (!this.isConfigured()) return null;
    try {
      return this.config.geocoding.provider === 'google'
        ? await this.google(input)
        : await this.nominatim(input);
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
    const attempts = [
      new URLSearchParams({
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'br',
        street: normalizeAddressForGeocoding(input.address),
        city: input.city || DEFAULT_CITY,
        state: input.state || DEFAULT_STATE,
        country: 'Brasil',
      }),
      new URLSearchParams({
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'br',
        q: fullAddressForMaps(
          { ...input, address: normalizeAddressForGeocoding(input.address) },
          true,
        ),
      }),
    ];
    if (this.config.geocoding.nominatimEmail)
      attempts.forEach((params) => params.set('email', this.config.geocoding.nominatimEmail!));
    for (const params of attempts) {
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
    const location = body.results?.[0]?.geometry.location;
    return location ? { latitude: location.lat, longitude: location.lng, source: 'google' } : null;
  }

  async geocodeStore(storeId: string): Promise<boolean> {
    const store = await this.db.store.findUnique({ where: { id: storeId } });
    if (!store) return false;
    const result = await this.geocode(store);
    if (!result) return false;
    await this.db.store.update({
      where: { id: storeId },
      data: {
        latitude: result.latitude,
        longitude: result.longitude,
        geocodeSource: result.source,
        geocodedAt: new Date(),
      },
    });
    return true;
  }

  /** Geocodifica lojas sem coordenadas (sequencial, respeitando o limite do provedor). */
  async geocodeMissingStores(
    onProgress?: (message: string) => void,
  ): Promise<{ processed: number; updated: number; failed: string[] }> {
    if (this.running) return { processed: 0, updated: 0, failed: [] };
    this.running = true;
    const failed: string[] = [];
    let updated = 0;
    try {
      const stores = await this.db.store.findMany({
        where: { active: true, OR: [{ latitude: null }, { longitude: null }] },
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

  startBackgroundGeocoding(): { started: boolean } {
    if (this.running || !this.isConfigured()) return { started: false };
    void this.geocodeMissingStores().then((result) =>
      this.logger.log(
        `Geocodificação concluída: ${result.updated}/${result.processed} lojas atualizadas.`,
      ),
    );
    return { started: true };
  }
}
