import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  letterMetaSchema,
  letterQuerySchema,
  letterUpdateSchema,
  type LetterMetaInput,
  type LetterQuery,
  type LetterUpdateInput,
} from '@routeflow/types';
import { loadConfig } from '../../config/env';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import type { UploadedFile as UploadedFileType } from '../../common/uploads';
import { AuthorizationsService } from './authorizations.service';

const pdfUpload = () =>
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: loadConfig().files.maxPdfBytes, files: 1 },
  });

@Controller()
export class AuthorizationsController {
  constructor(private readonly letters: AuthorizationsService) {}

  @Get('authorizations')
  list(@Query(new ZodPipe(letterQuerySchema)) query: LetterQuery) {
    return this.letters.list(query);
  }

  @Get('stores/:storeId/authorizations')
  listByStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.letters.list({ storeId });
  }

  /** Carta cobrindo várias lojas (ex.: carta trimestral da rede). */
  @Post('authorizations')
  @UseInterceptors(pdfUpload())
  createMany(
    @Body(new ZodPipe(letterMetaSchema)) body: LetterMetaInput,
    @UploadedFile() file: UploadedFileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.letters.create(body, file, user);
  }

  @Post('stores/:storeId/authorizations')
  @UseInterceptors(pdfUpload())
  create(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(new ZodPipe(letterMetaSchema)) body: LetterMetaInput,
    @UploadedFile() file: UploadedFileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.letters.create(body, file, user, storeId);
  }

  @Get('authorizations/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.letters.get(id);
  }

  @Patch('authorizations/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(letterUpdateSchema)) body: LetterUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.letters.update(id, body, user);
  }

  @Post('authorizations/:id/file')
  @UseInterceptors(pdfUpload())
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.letters.replaceFile(id, file, user);
  }

  /** Exclusão lógica (qualquer perfil): o histórico e o arquivo ficam para auditoria. */
  @Delete('authorizations/:id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.letters.remove(id, user);
  }

  /** Tira uma loja da carta; se for a última, a carta é excluída (logicamente). */
  @Delete('authorizations/:id/stores/:storeId')
  removeStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.letters.removeStore(id, storeId, user);
  }

  @Get('authorizations/:id/history')
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.letters.history(id);
  }
}

@Global()
@Module({
  providers: [AuthorizationsService],
  controllers: [AuthorizationsController],
  exports: [AuthorizationsService],
})
export class AuthorizationsModule {}
