import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { CreatorColumn, PopulateRelation, ResourceEntity } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/entity';
import { User } from '@resources/users/entity';
import { Category } from '@resources/categories/entity';

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

  @ManyToOne(() => Project, (project) => project.applications, { cascade: ['update'], eager: true })
  project: Project;

  @Column()
  projectId: number;

  @ManyToMany(() => User, (user) => user.reviewedApps, { cascade: ['update'] })
  reviewers?: User[];

  @RelationId((app: Application) => app.reviewers)
  reviewerIds?: number[];

  @PopulateRelation()
  @ManyToOne(() => Category, (category) => category.applications, {
    cascade: ['update']
  })
  category?: Category;

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
