import { Logger } from '@nestjs/common';
import { ClientSession, Document, Model } from 'mongoose';
import { PartialDeep } from 'type-fest';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileProps } from '../../storage/decorators';
import { FileError, FileManager } from '../../storage';
import { Action } from '../../enums';
import { FileMeta } from '../../storage/schema';
import { FilesUtil, FilterUtil, ObjectUtil, RequestUtil, StringUtil } from '../../utils';
import { AggregateRequest, AggregateResponse, QueryRequest, QueryResponse, ValidationError } from '../dto';
import { ResourceService } from './resource.service';
import { ResourcePolicyService } from '../policy';
import { ResourceSchema } from '../schema';
import * as _ from 'lodash';

type ModelReferences = {
  fields: string[];
  references: string[];
  virtuals: string[];
  embedded: string[];
  files: string[];
  fileProps: Record<string, FileProps>;
  refProps: Record<string, any>;
  embeddedTypes: Record<string, string>;
};

export abstract class MongooseResourceService<T> extends ResourcePolicyService implements ResourceService<T> {
  public static modelRelationNames: Record<string, string[]>;
  public static modelReferences: Record<string, ModelReferences>;
  private static replicationEnabled: boolean;

  private readonly log = new Logger(MongooseResourceService.name);

  protected isProtected: boolean = false;
  protected session?: ClientSession;

  protected constructor(
    protected model: Model<T & ResourceSchema>,
    protected fileManager?: FileManager
  ) {
    super('_id');

    if (MongooseResourceService.replicationEnabled === undefined) {
      MongooseResourceService.replicationEnabled = !!this.model.db['_connectionOptions'].replicaSet;
      this.log.log('Database replication enabled');
    }

    if (!MongooseResourceService.modelReferences) {
      MongooseResourceService.modelReferences = this.initAllReferences();
    }
    if (!MongooseResourceService.modelRelationNames) {
      MongooseResourceService.modelRelationNames = this.initRelationModelNames();
    }
  }

  async startTransaction(options?: any): Promise<{ session: ClientSession }> {
    const session = await this.model.db.startSession();
    session.startTransaction(options);
    return { session };
  }

  useWith(sessionManager: ClientSession): MongooseResourceService<T> {
    const managedService = ObjectUtil.duplicate<MongooseResourceService<T>>(this);

    const session = MongooseResourceService.replicationEnabled ? sessionManager : undefined;

    managedService.setProtected(this.isProtected);
    managedService.setModel(this.model);
    managedService.setSession(session);
    managedService.setFileManager(this.fileManager.useWith(session));

    return managedService;
  }

  asProtected(): ResourceService<T> {
    const protectedService = ObjectUtil.duplicate<MongooseResourceService<T>>(this);

    protectedService.setProtected(true);
    protectedService.setModel(this.model);
    protectedService.setSession(this.session);

    return protectedService;
  }

  async find(id: string): Promise<T> {
    return this.findResource(id, true);
  }

