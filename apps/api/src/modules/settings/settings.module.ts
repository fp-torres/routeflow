import { Body, Controller, Get, Global, Module, Patch, Put, Req } from '@nestjs/common';
import {
  companySettingsUpdateSchema,
  homeAddressSchema,
  type CompanySettingsUpdate,
  type HomeAddressInput,
} from '@routeflow/types';
import { CurrentUser, Roles } from '../../common/decorators';
import { requestMeta, type AppRequest, type AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { HomeAddressService } from './home-address.service';
import { SettingsService } from './settings.service';

@Controller()
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly homeAddress: HomeAddressService,
    private readonly audit: AuditService,
  ) {}

  @Get('settings')
  get() {
    return this.settings.get();
  }

  @Patch('settings')
  @Roles('ADMIN')
  async update(
    @Body(new ZodPipe(companySettingsUpdateSchema)) body: CompanySettingsUpdate,
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
  ) {
    const result = await this.settings.update(body);
    void this.audit.log({
      userId: user.id,
      entity: 'settings',
      action: 'settings.update',
      metadata: body,
      ...requestMeta(req),
    });
    return result;
  }

  @Get('me/home-address')
  getHome(@CurrentUser() user: AuthUser) {
    return this.homeAddress.getActive(user.id);
  }

  @Put('me/home-address')
  async setHome(
    @Body(new ZodPipe(homeAddressSchema)) body: HomeAddressInput,
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
  ) {
    const result = await this.homeAddress.set(user.id, body);
    void this.audit.log({
      userId: user.id,
      entity: 'home_address',
      entityId: result.id,
      action: 'home_address.update',
      ...requestMeta(req),
    });
    return result;
  }
}

@Global()
@Module({
  imports: [GeocodingModule],
  providers: [SettingsService, HomeAddressService],
  controllers: [SettingsController],
  exports: [SettingsService, HomeAddressService],
})
export class SettingsModule {}
