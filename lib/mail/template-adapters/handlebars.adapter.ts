import { Inject, Injectable, Logger } from '@nestjs/common';
import * as handlebars from 'handlebars';
import { get } from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as inlineCss from 'inline-css';
import * as glob from 'glob';
import { CompileConfig, TemplateAdapter } from './template.adapter';
import { MAIL_MODULE_OPTIONS } from '../mail.constants';
import { MailModuleOptions, TemplateAdapterConfig } from '../mail.module';

@Injectable()
export class HandlebarsAdapter implements TemplateAdapter {
  private readonly logger = new Logger(HandlebarsAdapter.name);
  private precompiledTemplates: { [name: string]: handlebars.TemplateDelegate } = {};

  private config: TemplateAdapterConfig = {
    inlineCssOptions: { url: ' ' },
    inlineCssEnabled: true
  };

  constructor(@Inject(MAIL_MODULE_OPTIONS) private mailModuleOptions: MailModuleOptions) {
    const options = mailModuleOptions.template?.options || {};
    const config = mailModuleOptions.template?.adapterConfig || {};
    handlebars.registerHelper('concat', (...args) => {
      args.pop();
      return args.join('');
    });
    handlebars.registerHelper(options.helpers || {});
    Object.assign(this.config, config);
  }

  async compile(template: string, context: Record<string, any>, config?: CompileConfig): Promise<string> {
    const { templateName } = await this.precompile(template, config);

    const runtimeOptions = get(config, 'options', {
      partials: false,
      data: {}
    });

    if (runtimeOptions.partials) {
      const files = glob.sync(path.join(runtimeOptions.partials.dir, '**', '*.hbs'));
      for (const file of files) {
        const { templateName, templatePath } = await this.precompile(file, runtimeOptions.partials);
        const templateDir = path.relative(runtimeOptions.partials.dir, path.dirname(templatePath));
        handlebars.registerPartial(
          path.join(templateDir, templateName),
          fs.readFileSync(templatePath, 'utf-8')
        );
      }
    }

    const rendered = this.precompiledTemplates[templateName](context, {
      ...runtimeOptions,
      partials: this.precompiledTemplates
    });

    let html = rendered;
    if (this.config.inlineCssEnabled) {
      try {
        html = await inlineCss(rendered, this.config.inlineCssOptions);
      } catch (e) {
        this.logger.error('Error while inlining css in templates: %j', e);
        throw e;
      }
    }

    return html;
  }

  private async precompile(
    template: string,
    config?: CompileConfig
  ): Promise<{ templateName: string; templatePath: string }> {
    const templateExt = path.extname(template) || '.hbs';
    const templateName = path.basename(template, path.extname(template));
    const templateDir = path.isAbsolute(template)
      ? path.dirname(template)
      : path.join(get(config, 'rootDir', ''), path.dirname(template));
    const templatePath = path.join(templateDir, templateName + templateExt);

    if (!this.precompiledTemplates[templateName]) {
      try {
        const template = fs.readFileSync(templatePath, 'utf-8');
        const options = get(config, 'options', {});
        this.precompiledTemplates[templateName] = handlebars.compile(template, options);
      } catch (e) {
        this.logger.error('Error while precompiling templates: %j', e);
        throw e;
      }
    }

    return { templateName, templatePath };
  }
}
