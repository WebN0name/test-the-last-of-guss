import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'rounds' })
@Index('rounds_end_at_id_idx', ['endAt', 'id'])
export class RoundOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'creator_id' })
  creatorId!: string;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'creator_id' })
  creator?: UserOrmEntity;

  @Column({ type: 'timestamptz', name: 'start_at' })
  startAt!: Date;

  @Column({ type: 'timestamptz', name: 'end_at' })
  endAt!: Date;

  @Column({ type: 'integer', name: 'total_score', default: 0 })
  totalScore!: number;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
