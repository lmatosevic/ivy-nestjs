import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as handlebars from 'handlebars';
import * as handlebarsHelpers from 'handlebars-helpers';
import { promises as fsp } from 'fs';
import * as path from 'path';
import * as inlineCss from 'inline-css';
import * as glob from 'glob';
import { get } from 'lodash';
import { CompileConfig, TemplateAdapter } from './template.adapter';
import { TemplateModuleOptions } from '../template.module';
import { TEMPLATE_MODULE_OPTIONS } from '../template.constants';

export type TemplateInfo = {
  templateExt: string;
  templateName: string;
  templateDir: string;
  templatePath: string;
};

@Injectable()
export class HandlebarsAdapter implements TemplateAdapter {
  private readonly logger = new Logger(HandlebarsAdapter.name);
  private precompiledTemplates: { [name: string]: handlebars.TemplateDelegate } = {};

  constructor(@Inject(TEMPLATE_MODULE_OPTIONS) private templateModuleOptions: TemplateModuleOptions) {
    const options = templateModuleOptions.options || {};
    handlebars.registerHelper(handlebarsHelpers());
    handlebars.registerHelper('concat', (...args) => {
      args.pop();
      return args.join('');
    });
    handlebars.registerHelper(options.helpers || {});
  }

  async compile(
    template: string,
    context: Record<string, any>,
    config: CompileConfig = {},
    isFile: boolean = true
  ): Promise<string> {
    const { templateName } = await this.precompile(template, config, isFile);

    const runtimeOptions = get(config, 'options', {
      partials: true,
      data: {}
    });

    if (runtimeOptions.partials !== false) {
      const rootDir = get(config, 'rootDir', '');
      const files = glob.sync(path.join(rootDir, '**', '*.hbs'));
      for (const file of files) {
        const { templateName, templatePath } = await this.precompile(file);
        const templateDir = path.relative(rootDir, path.dirname(file));
        const partialName = path.join(templateDir, templateName).replace(/\\/g, '.').replace(/\//g, '.');
        if (!handlebars.partials[partialName]) {
          const fileContent = await fsp.readFile(templatePath, 'utf-8');
          handlebars.registerPartial(partialName, fileContent);
        }
      }
    }

    const rendered = this.precompiledTemplates[templateName](
      { ...(runtimeOptions.data || {}), ...context },
      {
        ...runtimeOptions,
        partials: runtimeOptions.partials !== false ? this.precompiledTemplates : {}
      }
    );

    const inlineCssOptions = get(config, 'inlineCss', {
      enabled: false,
      url: '_'
    });

    let html = rendered;
    if (inlineCssOptions.enabled) {
      try {
        html = await inlineCss(rendered, inlineCssOptions);
      } catch (e) {
        this.logger.error('Error while inlining css in templates: %j', e);
        throw e;
      }
    }

    return html;
  }

  private async precompile(
    template: string,
    config?: CompileConfig,
    isFile: boolean = true
  ): Promise<TemplateInfo> {
    const { templateExt, templateName, templateDir, templatePath } = isFile
      ? this.templateFileInfo(template, config)
      : this.templateContentInfo();

    if (!this.precompiledTemplates[templateName]) {
      try {
        const content = isFile ? await fsp.readFile(templatePath, 'utf-8') : template;
        const options = get(config, 'options', {});
        this.precompiledTemplates[templateName] = handlebars.compile(content, options);
      } catch (e) {
        this.logger.error('Error while precompiling templates: %j', e);
        throw e;
      }
    }

    return { templateExt, templateName, templateDir, templatePath };
  }

  private templateFileInfo(template: string, config?: CompileConfig): TemplateInfo {
    const templateExt = path.extname(template) || '.hbs';
    const templateName = path.basename(template, path.extname(template));
    const templateDir = path.isAbsolute(template)
      ? path.dirname(template)
      : path.join(get(config, 'rootDir', ''), path.dirname(template));
    const templatePath = path.join(templateDir, templateName + templateExt);
    return { templateExt, templateName, templateDir, templatePath };
  }

  private templateContentInfo(): TemplateInfo {
    const uuid = uuidv4();
    return {
      templateExt: 'hbs',
      templateName: `template_${uuid}`,
      templateDir: null,
      templatePath: null
    };
  }
}