  async query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>> {
    let { filter, ...options } = queryDto;

    filter = _.merge(_.cloneDeep(filter || {}), this.policyFilter());

    const projection = this.policyProjection();

    if (options?.sort) {
      options.sort = RequestUtil.normalizeSort(options.sort);
    }

    let session = await this.makeSession();

    let results;
    let totalCount;
    try {
      if (!this.session && session) {
        session.startTransaction();
      }

      if (Object.keys(filter).length > 0) {
        filter = FilterUtil.transformMongooseFilter(filter);
        this.log.debug('Transformed filter: %j', filter);
        filter = await this.resolveFilterSubReferences(filter);
      }

      results = await this.model
        .find(filter as any, projection, {
          skip: (options.page - 1) * options.size,
          limit: options.size,
          sort: options.sort
        })
        .populate(this.makePopulationArray())
        .session(session)
        .exec();
      totalCount = await this.model
        .countDocuments(filter as any)
        .session(session)
        .exec();

      if (!this.session && session) {
        await session.commitTransaction();
      }
    } catch (e) {
      if (!this.session && session) {
        await session.abortTransaction();
      }
      this.log.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.reason?.message || e.message,
        status: 400
      });
    } finally {
      if (!this.session && session) {
        await session.endSession();
      }
    }

    return {
      resultCount: results.length,
      totalCount: totalCount,
      items: results
    };
  }

  async aggregate(aggregateDto: AggregateRequest<T>): Promise<AggregateResponse<T>> {
    let { filter, select, range } = aggregateDto;
    let items = [];
    let total = {};

    filter = _.merge(_.cloneDeep(filter || {}), this.policyFilter());

    const projection = this.policyProjection();

    let session = await this.makeSession();

    try {
      if (!this.session && session) {
        session.startTransaction();
      }

      const startDate = new Date(range?.start);
      const endDate = new Date(range?.end);
      const stepSeconds = range.step ?? 3600;
      const dateField = range.dateField ?? 'createdAt';

      let aggregation = this.model.aggregate();
      let aggregationRange = this.model.aggregate();

      if (Object.keys(filter).length > 0) {
        filter = FilterUtil.transformMongooseFilter(filter);
        this.log.debug('Transformed filter: %j', filter);
        filter = await this.resolveFilterSubReferences(filter);
        const matchQuery = this.model.find(filter as any).getQuery();
        aggregation.append({ $match: matchQuery });
        aggregationRange.append({ $match: { ...matchQuery, [dateField]: { $gte: startDate, $lte: endDate } } });
      }

      if (Object.keys(projection).length > 0) {
        aggregation.append({ $project: projection });
        aggregationRange.append({ $project: projection });
      }

      let hasFirstOrLast = false;
      let index = 0;
      const aggregationGroup = { _id: null };
      const aggregationRangeGroup = {
        _id: {
          $dateTrunc: {
            date: `$${dateField}`,
            unit: 'second',
            binSize: stepSeconds
          }
        }
      };
      const aggregationRangeProjection = { _id: null };
      for (const [field, value] of Object.entries(select || {})) {
        for (const [func, enabled] of Object.entries(value || {})) {
          if (!enabled) {
            continue;
          }
          if (func.toLowerCase() === 'count') {
            aggregationGroup[`${field}_${func}`] = { $sum: 1 };
            aggregationRangeGroup[`${field}_${func}`] = { $sum: 1 };
          } else {
            aggregationGroup[`${field}_${func}`] = { [`$${func.toLowerCase()}`]: `$${field}` };
            aggregationRangeGroup[`${field}_${func}`] = { [`$${func.toLowerCase()}`]: `$${field}` };
          }

          aggregationRangeProjection[`${field}_${func}`] = {
            $cond: [{ $not: [`$${field}_${func}`] }, 0, `$${field}_${func}`]
          };

          if (['first', 'last'].includes(func)) {
            hasFirstOrLast = true;
          }

          index += 1;
        }
      }

      aggregation.append({ $group: aggregationGroup });
      aggregationRange.append({ $group: aggregationRangeGroup });
      aggregationRange.append({
        $densify: {
          field: '_id',
          range: {
            step: stepSeconds,
            unit: 'second',
            bounds: [startDate, endDate]
          }
        }
      });
      aggregationRange.append({ $project: aggregationRangeProjection });

      if (hasFirstOrLast) {
        aggregation.append({ $sort: { createdAt: 1 } });
        aggregationRange.append({ $sort: { [dateField]: 1 } });
      }

      if (index > 0) {
        const aggregated = await aggregation.session(session).exec();

        for (const [key, value] of Object.entries(aggregated[0] || {})) {
          if (key === '_id') {
            continue;
          }
          const keyParts = key.split('_');
          const func = keyParts.pop();
          const field = keyParts.join('_');
          _.set(total, `${field}.${func}`, StringUtil.toNumericValue(value as string));
        }

        if (range) {
          const rangeResults = await aggregationRange.session(session).exec();

          for (let result of rangeResults) {
            const item = {};
            for (const [key, value] of Object.entries(result)) {
              if (key === '_id') {
                continue;
              }
              const keyParts = key.split('_');
              const func = keyParts.pop();
              const field = keyParts.join('_');
              if (field && func) {
                _.set(item, `${field}.${func}`, StringUtil.toNumericValue(value as string));
              }
            }
            items.push(item);
          }
        }
      }

      if (!this.session && session) {
        await session.commitTransaction();
      }
    } catch (e) {
      if (!this.session && session) {
        await session.abortTransaction();
      }
      this.log.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.reason?.message || e.message,
        status: 400
      });
    } finally {
      if (!this.session && session) {
        await session.endSession();
      }
    }

    return { total, items };
  }

  async create(createDto: PartialDeep<T>): Promise<T> {
    const intersectedDto = this.intersectFields(createDto);

    const model = new this.model(intersectedDto);
    if (!model.createdBy && this.fields().includes('createdBy')) {
      model.createdBy = this.getAuthUser()?.getId();
    }

    let createdModel;
    let storedFiles;
    try {
      storedFiles = await this.persistResourceFiles(model, null, false);
      createdModel = await model.save();
    } catch (e) {
      this.log.debug(e);
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

    await this.expireCache(this.model.modelName, Action.Create);

    return this.populateModelDeep(createdModel);
  }

  async createBulk(createDtos: PartialDeep<T>[]): Promise<T[]> {
    const results = [];
    for (const createDto of createDtos) {
      try {
        results.push(await this.create(createDto));
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  async update(id: string, updateDto: PartialDeep<T>, isFileUpload?: boolean): Promise<T> {
    delete updateDto['id'];

    let intersectedDto = this.intersectFields(updateDto);

    const resource = await this.findResource(id, false, false);
    const currentResource = _.cloneDeep(resource);

    resource.set(intersectedDto);

    if (isFileUpload) {
      FilesUtil.mergeFileArrays(currentResource, resource, this.fileFields());
    }

    let updatedModel;
    let storedFiles;
    try {
      storedFiles = await this.persistResourceFiles(resource, currentResource, isFileUpload);

      updatedModel = await resource.save();

      const filesToDelete = await this.resourceFilesToDelete(currentResource, updatedModel);
      await this.fileManager?.deleteFileArray(filesToDelete);
    } catch (e) {
      this.log.debug(e);
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

    await this.expireCache(this.model.modelName, Action.Update);

    return this.populateModelDeep(updatedModel);
  }

  async updateBulk(updateDtos: PartialDeep<T>[]): Promise<T[]> {
    const results = [];
    for (const updateDto of updateDtos) {
      try {
        results.push(await this.update((updateDto as any).id, updateDto));
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  async delete(id: string): Promise<T> {
    const resource = await this.findResource(id, false, false);

    const session = await this.model.db.startSession();

    let removedModel;
    let populatedModel;
    try {
      session.startTransaction();

      removedModel = await resource.deleteOne();
      populatedModel = await this.populateModelDeep(removedModel);

      const filesToDelete = await this.resourceFilesToDelete(populatedModel, null);

      await this.cascadeRelations(populatedModel);

      await session.commitTransaction();

      await this.fileManager?.deleteFileArray(filesToDelete);
    } catch (e) {
      this.log.debug(e);
      await session.abortTransaction();
      throw new ResourceError(this.model.modelName, {
        message: e.message,
        reason: this.errorReasonsList(e),
        status: e.stack?.includes('ValidationError') ? 400 : 500
      });
    } finally {
      await session.endSession();
    }

    await this.expireCache(this.model.modelName, Action.Delete);

    return populatedModel;
  }

  async deleteBulk(ids: (string | number)[]): Promise<T[]> {
    const results = [];
    for (const id of ids) {
      try {
        results.push(await this.delete(id as string));
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  private async findResource(
    id: string,
    populate: boolean = false,
    useReadPolicy: boolean = true
  ): Promise<T & Document> {
    let resource;

    try {
      const policyFilter = await this.resolveFilterSubReferences(this.policyFilter(useReadPolicy));
      const findQuery = this.model.findOne({ $and: [{ _id: id }, policyFilter] } as any, this.policyProjection());
      if (populate) {
        findQuery.populate(this.makePopulationArray());
      }
      resource = await findQuery.session(this.session).exec();
    } catch (e) {
      this.log.debug(e);
      throw new ResourceError(this.model.modelName, {
        message: 'Bad request',
        reason: e.reason?.message || e.message,
        status: 400
      });
    }

    if (!resource) {
      throw new ResourceError(this.model.modelName, {
        message: 'Not Found for id: ' + id,
        status: 404
      });
    }

    return resource;
  }

  private async makeSession(): Promise<ClientSession | undefined> {
    let session;
    if (!this.session && MongooseResourceService.replicationEnabled) {
      session = await this.model.db.startSession();
    } else if (MongooseResourceService.replicationEnabled) {
      session = this.session;
    }
    return session;
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
      const newPopulationArray = this.makePopulationArray(fieldProp.ref, fieldProp.maxDepth, level + 1, [
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
      this.log.debug('Populated objects: %j', populations);
    }

    return populations;
  }

  private async populateModelAllFields(model: Document, modelName?: string): Promise<Document> {
    const filePaths = this.fileFields(modelName).map((f) => ({ path: f, populate: ['meta'] }));
    const refPaths = [...this.referencedFields(modelName), ...this.virtualFields(modelName)].map((f) => ({
      path: f
    }));
    return model.populate([...refPaths, ...filePaths]);
  }

  private async cascadeRelations(deletedResource: Document): Promise<void> {
    const deletedModelName = deletedResource.constructor['modelName'];
    const virtuals = this.virtualFields(deletedModelName);

    if (virtuals.length > 0) {
      this.log.verbose('Cascade virtuals: %j', virtuals);
    }

    for (const virtualField of virtuals) {
      let referencedResources = deletedResource[virtualField];
      if (!referencedResources) {
        continue;
      }

      if (!Array.isArray(referencedResources)) {
        referencedResources = [referencedResources];
      }

      const fieldProp = this.refProp(virtualField, deletedModelName);
      const fieldRefs = this.refProps(fieldProp.ref);
      const fieldsToUpdate = Object.entries(fieldRefs)
        .filter(([_, props]) => props?.ref === deletedModelName)
        .map(([field, props]) => ({ name: field, props }));

      for (const referencedResource of referencedResources) {
        const logData = { id: referencedResource.id };

        if (fieldProp.onDelete === 'cascade') {
          await referencedResource.deleteOne();
          this.log.verbose('Cascade delete for %s, %j', fieldProp.ref, logData);
          const populatedRefModel = await this.populateModelAllFields(referencedResource, fieldProp.ref);
          await this.cascadeRelations(populatedRefModel);
          continue;
        }

        for (const field of fieldsToUpdate) {
          if (!fieldProp.onDelete || fieldProp.onDelete === 'setNull') {
            if (!Array.isArray(referencedResource[field.name])) {
              referencedResource[field.name] = null;
            } else {
              referencedResource[field.name] = referencedResource[field.name].filter((id) => id !== deletedResource.id);
            }
            await referencedResource.save();
            this.log.verbose('Cascaded to null value for %s.%s, %j', fieldProp.ref, field.name, logData);
          } else {
            this.log.verbose('Do nothing on cascade for %s.%s, %j', fieldProp.ref, field.name, logData);
          }
        }
      }
    }
  }

  private async persistResourceFiles(
    resource: Document,
    currentResource: Document,
    isFileUpload: boolean
  ): Promise<string[]> {
    let modelName = resource.constructor['modelName'];
    if (!modelName || modelName === 'EmbeddedDocument') {
      modelName = resource?.schema?.['classRef']?.name;
    }
    const embedded = this.embeddedFields(modelName);

    const storedFiles = [];

    const storedFilesList = await this.fileManager?.persistFiles(
      this.fileProps(modelName),
      resource,
      currentResource,
      isFileUpload
    );

    for (const storedFile of storedFilesList) {
      storedFiles.push(storedFile);
    }

    for (const embeddedField of embedded) {
      let referencedResources = resource[embeddedField];
      const currentReferencedResources = currentResource?.[embeddedField];
      if (!referencedResources) {
        continue;
      }

      if (!Array.isArray(referencedResources)) {
        referencedResources = [referencedResources];
      }

      for (const referencedResource of referencedResources) {
        let currentReferencedResource = Array.isArray(currentReferencedResources)
          ? currentReferencedResources.find((crr) => crr.id === referencedResource.id)
          : currentReferencedResources;

        const subReferencedStoredFiles = await this.persistResourceFiles(
          referencedResource,
          currentReferencedResource,
          isFileUpload
        );

        for (const storedFile of subReferencedStoredFiles) {
          storedFiles.push(storedFile);
        }
      }
    }

    return storedFiles;
  }

  private async resourceFilesToDelete(deletedResource: Document, newResource: Document): Promise<string[]> {
    let deletedModelName = deletedResource.constructor['modelName'];
    if (!deletedModelName || deletedModelName === 'EmbeddedDocument') {
      deletedModelName = deletedResource?.schema?.['classRef']?.name;
    }

    const virtuals = this.virtualFields(deletedModelName);
    const embedded = this.embeddedFields(deletedModelName);

    const filesToDelete = [];

    filesToDelete.push(
      ...this.fileManager?.getFilesToDelete(this.fileProps(deletedModelName), deletedResource, newResource)
    );

    for (const virtualField of virtuals) {
      let referencedResources = deletedResource[virtualField];
      const currentReferencedResources = newResource?.[virtualField];
      if (!referencedResources) {
        continue;
      }

      if (!Array.isArray(referencedResources)) {
        referencedResources = [referencedResources];
      }

      const fieldProp = this.refProp(virtualField, deletedModelName);

      if (fieldProp.onDelete === 'cascade') {
        for (const referencedResource of referencedResources) {
          let currentReferencedResource = Array.isArray(currentReferencedResources)
            ? currentReferencedResources.find((crr) => crr.id === referencedResource.id)
            : currentReferencedResources;
          if (currentReferencedResource) {
            currentReferencedResource = await this.populateModelAllFields(currentReferencedResource, fieldProp.ref);
          }

          const populatedRefModel = await this.populateModelAllFields(referencedResource, fieldProp.ref);
          const subFilesToDelete = await this.resourceFilesToDelete(populatedRefModel, currentReferencedResource);

          for (const deletedFile of subFilesToDelete) {
            filesToDelete.push(deletedFile);
          }
        }
      }
    }

    for (const embeddedField of embedded) {
      let referencedResources = deletedResource[embeddedField];
      const currentReferencedResources = newResource?.[embeddedField];
      if (!referencedResources) {
        continue;
      }

      if (!Array.isArray(referencedResources)) {
        referencedResources = [referencedResources];
      }

      for (const referencedResource of referencedResources) {
        let currentReferencedResource = Array.isArray(currentReferencedResources)
          ? currentReferencedResources.find((crr) => crr.id === referencedResource.id)
          : currentReferencedResources;

        const subFilesToDelete = await this.resourceFilesToDelete(referencedResource, currentReferencedResource);

        for (const deletedFile of subFilesToDelete) {
          filesToDelete.push(deletedFile);
        }
      }
    }

    return filesToDelete;
  }

  private async resolveFilterSubReferences(filter: any): Promise<any> {
    this.log.debug('Before filter resolve: %j', filter);

    const resolvedFilter = await ObjectUtil.transfromKeysAndValuesAsync(
      filter,
      async (key, value, keyList) => {
        const modelName = this.modelNameFromFieldList(keyList);

        // Virtual fields references will be transformed to map of allowed id values
        if (value !== null && typeof value === 'object' && this.virtualFields(modelName).includes(key)) {
          return '_id';
        }

        // Nested keys and values will be returned from newValue function
        if (
          value !== null &&
          typeof value === 'object' &&
          (this.fileFields(modelName).includes(key) || this.embeddedFields(modelName).includes(key))
        ) {
          return null;
        }

        return key;
      },
      async (key, value, keyList) => {
        const modelName = this.modelNameFromFieldList(keyList);

        if (value !== null && typeof value === 'object') {
          const model = this.model.db.models[this.refProp(key, modelName)?.ref];

          // Transform referenced fields query object to an array of matching ids
          if (model && !Array.isArray(value) && this.referencedFields(modelName).includes(key)) {
            return { $in: await model.distinct('_id', value).session(this.session).exec() };
          }

          // Transform virtual fields query object to allowed reverse id references by virtual properties
          if (model && this.virtualFields(modelName).includes(key)) {
            const query = Array.isArray(value) ? { _id: value } : value;
            const fieldRefs = this.refProps(model.modelName);
            const refData = Object.entries(fieldRefs).find(([_, meta]) => (meta as any).ref === modelName);
            if (refData && refData.length > 1) {
              const refName = refData[0];
              return { $in: await model.distinct(refName, query).session(this.session).exec() };
            }
          }

          // Transform keys for nested properties in format key.subKey = value and resolved FileMeta subqueries
          if (
            !Array.isArray(value) &&
            (this.fileFields(modelName).includes(key) || this.embeddedFields(modelName).includes(key))
          ) {
            const metaModel = this.model.db.models[FileMeta.name];
            const nestedEntires = [];
            for (const filterKey of Object.keys(value)) {
              const filterValue = value[filterKey];
              if (['$and', '$or', '$nor'].includes(filterKey)) {
                const replacedEntryKeys = await ObjectUtil.transfromKeysAndValuesAsync(
                  { filterValue },
                  async (k, v, kl) => (k.startsWith('$') || kl.includes('meta') ? k : `${key}.${k}`),
                  async (k, v) =>
                    k !== 'meta' ? v : { $in: await metaModel.distinct('_id', v).session(this.session).exec() }
                );
                nestedEntires.push({ key: filterKey, value: replacedEntryKeys[`${key}.filterValue`] });
              } else {
                const nestedValue =
                  filterKey !== 'meta'
                    ? filterValue
                    : { $in: await metaModel.distinct('_id', filterValue).session(this.session).exec() };
                nestedEntires.push({ key: `${key}.${filterKey}`, value: nestedValue });
              }
            }
            return nestedEntires;
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

    this.log.debug('After filter resolve: %j', resolvedFilter);

    return resolvedFilter;
  }

  private modelNameFromFieldList(fieldList: string[]): string {
    const fields = [...fieldList];
    let currentModelName = this.model.modelName;

    while (fields.length > 0) {
      const field = fields.shift();
      const fieldProp = this.refProp(field, currentModelName);
      if (fieldProp && fieldProp.ref) {
        currentModelName = fieldProp.ref;
      }
    }

    return currentModelName;
  }

  private relationModelNames(modelName?: string, exclude: string[] = []): string[] {
    const names: string[] = [];

    const virtuals = this.virtualFields(modelName).map((f) => this.refProp(f, modelName)?.ref);
    const refs = this.referencedFields(modelName).map((f) => this.refProp(f, modelName)?.ref);
    const embedded = this.embeddedFields(modelName).map((f) => this.embeddedType(f, modelName));

    for (const relationModelName of [...virtuals, ...refs, ...embedded]) {
      if (exclude.includes(relationModelName) || names.includes(relationModelName)) {
        continue;
      }
      names.push(relationModelName);
      const childRelationNames = this.relationModelNames(relationModelName, [relationModelName, ...exclude]);
      names.push(...childRelationNames.filter((crn) => !names.includes(crn)));
    }

    return Array.from(new Set<string>(names));
  }

  private fields(modelName?: string): string[] {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.fields;
  }

  private referencedFields(modelName?: string): string[] {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.references;
  }

  private virtualFields(modelName?: string): string[] {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.virtuals;
  }

  private embeddedFields(modelName?: string): string[] {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.embedded;
  }

  private fileFields(modelName?: string): string[] {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.files;
  }

  private fileProps(modelName?: string): Record<string, FileProps> {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.fileProps;
  }

  private refProps(modelName?: string): Record<string, any> {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.refProps;
  }

  private refProp(fieldName: string, modelName?: string): any {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.refProps?.[fieldName];
  }

  private embeddedTypes(modelName?: string): any {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.embeddedTypes;
  }

  private embeddedType(fieldName: string, modelName?: string): string {
    return MongooseResourceService.modelReferences[modelName || this.model.modelName]?.embeddedTypes?.[fieldName];
  }

  private initRelationModelNames(): Record<string, string[]> {
    const relationModelNames: Record<string, string[]> = {};

    if (!this.model?.db?.models) {
      return relationModelNames;
    }

    for (const modelName of Object.keys(this.model?.db?.models)) {
      relationModelNames[modelName] = this.relationModelNames(modelName);
      this.log.debug('%s relation names: %j', modelName, relationModelNames[modelName]);
    }

    return relationModelNames;
  }

  private initAllReferences(): Record<string, ModelReferences> {
    const referencesMap: Record<string, ModelReferences> = {};

    if (!this.model?.db?.models) {
      return referencesMap;
    }

    for (const modelName of Object.keys(this.model?.db?.models)) {
      const model = this.model?.db?.models[modelName];
      referencesMap[modelName] = this.makeReferences(model);
    }

    return referencesMap;
  }

  private makeReferences(model: Model<T & Document>): ModelReferences {
    const references: string[] = [];
    const virtuals: string[] = [];
    const embedded: string[] = [];
    const files: string[] = [];
    const fields: string[] = [];
    const fileProps: Record<string, FileProps> = {};
    const refProps: Record<string, any> = {};
    const embeddedTypes: Record<string, string> = {};

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

      if (!files.includes(fieldName) && fieldData?.type) {
        const classRef = Array.isArray(fieldData?.type)
          ? fieldData?.type[0]?.['classRef']
          : fieldData?.type?.['classRef'];

        if (classRef?.prototype instanceof Document) {
          embedded.push(fieldName);
          embeddedTypes[fieldName] = classRef.name;
        }
      }
    }

    for (const virtualModelName of Object.keys(model?.schema?.virtuals)) {
      const value = model?.schema?.virtuals[virtualModelName];
      if (value?.options && virtualModelName !== 'id') {
        virtuals.push(virtualModelName);
        refProps[virtualModelName] = value?.options;
      }
    }

    this.log.debug('%s file fields: %j', model.modelName, files);
    this.log.debug('%s referenced fields: %j', model.modelName, references);
    this.log.debug('%s embedded fields: %j', model.modelName, embedded);
    this.log.debug('%s virtual fields: %j', model.modelName, virtuals);

    return { fields, references, virtuals, embedded, files, fileProps, refProps, embeddedTypes };
  }

  private setModel(model: Model<T & ResourceSchema>): void {
    this.model = model;
  }

  private setProtected(value: boolean): void {
    this.isProtected = value;
  }

  private setSession(session: ClientSession): void {
    this.session = session;
  }

  private setFileManager(fileManager: FileManager): void {
    this.fileManager = fileManager;
  }
}
