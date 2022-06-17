import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { CreatorColumn, ResourceEntity } from 'ivy-nestjs/resource';
import { User } from '@resources/users/entity';
import { File } from 'ivy-nestjs/storage/schema';
import { FileColumn, Role } from 'ivy-nestjs';
import { Application } from '@resources/applications/entity';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@ObjectType()
@Entity()
export class Project extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
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
      return user.hasRole(Role.Admin) || user.getId().equals(res.createdBy);
    }
  })
  documents?: File[];

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn()
  owner: User;

  @Column()
  ownerId: number;

  @OneToMany(() => Application, (application) => application.project)
  applications?: Application[];

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
