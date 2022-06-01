import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Response,
  StreamableFile
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, Authorized } from '../auth';
import { FileManager } from './file-manager';
import { FileError } from './errors';
import { CurrentUser } from '../auth/decorators';
import { StorageModuleOptions } from './storage.module';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';

@ApiTags('files')
@Controller('files')
export class StorageController {
  private readonly cacheDuration;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    private readonly fileManager: FileManager
  ) {
    if (storageModuleOptions.filesRoute) {
      Reflect.defineMetadata('path', storageModuleOptions.filesRoute, StorageController);
    }
    if (['public', 'none'].includes(storageModuleOptions.filesAccess)) {
      const descriptor = Object.getOwnPropertyDescriptor(
        StorageController.prototype,
        'protectedFile'
      );
      Reflect.deleteMetadata('path', descriptor.value);
    }
    if (['protected', 'none'].includes(storageModuleOptions.filesAccess)) {
      const descriptor = Object.getOwnPropertyDescriptor(
        StorageController.prototype,
        'publicFile'
      );
      Reflect.deleteMetadata('path', descriptor.value);
    }
    this.cacheDuration = this.storageModuleOptions.cacheDuration ?? 86400;
  }

  @ApiOkResponse({ description: 'Binary file content' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @Get('/public/:name')
  @HttpCode(200)
  async publicFile(
    @Param('name') name: string,
    @Response({ passthrough: true }) res
  ): Promise<StreamableFile> {
    return await this.validateAndMakeFileStream(name, res);
  }

  @Authorized()
  @ApiOkResponse({ description: 'Binary file content' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @Get('/protected/:name')
  @HttpCode(200)
  async protectedFile(
    @Param('name') name: string,
    @Response({ passthrough: true }) res,
    @CurrentUser() user: AuthUser
  ): Promise<StreamableFile> {
    return await this.validateAndMakeFileStream(name, res, user);
  }

  private async validateAndMakeFileStream(
    name: string,
    res: any,
    user?: AuthUser
  ): Promise<StreamableFile> {
    const { allowed, meta } = await this.fileManager.checkFileAccess(name, user);
    if (!allowed) {
      throw new FileError(`File access forbidden`, 403);
    }

    const stream = await this.fileManager.streamFile(name);
    if (!stream) {
      throw new FileError(`File not found: ${name}`, 404);
    }

    res.set({
      'Content-Type': meta?.mimeType || 'application/octet-stream',
      'Content-Disposition': 'inline; filename="' + name + '"',
      Pragma: 'public',
      'Cache-Control': `public, max-age=${this.cacheDuration}`,
      Expires: new Date(Date.now() + this.cacheDuration).toUTCString()
    });

    return stream;
  }
}
