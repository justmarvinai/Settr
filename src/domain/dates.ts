/**
 * Calendar dates as `YYYY-MM-DD` strings (DATA_MODEL.md §5.1). Arithmetic runs on whole days since
 * the epoch in UTC, so time zones and daylight saving never shift a date.
 */

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a `YYYY-MM-DD` date. */
export function dayNumber(iso: string): number {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new RangeError(`Not an ISO date: ${iso}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS;
}

export function isoFromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoFromDayNumber(dayNumber(iso) + days);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** The same day `months` months earlier or later, clamped to the month's last day (31.03. − 1 = 28.02.). */
export function addMonths(iso: string, months: number): string {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new RangeError(`Not an ISO date: ${iso}`);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1 + months;
  const day = Number(match[3]);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
}
