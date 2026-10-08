import { describe, expect, it } from 'vitest';
import {
  displayedScore,
  displayedTaps,
  initialTapState,
  nextFlushCount,
  tapReducer,
  type TapState,
} from './tap-reducer';

const tap = (s: TapState): TapState => tapReducer(s, { type: 'tap', dx: 0 });

describe('tapReducer', () => {
  it('тап увеличивает pending и показывает оптимистичный счёт', () => {
    const s = tap(initialTapState(0, 0));
    expect(s.pending).toBe(1);
    expect(displayedScore(s)).toBe(1);
    expect(displayedTaps(s)).toBe(1);
    expect(s.pops[0]?.gain).toBe(1);
  });

  it('одиннадцатый тап даёт pop +10 и 20 очков', () => {
    let s = initialTapState(10, 10);
    s = tap(s);
    expect(s.pops[0]?.gain).toBe(10);
    expect(displayedScore(s)).toBe(20);
  });

  it('flushStart переносит pending в inFlight, не больше потолка', () => {
    let s = initialTapState(0, 0);
    for (let i = 0; i < 25; i++) s = tap(s);
    expect(nextFlushCount(s, 20)).toBe(20);
    s = tapReducer(s, { type: 'flushStart', count: 20 });
    expect(s.inFlight).toBe(20);
    expect(s.pending).toBe(5);
    expect(displayedScore(s)).toBe(25 + 18);
  });

  it('тапы во время полёта копятся в pending', () => {
    let s = tap(initialTapState(0, 0));
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tap(tap(s));
    expect(s.inFlight).toBe(1);
    expect(s.pending).toBe(2);
    expect(nextFlushCount(s, 20)).toBe(0);
  });

  it('flushSuccess подтверждает с сервера и обнуляет inFlight, pending остаётся', () => {
    let s = tap(initialTapState(0, 0));
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tap(s);
    s = tapReducer(s, { type: 'flushSuccess', taps: 1, score: 1 });
    expect(s.confirmed).toEqual({ taps: 1, score: 1 });
    expect(s.inFlight).toBe(0);
    expect(s.pending).toBe(1);
    expect(displayedScore(s)).toBe(2);
  });

  it('flushError сбрасывает pending и inFlight и просит resync', () => {
    let s = tap(tap(initialTapState(5, 5)));
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tapReducer(s, { type: 'flushError' });
    expect(s.pending).toBe(0);
    expect(s.inFlight).toBe(0);
    expect(s.needsResync).toBe(true);
    expect(displayedScore(s)).toBe(5);
  });

  it('resync заменяет подтверждённое и снимает флаг', () => {
    let s = tapReducer(tap(initialTapState(0, 0)), { type: 'flushError' });
    s = tapReducer(s, { type: 'resync', taps: 7, score: 7 });
    expect(s.confirmed).toEqual({ taps: 7, score: 7 });
    expect(s.needsResync).toBe(false);
  });

  it('pops ограничены MAX_POPS и удаляются по popExpired', () => {
    let s = initialTapState(0, 0);
    for (let i = 0; i < 10; i++) s = tap(s);
    expect(s.pops.length).toBeLessThanOrEqual(6);
    const id = s.pops[0]!.id;
    s = tapReducer(s, { type: 'popExpired', id });
    expect(s.pops.find((p) => p.id === id)).toBeUndefined();
  });

  it('flushStart без pending или во время полёта ничего не меняет', () => {
    const idle = initialTapState(0, 0);
    expect(tapReducer(idle, { type: 'flushStart', count: 1 })).toBe(idle);
    let s = tap(idle);
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tap(s);
    expect(tapReducer(s, { type: 'flushStart', count: 1 })).toBe(s);
  });

  it('resync после ответа тапа игнорируется: GET не перетирает свежий confirmed', () => {
    let s = tap(initialTapState(0, 0));
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tapReducer(s, { type: 'flushError' });
    s = tap(s);
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tapReducer(s, { type: 'flushSuccess', taps: 5, score: 5 });
    expect(s.needsResync).toBe(false);
    const after = tapReducer(s, { type: 'resync', taps: 3, score: 3 });
    expect(after.confirmed).toEqual({ taps: 5, score: 5 });
  });

  it('resync до ответа тапа игнорируется, пока запрос в полёте', () => {
    let s = tap(initialTapState(0, 0));
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    s = tapReducer(s, { type: 'flushError' });
    s = tap(s);
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    const during = tapReducer(s, { type: 'resync', taps: 3, score: 3 });
    expect(during.confirmed).toEqual({ taps: 0, score: 0 });
    expect(during.needsResync).toBe(true);
    const done = tapReducer(during, { type: 'flushSuccess', taps: 4, score: 4 });
    expect(done.confirmed).toEqual({ taps: 4, score: 4 });
    expect(done.needsResync).toBe(false);
  });

  it('flushStart зажимает count по pending, 0 и повтор в полёте не меняют состояние', () => {
    let s = tap(tap(initialTapState(0, 0)));
    expect(tapReducer(s, { type: 'flushStart', count: 0 })).toBe(s);
    s = tapReducer(s, { type: 'flushStart', count: 20 });
    expect(s.inFlight).toBe(2);
    expect(s.pending).toBe(0);
    s = tap(s);
    expect(tapReducer(s, { type: 'flushStart', count: 1 })).toBe(s);
  });

  it('тап в очереди раньше flushStart: inFlight равен отправленному count', () => {
    let s = tap(initialTapState(0, 0));
    const sent = nextFlushCount(s, 20);
    s = tap(s);
    s = tapReducer(s, { type: 'flushStart', count: sent });
    expect(s.inFlight).toBe(sent);
    expect(s.pending).toBe(1);
  });

  it('settledSeq растёт на flushSuccess и flushError', () => {
    let s = tap(initialTapState(0, 0));
    s = tapReducer(s, { type: 'flushStart', count: 1 });
    expect(s.settledSeq).toBe(0);
    s = tapReducer(s, { type: 'flushSuccess', taps: 1, score: 1 });
    expect(s.settledSeq).toBe(1);
    s = tapReducer(tap(s), { type: 'flushStart', count: 1 });
    s = tapReducer(s, { type: 'flushError' });
    expect(s.settledSeq).toBe(2);
  });
});
