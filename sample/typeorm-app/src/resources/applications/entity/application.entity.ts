import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn
} from 'typeorm';
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { CreatorColumn, ResourceEntity } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/entity';
import { User } from '@resources/users/entity';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

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
  @JoinColumn()
  project: Project;

  @Column()
  projectId: number;

  @ManyToMany(() => User, (user) => user.reviewedApps, { cascade: ['update'] })
  reviewers?: User[];

  @RelationId((app: Application) => app.reviewers)
  reviewerIds?: number[];

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @CreatorColumn({ type: () => User })
  createdBy?: User;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
