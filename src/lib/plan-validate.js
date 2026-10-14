import { validateCourse } from "./course-json.js";
import { isValidISODate, isValidTimezone, WEEKDAYS } from "./dates.js";
import { getStartDateAvailability, isValidRatio } from "./scheduler.js";

/**
 * Server-side validation for plan input. Every function returns plain
 * `{ path, message }` issues so the API can answer with all problems at once.
 */

export const MAX_SKIP_DATES = 400;
const TITLE_MAX = 100;

const issue = (path, message) => ({ path, message });

export function checkTitle(value, issues) {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(issue("title", "Give your plan a title."));
    return null;
  }
  if (value.trim().length > TITLE_MAX) {
    issues.push(
      issue("title", `Keep the title under ${TITLE_MAX} characters.`),
    );
    return null;
  }
  return value.trim();
}

export function checkRatio(value, issues) {
  if (!isValidRatio(value) || value.a > 1000 || value.b > 1000) {
    issues.push(
      issue(
        "ratio",
        "Both sides of the speed ratio must be positive numbers (up to 1000).",
      ),
    );
    return null;
  }
  return { a: value.a, b: value.b };
}

export function checkWeeklyMinutes(value, issues) {
  const result = {};
  for (const key of WEEKDAYS) {
    const minutes = value?.[key];
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
      issues.push(
        issue(
          `weeklyMinutes.${key}`,
          "Study time must be a whole number of minutes from 0 to 1440.",
        ),
      );
      return null;
    }
    result[key] = minutes;
  }
  return result;
}

/**
 * @param {unknown} value
 * @param {{ today: string, existing?: string[] }} context new dates must not be
 *   in the past; dates already stored are kept as they are
 */
export function checkSkipDates(value, issues, { today, existing = [] }) {
  if (!Array.isArray(value) || value.length > MAX_SKIP_DATES) {
    issues.push(issue("skipDates", "skipDates must be a list of dates."));
    return null;
  }
  const kept = new Set(existing);
  for (const date of value) {
    if (!isValidISODate(date)) {
      issues.push(
        issue("skipDates", `"${date}" is not a valid date (use YYYY-MM-DD).`),
      );
      return null;
    }
    if (date < today && !kept.has(date)) {
      issues.push(
        issue(
          "skipDates",
          `${date} is in the past, so it can't be added as a skip day.`,
        ),
      );
      return null;
    }
  }
  return [...new Set(value)].sort();
}

export function checkStartDate(
  value,
  issues,
  { today, weeklyMinutes, skipDates, completedTodaySeconds },
) {
  if (!isValidISODate(value)) {
    issues.push(issue("startDate", "Start date must look like 2025-03-12."));
    return null;
  }
  const { available, reason } = getStartDateAvailability({
    date: value,
    today,
    weeklyMinutes,
    skipDates,
    completedTodaySeconds,
  });
  if (!available) {
    issues.push(issue("startDate", reason));
    return null;
  }
  return value;
}

/**
 * Validate the body of POST /api/plans.
 * @returns {{ ok: true, value: object } | { ok: false, issues: object[] }}
 */
export function validateCreateInput(body, { today }) {
  const issues = [];
  const title = checkTitle(body.title, issues);
  const ratio = checkRatio(body.ratio, issues);
  const weeklyMinutes = checkWeeklyMinutes(body.weeklyMinutes, issues);
  const skipDates = checkSkipDates(body.skipDates ?? [], issues, { today });

  let sections = null;
  const course = validateCourse(body.sections);
  if (course.ok) {
    // Fresh plans start with nothing completed; ids are assigned by the database
    sections = course.sections.map((section) => ({
      section: section.section,
      title: section.title,
      lessons: section.lessons.map((lesson) => ({
        lesson: lesson.lesson,
        title: lesson.title,
        durationSeconds: lesson.durationSeconds,
        completed: false,
        completedAt: null,
      })),
    }));
  } else {
    for (const item of course.errors)
      issues.push(issue(`sections${item.path.slice(1)}`, item.message));
  }

  let startDate = null;
  if (weeklyMinutes && skipDates) {
    startDate = checkStartDate(body.startDate, issues, {
      today,
      weeklyMinutes,
      skipDates,
      completedTodaySeconds: 0,
    });
  }

  if (!isValidTimezone(body.timezone))
    issues.push(issue("timezone", "Unknown timezone."));
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      title,
      sections,
      ratio,
      weeklyMinutes,
      startDate,
      skipDates,
      timezone: body.timezone,
    },
  };
}

