import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleAsyncOptions, ModuleUtil } from '../../../utils';
import { VerificationToken as VerificationTokenEntity } from './entity';
import { VerificationToken, VerificationTokenSchema } from './schema';
import { MongooseVerificationTokenService, TypeOrmVerificationTokenService } from './services';
import { VerificationService } from './verification.service';
import { VERIFICATION_MODULE_OPTIONS, VERIFICATION_TOKEN_SERVICE } from './verification.constants';

export type TokenMethodType = 'bytes' | 'string' | 'base32' | 'base62' | 'uuidv4' | 'uuidv5';

export interface VerificationModuleOptions {
  tokenType?: TokenMethodType;
  tokenLength?: number;
  tokenPrefix?: string;
  enabled?: boolean;
}

@Global()
@Module({})
export class VerificationModule {
  static forRoot(options: VerificationModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: VERIFICATION_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<VerificationModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, VERIFICATION_MODULE_OPTIONS);
    return this.createModule(providers, [...imports]);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    const env = ModuleUtil.getCurrentEnv();
    const dbType = env.DB_TYPE || 'mongoose';

    const { databaseModule, serviceProvider } = this.databaseModuleAndServiceProviders(dbType);

    return {
      module: VerificationModule,
      imports: [...imports, databaseModule],
      providers: [...providers, VerificationService, serviceProvider],
      exports: [VERIFICATION_MODULE_OPTIONS, VERIFICATION_TOKEN_SERVICE, VerificationService]
    };
  }

  private static databaseModuleAndServiceProviders(dbType: string): {
    databaseModule: DynamicModule;
    serviceProvider: Provider;
  } {
    let databaseModule;
    let databaseService;

    if (dbType === 'mongoose') {
      databaseModule = MongooseModule.forFeature([
        {
          name: VerificationToken.name,
          schema: VerificationTokenSchema,
          collection: '_verificationtokens'
        }
      ]);
      databaseService = MongooseVerificationTokenService;
    } else {
      databaseModule = TypeOrmModule.forFeature([VerificationTokenEntity]);
      databaseService = TypeOrmVerificationTokenService;
    }

    return {
      databaseModule,
      serviceProvider: {
        provide: VERIFICATION_TOKEN_SERVICE,
        useClass: databaseService
      }
    };
  }
}
