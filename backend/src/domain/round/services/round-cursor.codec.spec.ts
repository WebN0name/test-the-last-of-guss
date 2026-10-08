import { decodeCursor, encodeCursor } from './round-cursor.codec';
import { InvalidCursorError } from '../errors/round.errors';

const UUID = '8c3eed83-8a8a-41a0-8f91-9ad501e8f8a1';

describe('round cursor codec', () => {
  it('round-trip сохраняет дату с миллисекундами и id', () => {
    const cursor = { sortValue: new Date('2026-10-07T10:00:00.123Z'), id: UUID };
    expect(decodeCursor(encodeCursor(cursor, 'finished'), 'finished')).toEqual(cursor);
  });

  it('строка — base64url без +, / и =', () => {
    const s = encodeCursor({ sortValue: new Date(), id: UUID }, 'current');
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    '',
    'мусор',
    'bm90IGpzb24',
    Buffer.from('{"sortValue":"x","id":"y"}').toString('base64url'),
    Buffer.from('{"sortValue":"2026-01-01T00:00:00Z"}').toString('base64url'),
    Buffer.from(`{"sortValue":"2026-01-01","id":"${UUID}","scope":"finished"}`).toString('base64url'),
    Buffer.from(`{"sortValue":"2026-01-01T00:00:00Z","id":"${UUID}","scope":"finished"}`).toString('base64url'),
    Buffer.from(`{"sortValue":"-271821-04-20T00:00:00Z","id":"${UUID}","scope":"finished"}`).toString('base64url'),
  ])('мусор %s → InvalidCursorError', (s) => {
    expect(() => decodeCursor(s, 'finished')).toThrow(InvalidCursorError);
  });

  it('курсор другого scope → InvalidCursorError', () => {
    const raw = encodeCursor({ sortValue: new Date('2026-10-07T10:00:00.123Z'), id: UUID }, 'finished');
    expect(() => decodeCursor(raw, 'current')).toThrow(InvalidCursorError);
  });

  it('курсор без scope или с неизвестным scope → InvalidCursorError', () => {
    const base = `"sortValue":"2026-01-01T00:00:00.000Z","id":"${UUID}"`;
    for (const body of [`{${base}}`, `{${base},"scope":"other"}`, `{${base},"scope":1}`]) {
      expect(() => decodeCursor(Buffer.from(body).toString('base64url'), 'finished')).toThrow(InvalidCursorError);
    }
  });
});
