import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { {{resourceControllerName}} } from './{{resourceFileNamePlural}}.controller';
import { {{resourceResolverName}} } from './{{resourceFileNamePlural}}.resolver';
import { {{resourceServiceName}} } from './{{resourceFileNamePlural}}.service';
import { {{resourceModelName}}, {{resourceSchemaName}} } from './schema';
import { {{resourcePolicyName}} } from './policy';

@Module({
  imports: [MongooseModule.forFeature([{ name: {{resourceModelName}}.name, schema: {{resourceSchemaName}} }])],
  controllers: [{{resourceControllerName}}],
  providers: [{{resourceServiceName}}, {{resourceResolverName}}, {{resourcePolicyName}}],
  exports: [{{resourceServiceName}}, {{resourcePolicyName}}]
})
export class {{resourceModuleName}} {}
