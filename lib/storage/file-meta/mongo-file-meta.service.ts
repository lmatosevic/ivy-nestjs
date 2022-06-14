import { Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileMetadata, FileMetaService, FilePropsMeta } from './file-meta.service';
import { FileMeta } from '../schema';
import { FILE_PROPS_KEY } from '../../storage';

@Injectable()
export class MongoFileMetaService implements FileMetaService {
  private readonly logger: Logger = new Logger(MongoFileMetaService.name);

  constructor(@InjectModel(FileMeta.name) protected fileMetaModel: Model<FileMeta>) {}

  async find(name: string): Promise<FileMetadata> {
    try {
      return await this.fileMetaModel.findOne({ name }).exec();
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
    const meta = await this.find(name) as FileMeta;

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
      const metadata = await this.fileMetaModel.findOne({ name }).exec();
      await metadata.remove();
    } catch (e) {
      this.logger.error('Error deleting file metadata "%s", %j', name, e);
      return false;
    }
    return true;
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

  async filesResource(meta: FileMetadata): Promise<any> {
    const model = this.fileMetaModel?.db?.models?.[meta?.resource];
    try {
      return await model.findOne({ _id: meta.resourceId }).exec();
    } catch (e) {
      this.logger.error('Error finding file\'s resource model "%s", %j', meta.resource, e);
      return null;
    }
  }

  modelFields(model: any): string[] {
    return Object.keys(model?.toObject() || {});
  }

  modelName(model: any): string {
    return model?.constructor?.modelName;
  }
}
