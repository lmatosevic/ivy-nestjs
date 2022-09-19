import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import { HideField, ObjectType } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { AuthUser } from 'ivy-nestjs/auth';
import { AuthSource, Role } from 'ivy-nestjs/enums';
import { CreatorColumn, PopulateRelation, ResourceEntity } from 'ivy-nestjs/resource';
import { FileColumn } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/entity';
import { Project } from '@resources/projects/entity';
import { Application } from '@resources/applications/entity';

@ObjectType()
@Entity()
export class User extends ResourceEntity implements AuthUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: Role, default: Role.User })
  role: Role;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @Column({ type: 'enum', enum: AuthSource, default: AuthSource.Local })
  authSource: AuthSource;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @Column({ nullable: true })
  passwordHash: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  consent: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  loginAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  logoutAt?: Date;

  @FileColumn({
    mimeType: 'image/(jpg|jpeg|png|gif)',
    maxSize: '1.23 MB',
    dirname: () => '{{resourceName}}/{{fieldName}}',
    filename: () => '{{name}}-{{hash}}.{{extension}}'
  })
  avatar?: File;

  @PopulateRelation()
  @OneToMany(() => Project, (project) => project.owner)
  projects?: Project[];

  @RelationId((user: User) => user.projects)
  projectIds?: number[];

  @PopulateRelation()
  @ManyToMany(() => Application, (application) => application.reviewers, { eager: true })
  @JoinTable()
  reviewedApps?: Application[];

  @RelationId((user: User) => user.reviewedApps)
  reviewedAppIds?: number[];

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @CreatorColumn({ type: () => User })
  createdBy?: User;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  getId(): any {
    return this.id;
  }

  getEmail(): string {
    return this.email;
  }

  getUsername(): string {
    return this.email;
  }

  setUsername(name: string): void {
    this.email = name;
  }

  hasRole(role: Role): boolean {
    return this.role === role;
  }
}
