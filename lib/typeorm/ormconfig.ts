import { DataSource } from 'typeorm';
import 'dotenv/config';

const db = {
  type: process.env.DB_TYPE || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ?? 27017,
  name: process.env.DB_NAME || 'ivy',
  schema: process.env.DB_SCHEMA || 'public',
  authSource: process.env.DB_AUTH_SOURCE || 'admin',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  migration: {
    enabled: process.env.DB_MIGRATION_ENABLED === 'true',
    table: process.env.DB_MIGRATION_TABLE || 'migration',
    dirname: process.env.DB_MIGRATION_DIRNAME || 'migrations'
  }
};

export default new DataSource({
  type: db.type as any,
  host: db.host,
  port: db.port as number,
  username: db.user,
  password: db.password,
  database: db.name,
  schema: db.schema,
  entities: [`./src/**/*.entity{.ts,.js}`],
  subscribers: [`./src/**/*.subscriber{.ts,.js}`],
  migrations: [`./src/${db.migration.dirname}/**/*{.ts,.js}`],
  synchronize: db.migration.enabled && process.env.NODE_ENV !== 'production',
  migrationsTableName: db.migration.table
});
