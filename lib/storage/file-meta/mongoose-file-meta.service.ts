import { ClientSession, Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileMetadata, FileMetaService, FilePropsMeta } from './file-meta.service';
import { ObjectUtil } from '../../utils';
import { FileMeta } from '../schema';
import { FILE_PROPS_KEY, FileProps } from '../../storage';

@Injectable()
export class MongooseFileMetaService implements FileMetaService {
  private readonly logger: Logger = new Logger(MongooseFileMetaService.name);
  protected session?: ClientSession;

  constructor(@InjectModel(FileMeta.name) protected fileMetaModel: Model<FileMeta>) {}

  useWith(sessionManager: ClientSession): FileMetaService {
    const managedService = ObjectUtil.duplicate<MongooseFileMetaService>(this);

    managedService.setFileMetaModel(this.fileMetaModel);
    managedService.setSession(sessionManager);

    return managedService;
  }

  async find(name: string): Promise<FileMetadata> {
    try {
      return await this.fileMetaModel.findOne({ name }).session(this.session).exec();
    } catch (e) {
      this.logger.error('Error finding file metadata "%s", %j', name, e);
      return null;
    }
  }

  async save(meta: FileMetadata): Promise<string> {
    const model = new this.fileMetaModel(meta);

    try {
      const savedModel = await model.save();
      return savedModel._id;
    } catch (e) {
      this.logger.error('Error saving file metadata "%s", %j', meta.name, e);
      throw e;
    }
  }

  async update(name: string, metadata: Partial<FileMetadata>): Promise<boolean> {
    const meta = (await this.find(name)) as FileMeta;

    try {
      meta.set(metadata);
      await meta.save();
      return true;
    } catch (e) {
      this.logger.error('Error updating file metadata "%s", %j', meta.name, e);
      throw e;
    }
  }

  async delete(name: string): Promise<boolean> {
    try {
      const metadata = await this.fileMetaModel.findOne({ name }).session(this.session).exec();
      await metadata.deleteOne();
    } catch (e) {
      this.logger.error('Error deleting file metadata "%s", %j', name, e);
      return false;
    }
    return true;
  }

  async filesResource(meta: FileMetadata): Promise<any> {
    const model = this.fileMetaModel?.db?.models?.[meta?.resource];
    try {
      return await model.findOne({ _id: meta.resourceId }).session(this.session).exec();
    } catch (e) {
      this.logger.error('Error finding file\'s resource model "%s", %j', meta.resource, e);
      return null;
    }
  }

  async filePropsMeta(name: string): Promise<FilePropsMeta> {
    const meta = await this.find(name);

    if (!meta) {
      return { props: null, meta: null };
    }

    for (const [modelName, model] of Object.entries(this.fileMetaModel?.db?.models)) {
      if (modelName === meta.resource) {
        const props = Reflect.getMetadata(FILE_PROPS_KEY, model.schema['classRef']?.prototype);
        if (props && props[meta.field]) {
          return { props: props[meta.field], meta };
        }
      }
    }

    return { props: null, meta };
  }

  fileProps(meta: FileMetadata): Promise<FileProps> {
    for (const [modelName, model] of Object.entries(this.fileMetaModel?.db?.models)) {
      if (modelName === meta.resource) {
        const props = Reflect.getMetadata(FILE_PROPS_KEY, model.schema['classRef']?.prototype);
        if (props && props[meta.field]) {
          return props[meta.field];
        }
      }
    }
    return null;
  }

  modelFields(model: any): string[] {
    return Object.keys(model?.toObject() || {});
  }

  modelName(model: any): string {
    let modelName = model?.constructor?.modelName;
    if (!modelName || modelName === 'EmbeddedDocument') {
      modelName = model?.schema?.['classRef']?.name;
    }
    return modelName;
  }

  private setFileMetaModel(model: Model<FileMeta>): void {
    this.fileMetaModel = model;
  }

  private setSession(session: ClientSession): void {
    this.session = session;
  }
}
