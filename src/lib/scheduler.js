import {
  addDays,
  dateInTimezone,
  isValidISODate,
  isValidTimezone,
  maxDate,
  WEEKDAY_LABELS,
  WEEKDAYS,
  weekdayOf,
} from "./dates.js";

/**
 * PlanEase scheduler: a pure function, no I/O, no clock access.
 *
 * Given the lessons (in order), a weekly allowance, a speed ratio, a start date
 * and skip dates, it lays the remaining work out day by day. It is re-run on
 * every change (start date, skip days, allowance, ratio, progress), so the
 * schedule is never stored.
 *
 * Rules, in the order the code applies them:
 *  1. Effective seconds of a lesson = durationSeconds * (b / a), rounded up.
 *  2. Completed lessons are fixed: they are never placed again.
 *  3. Scheduling starts at max(startDate, today). Past days are never filled,
 *     so work missed on earlier days rolls forward automatically.
 *  4. Walk calendar days. Skip dates and days with 0 allowance get no work.
 *  5. Fill each day's allowance with lessons in order. A lesson may be split
 *     across days ("Part 1/2"); each part carries the seconds placed that day.
 *  6. Time already completed today counts against today's allowance, and those
 *     lessons are listed first on today's entry with `done: true`.
 *  7. Stop when every remaining lesson is placed. The last day is the end date.
 *  8. The walk is capped (`maxDays`), and impossible inputs (no study time at
 *     all, bad ratio, bad dates) return `{ ok: false }` instead of looping.
 */

/** Longest schedule we will build (about 10 years of calendar days). */
export const MAX_SCHEDULE_DAYS = 3650;

const MAX_DAY_MINUTES = 1440;

/**
 * @typedef {"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"} WeekdayKey
 * @typedef {Record<WeekdayKey, number>} WeeklyMinutes minutes per weekday, 0 = off
 * @typedef {{ a: number, b: number }} Ratio  a seconds of lecture take b seconds
 *
 * @typedef {object} ScheduleLesson
 * @property {string} [id] stable id, passed through to the schedule items
 * @property {string} title
 * @property {number} durationSeconds lecture length
 * @property {boolean} [completed]
 * @property {Date|string|number} [completedAt]
 *
 * @typedef {object} ScheduleSection
 * @property {string} title
 * @property {ScheduleLesson[]} lessons
 *
 * @typedef {object} ScheduleItem
 * @property {number} sectionIndex position in `sections`
 * @property {number} lessonIndex position in `section.lessons`
 * @property {string} [lessonId]
 * @property {number} seconds effective seconds placed on this day
 * @property {number} part 1-based part number
 * @property {number} parts how many days this lesson is split across (1 = whole)
 * @property {boolean} done true for lessons already completed today
 *
 * @typedef {object} ScheduleDay
 * @property {string} date YYYY-MM-DD
 * @property {WeekdayKey} weekday
 * @property {number} allowanceSeconds full allowance for the day (0 if skipped)
 * @property {number} plannedSeconds effective seconds still to do
 * @property {number} doneSeconds effective seconds completed today
 * @property {ScheduleItem[]} items done items first, then planned items
 */

/** @param {unknown} ratio */
export function isValidRatio(ratio) {
  return (
    typeof ratio === "object" &&
    ratio !== null &&
    Number.isFinite(ratio.a) &&
    Number.isFinite(ratio.b) &&
    ratio.a > 0 &&
    ratio.b > 0
  );
}

/**
 * Time a lesson takes to complete at the chosen speed. Rounded up so the
 * plan never promises more than the allowance can hold; always at least 1s.
 * @param {number} durationSeconds
 * @param {Ratio} ratio
 */
export function effectiveSeconds(durationSeconds, ratio) {
  // The epsilon stops float noise (e.g. 1.0000000000000002) rounding up a second
  return Math.max(1, Math.ceil((durationSeconds * ratio.b) / ratio.a - 1e-9));
}

/**
 * Lecture and effective totals for the wizard's live summary.
 * @param {ScheduleSection[]} sections
 * @param {Ratio} ratio
 */
export function summarizeContent(sections, ratio) {
  let lectureSeconds = 0;
  let effective = 0;
  let lessonCount = 0;
  for (const section of sections) {
    for (const lesson of section.lessons) {
      lectureSeconds += lesson.durationSeconds;
      effective += effectiveSeconds(lesson.durationSeconds, ratio);
      lessonCount += 1;
    }
  }
  return { lectureSeconds, effectiveSeconds: effective, lessonCount };
}

