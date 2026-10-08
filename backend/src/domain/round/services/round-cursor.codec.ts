import { RoundCursor, RoundScope } from '../value-objects/round-page';
import { InvalidCursorError } from '../errors/round.errors';

interface CursorPayload {
  sortValue: string;
  id: string;
  scope: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CURSOR_LENGTH = 256;

export function encodeCursor(cursor: RoundCursor, scope: RoundScope): string {
  const payload: CursorPayload = { sortValue: cursor.sortValue.toISOString(), id: cursor.id, scope };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string, scope: RoundScope): RoundCursor {
  assertLengthWithinLimit(raw);
  const payload = parsePayload(raw);
  assertScopeMatches(payload.scope, scope);
  assertUuid(payload.id);
  return { sortValue: parseStrictIsoDate(payload.sortValue), id: payload.id };
}

function assertLengthWithinLimit(raw: string): void {
  if (raw.length === 0 || raw.length > MAX_CURSOR_LENGTH) throw new InvalidCursorError();
}

function parsePayload(raw: string): CursorPayload {
  const decoded = decodeJson(raw);
  if (!isCursorPayload(decoded)) throw new InvalidCursorError();
  return decoded;
}

function decodeJson(raw: string): unknown {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError();
  }
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const { sortValue, id, scope } = value as Record<string, unknown>;
  return typeof sortValue === 'string' && typeof id === 'string' && typeof scope === 'string';
}

function assertScopeMatches(actual: string, expected: RoundScope): void {
  if (actual !== expected) throw new InvalidCursorError();
}

function assertUuid(id: string): void {
  if (!UUID_PATTERN.test(id)) throw new InvalidCursorError();
}

function parseStrictIsoDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) throw new InvalidCursorError();
  return date;
}
