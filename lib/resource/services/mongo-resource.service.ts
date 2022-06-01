import { Logger } from '@nestjs/common';
import { Document, Model } from 'mongoose';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileError, FileManager, FileProps } from '../../storage';
import { ObjectUtil } from '../../utils';
import { QueryRequest, QueryResponse, ValidationError } from '../dto';
import { ResourceService } from './resource.service';
import { ResourcePolicyService } from '../policy';
import * as _ from 'lodash';

type ModelReferences = {
  references: string[];
  virtuals: string[];
  files: string[];
  fileProps: Record<string, FileProps>;
  fieldProps: Record<string, any>;
};

export abstract class MongoResourceService<T> extends ResourcePolicyService implements ResourceService<T> {
  private static modelReferences: Record<string, ModelReferences>;
  private readonly logger = new Logger(MongoResourceService.name);

  protected constructor(protected model: Model<T & Document>, protected fileManager?: FileManager) {
    super();

    if (!MongoResourceService.modelReferences) {
      MongoResourceService.modelReferences = this.fetchAllReferences();
    }
  }

  async find(id: string): Promise<T> {
    let result;
    try {
      let policyFilter = await this.resolveFilterSubReferences(this.policyFilter());
      result = await this.model
        .findOne({ $and: [{ _id: id }, policyFilter] } as any, this.policyProjection())
        .populate(this.makePopulationArray())
        .exec();
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
    }

    if (!result) {
      throw new ResourceError(this.model.modelName, {
        message: 'Not Found',
        status: 404
      });
    }

    return result;
  }

  async query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>> {
    let { filter, ...options } = queryDto;
    filter = _.merge(filter || {}, this.policyFilter());

    let results;
    let totalCount;
    try {
      filter = await this.resolveFilterSubReferences(filter);
      results = await this.model
        .find(filter, this.policyProjection(), options)
        .populate(this.makePopulationArray())
        .exec();
      totalCount = await this.model.countDocuments(filter).exec();
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
    }

    return { resultCount: results.length, totalCount: totalCount, items: results };
  }

