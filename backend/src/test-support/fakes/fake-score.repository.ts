import { RoundTally } from '../../domain/score/value-objects/round-tally';
import { Score } from '../../domain/score/entities/score';
import { ApplyTapsParams, IScoreRepository } from '../../domain/score/repositories/score.repository.interface';
import { Standing } from '../../domain/score/value-objects/standing';
import { Winner } from '../../domain/score/value-objects/winner';

export class FakeScoreRepository implements IScoreRepository {
  applyTapsResult: Score | null = null;
  readonly calls: ApplyTapsParams[] = [];
  readonly registered: { roundId: string; userId: string; graceSec: number }[] = [];
  mine: Score | null = null;
  winner: Winner | null = null;
  total: number | null = 0;
  standings: Standing[] = [];

  async applyTaps(params: ApplyTapsParams): Promise<Score | null> {
    this.calls.push(params);
    return this.applyTapsResult;
  }

  async registerParticipant(roundId: string, userId: string, graceSec: number): Promise<void> {
    this.registered.push({ roundId, userId, graceSec });
  }

  async findMine(): Promise<Score | null> {
    return this.mine;
  }

  async findTally(): Promise<RoundTally | null> {
    if (this.total === null) return null;
    const myScore = this.mine ? { taps: this.mine.taps, score: this.mine.score } : { taps: 0, score: 0 };
    return { total: this.total, winner: this.winner, standings: this.standings, myScore };
  }
}
