import path from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { Env } from '../config/env';
import { RoundOrmEntity } from './entities/round.orm-entity';
import { ScoreOrmEntity } from './entities/score.orm-entity';
import { UserOrmEntity } from './entities/user.orm-entity';

export const ORM_ENTITIES = [UserOrmEntity, RoundOrmEntity, ScoreOrmEntity];

export function buildDataSourceOptions(env: Env): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: ORM_ENTITIES,
    migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}
