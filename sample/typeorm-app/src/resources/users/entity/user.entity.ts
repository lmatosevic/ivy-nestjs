import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AuthUser } from 'ivy-nestjs/auth';
import { AuthSource, Role } from 'ivy-nestjs/enums';
import { ResourceEntity } from 'ivy-nestjs/resource';
import { FileColumn } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/entity';

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
  consent: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  loginAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  logoutAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @FileColumn({ mimeType: 'image/(jpg|jpeg|png|gif)', maxSize: '5 MB' })
  avatar?: File;

  getId(): any {
    return this.id;
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
