import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ResourceEntity } from 'ivy-nestjs/resource';
import { Plan } from '@resources/plans/entity';
import { FileColumn } from 'ivy-nestjs';
import { File } from 'ivy-nestjs/storage/entity';

@ObjectType()
@Entity()
export class Feature extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Plan, (plan) => plan.features, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete'
  })
  plan?: Plan;

  @FileColumn({ maxSize: 3145728 })
  file?: File;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
