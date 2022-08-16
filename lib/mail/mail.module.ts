import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { QueueModule } from '../queue';
import { MailService } from './mail.service';
import { MailJob } from './mail.job';
import { MailIntegrationService, SendinblueService, SmtpService } from './integrations';
import { HandlebarsAdapter, TemplateAdapter } from './template-adapters';
import {
  MAIL_INTEGRATION_SERVICE,
  MAIL_MODULE_OPTIONS,
  MAIL_QUEUE_NAME,
  MAIL_TEMPLATE_ADAPTER
} from './mail.constants';

export type TemplateAdapterConfig = {
  inlineCssOptions?: { url?: string };
  inlineCssEnabled?: boolean;
};

export interface MailModuleOptions {
  type?: 'smtp' | 'sendinblue' | 'custom';
  queueEnabled?: boolean;
  senderName?: string;
  senderAddress?: string;
  template?: {
    type?: 'handlebars' | 'custom';
    rootDir?: string;
    options?: Record<string, any>;
    adapterConfig?: TemplateAdapterConfig;
    templateAdapter?: TemplateAdapter;
    enabled?: boolean;
  };
  smtp?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string;
  };
  sendinblue?: {
    apiKey: string;
  };
  integrationService?: MailIntegrationService;
}

@Global()
@Module({})
export class MailModule {
  static forRoot(options: MailModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: MAIL_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<MailModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, MAIL_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    const env = ModuleUtil.getCurrentEnv();
    const queueEnabled = env.MAIL_QUEUE_ENABLED !== 'false';

    if (queueEnabled) {
      imports.push(QueueModule.registerQueue({ name: MAIL_QUEUE_NAME }));
      providers.push(MailJob);
    }

    return {
      module: MailModule,
      imports: [...imports],
      providers: [
        ...providers,
        MailService,
        this.integrationServiceProvider(),
        this.templateAdatperProvider()
      ],
      exports: [MAIL_MODULE_OPTIONS, MAIL_INTEGRATION_SERVICE, MAIL_TEMPLATE_ADAPTER, MailService]
    };
  }

  private static integrationServiceProvider(): Provider {
    return {
      provide: MAIL_INTEGRATION_SERVICE,
      inject: [MAIL_MODULE_OPTIONS, ConfigService],
      useFactory: async (options: MailModuleOptions, config: ConfigService) => {
        const mailType = options.type ?? config.get('mail.type');
        switch (mailType) {
          case 'smtp':
            return new SmtpService(options, config);
          case 'sendinblue':
            return new SendinblueService(options, config);
          default:
            return options.integrationService;
        }
      }
    };
  }

  private static templateAdatperProvider(): Provider {
    return {
      provide: MAIL_TEMPLATE_ADAPTER,
      inject: [MAIL_MODULE_OPTIONS, ConfigService],
      useFactory: async (options: MailModuleOptions, config: ConfigService) => {
        const mailType = options.template?.type ?? config.get('mail.template.type');
        switch (mailType) {
          case 'handlebars':
            return new HandlebarsAdapter(options);
          default:
            return options.template?.templateAdapter;
        }
      }
    };
  }
}
