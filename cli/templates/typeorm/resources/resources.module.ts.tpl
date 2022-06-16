import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { {{resourceControllerName}} } from './{{resourceNamePlural}}.controller';
import { {{resourceResolverName}} } from './{{resourceNamePlural}}.resolver';
import { {{resourceServiceName}} } from './{{resourceNamePlural}}.service';
import { {{resourceModelName}} } from './entity';
import { {{resourcePolicyName}} } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([{{resourceModelName}}])],
  controllers: [{{resourceControllerName}}],
  providers: [{{resourceServiceName}}, {{resourceResolverName}}, {{resourcePolicyName}}],
  exports: [{{resourceServiceName}}, {{resourcePolicyName}}]
})
export class {{resourceModuleName}} {}
