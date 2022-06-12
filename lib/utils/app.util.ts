import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResolverTypeMetadata } from '@nestjs/graphql/dist/schema-builder/metadata';
import { TypeMetadataStorage } from '@nestjs/graphql';
import helmet from 'helmet';
import { LoggerService } from '../logger/logger.service';

export class AppUtil {
  static initialize(app: INestApplication): { port: number; host: string; address: string } {
    const logger = new Logger('Initialization');

    app.useLogger(app.get(LoggerService));
    app.flushLogs();

    const configService = app.get(ConfigService);

    logger.log('App running in %s', configService.get('env'));

    const port = configService.get('app.port');
    const host = configService.get('app.host');
    const address = `http://${host}:${port}`;

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
      logger.log(`GraphQL playground available on: ${address}/graphql`);
    }

    this.upgradeGraphQLSchemaBuilder();

    return { port, host, address };
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
