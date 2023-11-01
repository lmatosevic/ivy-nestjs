import 'dotenv/config';
import { DataSource } from 'typeorm';

const db = {
  type: process.env.DB_TYPE || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ?? 5432,
  name: process.env.DB_NAME || 'ivy',
  schema: process.env.DB_SCHEMA || 'public',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  migration: {
    enabled: process.env.DB_MIGRATION_ENABLED === 'true',
    table: process.env.DB_MIGRATION_TABLE || 'migration',
    dirname: process.env.DB_MIGRATION_DIRNAME || 'migrations',
    sourceRoot: process.env.DB_MIGRATION_SOURCE_ROOT || './src',
    extraEntities: !process.env.DB_MIGRATION_EXTRA_ENTITIES ? [] : process.env.DB_MIGRATION_EXTRA_ENTITIES.split(';'),
    extraSubscribers: !process.env.DB_MIGRATION_EXTRA_SUBSCRIBERS
      ? []
      : process.env.DB_MIGRATION_EXTRA_SUBSCRIBERS.split(';'),
    extraMigrations: !process.env.DB_MIGRATION_EXTRA_MIGRATIONS
      ? []
      : process.env.DB_MIGRATION_EXTRA_MIGRATIONS.split(';'),
    ignoreEntities: (process.env.DB_MIGRATION_IGNORE_ENTITIES || '').split(',').join('|')
  }
};

export const ormconfig = {
  type: db.type as any,
  host: db.host,
  port: db.port as number,
  username: db.user,
  password: db.password,
  database: db.name,
  schema: db.schema,
  entities: [
    `${db.migration.sourceRoot}/**/!(${db.migration.ignoreEntities}).entity{.ts,.js}`,
    `./node_modules/ivy-nestjs/**/!(${db.migration.ignoreEntities}).entity.js`,
    ...db.migration.extraEntities
  ],
  subscribers: [`${db.migration.sourceRoot}/**/*.subscriber{.ts,.js}`, ...db.migration.extraSubscribers],
  migrations: [`${db.migration.sourceRoot}/**/${db.migration.dirname}/**/*{.ts,.js}`, ...db.migration.extraMigrations],
  migrationsTableName: db.migration.table,
  synchronize: db.migration.enabled && process.env.NODE_ENV !== 'production'
};

export default new DataSource(ormconfig);
