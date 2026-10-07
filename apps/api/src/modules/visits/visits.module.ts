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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  photoUploadMetaSchema,
  visitActivitySchema,
  visitCreateSchema,
  visitFinishSchema,
  visitQuerySchema,
  visitRescheduleSchema,
  visitStartSchema,
  visitUpdateSchema,
  type PhotoUploadMeta,
  type VisitActivityInput,
  type VisitCreateInput,
  type VisitFinishInput,
  type VisitQuery,
  type VisitRescheduleInput,
  type VisitStartInput,
  type VisitUpdateInput,
} from '@routeflow/types';
import { loadConfig } from '../../config/env';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import type { UploadedFile } from '../../common/uploads';
import { ZodPipe } from '../../common/zod.pipe';
import { RoutesModule } from '../routes/routes.module';
import { PhotosService } from './photos.service';
import { VisitsService } from './visits.service';

@Controller('visits')
export class VisitsController {
  constructor(
    private readonly visits: VisitsService,
    private readonly photos: PhotosService,
  ) {}

  @Get()
  list(@Query(new ZodPipe(visitQuerySchema)) query: VisitQuery, @CurrentUser() user: AuthUser) {
    return this.visits.list(query, user);
  }

  @Post()
  create(
    @Body(new ZodPipe(visitCreateSchema)) body: VisitCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visits.create(body, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.visits.detail(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(visitUpdateSchema)) body: VisitUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visits.update(id, body, user);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(visitStartSchema)) body: VisitStartInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visits.start(id, body, user);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(visitFinishSchema)) body: VisitFinishInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visits.finish(id, body, user);
  }

  @Post(':id/activities')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(visitActivitySchema)) body: VisitActivityInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visits.addActivity(id, body, user);
  }

  @Post(':id/reschedule')
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(visitRescheduleSchema)) body: VisitRescheduleInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visits.reschedule(id, body, user);
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: loadConfig().files.maxPhotoBytes, files: 10 },
    }),
  )
  uploadPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: UploadedFile[],
    @Body(new ZodPipe(photoUploadMetaSchema)) body: PhotoUploadMeta,
    @CurrentUser() user: AuthUser,
  ) {
    return this.photos.upload(id, files, body, user);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  async removePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.photos.remove(id, photoId, user);
  }
}

@Module({
  imports: [RoutesModule],
  providers: [VisitsService, PhotosService],
  controllers: [VisitsController],
  exports: [VisitsService],
})
export class VisitsModule {}
