import { SetMetadata } from '@nestjs/common';

export const RENDER_KEY = 'render';

export type RenderConfig = {
  template: string;
  context?: Record<string, any>;
};

export const Render = (template: string, context?: Record<string, any>) =>
  SetMetadata(RENDER_KEY, { template, context });
