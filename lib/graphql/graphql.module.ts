import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLModule as NestjsGraphQLModule, GqlModuleOptions } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { DateScalar } from './scalars';
import { MONGOOSE_MODULE_OPTIONS } from '../mongoose/mongoose.constant';
import { GRAPHQL_MODULE_OPTIONS } from './graphql.constant';

@Global()
@Module({})
export class GraphQLModule {
  static forRoot<T extends Record<string, any> = GqlModuleOptions>(options: T = {} as T): DynamicModule {
    return this.createModule([
      {
        provide: GRAPHQL_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync<T extends Record<string, any> = GqlModuleOptions>(
    options: ModuleAsyncOptions<T>
  ): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, MONGOOSE_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: GraphQLModule,
      imports: [
        ...imports,
        NestjsGraphQLModule.forRootAsync<ApolloDriverConfig>({
          driver: ApolloDriver,
          inject: [GRAPHQL_MODULE_OPTIONS, ConfigService],
          useFactory: async (graphqlModuleOptions: GqlModuleOptions, conf: ConfigService) => ({
            debug: conf.get('app.debug'),
            playground: conf.get('graphql.playground'),
            autoSchemaFile: `${process.cwd()}/graphql/schema.gql`,
            sortSchema: true,
            cors: {
              origin: conf.get('cors.origin'),
              credentials: conf.get('cors.credentials')
            },
            ...graphqlModuleOptions
          })
        })
      ],
      providers: [...providers, DateScalar],
      exports: [GRAPHQL_MODULE_OPTIONS, NestjsGraphQLModule]
    };
  }
}
