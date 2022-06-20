import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { {{resourceModelName}} } from './entity';
import { {{createDtoName}}, {{updateDtoName}} } from './dto';
import { {{resourceServiceName}} } from './{{resourceFileNamePlural}}.service';
import { {{resourcePolicyName}} } from './policy';

@Controller('{{resourceFileNamePlural}}')
export class {{resourceControllerName}} extends ResourceController({{resourceModelName}}, {{createDtoName}}, {{updateDtoName}}) {
  constructor(private {{resourceNamePlural}}Service: {{resourceServiceName}}, private {{resourceNamePlural}}Policy: {{resourcePolicyName}}) {
    super({{resourceNamePlural}}Service, {{resourceNamePlural}}Policy);
  }
}
