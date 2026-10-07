import { Body, Controller, Get, HttpCode, Inject, Module, Patch, Post, Req } from '@nestjs/common';
import {
  changePasswordSchema,
  profileUpdateSchema,
  type ChangePasswordInput,
  type ProfileUpdateInput,
} from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { CurrentUser, Roles } from '../../common/decorators';
import { requestMeta, type AppRequest, type AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { AuthModule, REFRESH_COOKIE } from '../auth/auth.module';
import { AuthService, toUserDto } from '../auth/auth.service';
import { sha256 } from '../auth/password';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('MANAGER')
  async list() {
    const users = await this.db.user.findMany({ orderBy: { name: 'asc' } });
    return users.map(toUserDto);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return toUserDto(await this.db.user.findUniqueOrThrow({ where: { id: user.id } }));
  }

  @Patch('me')
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(profileUpdateSchema)) body: ProfileUpdateInput,
  ) {
    const updated = await this.db.user.update({
      where: { id: user.id },
      data: { name: body.name },
    });
    void this.audit.log({
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      action: 'user.update_profile',
    });
    return toUserDto(updated);
  }

  @Post('me/password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Req() req: AppRequest,
  ) {
    const current = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.auth.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
      current ? sha256(current) : undefined,
    );
    void this.audit.log({
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      action: 'user.change_password',
      ...requestMeta(req),
    });
  }
}

@Module({ imports: [AuthModule], controllers: [UsersController] })
export class UsersModule {}
