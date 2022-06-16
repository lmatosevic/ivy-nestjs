import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { {{resourceModelName}} } from './entity';
import { {{createDtoName}}, {{updateDtoName}} } from './dto';
import { {{resourceServiceName}} } from './{{resourceNamePlural}}.service';
import { {{resourcePolicyName}} } from './policy';

@Resolver(() => {{resourceModelName}})
export class {{resourceResolverName}} extends ResourceResolver({{resourceModelName}}, {{createDtoName}}, {{updateDtoName}}) {
  constructor(private {{resourceNamePlural}}Service: {{resourceServiceName}}, private {{resourceNamePlural}}Policy: {{resourcePolicyName}}) {
    super({{resourceNamePlural}}Service, {{resourceNamePlural}}Policy);
  }
}
