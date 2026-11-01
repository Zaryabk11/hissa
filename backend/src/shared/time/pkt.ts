const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Pakistan has no DST, so PKT is always UTC+5.
export function pktDay(now: Date): string {
  return new Date(now.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

// The UTC instants bounding a PKT day (YYYY-MM-DD): [startIso, endIso).
export function pktDayBounds(day: string): { startIso: string; endIso: string } {
  const start = Date.parse(`${day}T00:00:00.000Z`) - PKT_OFFSET_MS;
  return { startIso: new Date(start).toISOString(), endIso: new Date(start + DAY_MS).toISOString() };
}
