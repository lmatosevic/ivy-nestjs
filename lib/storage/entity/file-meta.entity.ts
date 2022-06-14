import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { HideField, ObjectType } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { ApiHideProperty } from '@nestjs/swagger';

@ObjectType()
@Entity({ name: '_file_meta' })
export class FileMeta {
  @ApiHideProperty()
  @HideField()
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @Column({ unique: true })
  name: string;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @Column()
  resource: string;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @Column({ nullable: true })
  resourceId?: number;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @Column()
  field: string;

  @Column()
  mimeType?: string;

  @Column({ type: 'int' })
  size?: number;

  @CreateDateColumn()
  createdAt?: Date;

  @ApiHideProperty()
  @HideField()
  @Exclude()
  @UpdateDateColumn()
  updatedAt?: Date;
}
