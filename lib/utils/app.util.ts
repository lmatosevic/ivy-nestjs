import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ResolverTypeMetadata } from '@nestjs/graphql/dist/schema-builder/metadata';
import { TypeMetadataStorage } from '@nestjs/graphql';
import { json, urlencoded } from 'body-parser';
import helmet from 'helmet';
import * as fs from 'fs/promises';
import { LoggerService } from '../logger/logger.service';
import { GRAPHQL_MODULE_OPTIONS } from '../graphql/graphql.constant';
import { RESOURCE_CONFIG_KEY } from '../resource';
import { ReflectionUtil } from './reflection.util';

export class AppUtil {
  static async initialize(app: INestApplication): Promise<{ port: number; host: string; address: string }> {
    const logger = new Logger('Initialization');

    app.useLogger(app.get(LoggerService));
    app.flushLogs();

    const conf = app.get(ConfigService);

    const bodySizeLimit = conf.get('app.bodySizeLimit');
    app.use(json({ limit: bodySizeLimit }));
    app.use(urlencoded({ limit: bodySizeLimit, extended: true }));

    const expressApp = app as NestExpressApplication;
    if (conf.get('app.assetsEnabled') && expressApp.useStaticAssets) {
      expressApp.useStaticAssets(conf.get('app.assetsDir'), {
        prefix: conf.get('app.assetsPrefix')
      });
    }

    const env = conf.get('env');
    logger.log('App running in %s', env);

    const port = conf.get('app.port');
    let host = conf.get('app.host');
    let hostname = conf.get('app.hostname');

    const address = hostname.startsWith('http') ? hostname : `http://${hostname}:${port}`;

    if (conf.get('app.shutdownHooksEnabled')) {
      app.enableShutdownHooks();
      logger.log('Shutdown hooks enabled');
    }

    if (conf.get('app.helmetEnabled')) {
      app.use(
        helmet({
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: false
        })
      );
      logger.log('Helmet security rules enabled');
    }

    if (conf.get('cors.enabled')) {
      app.enableCors({
        origin: conf.get('cors.origin'),
        methods: conf.get('cors.methods'),
        allowedHeaders: conf.get('cors.allowedHeaders'),
        exposedHeaders: conf.get('cors.exposedHeaders'),
        maxAge: conf.get('cors.maxAge'),
        credentials: conf.get('cors.credentials')
      });
      logger.log(`CORS is enabled for origin: ${conf.get('cors.origin')}`);
    }

    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    if (conf.get('app.debug')) {
      logger.warn('Debug mode activated');
    }

    this.upgradeGraphQLSchemaBuilder();

    this.resolveRestControllerOperations(app, conf);
    this.resolveGraphqlResolverOperations(app, conf);

    if (conf.get('rest.enabled') && conf.get('rest.swagger') && env !== 'test') {
      const builder = new DocumentBuilder()
        .setTitle(conf.get('app.name'))
        .setDescription(
          '<small><a href="/api-docs-json" target="_blank">api-docs.json</a></small>' +
            '<br><p>' +
            conf.get('app.description') +
            '</p>'
        )
        .setVersion(conf.get('app.version'))
        .addServer(address, 'Default server');

      if (conf.get('auth.jwt.enabled')) {
        builder.addBearerAuth();
      }
      if (conf.get('auth.basic.enabled')) {
        builder.addBasicAuth();
      }
      if (conf.get('auth.oauth2.enabled')) {
        builder.addOAuth2();
      }
      if (conf.get('auth.apikey.enabled')) {
        builder.addApiKey();
      }

      const config = builder.build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api-docs', app, document);

      const docsDir = `${process.cwd()}/openapi`;
      try {
        await fs.access(docsDir);
      } catch {
        await fs.mkdir(docsDir, { recursive: true });
      }
      await fs.writeFile(`${docsDir}/api-docs.json`, JSON.stringify(document, null, 4));

      logger.log(`Swagger docs available on: ${address}/api-docs`);
    }

    if (!conf.get('rest.enabled')) {
      app.use((req, res, next) => {
        if (req.path === '/graphql' || req.path.split('.').length > 1) {
          return next();
        }
        res.sendStatus(404);
      });
    }

    if (conf.get('graphql.enabled') && conf.get('graphql.playground') && env !== 'test') {
      try {
        await app.resolve(GRAPHQL_MODULE_OPTIONS, undefined, { strict: false });
        logger.log(`GraphQL playground available on: ${address}/graphql`);
      } catch (e) {
        // GraphQL module not imported
      }
    }

    if (conf.get('docsOnly')) {
      await app.init();
      logger.log('Documentation generated, exiting...');
      await app.close();
      process.exit(0);
    }

    return { port, host, address };
  }

