import { Body, Controller, Get, HttpCode, Inject, Module, Post, Req, Res } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { loginSchema, type LoginInput } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { CurrentUser, Public } from '../../common/decorators';
import { requestMeta, type AppRequest, type AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AuthService, toUserDto, type SessionResult } from './auth.service';

export const REFRESH_COOKIE = 'rf_rt';
/** Cookie NÃO sensível (sem token) que só indica ao frontend que existe sessão a renovar. */
export const SESSION_HINT_COOKIE = 'rf_session';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Db,
  ) {}

  private setCookie(res: Response, session: SessionResult): void {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.config.isProduction || this.config.trustProxy,
      sameSite: 'strict',
      path: '/api/auth',
      expires: session.refreshExpiresAt,
    });
    res.cookie(SESSION_HINT_COOKIE, '1', {
      httpOnly: false,
      secure: this.config.isProduction || this.config.trustProxy,
      sameSite: 'strict',
      path: '/',
      expires: session.refreshExpiresAt,
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.clearCookie(SESSION_HINT_COOKIE, { path: '/' });
  }

  private body(session: SessionResult) {
    return { accessToken: session.accessToken, expiresIn: session.expiresIn, user: session.user };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodPipe(loginSchema)) body: LoginInput,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(body.email, body.password, requestMeta(req));
    this.setCookie(res, session);
    return this.body(session);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response) {
    try {
      const session = await this.auth.refresh(
        req.cookies?.[REFRESH_COOKIE] as string | undefined,
        requestMeta(req),
      );
      this.setCookie(res, session);
      return this.body(session);
    } catch (error) {
      this.clearCookies(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined, requestMeta(req));
    this.clearCookies(res);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return toUserDto(await this.db.user.findUniqueOrThrow({ where: { id: user.id } }));
  }
}

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.auth.jwtSecret,
        signOptions: { expiresIn: config.auth.accessTtlSeconds, issuer: 'routeflow' },
        verifyOptions: { issuer: 'routeflow' },
      }),
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
