import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  changePasswordSchema,
  isoToUtcDate,
  profileUpdateSchema,
  todayIso,
  transferOperationSchema,
  userCreateSchema,
  userPasswordResetSchema,
  userUpdateSchema,
  type ChangePasswordInput,
  type ProfileUpdateInput,
  type TransferOperationInput,
  type UserCreateInput,
  type UserPasswordResetInput,
  type UserUpdateInput,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { CurrentUser, Roles } from '../../common/decorators';
import { requestMeta, type AppRequest, type AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { AuthModule, REFRESH_COOKIE } from '../auth/auth.module';
import { AuthService, toUserDto } from '../auth/auth.service';
import { hashPassword, sha256 } from '../auth/password';

export interface TransferOperationResult {
  routes: number;
  skippedRoutes: number;
  visits: number;
  templates: number;
  templatesKept: boolean;
  homeAddressCopied: boolean;
}

/**
 * Perfil do próprio usuário (todos) e gestão de usuários (somente ADMIN).
 * Papéis: ADMIN (tudo, inclusive usuários e configurações), MANAGER (acompanha toda a
 * operação, relatórios e links públicos) e EMPLOYEE (opera o próprio dia: agenda, rotas,
 * visitas, fotos, despesas, lojas e cartas).
 */
@Controller('users')
export class UsersController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('MANAGER')
  async list() {
    const users = await this.db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
    return users.map(toUserDto);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return toUserDto(await this.db.user.findUniqueOrThrow({ where: { id: user.id } }));
  }

  @Patch('me')
  async updateMe(
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

  @Post()
  @Roles('ADMIN')
  async create(
    @Body(new ZodPipe(userCreateSchema)) body: UserCreateInput,
    @CurrentUser() actor: AuthUser,
  ) {
    const exists = await this.db.user.findUnique({ where: { email: body.email } });
    if (exists) throw new ConflictException('Já existe um usuário com este e-mail.');
    const created = await this.db.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
    });
    void this.audit.log({
      userId: actor.id,
      entity: 'user',
      entityId: created.id,
      action: 'user.create',
      metadata: { email: created.email, role: created.role },
    });
    return toUserDto(created);
  }

  private async revokeSessions(userId: string) {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(userUpdateSchema)) body: UserUpdateInput,
    @CurrentUser() actor: AuthUser,
  ) {
    const target = await this.db.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    const losesAdmin = (body.role !== undefined && body.role !== 'ADMIN') || body.active === false;
    if (id === actor.id && losesAdmin) {
      throw new BadRequestException('Você não pode remover o seu próprio acesso de administrador.');
    }
    if (target.role === 'ADMIN' && target.active && losesAdmin) {
      const others = await this.db.user.count({
        where: { role: 'ADMIN', active: true, id: { not: id } },
      });
      if (others === 0)
        throw new BadRequestException('É preciso manter ao menos um administrador ativo.');
    }
    const updated = await this.db.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    if (body.active === false || (body.role !== undefined && body.role !== target.role))
      await this.revokeSessions(id);
    void this.audit.log({
      userId: actor.id,
      entity: 'user',
      entityId: id,
      action: 'user.update',
      metadata: body,
    });
    return toUserDto(updated);
  }

  @Post(':id/password')
  @Roles('ADMIN')
  @HttpCode(204)
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(userPasswordResetSchema)) body: UserPasswordResetInput,
    @CurrentUser() actor: AuthUser,
  ) {
    const target = await this.db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    await this.db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(body.password) },
    });
    await this.revokeSessions(id);
    void this.audit.log({
      userId: actor.id,
      entity: 'user',
      entityId: id,
      action: 'user.reset_password',
    });
  }

  /**
   * Transfere a programação de um usuário para outro (ex.: a planilha foi importada no
   * administrador e quem visita as lojas é a Maria): rotas e visitas (a partir de hoje,
   * ou todas), roteiros e o endereço de casa. Datas em que o destino já tem rota são mantidas.
   */
  @Post(':id/transfer-operation')
  @Roles('ADMIN')
  async transferOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(transferOperationSchema)) body: TransferOperationInput,
    @CurrentUser() actor: AuthUser,
  ): Promise<TransferOperationResult> {
    if (id === body.fromUserId) throw new BadRequestException('Escolha usuários diferentes.');
    const [from, to] = await Promise.all([
      this.db.user.findUnique({ where: { id: body.fromUserId }, select: { id: true } }),
      this.db.user.findUnique({ where: { id }, select: { id: true, active: true } }),
    ]);
    if (!from || !to) throw new NotFoundException('Usuário não encontrado.');
    if (!to.active) throw new BadRequestException('O usuário de destino está desativado.');
    const minDate = body.includePast ? undefined : isoToUtcDate(todayIso(this.config.timeZone));
    const result = await this.db.$transaction(async (tx) => {
      const routes = await tx.route.findMany({
        where: { employeeId: from.id, ...(minDate ? { date: { gte: minDate } } : {}) },
        select: { id: true, date: true },
      });
      const taken = new Set(
        (
          await tx.route.findMany({
            where: { employeeId: to.id, date: { in: routes.map((r) => r.date) } },
            select: { date: true },
          })
        ).map((r) => r.date.getTime()),
      );
      const movable = routes.filter((r) => !taken.has(r.date.getTime())).map((r) => r.id);
      if (movable.length) {
        await tx.route.updateMany({ where: { id: { in: movable } }, data: { employeeId: to.id } });
      }
      const visits = await tx.visit.updateMany({
        where: {
          employeeId: from.id,
          OR: [
            { routeId: { in: movable } },
            { routeId: null, ...(minDate ? { scheduledDate: { gte: minDate } } : {}) },
          ],
        },
        data: { employeeId: to.id },
      });
      const targetTemplates = await tx.routeTemplate.count({ where: { employeeId: to.id } });
      const templates =
        targetTemplates === 0
          ? await tx.routeTemplate.updateMany({
              where: { employeeId: from.id },
              data: { employeeId: to.id },
            })
          : { count: 0 };
      const [home, targetHome] = await Promise.all([
        tx.homeAddress.findFirst({
          where: { employeeId: from.id, active: true },
          orderBy: { createdAt: 'desc' },
        }),
        tx.homeAddress.findFirst({ where: { employeeId: to.id, active: true } }),
      ]);
      let homeAddressCopied = false;
      if (home && !targetHome) {
        await tx.homeAddress.create({
          data: {
            employeeId: to.id,
            label: home.label,
            address: home.address,
            latitude: home.latitude,
            longitude: home.longitude,
            active: true,
          },
        });
        homeAddressCopied = true;
      }
      return {
        routes: movable.length,
        skippedRoutes: routes.length - movable.length,
        visits: visits.count,
        templates: templates.count,
        templatesKept: targetTemplates > 0,
        homeAddressCopied,
      };
    });
    void this.audit.log({
      userId: actor.id,
      entity: 'user',
      entityId: id,
      action: 'user.transfer_operation',
      metadata: { fromUserId: body.fromUserId, includePast: body.includePast, ...result },
    });
    return result;
  }
}

@Module({ imports: [AuthModule], controllers: [UsersController] })
export class UsersModule {}
