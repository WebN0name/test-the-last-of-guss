import { RoundTally } from '../value-objects/round-tally';
import { Score } from '../entities/score';

export interface ApplyTapsParams {
  roundId: string;
  userId: string;
  count: number;
  graceSec: number;
  maxTps: number;
}

export interface IScoreRepository {
  applyTaps(params: ApplyTapsParams): Promise<Score | null>;
  registerParticipant(roundId: string, userId: string, graceSec: number): Promise<void>;
  findMine(roundId: string, userId: string): Promise<Score | null>;
  findTally(roundId: string, userId: string): Promise<RoundTally | null>;
}
