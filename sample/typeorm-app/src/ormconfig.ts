import { ormconfig } from 'ivy-nestjs/typeorm/ormconfig';
import { DataSource } from 'typeorm';

// This is required since this subproject is depending on ivy-nestjs modules and classes directly, instead of just
// installing ivy-nestjs as a package with all of its configurations ready to use
export default new DataSource({
  ...ormconfig,
  entities: [...ormconfig.entities, '../../lib/**/*.entity{.ts,.js}']
});
