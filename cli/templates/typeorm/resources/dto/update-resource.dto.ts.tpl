import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { {{createDtoName}} } from './create-{{resourceFileName}}.dto';

@InputType()
export class {{updateDtoName}} extends PartialType({{createDtoName}}) {}
