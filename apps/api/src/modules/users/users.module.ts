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
  Delete,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
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
import { StorageService } from '../storage/storage.service';
import { detectImageKind, type UploadedFile as UploadedFileType } from '../../common/uploads';

const AVATAR_SIZE = 384;

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
    private readonly storage: StorageService,
  ) {}

  @Get()
  @Roles('MANAGER')
  async list() {
    const users = await this.db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
    return users.map((u) => toUserDto(u, this.auth.signAvatar));
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return toUserDto(
      await this.db.user.findUniqueOrThrow({ where: { id: user.id } }),
      this.auth.signAvatar,
    );
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
    return toUserDto(updated, this.auth.signAvatar);
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

  /**
   * Foto de perfil: valida o tipo real do arquivo, corrige a orientação, recorta em quadrado
   * priorizando a área de interesse (rosto), reduz para 384×384, converte para WebP e remove
   * metadados (inclusive GPS). A foto anterior é apagada.
   */
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: UploadedFileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Selecione uma imagem.');
    if (!detectImageKind(file.buffer)) {
      throw new UnsupportedMediaTypeException('Envie uma imagem JPG, PNG, WebP ou AVIF.');
    }
    let optimized: Buffer;
    try {
      optimized = await sharp(file.buffer, { failOn: 'none', limitInputPixels: 100_000_000 })
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: sharp.strategy.attention })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new UnsupportedMediaTypeException(
        'Não foi possível ler esta imagem. Tente outra foto (JPG ou PNG).',
      );
    }
    const key = `avatars/${user.id}/${randomUUID()}.webp`;
    await this.storage.put(key, optimized);
    const previous = await this.db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatarKey: true },
    });
    const updated = await this.db.user.update({
      where: { id: user.id },
      data: { avatarKey: key, avatarUpdatedAt: new Date() },
    });
    if (previous.avatarKey) await this.storage.delete(previous.avatarKey).catch(() => undefined);
    void this.audit.log({
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      action: 'user.avatar_update',
      metadata: { originalSize: file.size, optimizedSize: optimized.length },
    });
    return toUserDto(updated, this.auth.signAvatar);
  }

  @Delete('me/avatar')
  async removeAvatar(@CurrentUser() user: AuthUser) {
    const previous = await this.db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatarKey: true },
    });
    const updated = await this.db.user.update({
      where: { id: user.id },
      data: { avatarKey: null, avatarUpdatedAt: new Date() },
    });
    if (previous.avatarKey) await this.storage.delete(previous.avatarKey).catch(() => undefined);
    void this.audit.log({
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      action: 'user.avatar_remove',
    });
    return toUserDto(updated, this.auth.signAvatar);
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
    return toUserDto(created, this.auth.signAvatar);
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
    if (body.email && body.email !== target.email) {
      const taken = await this.db.user.findUnique({
        where: { email: body.email },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Já existe um usuário com este e-mail.');
    }
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
        ...(body.email !== undefined ? { email: body.email } : {}),
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
    return toUserDto(updated, this.auth.signAvatar);
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
