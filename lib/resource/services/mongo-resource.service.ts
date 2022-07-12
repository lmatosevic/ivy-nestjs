import { Logger } from '@nestjs/common';
import { Document, Model } from 'mongoose';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileProps } from '../../storage/decorators';
import { FileError, FileManager } from '../../storage';
import { FilesUtil, ObjectUtil, RequestUtil } from '../../utils';
import { QueryRequest, QueryResponse, ValidationError } from '../dto';
import { ResourceService } from './resource.service';
import { ResourcePolicyService } from '../policy';
import { ResourceSchema } from '../schema';
import * as _ from 'lodash';

type ModelReferences = {
  fields: string[];
  references: string[];
  virtuals: string[];
  files: string[];
  fileProps: Record<string, FileProps>;
  refProps: Record<string, any>;
};

export abstract class MongoResourceService<T> extends ResourcePolicyService implements ResourceService<T> {
  private static modelReferences: Record<string, ModelReferences>;
  private readonly logger = new Logger(MongoResourceService.name);

  protected constructor(protected model: Model<T & ResourceSchema>, protected fileManager?: FileManager) {
    super();

    if (!MongoResourceService.modelReferences) {
      MongoResourceService.modelReferences = this.fetchAllReferences();
    }
  }

  async find(id: string): Promise<T> {
    return this.findResource(id, true);
  }