  async create(createDto: any): Promise<T> {
    const intersectedDto = this.intersectFields(createDto);

    const model = new this.model(intersectedDto);
    model['createdBy'] = this.getAuthUser()?.getId();

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

  async update(id: string, updateDto: any, isFileUpload: boolean = false): Promise<T> {
    const intersectedDto = this.intersectFields(updateDto);

    let resource = await this.findResource(id);
    let currentResource = _.cloneDeep(resource);

    resource.set(intersectedDto);

    if (isFileUpload) {
      this.mergeFileArrays(currentResource, resource);
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
    let resource = await this.findResource(id);

    const session = await this.model.db.startSession();

    let removedModel;
    let populatedModel;
    try {
      session.startTransaction();

      removedModel = await resource.remove();
      populatedModel = await this.populateModelDeep(removedModel);
      await this.cascadeDelete(populatedModel);

      await session.commitTransaction();

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

  private async findResource(id: string): Promise<T & Document> {
    let resource;

    try {
      let policyFilter = await this.resolveFilterSubReferences(this.policyFilter());
      resource = await this.model
        .findOne({ $and: [{ _id: id }, policyFilter] } as any, this.policyProjection())
        .exec();
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.message,
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

  private mergeFileArrays(currentResource: any, resource: any): void {
    for (const fileField of this.fileFields()) {
      let fileValue = currentResource[fileField];
      if (Array.isArray(fileValue) && fileValue.length > 0) {
        resource[fileField] = [...fileValue, ...resource[fileField]];
      }
    }
  }

  private errorReasonsList(error: any): ValidationError[] | string {
    let reasons = [];
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
    let populations = this.makePopulationArray(modelName);
    return model.populate(populations);
  }

  private makePopulationArray(
    modelName?: string,
    depth: number = 5,
    level: number = 0,
    excludeFields: string[] = []
  ): any[] {
    let populations = [];
    let fields = [...this.referencedFields(modelName), ...this.virtualFields(modelName)].filter(
      (f) => !excludeFields.includes(f)
    );

    let fileFields = this.fileFields(modelName);
    for (const fileField of fileFields) {
      populations.push({ path: fileField, populate: ['meta'] });
    }

    if (level >= depth || fields.length === 0) {
      return populations;
    }

    let policyProjection = this.policyProjection(false);
    let hasPolicyProjections = Object.keys(policyProjection).length > 0;

    for (const field of fields) {
      let fieldProp = this.refProp(field, modelName);
      if (!fieldProp?.populate) {
        continue;
      }

      let excludeProjection = true;
      let projectionFields = ['_id'];
      for (const policyKey of Object.keys(policyProjection)) {
        let keyParts = policyKey.split('.');
        if (excludeProjection && keyParts.length > level && field === keyParts[level]) {
          excludeProjection = false;
        }
        if (keyParts.length > level + 1) {
          let projectField = keyParts[level + 1];
          if (!this.refProp(projectField, fieldProp.ref)?.ref) {
            projectionFields.push(projectField);
          }
        }
      }

      let policySelect = [];
      if (hasPolicyProjections) {
        if (excludeProjection) {
          continue;
        }

        if (projectionFields.length > 1) {
          let model = this.model?.db?.models[fieldProp.ref];
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

      let exclude = fieldProp.excludeFields || [];
      let select = exclude
        .filter((f) => !this.refProp(f, fieldProp.ref)?.ref)
        .map((f) => '-' + f)
        .concat(policySelect);
      let newPopulationArray = this.makePopulationArray(fieldProp.ref, depth, level + 1, [
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
      this.logger.verbose('Populated objects: %j', populations);
    }

    return populations;
  }

  private async cascadeDelete(deletedResource: T & Document): Promise<void> {
    let deletedModelName = deletedResource.constructor['modelName'];
    let virtuals = this.virtualFields(deletedModelName);

    if (virtuals.length === 0) {
      return;
    }

    this.logger.verbose('Cascade virtuals: %j', virtuals);

    for (const virtualField of virtuals) {
      let referencedModels = deletedResource[virtualField];
      if (!Array.isArray(referencedModels)) {
        referencedModels = [referencedModels];
      }

      let fieldProp = this.refProp(virtualField);
      let fieldRefs = this.refProps(fieldProp.ref);
      let fieldsToUpdate = Object.entries(fieldRefs)
        .filter(([_, props]) => props?.ref === deletedModelName)
        .map(([field, props]) => ({ name: field, props }));

      for (const referencedModel of referencedModels) {
        let logData = { id: referencedModel.id };

        if (fieldProp.onDelete === 'cascade') {
          await referencedModel.remove();
          await this.fileManager?.deleteFiles(this.fileProps(fieldProp.ref), referencedModel);
          this.logger.verbose('Cascade delete for %s, %j', fieldProp.ref, logData);
          let populatedRefModel = await this.populateModel(referencedModel, fieldProp.ref);
          await this.cascadeDelete(populatedRefModel);
          continue;
        }

        for (const field of fieldsToUpdate) {
          if (!fieldProp.onDelete || fieldProp.onDelete === 'setNull') {
            if (!Array.isArray(referencedModel[field.name])) {
              referencedModel[field.name] = null;
            } else {
              referencedModel[field.name] = referencedModel[field.name].filter(
                (id) => id !== deletedResource.id
              );
            }
            await referencedModel.save();
            this.logger.verbose('Cascaded to null value for %s.%s, %j', fieldProp.ref, field.name, logData);
          } else {
            this.logger.verbose('Do nothing on cascade for %s.%s, %j', fieldProp.ref, field.name, logData);
          }
        }
      }
    }
  }

  private async resolveFilterSubReferences(filter: any): Promise<any> {
    this.logger.verbose('Before filter resolve: %j', filter);

    const resolvedFilter = await ObjectUtil.transfromKeysAndValuesAsync(
      filter,
      async (key, value, keyList) => {
        let modelName = this.modelNameFromFieldList(keyList);

        if (value !== null && typeof value === 'object' && this.virtualFields(modelName).includes(key)) {
          return '_id';
        }
        return key;
      },
      async (key, value, keyList) => {
        let modelName = this.modelNameFromFieldList(keyList);

        if (value !== null && typeof value === 'object') {
          let model = this.model.db.models[this.refProp(key, modelName)?.ref];

          if (model && !Array.isArray(value) && this.referencedFields(modelName).includes(key)) {
            return await model.distinct('_id', value).exec();
          }

          if (model && this.virtualFields(modelName).includes(key)) {
            let query = Array.isArray(value) ? { _id: value } : value;
            let fieldRefs = this.refProps(model.modelName);
            let refData = Object.entries(fieldRefs).find(([_, meta]) => (meta as any).ref === modelName);
            if (refData && refData.length > 1) {
              let refName = refData[0];
              return await model.distinct(refName, query).exec();
            }
          }
        }
        return value;
      },
      async (key1, value1, key2, value2) => {
        return { key: '$and', value: [{ [key2]: value1 }, { [key2]: value2 }], remove: true };
      }
    );

    this.logger.verbose('After filter resolve: %j', resolvedFilter);

    return resolvedFilter;
  }

  private referencedFields(modelName?: string): string[] {
    return MongoResourceService.modelReferences[modelName || this.model.modelName]?.references;
  }

  private virtualFields(modelName?: string): string[] {
    return MongoResourceService.modelReferences[modelName || this.model.modelName]?.virtuals;
  }

  private fileFields(modelName?: string): string[] {
    return MongoResourceService.modelReferences[modelName || this.model.modelName]?.files;
  }

  private fileProps(modelName?: string): Record<string, FileProps> {
    return MongoResourceService.modelReferences[modelName || this.model.modelName]?.fileProps;
  }

  private refProps(modelName?: string): Record<string, any> {
    return MongoResourceService.modelReferences[modelName || this.model.modelName]?.fieldProps;
  }

  private refProp(fieldName: string, modelName?: string): any {
    return MongoResourceService.modelReferences[modelName || this.model.modelName]?.fieldProps?.[fieldName];
  }

  private modelNameFromFieldList(fieldList: string[]): string {
    let fields = [...fieldList];
    let previousModelName = this.model.modelName;
    let currentModelName = this.model.modelName;

    while (fields.length > 0) {
      let field = fields.shift();
      let fieldRef = this.refProp(field, currentModelName);
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
      let model = this.model?.db?.models[modelName];
      referencesMap[modelName] = this.fetchReferences(model);
    }

    return referencesMap;
  }

  private fetchReferences(model: Model<T & Document>): ModelReferences {
    let references: string[] = [];
    let virtuals: string[] = [];
    let files: string[] = [];
    let fileProps: Record<string, FileProps> = {};
    let fieldProps: Record<string, any> = [];

    for (const fieldName of Object.keys(model?.schema?.obj)) {
      let fieldData = model?.schema?.obj[fieldName];
      let referenceProperties;

      let props = Reflect.getMetadata(FILE_PROPS_KEY, model.schema['classRef']?.prototype);
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
        fieldProps[fieldName] = referenceProperties;
      }
    }

    for (const virtualModelName of Object.keys(model?.schema?.virtuals)) {
      let value = model?.schema?.virtuals[virtualModelName];
      if (value?.options && virtualModelName !== 'id') {
        virtuals.push(virtualModelName);
        fieldProps[virtualModelName] = value?.options;
      }
    }

    this.logger.verbose('%s file fields: %j', model.modelName, files);
    this.logger.verbose('%s referenced fields: %j', model.modelName, references);
    this.logger.verbose('%s virtual fields: %j', model.modelName, virtuals);

    return { references, virtuals, files, fileProps, fieldProps };
  }
}
