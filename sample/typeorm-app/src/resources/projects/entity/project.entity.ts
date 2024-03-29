import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { HideField, ObjectType } from '@nestjs/graphql';
import { CreatorColumn, PopulateRelation, ResourceEntity } from 'ivy-nestjs/resource';
import { User } from '@resources/users/entity';
import { File } from 'ivy-nestjs/storage/entity';
import { FileColumn, Role } from 'ivy-nestjs';
import { Application } from '@resources/applications/entity';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Plan } from '@resources/plans/entity';

@ObjectType()
@Entity()
export class Project extends ResourceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @FileColumn({
    access: 'protected',
    mimeType: '*/*',
    maxSize: '1.25 GB',
    maxCount: 8,
    isArray: true,
    policy: (user, meta, res) => {
      return user.hasRole(Role.Admin) || user.getId() === res.createdById;
    }
  })
  documents?: File[];

  @Column({ type: 'int', default: 1 })
  score?: number;

  @Column()
  ownerId: number;

  @ManyToOne(() => User, (user) => user.projects)
  owner: User;

  @PopulateRelation()
  @OneToOne(() => Plan, (plan) => plan.project)
  @JoinColumn()
  plan: Plan;

  @Column()
  planId: number;

  @PopulateRelation()
  @OneToMany(() => Application, (application) => application.project)
  applications?: Application[];

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @CreatorColumn({ type: () => User })
  createdBy?: User;

  @Column({ nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
