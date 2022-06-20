import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ResourceEntity } from 'ivy-nestjs/resource';
import { Plan } from '@resources/plans/entity';

@ObjectType()
@Entity()
export class Feature extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Plan, (plan) => plan.features)
  @JoinColumn()
  plan?: Plan;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
