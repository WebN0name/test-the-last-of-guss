import { Round } from '../../../domain/round/entities/round';
import { RoundView } from '../../../domain/round/value-objects/round-page';
import { RoundOrmEntity } from '../entities/round.orm-entity';

export interface RoundViewRow {
  id: string;
  creator_id: string;
  start_at: Date;
  end_at: Date;
  total_score: number;
  created_at: Date;
  creator_login: string;
}

export const RoundMapper = {
  toDomain(entity: RoundOrmEntity): Round {
    return Round.restore({
      id: entity.id,
      creatorId: entity.creatorId,
      startAt: entity.startAt,
      endAt: entity.endAt,
      totalScore: entity.totalScore,
      createdAt: entity.createdAt,
    });
  },

  toOrm(round: Round): RoundOrmEntity {
    const entity = new RoundOrmEntity();
    entity.id = round.id;
    entity.creatorId = round.creatorId;
    entity.startAt = round.startAt;
    entity.endAt = round.endAt;
    entity.totalScore = round.totalScore;
    entity.createdAt = round.createdAt;
    return entity;
  },

  rowToView(row: RoundViewRow): RoundView {
    return {
      round: Round.restore({
        id: row.id,
        creatorId: row.creator_id,
        startAt: row.start_at,
        endAt: row.end_at,
        totalScore: row.total_score,
        createdAt: row.created_at,
      }),
      creatorLogin: row.creator_login,
    };
  },
};
