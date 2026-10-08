import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnv } from '../../../src/infrastructure/config/env.validate';
import { Env } from '../../../src/infrastructure/config/env';
import { buildDataSourceOptions } from '../../../src/infrastructure/database/data-source.options';

config({ path: '.env.test', override: true, quiet: true });

export function testEnv(): Env {
  return validateEnv(process.env);
}

export async function createTestDataSource(): Promise<DataSource> {
  const ds = new DataSource(buildDataSourceOptions(testEnv()));
  await ds.initialize();
  await ds.runMigrations();
  return ds;
}

export async function truncateAll(ds: DataSource): Promise<void> {
  await ds.query('TRUNCATE TABLE scores, rounds, users CASCADE');
}
