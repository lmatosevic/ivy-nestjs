import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ResourceEntity } from 'ivy-nestjs/resource';
import { User } from '@resources/users/entity';
import { File } from 'ivy-nestjs/storage/schema';
import { AuthUser, FileColumn, Role } from 'ivy-nestjs';
import { Application } from '@resources/applications/entity';
import { ApiProperty } from '@nestjs/swagger';

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
  owner: User;

  @OneToMany(() => Application, (application) => application.project)
  applications?: Application[];

  @Field(() => User)
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { nullable: true })
  createdBy?: AuthUser;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
