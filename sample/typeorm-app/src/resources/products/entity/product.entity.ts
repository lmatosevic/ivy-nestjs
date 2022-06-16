import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Field, ObjectType, ID } from '@nestjs/graphql';
import { ResourceEntity } from 'ivy-nestjs/resource';
import { FileColumn } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/entity';

@ObjectType()
@Entity()
export class Product extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column({ length: 512 })
  name: string;

  @Column({ length: 4096, nullable: true })
  description?: string;

  @Column({ type: 'int', unsigned: true })
  price: number;

  @Column({ default: true })
  enabled: boolean;

  @FileColumn({ mimeType: 'image/(jpg|jpeg|png|gif)', maxSize: '10 MB', isArray: true })
  pictures?: File[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