const PATCHABLE = [
  "title",
  "startDate",
  "skipDates",
  "weeklyMinutes",
  "ratio",
  "sections",
];

/**
 * Validate the body of PATCH /api/plans/[id]. Only the fields present are
 * changed. `sections` replaces the lesson tree; lessons that keep their `id`
 * keep their progress.
 *
 * @param {object} body
 * @param {object} plan current plan DTO
 * @param {{ today: string, completedTodaySeconds: number }} context
 */
export function validatePatchInput(
  body,
  plan,
  { today, completedTodaySeconds },
) {
  const issues = [];
  const updates = {};

  for (const key of Object.keys(body)) {
    if (!PATCHABLE.includes(key))
      issues.push(issue(key, `"${key}" can't be changed.`));
  }
  if (Object.keys(body).length === 0)
    issues.push(issue("$", "Nothing to update."));

  if ("title" in body) {
    const title = checkTitle(body.title, issues);
    if (title) updates.title = title;
  }
  if ("ratio" in body) {
    const ratio = checkRatio(body.ratio, issues);
    if (ratio) updates.ratio = ratio;
  }
  if ("weeklyMinutes" in body) {
    const weeklyMinutes = checkWeeklyMinutes(body.weeklyMinutes, issues);
    if (weeklyMinutes) updates.weeklyMinutes = weeklyMinutes;
  }
  if ("skipDates" in body) {
    const skipDates = checkSkipDates(body.skipDates, issues, {
      today,
      existing: plan.skipDates,
    });
    if (skipDates) updates.skipDates = skipDates;
  }
  if ("startDate" in body && body.startDate !== plan.startDate) {
    const startDate = checkStartDate(body.startDate, issues, {
      today,
      weeklyMinutes: updates.weeklyMinutes ?? plan.weeklyMinutes,
      skipDates: updates.skipDates ?? plan.skipDates,
      completedTodaySeconds,
    });
    if (startDate) updates.startDate = startDate;
  }
  if ("sections" in body) {
    const course = validateCourse(body.sections);
    if (course.ok) updates.sections = course.sections;
    else
      for (const item of course.errors)
        issues.push(issue(`sections${item.path.slice(1)}`, item.message));
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, updates };
}

/**
 * Turn the validated lesson tree into stored sections. A lesson whose `id`
 * matches an existing lesson keeps its completion state and its id.
 */
export function mergeSections(existingSections, incoming) {
  const progress = new Map();
  for (const section of existingSections) {
    for (const lesson of section.lessons) {
      progress.set(lesson.id, {
        completed: lesson.completed,
        completedAt: lesson.completedAt,
      });
    }
  }
  const used = new Set(); // a repeated id would otherwise clone one lesson's state
  return incoming.map((section, si) => ({
    section: si + 1,
    title: section.title,
    lessons: section.lessons.map((lesson, li) => {
      const previous =
        lesson.id && !used.has(lesson.id) ? progress.get(lesson.id) : undefined;
      if (previous) used.add(lesson.id);
      return {
        ...(previous && { _id: lesson.id }),
        lesson: li + 1,
        title: lesson.title,
        durationSeconds: lesson.durationSeconds,
        completed: previous?.completed ?? false,
        completedAt: previous?.completedAt ?? null,
      };
    }),
  }));
}
