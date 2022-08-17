import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VerificationType } from '../../../../enums';
import { ResourceEntity } from '../../../../resource/entity/resource-entity';

@ObjectType()
@Entity({ name: '_verification_token' })
export class VerificationToken extends ResourceEntity {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: VerificationType, default: VerificationType.Other })
  type?: VerificationType;

  @Column({ type: 'int', unsigned: true })
  accountId: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
