import { Global, Module } from '@nestjs/common';
import { GAME_CONFIG, IGameConfig } from '../../application/ports/game-config.port';
import { Env } from './env';
import { validateEnv } from './env.validate';

@Global()
@Module({
  providers: [
    { provide: Env, useFactory: (): Env => validateEnv(process.env) },
    {
      provide: GAME_CONFIG,
      inject: [Env],
      useFactory: (env: Env): IGameConfig => ({
        roundDurationSec: env.ROUND_DURATION,
        cooldownSec: env.COOLDOWN_DURATION,
        tapGraceSec: env.TAP_GRACE_SECONDS,
        tapBatchMax: env.TAP_BATCH_MAX,
        maxTps: env.MAX_TPS,
      }),
    },
  ],
  exports: [Env, GAME_CONFIG],
})
export class EnvModule {}
