import * as InlineCss from 'inline-css';

export type InlineCssOptions = InlineCss.Options & { enabled?: boolean };

export type CompileConfig = {
  rootDir?: string;
  options?: Record<string, any>;
  inlineCss?: InlineCssOptions;
};

export interface TemplateAdapter {
  compile(template: string, context: Record<string, any>, config?: CompileConfig, isFile?: boolean): Promise<string>;
}