/**
 * Convert weekly minutes into seconds, or null if any value is unusable.
 * @param {WeeklyMinutes} weeklyMinutes
 * @returns {WeeklyMinutes | null}
 */
function allowanceSecondsByWeekday(weeklyMinutes) {
  const seconds = {};
  for (const key of WEEKDAYS) {
    const minutes = weeklyMinutes?.[key];
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > MAX_DAY_MINUTES
    ) {
      return null;
    }
    seconds[key] = minutes * 60;
  }
  return seconds;
}

const fail = (code, message) => ({ ok: false, error: { code, message } });

/**
 * Build the day-by-day schedule.
 *
 * @param {object} input
 * @param {ScheduleSection[]} input.sections lessons in course order
 * @param {WeeklyMinutes} input.weeklyMinutes
 * @param {Ratio} input.ratio
 * @param {string} input.startDate YYYY-MM-DD
 * @param {string[]} [input.skipDates] YYYY-MM-DD dates that get no work
 * @param {string} input.today YYYY-MM-DD in the user's timezone
 * @param {string} [input.timezone] IANA name, used to find lessons completed today
 * @param {number} [input.maxDays] safety cap on the day walk
 * @returns {{
 *   ok: true,
 *   from: string,
 *   endDate: string | null,
 *   studyDays: number,
 *   skippedDays: number,
 *   totals: { lectureSeconds: number, effectiveSeconds: number, completedSeconds: number, remainingSeconds: number },
 *   days: ScheduleDay[],
 * } | { ok: false, error: { code: string, message: string } }}
 */
