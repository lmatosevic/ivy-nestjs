import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { {{resourceModelName}} } from './schema';
import { {{createDtoName}}, {{updateDtoName}} } from './dto';
import { {{resourceServiceName}} } from './{{resourceNamePlural}}.service';
import { {{resourcePolicyName}} } from './policy';

@Controller('{{resourceNamePlural}}')
export class {{resourceControllerName}} extends ResourceController({{resourceModelName}}, {{createDtoName}}, {{updateDtoName}}) {
  constructor(private {{resourceNamePlural}}Service: {{resourceServiceName}}, private {{resourceNamePlural}}Policy: {{resourcePolicyName}}) {
    super({{resourceNamePlural}}Service, {{resourceNamePlural}}Policy);
  }
}
