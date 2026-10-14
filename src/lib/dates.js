/**
 * Calendar-date helpers. Dates are plain `YYYY-MM-DD` strings in the user's
 * timezone, so all arithmetic is done on whole days in UTC and never depends
 * on the machine's local timezone (no off-by-one bugs around midnight/DST).
 */

/** Weekday keys in Monday-first order, matching `Plan.weeklyMinutes`. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** @param {unknown} value */
export function isValidISODate(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (year < 1970) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

/** Whole days since 1970-01-01 for a valid `YYYY-MM-DD` string. */
export function toDayNumber(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function fromDayNumber(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** Days from `earlier` to `later` (negative if `later` is before `earlier`). */
export function diffDays(later, earlier) {
  return toDayNumber(later) - toDayNumber(earlier);
}

/** Later of two ISO dates (string comparison is chronological for ISO). */
export function maxDate(a, b) {
  return a >= b ? a : b;
}

/** @returns {"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"} */
export function weekdayOf(iso) {
  const sundayFirst = new Date(toDayNumber(iso) * MS_PER_DAY).getUTCDay();
  return WEEKDAYS[(sundayFirst + 6) % 7];
}

export function isValidTimezone(timezone) {
  if (typeof timezone !== "string" || !timezone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar date of an instant in a timezone.
 * @param {Date|string|number} instant
 * @param {string} timezone IANA name, e.g. "Asia/Kolkata"
 */
export function dateInTimezone(instant, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today's date in the user's timezone. */
export function todayIn(timezone, now = new Date()) {
  return dateInTimezone(now, timezone);
}

/**
 * Human label such as "Mar 12" or "Wed, Mar 12".
 * @param {string} iso
 * @param {{ weekday?: boolean, year?: boolean }} [options]
 */
export function formatDate(iso, { weekday = false, year = false } = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(weekday && { weekday: "short" }),
    ...(year && { year: "numeric" }),
  }).format(new Date(toDayNumber(iso) * MS_PER_DAY));
}
