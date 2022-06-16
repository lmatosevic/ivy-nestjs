import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule as NestjsConfigModule, ConfigModuleOptions } from '@nestjs/config';
import configuration from './configuration';
import { CONFIG_MODULE_OPTIONS } from './config.constants';
import { ModuleUtil } from '../utils';

@Module({
  imports: [
    NestjsConfigModule.forRoot({
      envFilePath: ModuleUtil.getEnvFiles(),
      load: [configuration],
      isGlobal: true
    })
  ],
  exports: [NestjsConfigModule]
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
        NestjsConfigModule.forRoot({
          ...options,
          envFilePath: [
            ...(ModuleUtil.getEnvFiles()),
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
      exports: [CONFIG_MODULE_OPTIONS, NestjsConfigModule]
    };
  }
}