export function buildSchedule({
  sections,
  weeklyMinutes,
  ratio,
  startDate,
  skipDates = [],
  today,
  timezone = "UTC",
  maxDays = MAX_SCHEDULE_DAYS,
}) {
  // ---- Validate inputs up front so the day walk below cannot misbehave ----
  if (!isValidRatio(ratio)) {
    return fail(
      "INVALID_RATIO",
      "Both sides of the speed ratio must be positive numbers.",
    );
  }
  const allowance = allowanceSecondsByWeekday(weeklyMinutes);
  if (!allowance) {
    return fail(
      "INVALID_ALLOWANCE",
      "Study time per day must be between 0 and 24 hours.",
    );
  }
  if (!isValidISODate(startDate) || !isValidISODate(today)) {
    return fail("INVALID_DATE", "Dates must look like 2025-03-12.");
  }
  if (!isValidTimezone(timezone)) {
    return fail("INVALID_TIMEZONE", "Unknown timezone.");
  }

  // ---- Flatten lessons in order and total them up ----
  const remaining = []; // lessons still to do, in course order
  const doneToday = []; // lessons completed today (only used when from === today)
  let lectureSeconds = 0;
  let totalEffective = 0;
  let completedSeconds = 0;

  const from = maxDate(startDate, today);

  sections.forEach((section, sectionIndex) => {
    section.lessons.forEach((lesson, lessonIndex) => {
      const effective = effectiveSeconds(lesson.durationSeconds, ratio);
      const entry = {
        sectionIndex,
        lessonIndex,
        lessonId: lesson.id,
        effective,
      };
      lectureSeconds += lesson.durationSeconds;
      totalEffective += effective;

      if (!lesson.completed) {
        remaining.push(entry);
        return;
      }
      completedSeconds += effective;
      const completedOn = lesson.completedAt
        ? dateInTimezone(lesson.completedAt, timezone)
        : null;
      if (completedOn === today && from === today) doneToday.push(entry);
    });
  });

  if (totalEffective === 0) {
    return fail("NO_LESSONS", "Add at least one lesson.");
  }

  const totals = {
    lectureSeconds,
    effectiveSeconds: totalEffective,
    completedSeconds,
    remainingSeconds: totalEffective - completedSeconds,
  };

  // Without any allowance the day walk could never place a lesson
  const hasStudyTime = WEEKDAYS.some((key) => allowance[key] > 0);
  if (remaining.length > 0 && !hasStudyTime) {
    return fail(
      "NO_STUDY_TIME",
      "Set some study time on at least one weekday to build a schedule.",
    );
  }

  // ---- Walk the calendar and fill each day ----
  const skipSet = new Set(skipDates);
  const doneTodaySeconds = doneToday.reduce((sum, e) => sum + e.effective, 0);
  /** @type {ScheduleDay[]} */
  const days = [];
  /** Parts placed so far per remaining lesson, to number "Part i/n". */
  const partsPlaced = new Array(remaining.length).fill(0);
  /** [item, remaining index] pairs, to fill in `parts` after the walk. */
  const placed = [];

  let cursor = 0; // index into `remaining` of the lesson being filled
  let left = remaining[0]?.effective ?? 0; // effective seconds of it not yet placed
  let endDate = null;
  let date = from;

  for (let i = 0; i < maxDays; i += 1, date = addDays(date, 1)) {
    // Always visit the first day (it may hold today's completed lessons);
    // after that, stop as soon as everything is placed.
    if (cursor >= remaining.length && i > 0) break;

    const weekday = weekdayOf(date);
    const fullAllowance = skipSet.has(date) ? 0 : allowance[weekday];
    let free = fullAllowance;
    const items = [];
    let doneSeconds = 0;

    if (i === 0) {
      for (const entry of doneToday) {
        items.push({
          sectionIndex: entry.sectionIndex,
          lessonIndex: entry.lessonIndex,
          lessonId: entry.lessonId,
          seconds: entry.effective,
          part: 1,
          parts: 1,
          done: true,
        });
      }
      doneSeconds = doneTodaySeconds;
      free = Math.max(0, free - doneTodaySeconds);
    }

    let plannedSeconds = 0;
    while (free > 0 && cursor < remaining.length) {
      const lesson = remaining[cursor];
      const chunk = Math.min(left, free);
      partsPlaced[cursor] += 1;
      const item = {
        sectionIndex: lesson.sectionIndex,
        lessonIndex: lesson.lessonIndex,
        lessonId: lesson.lessonId,
        seconds: chunk,
        part: partsPlaced[cursor],
        parts: 0, // set once all parts are known
        done: false,
      };
      items.push(item);
      placed.push([item, cursor]);
      plannedSeconds += chunk;
      left -= chunk;
      free -= chunk;
      endDate = date;
      if (left === 0) {
        cursor += 1;
        left = remaining[cursor]?.effective ?? 0;
      }
    }

    if (items.length > 0) {
      days.push({
        date,
        weekday,
        allowanceSeconds: fullAllowance,
        plannedSeconds,
        doneSeconds,
        items,
      });
    }
  }

  // Ran out of days before placing everything (e.g. 1 minute a day for years)
  if (cursor < remaining.length) {
    return fail(
      "TOO_LONG",
      "At this pace the plan would run for more than 10 years. Increase your daily study time or speed.",
    );
  }

  for (const [item, remainingIndex] of placed) {
    item.parts = partsPlaced[remainingIndex];
  }

  const studyDays = days.filter((day) => day.plannedSeconds > 0).length;
  let skippedDays = 0;
  if (endDate) {
    for (const skip of skipSet) {
      if (skip >= from && skip <= endDate) skippedDays += 1;
    }
  }

  return { ok: true, from, endDate, studyDays, skippedDays, totals, days };
}

/**
 * Can this date be used as the plan's start date? Mirrors the wizard rule:
 * past dates are never allowed, and today is disabled when no study time is
 * left for it.
 *
 * @param {object} input
 * @param {string} input.date candidate start date
 * @param {string} input.today
 * @param {WeeklyMinutes} input.weeklyMinutes
 * @param {string[]} [input.skipDates]
 * @param {number} [input.completedTodaySeconds] effective seconds already done today
 * @returns {{ available: boolean, reason: string | null }}
 */
export function getStartDateAvailability({
  date,
  today,
  weeklyMinutes,
  skipDates = [],
  completedTodaySeconds = 0,
}) {
  if (!isValidISODate(date)) {
    return { available: false, reason: "Pick a valid date." };
  }
  if (date < today) {
    return { available: false, reason: "That date has already passed." };
  }
  if (date > today) return { available: true, reason: null };

  const weekday = weekdayOf(today);
  const allowanceSeconds = (weeklyMinutes?.[weekday] ?? 0) * 60;
  if (skipDates.includes(today)) {
    return { available: false, reason: "Today is one of your skip days." };
  }
  if (allowanceSeconds === 0) {
    return {
      available: false,
      reason: `You set no study time for ${WEEKDAY_LABELS[weekday]}s.`,
    };
  }
  if (completedTodaySeconds >= allowanceSeconds) {
    return {
      available: false,
      reason: "You've already used up today's study time.",
    };
  }
  return { available: true, reason: null };
}
