import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ObjectType } from '@nestjs/graphql';
import { PopulateRelation, ResourceEntity } from 'ivy-nestjs/resource';
import { Application } from '@resources/applications/entity';

@ObjectType()
@Entity()
export class Category extends ResourceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @PopulateRelation({ populateChildren: false, type: 'single' })
  @ManyToOne(() => Category, (category) => category.children, { onDelete: 'SET NULL' })
  parent?: Category;

  @Column({ nullable: true })
  parentId?: number;

  @PopulateRelation({ excludeRelations: ['parent'], maxDepth: 5 })
  @OneToMany(() => Category, (category) => category.parent)
  children?: Category[];

  @OneToMany(() => Application, (product) => product.category)
  applications?: Application[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
