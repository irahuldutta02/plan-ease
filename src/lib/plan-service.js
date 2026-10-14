import "server-only";
import mongoose from "mongoose";
import { getPlanModel } from "@/models/Plan";
import { ApiError } from "./api";
import { todayIn } from "./dates.js";
import { analyzePlan } from "./plan-summary.js";

/** Plain, client-safe version of a stored plan. */
export function toPlanDTO(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    sections: doc.sections.map((section) => ({
      section: section.section,
      title: section.title,
      lessons: section.lessons.map((lesson) => ({
        id: String(lesson._id),
        lesson: lesson.lesson,
        title: lesson.title,
        durationSeconds: lesson.durationSeconds,
        completed: Boolean(lesson.completed),
        completedAt: lesson.completedAt
          ? new Date(lesson.completedAt).toISOString()
          : null,
      })),
    })),
    ratio: { a: doc.ratio.a, b: doc.ratio.b },
    weeklyMinutes: {
      mon: doc.weeklyMinutes.mon,
      tue: doc.weeklyMinutes.tue,
      wed: doc.weeklyMinutes.wed,
      thu: doc.weeklyMinutes.thu,
      fri: doc.weeklyMinutes.fri,
      sat: doc.weeklyMinutes.sat,
      sun: doc.weeklyMinutes.sun,
    },
    startDate: doc.startDate,
    skipDates: [...(doc.skipDates ?? [])].sort(),
    timezone: doc.timezone,
    createdAt: doc.createdAt?.toISOString?.() ?? null,
    updatedAt: doc.updatedAt?.toISOString?.() ?? null,
  };
}

export function assertObjectId(id, label = "plan") {
  if (!mongoose.isValidObjectId(id))
    throw new ApiError(404, `That ${label} wasn't found.`);
}

/** Load a plan only if it belongs to the user; otherwise 404 (never reveal others' plans). */
export async function findOwnedPlan(userId, id) {
  assertObjectId(id);
  const Plan = await getPlanModel();
  const doc = await Plan.findOne({ _id: id, userId }).lean();
  if (!doc) throw new ApiError(404, "That plan wasn't found.");
  return toPlanDTO(doc);
}

/** Schedule + summary for a plan DTO in the user's current timezone. */
export function analyze(plan, timezone, now = new Date()) {
  return analyzePlan(plan, { today: todayIn(timezone, now), timezone });
}

/** Response body shared by plan reads and mutations. */
export function planPayload(plan, timezone, extra = {}) {
  const { schedule, scheduleError, summary } = analyze(plan, timezone);
  return { plan, schedule, scheduleError, summary, ...extra };
}

/** `{ before, after }` end dates when a change moved the finish line, else null. */
export function endDateChange(beforeSchedule, afterSchedule) {
  const before = beforeSchedule?.endDate ?? null;
  const after = afterSchedule?.endDate ?? null;
  return before !== after ? { before, after } : null;
}
