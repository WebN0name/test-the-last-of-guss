import { Round } from '../entities/round';

export type RoundScope = 'current' | 'finished';

export interface RoundCursor {
  sortValue: Date;
  id: string;
}

export interface RoundView {
  round: Round;
  creatorLogin: string;
}

export interface RoundPage {
  items: RoundView[];
  nextCursor: RoundCursor | null;
}

export interface FindPageParams {
  scope: RoundScope;
  cursor: RoundCursor | null;
  limit: number;
  now: Date;
}
