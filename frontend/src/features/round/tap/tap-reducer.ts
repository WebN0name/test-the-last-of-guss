import { pointsForTap, scoreFor } from '@/entities/score/scoring-rule';
import { MAX_POPS } from '@/shared/config/constants';

export interface Pop {
  id: number;
  gain: 1 | 10;
  dx: number;
}

export interface TapState {
  confirmed: { taps: number; score: number };
  pending: number;
  inFlight: number;
  pops: Pop[];
  nextPopId: number;
  needsResync: boolean;
  resyncSeq: number;
  settledSeq: number;
}

export type TapAction =
  | { type: 'tap'; dx: number }
  | { type: 'flushStart'; count: number }
  | { type: 'flushSuccess'; taps: number; score: number }
  | { type: 'flushError' }
  | { type: 'resync'; taps: number; score: number }
  | { type: 'popExpired'; id: number };

export function initialTapState(taps: number, score: number): TapState {
  return {
    confirmed: { taps, score },
    pending: 0,
    inFlight: 0,
    pops: [],
    nextPopId: 1,
    needsResync: false,
    resyncSeq: 0,
    settledSeq: 0,
  };
}

export function displayedTaps(state: TapState): number {
  return state.confirmed.taps + state.inFlight + state.pending;
}

export function displayedScore(state: TapState): number {
  return scoreFor(displayedTaps(state));
}

export function nextFlushCount(state: TapState, max: number): number {
  return state.inFlight > 0 ? 0 : Math.min(state.pending, max);
}

export function tapReducer(state: TapState, action: TapAction): TapState {
  switch (action.type) {
    case 'tap': {
      const gain = pointsForTap(displayedTaps(state) + 1) === 10 ? 10 : 1;
      const pop: Pop = { id: state.nextPopId, gain, dx: action.dx };
      const pops = [...state.pops, pop].slice(-MAX_POPS);
      return { ...state, pending: state.pending + 1, pops, nextPopId: state.nextPopId + 1 };
    }
    case 'flushStart': {
      const count = Math.min(action.count, state.pending);
      if (state.inFlight > 0 || count <= 0) return state;
      return { ...state, pending: state.pending - count, inFlight: count };
    }
    case 'flushSuccess':
      return {
        ...state,
        confirmed: { taps: action.taps, score: action.score },
        inFlight: 0,
        needsResync: false,
        settledSeq: state.settledSeq + 1,
      };
    case 'flushError':
      return {
        ...state,
        pending: 0,
        inFlight: 0,
        needsResync: true,
        resyncSeq: state.resyncSeq + 1,
        settledSeq: state.settledSeq + 1,
      };
    case 'resync':
      if (!state.needsResync || state.inFlight > 0) return state;
      return { ...state, confirmed: { taps: action.taps, score: action.score }, needsResync: false };
    case 'popExpired':
      return { ...state, pops: state.pops.filter((p) => p.id !== action.id) };
  }
}
