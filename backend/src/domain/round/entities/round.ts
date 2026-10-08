import { RoundStatus } from '../value-objects/round-status';

export interface RoundProps {
  id: string;
  creatorId: string;
  startAt: Date;
  endAt: Date;
  totalScore: number;
  createdAt: Date;
}

export interface CreateRoundProps {
  id: string;
  creatorId: string;
  now: Date;
  cooldownSec: number;
  durationSec: number;
}

export class Round {
  readonly id: string;
  readonly creatorId: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly totalScore: number;
  readonly createdAt: Date;

  private constructor(props: RoundProps) {
    this.id = props.id;
    this.creatorId = props.creatorId;
    this.startAt = props.startAt;
    this.endAt = props.endAt;
    this.totalScore = props.totalScore;
    this.createdAt = props.createdAt;
  }

  static create(props: CreateRoundProps): Round {
    const startAt = new Date(props.now.getTime() + props.cooldownSec * 1000);
    const endAt = new Date(startAt.getTime() + props.durationSec * 1000);
    return new Round({
      id: props.id,
      creatorId: props.creatorId,
      startAt,
      endAt,
      totalScore: 0,
      createdAt: props.now,
    });
  }

  static restore(props: RoundProps): Round {
    return new Round(props);
  }

  statusAt(now: Date): RoundStatus {
    if (now < this.startAt) return 'cooldown';
    if (now < this.endAt) return 'active';
    return 'finished';
  }

  isTappableAt(now: Date, graceSec: number): boolean {
    const graceEnd = this.endAt.getTime() + graceSec * 1000;
    return now >= this.startAt && now.getTime() < graceEnd;
  }
}
