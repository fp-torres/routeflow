import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  quickAddCommitSchema,
  storeCreateSchema,
  storeQuerySchema,
  storeUpdateSchema,
  type QuickAddCommitInput,
  type StoreCreateInput,
  type StoreQuery,
  type StoreUpdateInput,
} from '@routeflow/types';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { GeocodingService } from '../geocoding/geocoding.service';
import { StoresService } from './stores.service';

const quickAddPreviewSchema = z.object({
  text: z.string().max(50_000),
  region: z.string().trim().max(80).nullable().optional(),
});

@Controller('stores')
export class StoresController {
  constructor(
    private readonly stores: StoresService,
    private readonly geocoding: GeocodingService,
  ) {}

  @Get()
  list(@Query(new ZodPipe(storeQuerySchema)) query: StoreQuery) {
    return this.stores.list(query);
  }

  @Get('catalog')
  catalog() {
    return this.stores.catalog();
  }

  @Post('quick-add/preview')
  @HttpCode(200)
  preview(@Body(new ZodPipe(quickAddPreviewSchema)) body: z.infer<typeof quickAddPreviewSchema>) {
    return this.stores.quickAddPreview(body.text, body.region ?? null);
  }

  @Post('quick-add')
  quickAdd(
    @Body(new ZodPipe(quickAddCommitSchema)) body: QuickAddCommitInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stores.quickAddCommit(body, user);
  }

  /** Inicia a geocodificação (em segundo plano) das lojas sem coordenadas. */
  @Post('geocode')
  @Roles('ADMIN')
  @HttpCode(202)
  geocodeAll() {
    return { ...this.geocoding.startBackgroundGeocoding(), provider: this.geocoding.describe() };
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.stores.get(id);
  }

  @Post()
  create(
    @Body(new ZodPipe(storeCreateSchema)) body: StoreCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stores.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(storeUpdateSchema)) body: StoreUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stores.update(id, body, user);
  }

  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(204)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.stores.deactivate(id, user);
  }

  @Post(':id/geocode')
  @HttpCode(200)
  async geocodeOne(@Param('id', ParseUUIDPipe) id: string) {
    const updated = await this.geocoding.geocodeStore(id);
    return { updated, store: await this.stores.get(id) };
  }
}

@Module({
  imports: [GeocodingModule],
  providers: [StoresService],
  controllers: [StoresController],
  exports: [StoresService],
})
export class StoresModule {}
