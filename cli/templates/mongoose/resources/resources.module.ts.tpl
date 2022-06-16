import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { {{resourceControllerName}} } from './{{resourceNamePlural}}.controller';
import { {{resourceResolverName}} } from './{{resourceNamePlural}}.resolver';
import { {{resourceServiceName}} } from './{{resourceNamePlural}}.service';
import { {{resourceModelName}}, {{resourceSchemaName}} } from './schema';
import { {{resourcePolicyName}} } from './policy';

@Module({
  imports: [MongooseModule.forFeature([{ name: {{resourceModelName}}.name, schema: {{resourceSchemaName}} }])],
  controllers: [{{resourceControllerName}}],
  providers: [{{resourceServiceName}}, {{resourceResolverName}}, {{resourcePolicyName}}],
  exports: [{{resourceServiceName}}, {{resourcePolicyName}}]
})
export class {{resourceModuleName}} {}
