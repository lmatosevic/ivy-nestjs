import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResolverTypeMetadata } from '@nestjs/graphql/dist/schema-builder/metadata';
import { TypeMetadataStorage } from '@nestjs/graphql';
import helmet from 'helmet';
import { LoggerService } from '../logger/logger.service';
import { GRAPHQL_MODULE_OPTIONS } from '../graphql/graphql.constant';
import { RESOURCE_CONFIG_KEY } from '../resource';

export class AppUtil {
  static initialize(app: INestApplication): { port: number; host: string; address: string } {
    const logger = new Logger('Initialization');

    app.useLogger(app.get(LoggerService));
    app.flushLogs();

    const configService = app.get(ConfigService);

    const env = configService.get('env');
    logger.log('App running in %s', env);

    const port = configService.get('app.port');
    let host = configService.get('app.host');
    let hostname = configService.get('app.hostname');

    const address = hostname.startsWith('http') ? hostname : `http://${hostname}:${port}`;

    if (configService.get('app.shutdownHooks')) {
      app.enableShutdownHooks();
      logger.log('Shutdown hooks enabled');
    }

    if (configService.get('app.helmet')) {
      app.use(
        helmet({
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false
        })
      );
      logger.log('Helmet security rules enabled');
    }

    if (configService.get('cors.enabled')) {
      app.enableCors({
        origin: configService.get('cors.origin'),
        methods: configService.get('cors.methods'),
        allowedHeaders: configService.get('cors.allowedHeaders'),
        exposedHeaders: configService.get('cors.exposedHeaders'),
        maxAge: configService.get('cors.maxAge'),
        credentials: configService.get('cors.credentials')
      });
      logger.log(`CORS is enabled for origin: ${configService.get('cors.origin')}`);
    }

    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    if (configService.get('app.debug')) {
      logger.warn('Debug mode activated');
    }

    this.upgradeGraphQLSchemaBuilder();

    this.resolveRestControllerOperations(app, configService);
    this.resolveGraphqlResolverOperations(app, configService);

    if (configService.get('rest.enabled') && configService.get('rest.swagger')) {
      const builder = new DocumentBuilder()
        .setTitle(configService.get('app.name'))
        .setDescription(
          '<small><a href="/api-docs-json" target="_blank">api-docs.json</a></small>' +
            '<br><p>' +
            configService.get('app.description') +
            '</p>'
        )
        .setVersion(configService.get('app.version'))
        .addServer(address, 'Default server');

      if (configService.get('auth.jwt.enabled')) {
        builder.addBearerAuth();
      }
      if (configService.get('auth.basic.enabled')) {
        builder.addBasicAuth();
      }
      if (configService.get('auth.oauth2.enabled')) {
        builder.addOAuth2();
      }
      if (configService.get('auth.apikey.enabled')) {
        builder.addApiKey();
      }

      const config = builder.build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api-docs', app, document);
      logger.log(`Swagger docs available on: ${address}/api-docs`);
    }

    if (!configService.get('rest.enabled')) {
      app.use((req, res, next) => {
        if (req.path === '/graphql' || req.path.split('.').length > 1) {
          return next();
        }
        res.sendStatus(404);
      });
    }

    if (configService.get('graphql.enabled') && configService.get('graphql.playground')) {
      app
        .resolve(GRAPHQL_MODULE_OPTIONS, undefined, { strict: false })
        .then(() => {
          logger.log(`GraphQL playground available on: ${address}/graphql`);
        })
        .catch(() => {
          // GraphQL module not imported
        });
    }

    return { port, host, address };
  }

  private static resolveRestControllerOperations(app: INestApplication, config: ConfigService): void {
    const modules = app['container'].getModules();

    const queryMethod = config.get('rest.queryMethod');

    for (const module of modules.values()) {
      for (const controller of module.controllers.values()) {
        const resourceConfig = Reflect.getMetadata(RESOURCE_CONFIG_KEY, controller.metatype);

        if (!resourceConfig) {
          continue;
        }

        const prototype = Object.getPrototypeOf(controller.metatype).prototype;
        this.resolveResourceEndpoints(config, prototype);

        if (queryMethod?.toLowerCase() === 'get') {
          const descriptor = Object.getOwnPropertyDescriptor(prototype, 'query');
          if (descriptor) {
            Reflect.deleteMetadata('path', descriptor.value);
          }
        } else if (queryMethod?.toLowerCase() === 'post') {
          const descriptor = Object.getOwnPropertyDescriptor(prototype, 'queryGet');
          if (descriptor) {
            Reflect.deleteMetadata('path', descriptor.value);
          }
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
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'createBulk');
      if (descriptor) {
        Reflect.deleteMetadata('path', descriptor.value);
        Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
      }
    }

    if (!bulkEnabled || !bulkUpdateEnabled) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'updateBulk');
      if (descriptor) {
        Reflect.deleteMetadata('path', descriptor.value);
        Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
      }
    }

    if (!bulkEnabled || !bulkDeleteEnabled) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'deleteBulk');
      if (descriptor) {
        Reflect.deleteMetadata('path', descriptor.value);
        Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
      }
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
