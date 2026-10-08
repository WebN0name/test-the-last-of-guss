import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';
import { roundsApi } from '@/entities/round/api';
import { errorText } from '@/shared/api/error-text';
import { TAP_BATCH_MAX } from '@/shared/config/constants';
import { serverNow } from '@/shared/server-clock/server-clock';
import { playGooseSound } from './goose-sound';
import { displayedScore, displayedTaps, initialTapState, nextFlushCount, tapReducer } from './tap-reducer';

interface Options {
  roundId: string;
  initial: { taps: number; score: number };
  startAt: string;
  endAt: string;
  isNikita: boolean;
}

const NO_POPS: never[] = [];
const TAP_TOAST_ID = 'tap-error';

export function useTapController({ roundId, initial, startAt, endAt, isNikita }: Options) {
  const [state, dispatch] = useReducer(tapReducer, initial, (i) => initialTapState(i.taps, i.score));
  const [pressed, setPressed] = useState(false);
  const sentBatches = useRef(0);

  const flush = useCallback(async () => {
    const count = nextFlushCount(state, TAP_BATCH_MAX);
    if (count === 0 || state.settledSeq !== sentBatches.current) return;
    sentBatches.current += 1;
    dispatch({ type: 'flushStart', count });
    try {
      const res = await roundsApi.tap(roundId, count);
      dispatch({ type: 'flushSuccess', taps: res.taps, score: res.score });
    } catch (error) {
      dispatch({ type: 'flushError' });
      toast.error(errorText(error, { context: 'tap' }), { id: TAP_TOAST_ID });
    }
  }, [roundId, state]);

  useEffect(() => {
    if (state.pending > 0 && state.inFlight === 0) void flush();
  }, [state.pending, state.inFlight, flush]);

  useEffect(() => {
    if (!state.needsResync) return;
    let cancelled = false;
    const resync = async () => {
      try {
        const summary = await roundsApi.get(roundId);
        if (!cancelled) dispatch({ type: 'resync', taps: summary.myScore.taps, score: summary.myScore.score });
      } catch {
        return;
      }
    };
    void resync();
    return () => {
      cancelled = true;
    };
  }, [state.needsResync, state.resyncSeq, roundId]);

  const tap = useCallback(() => {
    const now = serverNow();
    if (now < Date.parse(startAt) || now >= Date.parse(endAt)) return;
    playGooseSound();
    dispatch({ type: 'tap', dx: Math.round((Math.random() - 0.5) * 48) });
  }, [startAt, endAt]);

  const expirePop = useCallback((id: number) => dispatch({ type: 'popExpired', id }), []);

  return {
    score: isNikita ? 0 : displayedScore(state),
    taps: isNikita ? 0 : displayedTaps(state),
    pops: isNikita ? NO_POPS : state.pops,
    tap,
    expirePop,
    pressed,
    setPressed,
  };
}