  private static resolveRestControllerOperations(app: INestApplication, config: ConfigService): void {
    const modules = app['container'].getModules();

    const queryMethod = config.get('rest.queryMethod');
    const aggregateMethod = config.get('rest.aggregateMethod');

    for (const module of modules.values()) {
      for (const controller of module.controllers.values()) {
        const resourceConfig = Reflect.getMetadata(RESOURCE_CONFIG_KEY, controller.metatype);

        if (!resourceConfig) {
          continue;
        }

        const prototype = Object.getPrototypeOf(controller.metatype).prototype;
        this.resolveResourceEndpoints(config, prototype);

        if (queryMethod?.toLowerCase() === 'get') {
          ReflectionUtil.deleteResourceOperation(prototype, 'query');
        } else if (queryMethod?.toLowerCase() === 'post') {
          ReflectionUtil.deleteResourceOperation(prototype, 'queryGet');
        }

        if (aggregateMethod?.toLowerCase() === 'get') {
          ReflectionUtil.deleteResourceOperation(prototype, 'aggregate');
        } else if (aggregateMethod?.toLowerCase() === 'post') {
          ReflectionUtil.deleteResourceOperation(prototype, 'aggregateGet');
        }
      }
    }
  }

  private static resolveGraphqlResolverOperations(app: INestApplication, config: ConfigService): void {
    const modules = app['container'].getModules();

    for (const module of modules.values()) {
      for (const resolver of module.providers.values()) {
        if (!resolver.metatype) {
          continue;
        }

        const resourceConfig = Reflect.getMetadata(RESOURCE_CONFIG_KEY, resolver.metatype);

        if (!resourceConfig) {
          continue;
        }

        const prototype = Object.getPrototypeOf(resolver.metatype).prototype;
        this.resolveResourceEndpoints(config, prototype);
      }
    }
  }

  private static resolveResourceEndpoints(config: ConfigService, prototype: any): void {
    const bulkEnabled = config.get('bulk.enabled');
    const bulkCreateEnabled = config.get('bulk.createEnabled');
    const bulkUpdateEnabled = config.get('bulk.updateEnabled');
    const bulkDeleteEnabled = config.get('bulk.deleteEnabled');

    if (!bulkEnabled || !bulkCreateEnabled) {
      ReflectionUtil.deleteResourceOperation(prototype, 'createBulk');
    }

    if (!bulkEnabled || !bulkUpdateEnabled) {
      ReflectionUtil.deleteResourceOperation(prototype, 'updateBulk');
    }

    if (!bulkEnabled || !bulkDeleteEnabled) {
      ReflectionUtil.deleteResourceOperation(prototype, 'deleteBulk');
    }
  }

  private static upgradeGraphQLSchemaBuilder(): void {
    TypeMetadataStorage.addMutationMetadata = (metadata: ResolverTypeMetadata) => {
      const descriptor = Object.getOwnPropertyDescriptor(metadata.target.prototype, metadata.methodName);
      const typeData = Reflect.getMetadata('graphql:resolver_type', descriptor.value);
      if (typeData) {
        TypeMetadataStorage['mutations'].push(metadata);
      }
    };

    TypeMetadataStorage.addQueryMetadata = (metadata: ResolverTypeMetadata) => {
      const descriptor = Object.getOwnPropertyDescriptor(metadata.target.prototype, metadata.methodName);
      const typeData = Reflect.getMetadata('graphql:resolver_type', descriptor.value);
      if (typeData) {
        TypeMetadataStorage['queries'].push(metadata);
      }
    };
  }
}
