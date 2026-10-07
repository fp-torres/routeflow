import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  Inject,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { fareSchema, type FareInput, type ProvidersInfoDto } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { GeocodingService } from '../geocoding/geocoding.service';
import { FaresService } from './fares.service';
import { EstimateRouteProvider, GoogleRoutesProvider } from './providers';
import type { LegPoint, LegResult, RouteProvider } from './route-provider';

@Injectable()
export class TransportService {
  readonly provider: RouteProvider;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly fares: FaresService,
  ) {
    const estimate = new EstimateRouteProvider(fares);
    this.provider =
      config.routing.provider === 'google'
        ? new GoogleRoutesProvider(config.routing.googleApiKey, fares, estimate)
        : estimate;
  }

  describe(): ProvidersInfoDto['route'] {
    if (this.config.routing.provider === 'google') {
      return this.provider.isConfigured()
        ? {
            provider: 'google',
            configured: true,
            description:
              'Google Routes API — transporte público real (ônibus, metrô, trem e caminhada).',
          }
        : {
            provider: 'google',
            configured: false,
            description:
              'Google selecionado, mas GOOGLE_MAPS_API_KEY não foi informada. Usando estimativa local.',
          };
    }
    return {
      provider: 'estimate',
      configured: true,
      description:
        'Estimativa local (distância em linha reta × fator urbano + tarifas cadastradas). Configure ROUTE_PROVIDER=google para trajetos reais.',
    };
  }

  computeLeg(from: LegPoint, to: LegPoint, date: string): Promise<LegResult> {
    return this.provider.computeLeg(from, to, date);
  }
}

@Controller('transport')
export class TransportController {
  constructor(
    private readonly fares: FaresService,
    private readonly transport: TransportService,
    private readonly geocoding: GeocodingService,
    private readonly audit: AuditService,
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('fares')
  list() {
    return this.fares.list();
  }

  @Post('fares')
  @Roles('ADMIN')
  async create(@Body(new ZodPipe(fareSchema)) body: FareInput, @CurrentUser() user: AuthUser) {
    const fare = await this.fares.create(body);
    void this.audit.log({
      userId: user.id,
      entity: 'transport_fare',
      entityId: fare.id,
      action: 'fare.create',
      metadata: body,
    });
    return fare;
  }

  @Patch('fares/:id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(fareSchema)) body: FareInput,
    @CurrentUser() user: AuthUser,
  ) {
    const fare = await this.fares.update(id, body);
    void this.audit.log({
      userId: user.id,
      entity: 'transport_fare',
      entityId: id,
      action: 'fare.update',
      metadata: body,
    });
    return fare;
  }

  @Delete('fares/:id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.fares.remove(id);
    void this.audit.log({
      userId: user.id,
      entity: 'transport_fare',
      entityId: id,
      action: 'fare.delete',
    });
  }

  @Get('providers')
  async providers(@CurrentUser() user: AuthUser): Promise<ProvidersInfoDto> {
    const [storesWithoutCoordinates, home] = await Promise.all([
      this.db.store.count({
        where: { active: true, OR: [{ latitude: null }, { longitude: null }] },
      }),
      this.db.homeAddress.findFirst({ where: { employeeId: user.id, active: true } }),
    ]);
    return {
      route: this.transport.describe(),
      geocoding: this.geocoding.describe(),
      storage: { driver: this.config.storage.driver },
      storesWithoutCoordinates,
      homeHasCoordinates: home?.latitude != null && home?.longitude != null,
    };
  }
}

@Global()
@Module({
  imports: [GeocodingModule],
  providers: [FaresService, TransportService],
  controllers: [TransportController],
  exports: [FaresService, TransportService],
})
export class TransportModule {}
