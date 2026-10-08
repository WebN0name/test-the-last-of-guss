export interface IGameConfig {
  roundDurationSec: number;
  cooldownSec: number;
  tapGraceSec: number;
  tapBatchMax: number;
  maxTps: number;
}

export const GAME_CONFIG = Symbol('GAME_CONFIG');
