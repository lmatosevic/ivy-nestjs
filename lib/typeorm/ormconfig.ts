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
    sourceRoot: process.env.DB_MIGRATION_SOURCE_ROOT || './src'
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
    `${db.migration.sourceRoot}/**/*.entity{.ts,.js}`,
    './node_modules/ivy-nestjs/**/*.entity{.ts,.js}'
  ],
  subscribers: [`${db.migration.sourceRoot}/**/*.subscriber{.ts,.js}`],
  migrations: [`${db.migration.sourceRoot}/${db.migration.dirname}/**/*{.ts,.js}`],
  migrationsTableName: db.migration.table,
  synchronize: db.migration.enabled && process.env.NODE_ENV !== 'production'
};

export default new DataSource(ormconfig)