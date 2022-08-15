import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { QueueModule } from '../queue';
import { MailService } from './mail.service';
import { MailJob } from './mail.job';
import { MailIntegrationService, SendinblueService, SmtpService } from './integrations';
import { MAIL_INTEGRATION_SERVICE, MAIL_MODULE_OPTIONS, MAIL_QUEUE_NAME } from './mail.constants';
import { ConfigService } from '@nestjs/config';

export interface MailModuleOptions {
  type?: 'smtp' | 'sendinblue' | 'custom';
  queueEnabled?: boolean;
  senderName?: string;
  senderAddress?: string;
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
      providers: [...providers, MailService, this.integrationServiceProvider()],
      exports: [MAIL_MODULE_OPTIONS, MailService]
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
}
