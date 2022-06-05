import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule as NestJsConfigModule, ConfigModuleOptions } from '@nestjs/config';
import configuration from './configuration';
import { CONFIG_MODULE_OPTIONS } from './config.constants';

@Module({
  imports: [
    NestJsConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : ['.env.local', '.env'],
      load: [configuration],
      isGlobal: true
    })
  ],
  exports: [NestJsConfigModule]
})
export class ConfigModule {
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    return this.createModule(
      [
        {
          provide: CONFIG_MODULE_OPTIONS,
          useValue: options
        }
      ],
      [
        NestJsConfigModule.forRoot({
          ...options,
          envFilePath: [
            ...(process.env.NODE_ENV === 'test'
              ? ['.env.test', '.env']
              : ['.env.local', '.env']),
            ...(options.envFilePath || [])
          ],
          load: [configuration, ...(options.load || [])],
          isGlobal: options.isGlobal ?? true
        })
      ]
    );
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: ConfigModule,
      imports: [...imports],
      providers: [...providers],
      exports: [CONFIG_MODULE_OPTIONS, NestJsConfigModule]
    };
  }
}
