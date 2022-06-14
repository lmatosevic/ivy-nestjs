import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ObjectType } from '@nestjs/graphql';
import { FileMeta } from './file-meta.entity';

@ObjectType()
@Entity({ name: '_file' })
export class File {
  @PrimaryColumn()
  data: string;

  @Column({ nullable: true })
  originalName?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @OneToOne(() => FileMeta, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  meta?: FileMeta;
}
