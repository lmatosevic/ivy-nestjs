import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { TemplateService } from './template.service';
import { InlineCssOptions, TemplateAdapter, HandlebarsAdapter } from './adapters';
import { TEMPLATE_ADAPTER, TEMPLATE_MODULE_OPTIONS } from './template.constants';

export interface TemplateModuleOptions {
  type?: 'handlebars' | 'custom';
  rootDir?: string;
  options?: Record<string, any>;
  inlineCss?: InlineCssOptions;
  templateAdapter?: TemplateAdapter;
}

@Global()
@Module({})
export class TemplateModule {
  static forRoot(options: TemplateModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: TEMPLATE_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<TemplateModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, TEMPLATE_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: TemplateModule,
      imports: [...imports],
      providers: [...providers, TemplateService, this.templateAdatperProvider()],
      exports: [TEMPLATE_MODULE_OPTIONS, TemplateService]
    };
  }

  private static templateAdatperProvider(): Provider {
    return {
      provide: TEMPLATE_ADAPTER,
      inject: [TEMPLATE_MODULE_OPTIONS, ConfigService],
      useFactory: async (options: TemplateModuleOptions, config: ConfigService) => {
        const type = options.type ?? config.get('template.type');
        switch (type) {
          case 'handlebars':
            return new HandlebarsAdapter(options);
          default:
            return options.templateAdapter;
        }
      }
    };
  }
}
