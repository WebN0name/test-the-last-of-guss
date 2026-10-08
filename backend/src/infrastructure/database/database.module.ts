import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ROUND_REPOSITORY, SCORE_REPOSITORY, USER_REPOSITORY } from '../../domain/shared/tokens';
import { Env } from '../config/env';
import { buildDataSourceOptions } from './data-source.options';
import { TypeOrmRoundRepository } from './repositories/typeorm-round.repository';
import { TypeOrmScoreRepository } from './repositories/typeorm-score.repository';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [Env],
      useFactory: (env: Env) => buildDataSourceOptions(env),
    }),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: ROUND_REPOSITORY, useClass: TypeOrmRoundRepository },
    { provide: SCORE_REPOSITORY, useClass: TypeOrmScoreRepository },
  ],
  exports: [USER_REPOSITORY, ROUND_REPOSITORY, SCORE_REPOSITORY],
})
export class DatabaseModule {}
