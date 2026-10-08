let offsetMs = 0;

export function syncServerClock(serverTimeIso: string, receivedAtMs: number = Date.now()): void {
  const serverMs = new Date(serverTimeIso).getTime();
  if (Number.isNaN(serverMs)) return;
  offsetMs = serverMs - receivedAtMs;
}

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function getOffsetMs(): number {
  return offsetMs;
}

export function resetServerClock(): void {
  offsetMs = 0;
}
