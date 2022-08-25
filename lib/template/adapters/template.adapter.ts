export type InlineCssOptions = {
  url?: string;
  enabled?: boolean;
};

export type CompileConfig = {
  rootDir?: string;
  options?: Record<string, any>;
  inlineCss?: InlineCssOptions;
};

export interface TemplateAdapter {
  compile(
    template: string,
    context: Record<string, any>,
    isFile?: boolean,
    config?: CompileConfig
  ): Promise<string>;
}
