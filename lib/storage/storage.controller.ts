import { Controller, Get, Header, Headers, HttpStatus, Inject, Param, Response, StreamableFile } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express';
import { AuthUser } from '../auth';
import { ReflectionUtil } from '../utils';
import { Authorized, CurrentUser } from '../auth/decorators';
import { FileManager } from './file-manager';
import { FileError } from './errors';
import { StorageModuleOptions } from './storage.module';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';

@ApiTags('Files')
@Controller('files')
export class StorageController {
  private readonly cacheDuration;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    private configService: ConfigService,
    private readonly fileManager: FileManager
  ) {
    const filesRoute = storageModuleOptions.filesRoute ?? configService.get('storage.filesRoute');
    const filesAccess = storageModuleOptions.filesAccess ?? configService.get('storage.filesAccess');

    if (filesRoute) {
      Reflect.defineMetadata('path', filesRoute, StorageController);
    }
    if (['public', 'none'].includes(filesAccess)) {
      ReflectionUtil.deleteResourceOperation(StorageController.prototype, 'protectedFile');
    }
    if (['protected', 'none'].includes(filesAccess)) {
      ReflectionUtil.deleteResourceOperation(StorageController.prototype, 'publicFile');
    }
    this.cacheDuration = this.storageModuleOptions.cacheDuration ?? configService.get('storage.cacheDuration') ?? 86400;
  }

  @ApiOkResponse({ description: 'Binary file content' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @Header('Accept-Ranges', 'bytes')
  @Get('/public/:name(*)?')
  async publicFile(
    @Param('name') name: string,
    @Headers('Range') range: string,
    @Response({ passthrough: true }) res: ExpressResponse
  ): Promise<StreamableFile> {
    return await this.validateAndMakeFileStream(name, res, range);
  }

  @Authorized()
  @ApiOkResponse({ description: 'Binary file content' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @Header('Accept-Ranges', 'bytes')
  @Get('/protected/:name(*)?')
  async protectedFile(
    @Param('name') name: string,
    @Headers('Range') range: string,
    @Response({ passthrough: true }) res: ExpressResponse,
    @CurrentUser() user: AuthUser
  ): Promise<StreamableFile> {
    return await this.validateAndMakeFileStream(name, res, range, user);
  }

  private async validateAndMakeFileStream(
    name: string,
    res: ExpressResponse,
    range?: string,
    user?: AuthUser
  ): Promise<StreamableFile> {
    const { allowed, meta } = await this.fileManager.checkFileAccess(name, user);
    if (!allowed) {
      if (meta && user) {
        throw new FileError(`File access forbidden`, 403);
      } else {
        throw new FileError(`File not found: ${name}`, 404);
      }
    }

    const headers = {};
    let stream;
    let code;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : undefined;
      stream = await this.fileManager.streamFile(name, start, end);
      if (end === undefined || end >= stream.options.length || end >= meta.size) {
        end = (stream.options.length ?? meta.size) - 1;
      }
      headers['Content-Length'] = end - start + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${stream.options.length ?? meta.size}`;
      code = HttpStatus.PARTIAL_CONTENT;
    } else {
      stream = await this.fileManager.streamFile(name);
      headers['Content-Length'] = stream.options.length ?? meta.size;
      code = HttpStatus.OK;
    }

    if (!stream) {
      throw new FileError(`File not found: ${name}`, 404);
    }

    res.status(code);
    res.set({
      ...headers,
      'Content-Type': meta?.mimeType || 'application/octet-stream',
      'Content-Disposition': 'inline; filename="' + name + '"',
      Pragma: 'public',
      'Cache-Control': `public, max-age=${this.cacheDuration}`,
      Expires: new Date(Date.now() + this.cacheDuration).toUTCString()
    });

    return stream;
  }
}
