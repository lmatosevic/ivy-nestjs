import { classToPlain } from 'class-transformer';

export abstract class ResourceEntity {
  id: number;

  createdAt?: Date;

  updatedAt?: Date;

  toJSON(): Record<string, any> {
    return classToPlain(this);
  }
}
