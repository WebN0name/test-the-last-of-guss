import { IGameConfig } from '../../application/ports/game-config.port';

export class FakeGameConfig implements IGameConfig {
  roundDurationSec = 60;
  cooldownSec = 30;
  tapGraceSec = 2;
  tapBatchMax = 20;
  maxTps = 20;
}
