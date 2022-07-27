import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PopulateRelation, ResourceEntity } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/entity';
import { Feature } from '@resources/features/entity';
import { FileColumn } from 'ivy-nestjs';
import { File } from 'ivy-nestjs/storage/entity';

@ObjectType()
@Entity()
export class Plan extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  name: string;

  @OneToOne(() => Project, (project) => project.plan)
  project?: Project;

  @PopulateRelation()
  @OneToMany(() => Feature, (feature) => feature.plan, {
    cascade: true
  })
  features?: Feature[];

  @FileColumn({ maxSize: 3145728, maxCount: 5, isArray: true })
  files?: File[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
