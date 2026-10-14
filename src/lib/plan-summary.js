import {
  addDays,
  dateInTimezone,
  diffDays,
  todayIn,
  WEEKDAYS,
  weekdayOf,
} from "./dates.js";
import { buildSchedule } from "./scheduler.js";

/**
 * Derived, read-time facts about plans: progress, status chip, streaks.
 * Everything here is computed from the stored plan; nothing is persisted.
 */

/** Scheduler input for a plan DTO. */
export function scheduleInput(plan, { today, timezone }) {
  return {
    sections: plan.sections,
    weeklyMinutes: plan.weeklyMinutes,
    ratio: plan.ratio,
    startDate: plan.startDate,
    skipDates: plan.skipDates,
    today,
    timezone,
  };
}

/**
 * "On track", "Ahead", "Behind by N days", "Starts in N days" or "Done".
 * Compares real progress to a baseline run from the start date with nothing
 * completed: how many baseline study days are fully covered by finished work
 * versus how many have already passed.
 */
function statusOf(plan, schedule, today, timezone) {
  if (schedule.totals.remainingSeconds === 0) return { kind: "done", days: 0 };
  if (today < plan.startDate) {
    return { kind: "not_started", days: diffDays(plan.startDate, today) };
  }

  const baseline = buildSchedule({
    ...scheduleInput(plan, { today: plan.startDate, timezone }),
    sections: plan.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        completed: false,
      })),
    })),
  });
  if (!baseline.ok) return { kind: "on_track", days: 0 };

  const studyDays = baseline.days.filter((day) => day.plannedSeconds > 0);
  const passed = studyDays.filter((day) => day.date < today).length;
  const passedIncludingToday = studyDays.filter(
    (day) => day.date <= today,
  ).length;

  let covered = 0;
  let cumulative = 0;
  for (const day of studyDays) {
    cumulative += day.plannedSeconds;
    if (cumulative > schedule.totals.completedSeconds) break;
    covered += 1;
  }

  if (passed > covered) return { kind: "behind", days: passed - covered };
  if (covered > passedIncludingToday) {
    return { kind: "ahead", days: covered - passedIncludingToday };
  }
  return { kind: "on_track", days: 0 };
}

/**
 * @param {object} plan plan DTO
 * @param {{ today: string, timezone: string }} context
 * @returns {{ schedule: object | null, scheduleError: object | null, summary: object }}
 */
export function analyzePlan(plan, { today, timezone }) {
  const result = buildSchedule(scheduleInput(plan, { today, timezone }));

  let lessonsTotal = 0;
  let lessonsDone = 0;
  let sectionsDone = 0;
  for (const section of plan.sections) {
    lessonsTotal += section.lessons.length;
    const done = section.lessons.filter((lesson) => lesson.completed).length;
    lessonsDone += done;
    if (section.lessons.length > 0 && done === section.lessons.length)
      sectionsDone += 1;
  }

  const base = {
    lessonsTotal,
    lessonsDone,
    sectionsTotal: plan.sections.length,
    sectionsDone,
    startDate: plan.startDate,
  };

  if (!result.ok) {
    return {
      schedule: null,
      scheduleError: result.error,
      summary: {
        ...base,
        progressPct: 0,
        endDate: null,
        daysLeft: null,
        finished: false,
        status: { kind: "on_track", days: 0 },
      },
    };
  }

  const { totals, endDate } = result;
  const progressPct =
    totals.effectiveSeconds === 0
      ? 0
      : Math.floor((totals.completedSeconds / totals.effectiveSeconds) * 100);
  const finished = totals.remainingSeconds === 0;

  return {
    schedule: result,
    scheduleError: null,
    summary: {
      ...base,
      progressPct: finished ? 100 : Math.min(progressPct, 99),
      endDate,
      daysLeft:
        finished || !endDate ? 0 : Math.max(0, diffDays(endDate, today)),
      finished,
      totals,
      status: statusOf(plan, result, today, timezone),
    },
  };
}

/** Dates (in the timezone) on which the user completed at least one lesson. */
function activityDates(plans, timezone) {
  const dates = new Set();
  for (const plan of plans) {
    for (const section of plan.sections) {
      for (const lesson of section.lessons) {
        if (lesson.completed && lesson.completedAt) {
          dates.add(dateInTimezone(lesson.completedAt, timezone));
        }
      }
    }
  }
  return dates;
}

/** A rest day is one where no plan expected any work (skip, 0 allowance, not started). */
function makeRestDayCheck(plans) {
  return (date) =>
    plans.length > 0 &&
    plans.every(
      (plan) =>
        date < plan.startDate ||
        plan.skipDates.includes(date) ||
        plan.weeklyMinutes[weekdayOf(date)] === 0,
    );
}

/**
 * Consecutive active days ending today. Rest days neither add to nor break
 * the streak, and a day that is still in progress (today) never breaks it.
 */
export function computeStreak(activity, isRestDay, today) {
  let streak = 0;
  let date = today;
  for (let i = 0; i < 400; i += 1, date = addDays(date, -1)) {
    if (activity.has(date)) streak += 1;
    else if (date === today || isRestDay(date)) continue;
    else break;
  }
  return streak;
}

/** Monday to Sunday of the current week, with an activity flag per day. */
export function buildWeek(today, activity, isRestDay) {
  const monday = addDays(today, -WEEKDAYS.indexOf(weekdayOf(today)));
  return WEEKDAYS.map((weekday, index) => {
    const date = addDays(monday, index);
    return {
      date,
      weekday,
      active: activity.has(date),
      isToday: date === today,
      isFuture: date > today,
      rest: isRestDay(date),
    };
  });
}

/**
 * Everything the My Day screen needs, across all of a user's plans.
 * @param {object[]} plans plan DTOs
 */
export function buildMyDay(plans, timezone, now = new Date()) {
  const today = todayIn(timezone, now);
  const activity = activityDates(plans, timezone);
  const isRestDay = makeRestDayCheck(plans);

  const planViews = plans.map((plan) => {
    const { schedule, scheduleError, summary } = analyzePlan(plan, {
      today,
      timezone,
    });
    const todayEntry = schedule?.days.find((day) => day.date === today) ?? null;
    const nextDay = schedule?.days.find(
      (day) => day.date > today && day.plannedSeconds > 0,
    );

    const items = (todayEntry?.items ?? []).map((item) => {
      const section = plan.sections[item.sectionIndex];
      const lesson = section.lessons[item.lessonIndex];
      return {
        lessonId: item.lessonId,
        sectionTitle: section.title,
        lessonTitle: lesson.title,
        durationSeconds: lesson.durationSeconds,
        seconds: item.seconds,
        part: item.part,
        parts: item.parts,
        done: item.done,
      };
    });

    return {
      id: plan.id,
      title: plan.title,
      summary,
      scheduleError,
      items,
      plannedSeconds: todayEntry?.plannedSeconds ?? 0,
      doneSeconds: todayEntry?.doneSeconds ?? 0,
      nextStudyDate: nextDay?.date ?? null,
    };
  });

  return {
    today,
    plans: planViews,
    streak: computeStreak(activity, isRestDay, today),
    week: buildWeek(today, activity, isRestDay),
  };
}
