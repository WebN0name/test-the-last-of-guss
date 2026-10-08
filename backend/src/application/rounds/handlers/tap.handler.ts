import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RoundNotActiveError, RoundNotFoundError } from '../../../domain/round/errors/round.errors';
import { IRoundRepository } from '../../../domain/round/repositories/round.repository.interface';
import { IScoreRepository } from '../../../domain/score/repositories/score.repository.interface';
import { IClock } from '../../../domain/shared/clock';
import { CLOCK, ROUND_REPOSITORY, SCORE_REPOSITORY } from '../../../domain/shared/tokens';
import { UserRole } from '../../../domain/user/value-objects/user-role';
import { GAME_CONFIG, IGameConfig } from '../../ports/game-config.port';
import { TapCommand } from '../commands/tap.command';
import { TapResult } from '../results/round-results';

@CommandHandler(TapCommand)
export class TapHandler implements ICommandHandler<TapCommand, TapResult> {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: IRoundRepository,
    @Inject(SCORE_REPOSITORY) private readonly scores: IScoreRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(GAME_CONFIG) private readonly config: IGameConfig,
  ) {}

  async execute(command: TapCommand): Promise<TapResult> {
    const round = await this.rounds.findById(command.roundId);
    if (!round) throw new RoundNotFoundError(command.roundId);
    if (!round.isTappableAt(this.clock.now(), this.config.tapGraceSec)) throw new RoundNotActiveError(command.roundId);
    if (command.role === UserRole.Nikita) {
      await this.scores.registerParticipant(command.roundId, command.userId, this.config.tapGraceSec);
      return { taps: 0, score: 0 };
    }

    const score = await this.scores.applyTaps({
      roundId: command.roundId,
      userId: command.userId,
      count: command.count,
      graceSec: this.config.tapGraceSec,
      maxTps: this.config.maxTps,
    });
    if (!score) throw new RoundNotActiveError(command.roundId);
    return { taps: score.taps, score: score.score };
  }
}
