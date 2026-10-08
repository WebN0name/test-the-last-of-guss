import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoundTally } from '../../../domain/score/value-objects/round-tally';
import { Standing, STANDINGS_LIMIT } from '../../../domain/score/value-objects/standing';
import { Score } from '../../../domain/score/entities/score';
import { ApplyTapsParams, IScoreRepository } from '../../../domain/score/repositories/score.repository.interface';
import { ScoreOrmEntity } from '../entities/score.orm-entity';
import { APPLY_TAPS_SQL, REGISTER_PARTICIPANT_SQL, TALLY_SQL } from './sql/score.sql';

interface ScoreRow {
  round_id: string;
  user_id: string;
  taps: number;
  score: number;
  updated_at: Date;
}

interface TallyRow {
  total_score: number;
  winner_id: string | null;
  winner_login: string | null;
  winner_score: number | null;
  my_taps: number | null;
  my_score: number | null;
  standings: Standing[];
}

@Injectable()
export class TypeOrmScoreRepository implements IScoreRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async applyTaps(params: ApplyTapsParams): Promise<Score | null> {
    const rows = await this.dataSource.query<ScoreRow[]>(APPLY_TAPS_SQL, [
      params.roundId,
      params.userId,
      params.count,
      params.graceSec,
      params.maxTps,
    ]);
    const row = rows[0];
    return row ? toScore(row) : null;
  }

  async registerParticipant(roundId: string, userId: string, graceSec: number): Promise<void> {
    await this.dataSource.query(REGISTER_PARTICIPANT_SQL, [roundId, userId, graceSec]);
  }

  async findMine(roundId: string, userId: string): Promise<Score | null> {
    const entity = await this.dataSource.getRepository(ScoreOrmEntity).findOne({ where: { roundId, userId } });
    if (!entity) return null;
    return {
      roundId: entity.roundId,
      userId: entity.userId,
      taps: entity.taps,
      score: entity.score,
      updatedAt: entity.updatedAt,
    };
  }

  async findTally(roundId: string, userId: string): Promise<RoundTally | null> {
    const rows = await this.dataSource.query<TallyRow[]>(TALLY_SQL, [roundId, userId, STANDINGS_LIMIT]);
    const row = rows[0];
    if (!row) return null;
    const winner =
      row.winner_id !== null && row.winner_login !== null && row.winner_score !== null
        ? { userId: row.winner_id, login: row.winner_login, score: row.winner_score }
        : null;
    return {
      total: row.total_score,
      winner,
      standings: row.standings,
      myScore: { taps: row.my_taps ?? 0, score: row.my_score ?? 0 },
    };
  }
}

function toScore(row: ScoreRow): Score {
  return { roundId: row.round_id, userId: row.user_id, taps: row.taps, score: row.score, updatedAt: row.updated_at };
}
