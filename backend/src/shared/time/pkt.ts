const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Pakistan has no DST, so PKT is always UTC+5.
export function pktDay(now: Date): string {
  return new Date(now.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

// The UTC instants bounding a PKT day (YYYY-MM-DD): [startIso, endIso).
export function pktDayBounds(day: string): { startIso: string; endIso: string } {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T00:00:00.000Z`) : NaN;
  // Date.parse rolls 2026-02-30 over to March, so require the date to round-trip unchanged.
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day)
    throw new Error(`Invalid PKT day: ${day}`);
  const start = parsed - PKT_OFFSET_MS;
  return { startIso: new Date(start).toISOString(), endIso: new Date(start + DAY_MS).toISOString() };
}
