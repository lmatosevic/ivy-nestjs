import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompileConfig, TemplateAdapter } from './adapters';
import { TemplateModuleOptions } from './template.module';
import { TEMPLATE_ADAPTER, TEMPLATE_MODULE_OPTIONS } from './template.constants';
import * as _ from 'lodash';

@Injectable()
export class TemplateService {
  private readonly templateConfig;

  constructor(
    @Inject(TEMPLATE_MODULE_OPTIONS) private templateModuleOptions: TemplateModuleOptions,
    @Inject(TEMPLATE_ADAPTER) private templateAdapter: TemplateAdapter,
    private configService: ConfigService
  ) {
    this.templateConfig = _.merge({ ...this.configService.get('template') }, this.templateModuleOptions);
  }

  async compile(
    template: string,
    context: Record<string, any>,
    isFile: boolean = true,
    config?: CompileConfig
  ): Promise<string> {
    const templateConfig = _.merge({ ...this.templateConfig }, config || {});
    return this.templateAdapter.compile(template, context, isFile, templateConfig);
  }
}
