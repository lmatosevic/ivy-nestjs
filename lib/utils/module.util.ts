import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common';

export interface ModuleAsyncOptions<T> extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ModuleOptionsFactory<T>>;
  useClass?: Type<ModuleOptionsFactory<T>>;
  useFactory?: (...args: any[]) => Promise<T> | T;
  inject?: any[];
}

export interface ModuleOptionsFactory<T> {
  createOptions(): Promise<T> | T;
}

export class ModuleUtil {
  static makeAsyncImportsAndProviders<T = any>(
    options: ModuleAsyncOptions<T>,
    optionsKey: string
  ): { imports: any[]; providers: any[] } {
    const providers = [];

    if (options.useFactory) {
      providers.push({
        provide: optionsKey,
        useFactory: options.useFactory,
        inject: options.inject || []
      });
    } else if (options.useExisting || options.useClass) {
      const inject = [(options.useClass || options.useExisting) as Type<ModuleOptionsFactory<T>>];

      providers.push({
        provide: optionsKey,
        useFactory: async (optionsFactory: ModuleOptionsFactory<T>) => await optionsFactory.createOptions(),
        inject
      });

      if (options.useClass) {
        const useClass = options.useClass as Type<ModuleOptionsFactory<T>>;
        providers.push({
          provide: useClass,
          useClass
        });
      }
    }

    const imports = options.imports || [];

    return { imports, providers };
  }
}
