import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoundNotFoundError } from '../../../domain/round/errors/round.errors';
import { IRoundRepository } from '../../../domain/round/repositories/round.repository.interface';
import { IScoreRepository } from '../../../domain/score/repositories/score.repository.interface';
import { IClock } from '../../../domain/shared/clock';
import { CLOCK, ROUND_REPOSITORY, SCORE_REPOSITORY } from '../../../domain/shared/tokens';
import { GAME_CONFIG, IGameConfig } from '../../ports/game-config.port';
import { GetRoundQuery } from '../queries/get-round.query';
import { RoundSummary } from '../results/round-results';

@QueryHandler(GetRoundQuery)
export class GetRoundHandler implements IQueryHandler<GetRoundQuery, RoundSummary> {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: IRoundRepository,
    @Inject(SCORE_REPOSITORY) private readonly scores: IScoreRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(GAME_CONFIG) private readonly config: IGameConfig,
  ) {}

  async execute(query: GetRoundQuery): Promise<RoundSummary> {
    const now = this.clock.now();
    const view = await this.rounds.findViewById(query.roundId);
    if (!view) throw new RoundNotFoundError(query.roundId);

    const resultsAt = view.round.endAt.getTime() + this.config.tapGraceSec * 1000;
    if (now.getTime() < resultsAt) {
      const mine = await this.scores.findMine(query.roundId, query.userId);
      const myScore = mine ? { taps: mine.taps, score: mine.score } : { taps: 0, score: 0 };
      return { view, myScore, total: null, winner: null, standings: null, now };
    }
    const tally = await this.scores.findTally(query.roundId, query.userId);
    if (!tally) throw new RoundNotFoundError(query.roundId);
    return { view, myScore: tally.myScore, total: tally.total, winner: tally.winner, standings: tally.standings, now };
  }
}
