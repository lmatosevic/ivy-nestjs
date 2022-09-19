import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType } from '@nestjs/graphql';
import { ResourceEntity } from 'ivy-nestjs/resource';

@ObjectType()
@Entity()
export class {{resourceModelName}} extends ResourceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
