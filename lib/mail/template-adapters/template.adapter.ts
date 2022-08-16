export type CompileConfig = {
  rootDir?: string;
  options?: Record<string, any>;
};

export interface TemplateAdapter {
  compile(template: string, context: Record<string, any>, config?: CompileConfig): Promise<string>;
}
