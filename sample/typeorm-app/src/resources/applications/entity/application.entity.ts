import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ResourceEntity } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/entity';
import { User } from '@resources/users/entity';
import { ApiProperty } from '@nestjs/swagger';
import { AuthUser } from 'ivy-nestjs';

@ObjectType()
@Entity()
export class Application extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  title: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @ManyToOne(() => Project, (project) => project.applications)
  project: Project;

  @ManyToMany(() => User, (user) => user.reviewedApps)
  reviewers?: User[];

  @Field(() => User)
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  createdBy?: AuthUser;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
