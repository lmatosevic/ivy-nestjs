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
import { HideField, ObjectType } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { CreatorColumn, PopulateRelation, ResourceEntity } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/entity';
import { User } from '@resources/users/entity';
import { Category } from '@resources/categories/entity';

@ObjectType()
@Entity()
export class Application extends ResourceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @ManyToOne(() => Project, (project) => project.applications, { eager: true })
  project: Project;

  @Column()
  projectId: number;

  @ManyToMany(() => User, (user) => user.reviewedApps)
  reviewers?: User[];

  @RelationId((app: Application) => app.reviewers)
  reviewerIds?: number[];

  @PopulateRelation()
  @ManyToOne(() => Category, (category) => category.applications)
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
