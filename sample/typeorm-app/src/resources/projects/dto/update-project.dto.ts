import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateProjectDto } from './create-project.dto';

@InputType()
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
