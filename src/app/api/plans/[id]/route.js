import { failure, ok, readJson, timezoneOf, withAuth } from "@/lib/api";
import { todayIn } from "@/lib/dates.js";
import {
  analyze,
  assertObjectId,
  endDateChange,
  findOwnedPlan,
  planPayload,
  toPlanDTO,
} from "@/lib/plan-service";
import { scheduleInput } from "@/lib/plan-summary.js";
import { mergeSections, validatePatchInput } from "@/lib/plan-validate.js";
import { buildSchedule } from "@/lib/scheduler.js";
import { getPlanModel } from "@/models/Plan";

/** GET /api/plans/[id]: the plan, its computed schedule and summary. */
export const GET = withAuth(async ({ request, params, userId }) => {
  const plan = await findOwnedPlan(userId, params.id);
  return ok(planPayload(plan, timezoneOf(request, plan.timezone)));
});

/**
 * PATCH /api/plans/[id]: change title, startDate, skipDates, weeklyMinutes,
 * ratio or sections. Responds with the new plan and `change` ({ before, after }
 * end dates) when the finish line moved.
 */
export const PATCH = withAuth(async ({ request, params, userId }) => {
  const plan = await findOwnedPlan(userId, params.id);
  const timezone = timezoneOf(request, plan.timezone);
  const today = todayIn(timezone);
  const before = analyze(plan, timezone);

  const todayEntry = before.schedule?.days.find((day) => day.date === today);
  const body = await readJson(request);
  const result = validatePatchInput(body, plan, {
    today,
    completedTodaySeconds: todayEntry?.doneSeconds ?? 0,
  });
  if (!result.ok)
    return failure(400, "Please fix the highlighted problems.", {
      issues: result.issues,
    });

  const updates = { ...result.updates };
  if (updates.sections)
    updates.sections = mergeSections(plan.sections, updates.sections);

  // Make sure the edited plan still produces a schedule before saving it
  const draft = { ...plan, ...updates };
  const check = buildSchedule(scheduleInput(draft, { today, timezone }));
  if (!check.ok)
    return failure(400, check.error.message, { code: check.error.code });

  const Plan = await getPlanModel();
  const saved = await Plan.findOneAndUpdate(
    { _id: params.id, userId },
    { $set: updates },
    { new: true },
  ).lean();
  const next = toPlanDTO(saved);
  const payload = planPayload(next, timezone);
  return ok({
    ...payload,
    change: endDateChange(before.schedule, payload.schedule),
  });
});

/** DELETE /api/plans/[id] */
export const DELETE = withAuth(async ({ params, userId }) => {
  assertObjectId(params.id);
  const Plan = await getPlanModel();
  const { deletedCount } = await Plan.deleteOne({ _id: params.id, userId });
  if (deletedCount === 0) return failure(404, "That plan wasn't found.");
  return ok({ deleted: true });
});
