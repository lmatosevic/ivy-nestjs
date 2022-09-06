import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { FileMetadata, FileMetaService, FilePropsMeta } from './file-meta.service';
import { FileMeta } from '../entity';
import { ObjectUtil } from '../../utils';
import { FILE_PROPS_KEY, FileProps } from '../../storage';

@Injectable()
export class TypeOrmFileMetaService implements FileMetaService {
  private readonly logger: Logger = new Logger(TypeOrmFileMetaService.name);
  protected entityManager?: EntityManager;

  constructor(@InjectRepository(FileMeta) private fileMetaRepository: Repository<FileMeta>) {}

  useWith(sessionManager: EntityManager): FileMetaService {
    const managedService = ObjectUtil.duplicate<TypeOrmFileMetaService>(this);

    const repository: Repository<FileMeta> = sessionManager.getRepository(
      this.fileMetaRepository.metadata.name
    );

    managedService.setFileMetaRepository(repository);
    managedService.setEntityManager(sessionManager);

    return managedService;
  }

  async find(name: string): Promise<FileMetadata> {
    try {
      return await this.fileMetaRepository.findOneBy({ name });
    } catch (e) {
      this.logger.error('Error finding file metadata "%s", %j', name, e);
      return null;
    }
  }

  async save(meta: FileMetadata): Promise<number> {
    const model = this.fileMetaRepository.create(meta as FileMeta);

    try {
      const savedModel = await this.fileMetaRepository.save(model);
      return savedModel.id;
    } catch (e) {
      this.logger.error('Error saving file metadata "%s", %j', meta.name, e);
      throw e;
    }
  }

  async update(name: string, metadata: Partial<FileMetadata>): Promise<boolean> {
    let meta = (await this.find(name)) as FileMeta;

    try {
      meta = this.fileMetaRepository.merge(meta, metadata as FileMeta) as any;
      await this.fileMetaRepository.save(meta);
      return true;
    } catch (e) {
      this.logger.error('Error updating file metadata "%s", %j', meta.name, e);
      throw e;
    }
  }

  async delete(name: string): Promise<boolean> {
    try {
      const model = await this.fileMetaRepository.findOneBy({ name });
      return !!(await this.fileMetaRepository.remove(model));
    } catch (e) {
      this.logger.error('Error deleting file metadata "%s", %j', name, e);
      return false;
    }
  }

  async filesResource(meta: FileMetadata): Promise<any> {
    const repository = this.fileMetaRepository.manager.getRepository(meta.resource);
    try {
      return await repository.findOneBy({ id: meta.resourceId });
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

    const repository = this.fileMetaRepository.manager.getRepository(meta.resource);

    const props = Reflect.getMetadata(FILE_PROPS_KEY, repository.metadata?.target?.['prototype']);
    if (props && props[meta.field]) {
      return { props: props[meta.field], meta };
    }

    return { props: null, meta };
  }

  async fileProps(meta: FileMetadata): Promise<FileProps> {
    const repository = this.fileMetaRepository.manager.getRepository(meta.resource);

    const props = Reflect.getMetadata(FILE_PROPS_KEY, repository.metadata?.target?.['prototype']);
    if (props && props[meta.field]) {
      return props[meta.field];
    }

    return null;
  }

  modelFields(model: any): string[] {
    const repository = this.fileMetaRepository.manager.getRepository(model.constructor.name);
    return Object.keys(repository?.metadata?.propertiesMap || []);
  }

  modelName(model: any): string {
    const repository = this.fileMetaRepository.manager.getRepository(model.constructor.name);
    return repository?.metadata?.name;
  }

  private setFileMetaRepository(repository: Repository<FileMeta>): void {
    this.fileMetaRepository = repository;
  }

  private setEntityManager(manager: EntityManager): void {
    this.entityManager = manager;
  }
}
