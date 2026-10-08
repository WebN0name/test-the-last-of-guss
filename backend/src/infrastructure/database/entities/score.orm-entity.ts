import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scores' })
@Index('scores_leaderboard_idx', ['roundId', 'score', 'updatedAt'])
export class ScoreOrmEntity {
  @PrimaryColumn({ type: 'uuid', name: 'round_id' })
  roundId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'integer', default: 0 })
  taps!: number;

  @Column({ type: 'integer', default: 0 })
  score!: number;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
