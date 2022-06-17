import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateApplicationDto } from './create-application.dto';

@InputType()
export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}
