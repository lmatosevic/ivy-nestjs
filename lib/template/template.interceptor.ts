import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, switchMap } from 'rxjs';
import { TemplateService } from './template.service';
import { RENDER_KEY, RenderConfig } from './decorators';
import { ContextUtil } from '../utils';

@Injectable()
export class TemplateInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private templateService: TemplateService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<string> {
    const ctx = ContextUtil.normalizeContext(context);
    const renderConfig = this.reflector.getAllAndOverride<RenderConfig>(RENDER_KEY, [ctx.getHandler(), ctx.getClass()]);

    if (!renderConfig) {
      return next.handle();
    }

    return next.handle().pipe(
      switchMap((data: any) =>
        this.templateService.compile(renderConfig.template, {
          ...data,
          ...(renderConfig.context || {})
        })
      )
    );
  }
}
