import { Standing } from './standing';
import { Winner } from './winner';

export interface RoundTally {
  total: number;
  winner: Winner | null;
  standings: Standing[];
  myScore: { taps: number; score: number };
}