  async query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>> {
    let { filter, ...options } = queryDto;
    filter = _.merge(filter || {}, this.policyFilter());

    if (options?.sort) {
      options.sort = RequestUtil.normalizeSort(options.sort);
    }

    let results;
    let totalCount;
    try {
      filter = await this.resolveFilterSubReferences(filter);
      results = await this.model
        .find(filter, this.policyProjection(), {
          skip: (options.page - 1) * options.size,
          limit: options.size,
          sort: options.sort
        })
        .populate(this.makePopulationArray())
        .exec();
      totalCount = await this.model.countDocuments(filter).exec();
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.reason?.message || e.message,
        status: 400
      });
    }

    return {
      resultCount: results.length,
      totalCount: totalCount,
      items: results
    };
  }

  async create(createDto: Partial<T & any>): Promise<T> {
    const intersectedDto = this.intersectFields(createDto);

    const model = new this.model(intersectedDto);
    if (!model.createdBy && this.fields().includes('createdBy')) {
      model.createdBy = this.getAuthUser()?.getId();
    }

    let createdModel;
    let storedFiles;
    try {
      storedFiles = await this.fileManager?.persistFiles(this.fileProps(), model);
      createdModel = await model.save();
    } catch (e) {
      this.logger.debug(e);
      await this.fileManager?.deleteFileArray(storedFiles);
      if (e instanceof FileError) {
        throw e;
      }
      throw new ResourceError(this.model.modelName, {
        message: e.message,
        reason: this.errorReasonsList(e),
        status: e.stack?.includes('ValidationError') ? 400 : 500
      });
    }

    return this.populateModelDeep(createdModel);
  }

  async update(id: string, updateDto: Partial<T & any>, isFileUpload?: boolean): Promise<T> {
    const intersectedDto = this.intersectFields(updateDto);

    const resource = await this.findResource(id);
    const currentResource = _.cloneDeep(resource);

    resource.set(intersectedDto);

    if (isFileUpload) {
      FilesUtil.mergeFileArrays(currentResource, resource, this.fileFields());
    }

    let updatedModel;
    let storedFiles;
    try {
      storedFiles = await this.fileManager?.persistFiles(
        this.fileProps(),
        resource,
        currentResource,
        isFileUpload
      );
      updatedModel = await resource.save();
      await this.fileManager?.deleteFiles(this.fileProps(), currentResource, updatedModel);
    } catch (e) {
      this.logger.debug(e);
      await this.fileManager?.deleteFileArray(storedFiles);
      if (e instanceof FileError) {
        throw e;
      }
      throw new ResourceError(this.model.modelName, {
        message: e.message,
        reason: this.errorReasonsList(e),
        status: e.stack?.includes('ValidationError') ? 400 : 500
      });
    }

    return this.populateModelDeep(updatedModel);
  }

  async delete(id: string): Promise<T> {
    const resource = await this.findResource(id);

    const session = await this.model.db.startSession();

    let removedModel;
    let populatedModel;
    try {
      session.startTransaction();

      removedModel = await resource.remove();
      populatedModel = await this.populateModelDeep(removedModel);

      const filesToDelete = await this.resourceFilesToDelete(populatedModel);

      await this.cascadeRelations(populatedModel);

      await session.commitTransaction();

      await this.fileManager?.deleteFileArray(filesToDelete);
      await this.fileManager?.deleteFiles(this.fileProps(), removedModel);
    } catch (e) {
      this.logger.debug(e);
      await session.abortTransaction();
      throw new ResourceError(this.model.modelName, {
        message: e.message,
        reason: this.errorReasonsList(e),
        status: e.stack?.includes('ValidationError') ? 400 : 500
      });
    }

    await session.endSession();

    return populatedModel;
  }

  private async findResource(id: string, populate: boolean = false): Promise<T & Document> {
    let resource;

    try {
      const policyFilter = await this.resolveFilterSubReferences(this.policyFilter());
      const resourceFind = this.model.findOne(
        { $and: [{ _id: id }, policyFilter] } as any,
        this.policyProjection()
      );
      if (populate) {
        resourceFind.populate(this.makePopulationArray());
      }
      resource = await resourceFind.exec();
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.reason?.message || e.message,
        status: 400
      });
    }

    if (!resource) {
      throw new ResourceError(this.model.modelName, {
        message: 'Not Found',
        status: 404
      });
    }

    return resource;
  }

  private errorReasonsList(error: any): ValidationError[] | string {
    const reasons = [];
    for (const [field, err] of Object.entries(error?.errors || {})) {
      reasons.push({
        value: err['value'],
        property: field,
        constraints: {
          [err['kind']]: err['message']
        }
      });
    }
    return reasons.length > 0 ? reasons : 'Invalid data provided';
  }

  private async populateModel(model: T & Document, modelName?: string): Promise<T & Document> {
    return model.populate(this.makePopulationArray(modelName, 1));
  }

  private async populateModelDeep(model: T & Document, modelName?: string): Promise<T & Document> {
    const populations = this.makePopulationArray(modelName);
    return model.populate(populations);
  }

  private makePopulationArray(modelName?: string, depth = 5, level = 0, excludeFields: string[] = []): any[] {
    const populations = [];
    const fields = [...this.referencedFields(modelName), ...this.virtualFields(modelName)].filter(
      (f) => !excludeFields.includes(f)
    );

    const fileFields = this.fileFields(modelName);
    for (const fileField of fileFields) {
      populations.push({ path: fileField, populate: ['meta'] });
    }

    if (level >= depth || fields.length === 0) {
      return populations;
    }

    const policyProjection = this.policyProjection(false);
    const hasPolicyProjections = Object.keys(policyProjection).length > 0;

    for (const field of fields) {
      const fieldProp = this.refProp(field, modelName);
      if (!fieldProp?.populate) {
        continue;
      }

      let excludeProjection = true;
      const projectionFields = ['_id'];
      for (const policyKey of Object.keys(policyProjection)) {
        const keyParts = policyKey.split('.');
        if (excludeProjection && keyParts.length > level && field === keyParts[level]) {
          excludeProjection = false;
        }
        if (keyParts.length > level + 1) {
          const projectField = keyParts[level + 1];
          if (!this.refProp(projectField, fieldProp.ref)?.ref) {
            projectionFields.push(projectField);
          }
        }
      }

      const policySelect = [];
      if (hasPolicyProjections) {
        if (excludeProjection) {
          continue;
        }

        if (projectionFields.length > 1) {
          const model = this.model?.db?.models[fieldProp.ref];
          for (const fieldPath of Object.keys(model?.schema?.paths || {})) {
            if (fieldPath === '__v') {
              continue;
            }
            if (!projectionFields.includes(fieldPath) && !this.refProp(fieldPath, fieldProp.ref)?.ref) {
              policySelect.push('-' + fieldPath);
            }
          }
        }
      }

      const exclude = fieldProp.excludeFields || [];
      const select = exclude
        .filter((f) => !this.refProp(f, fieldProp.ref)?.ref)
        .map((f) => '-' + f)
        .concat(policySelect);
      const newPopulationArray = this.makePopulationArray(fieldProp.ref, depth, level + 1, [
        ...excludeFields,
        ...exclude,
        ...[fieldProp.foreignField].filter((f) => !!f)
      ]);

      populations.push({
        path: field,
        populate: newPopulationArray.length > 0 ? newPopulationArray : undefined,
        select: select.length > 0 ? select : undefined
      });
    }

    if (level === 0) {
      this.logger.debug('Populated objects: %j', populations);
    }

    return populations;
  }

  private async cascadeRelations(deletedResource: Document): Promise<void> {
    const deletedModelName = deletedResource.constructor['modelName'];
    const virtuals = this.virtualFields(deletedModelName);

    if (virtuals.length > 0) {
      this.logger.verbose('Cascade virtuals: %j', virtuals);
    }

    for (const virtualField of virtuals) {
      let referencedResources = deletedResource[virtualField];
      if (!Array.isArray(referencedResources)) {
        referencedResources = [referencedResources];
      }

      const fieldProp = this.refProp(virtualField);
      const fieldRefs = this.refProps(fieldProp.ref);
      const fieldsToUpdate = Object.entries(fieldRefs)
        .filter(([_, props]) => props?.ref === deletedModelName)
        .map(([field, props]) => ({ name: field, props }));

      for (const referencedResource of referencedResources) {
        const logData = { id: referencedResource.id };

        if (fieldProp.onDelete === 'cascade') {
          await referencedResource.remove();
          this.logger.verbose('Cascade delete for %s, %j', fieldProp.ref, logData);
          const populatedRefModel = await this.populateModel(referencedResource, fieldProp.ref);
          await this.cascadeRelations(populatedRefModel);
          continue;
        }

        for (const field of fieldsToUpdate) {
          if (!fieldProp.onDelete || fieldProp.onDelete === 'setNull') {
            if (!Array.isArray(referencedResource[field.name])) {
              referencedResource[field.name] = null;
            } else {
              referencedResource[field.name] = referencedResource[field.name].filter(
                (id) => id !== deletedResource.id
              );
            }
            await referencedResource.save();
            this.logger.verbose('Cascaded to null value for %s.%s, %j', fieldProp.ref, field.name, logData);
          } else {
            this.logger.verbose('Do nothing on cascade for %s.%s, %j', fieldProp.ref, field.name, logData);
          }
        }
      }
    }
  }

  private async resourceFilesToDelete(deletedResource: Document): Promise<string[]> {
    const deletedModelName = deletedResource.constructor['modelName'];
    const virtuals = this.virtualFields(deletedModelName);

    const filesToDelete = [];

    for (const virtualField of virtuals) {
      let referencedResources = deletedResource[virtualField];
      if (!Array.isArray(referencedResources)) {
        referencedResources = [referencedResources];
      }

      const fieldProp = this.refProp(virtualField);

      if (fieldProp.onDelete === 'cascade') {
        for (const referencedResource of referencedResources) {
          filesToDelete.push(
            ...this.fileManager?.getFilesToDelete(this.fileProps(fieldProp.ref), referencedResource)
          );

          const populatedRefModel = await this.populateModel(referencedResource, fieldProp.ref);
          const subFilesToDelete = await this.resourceFilesToDelete(populatedRefModel);

          filesToDelete.concat(subFilesToDelete);
        }
      }
    }

    return filesToDelete;
  }

  private async resolveFilterSubReferences(filter: any): Promise<any> {
    this.logger.debug('Before filter resolve: %j', filter);

    const resolvedFilter = await ObjectUtil.transfromKeysAndValuesAsync(
      filter,
      async (key, value, keyList) => {
        const modelName = this.modelNameFromFieldList(keyList);

        if (value !== null && typeof value === 'object' && this.virtualFields(modelName).includes(key)) {
          return '_id';
        }
        return key;
      },
      async (key, value, keyList) => {
        const modelName = this.modelNameFromFieldList(keyList);

        if (value !== null && typeof value === 'object') {
          const model = this.model.db.models[this.refProp(key, modelName)?.ref];

          if (model && !Array.isArray(value) && this.referencedFields(modelName).includes(key)) {
            return await model.distinct('_id', value).exec();
          }

          if (model && this.virtualFields(modelName).includes(key)) {
            const query = Array.isArray(value) ? { _id: value } : value;
            const fieldRefs = this.refProps(model.modelName);
            const refData = Object.entries(fieldRefs).find(([_, meta]) => (meta as any).ref === modelName);
            if (refData && refData.length > 1) {
              const refName = refData[0];
              return await model.distinct(refName, query).exec();
            }
          }
        }
        return value;
      },
      async (key1, value1, key2, value2) => {
        return {
          key: '$and',
          value: [{ [key2]: value1 }, { [key2]: value2 }],
          remove: true
        };
      }
    );

    this.logger.debug('After filter resolve: %j', resolvedFilter);

    return resolvedFilter;
  }

  private fields(modelName?: string): string[] {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.fields;
  }

  private referencedFields(modelName?: string): string[] {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.references;
  }

  private virtualFields(modelName?: string): string[] {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.virtuals;
  }

  private fileFields(modelName?: string): string[] {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.files;
  }

  private fileProps(modelName?: string): Record<string, FileProps> {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.fileProps;
  }

  private refProps(modelName?: string): Record<string, any> {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.refProps;
  }

  private refProp(fieldName: string, modelName?: string): any {
    const name = modelName || this.model.modelName;
    return MongoResourceService.modelReferences[name]?.refProps?.[fieldName];
  }

  private modelNameFromFieldList(fieldList: string[]): string {
    const fields = [...fieldList];
    let previousModelName = this.model.modelName;
    let currentModelName = this.model.modelName;

    while (fields.length > 0) {
      const field = fields.shift();
      const fieldRef = this.refProp(field, currentModelName);
      if (fieldRef && fieldRef.ref) {
        previousModelName = currentModelName;
        currentModelName = fieldRef.ref;
      }
    }

    return fieldList.length > 1 ? previousModelName : currentModelName;
  }

  private fetchAllReferences(): Record<string, ModelReferences> {
    const referencesMap: Record<string, ModelReferences> = {};

    if (!this.model?.db?.models) {
      return referencesMap;
    }

    for (const modelName of Object.keys(this.model?.db?.models)) {
      const model = this.model?.db?.models[modelName];
      referencesMap[modelName] = this.fetchReferences(model);
    }

    return referencesMap;
  }

  private fetchReferences(model: Model<T & Document>): ModelReferences {
    const references: string[] = [];
    const virtuals: string[] = [];
    const files: string[] = [];
    const fields: string[] = [];
    const fileProps: Record<string, FileProps> = {};
    const refProps: Record<string, any> = [];

    for (const fieldName of Object.keys(model?.schema?.obj)) {
      const fieldData = model?.schema?.obj[fieldName];
      let referenceProperties;

      fields.push(fieldName);

      const props = Reflect.getMetadata(FILE_PROPS_KEY, model.schema['classRef']?.prototype);
      if (props && props[fieldName]) {
        fileProps[fieldName] = props[fieldName];
        files.push(fieldName);
      }

      if (fieldData?.ref) {
        referenceProperties = fieldData;
      } else if (Array.isArray(fieldData?.type) && fieldData?.type[0]?.ref) {
        referenceProperties = fieldData.type[0];
      }

      if (referenceProperties) {
        references.push(fieldName);
        refProps[fieldName] = referenceProperties;
      }
    }

    for (const virtualModelName of Object.keys(model?.schema?.virtuals)) {
      const value = model?.schema?.virtuals[virtualModelName];
      if (value?.options && virtualModelName !== 'id') {
        virtuals.push(virtualModelName);
        refProps[virtualModelName] = value?.options;
      }
    }

    this.logger.debug('%s file fields: %j', model.modelName, files);
    this.logger.debug('%s referenced fields: %j', model.modelName, references);
    this.logger.debug('%s virtual fields: %j', model.modelName, virtuals);

    return { fields, references, virtuals, files, fileProps, refProps };
  }
}
