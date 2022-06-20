import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { {{resourceControllerName}} } from './{{resourceFileNamePlural}}.controller';
import { {{resourceResolverName}} } from './{{resourceFileNamePlural}}.resolver';
import { {{resourceServiceName}} } from './{{resourceFileNamePlural}}.service';
import { {{resourceModelName}} } from './entity';
import { {{resourcePolicyName}} } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([{{resourceModelName}}])],
  controllers: [{{resourceControllerName}}],
  providers: [{{resourceServiceName}}, {{resourceResolverName}}, {{resourcePolicyName}}],
  exports: [{{resourceServiceName}}, {{resourcePolicyName}}]
})
export class {{resourceModuleName}} {}
