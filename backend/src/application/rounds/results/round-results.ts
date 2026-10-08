import { RoundView } from '../../../domain/round/value-objects/round-page';
import { Standing } from '../../../domain/score/value-objects/standing';
import { Winner } from '../../../domain/score/value-objects/winner';

export interface TapResult {
  taps: number;
  score: number;
}

export interface RoundSummary {
  view: RoundView;
  myScore: TapResult;
  total: number | null;
  winner: Winner | null;
  standings: Standing[] | null;
  now: Date;
}

export interface RoundListResult {
  items: RoundView[];
  nextCursor: string | null;
  now: Date;
}
