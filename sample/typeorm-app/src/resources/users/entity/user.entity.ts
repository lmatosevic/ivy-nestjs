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
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { AuthUser } from 'ivy-nestjs/auth';
import { AuthSource, Role } from 'ivy-nestjs/enums';
import { CreatorColumn, ResourceEntity } from 'ivy-nestjs/resource';
import { FileColumn } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/entity';
import { Project } from '@resources/projects/entity';
import { Application } from '@resources/applications/entity';
import { Exclude } from 'class-transformer';
import { ApiHideProperty } from '@nestjs/swagger';

@ObjectType()
@Entity()
export class User extends ResourceEntity implements AuthUser {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
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

  @FileColumn({ mimeType: 'image/(jpg|jpeg|png|gif)', maxSize: '1.23 MB' })
  avatar?: File;

  @OneToMany(() => Project, (project) => project.owner)
  projects?: Project[];

  @RelationId((user: User) => user.projects)
  projectIds?: number[];

  @ManyToMany(() => Application, (application) => application.reviewers)
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
