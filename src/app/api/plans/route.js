import { failure, ok, readJson, timezoneOf, withAuth } from "@/lib/api";
import { todayIn } from "@/lib/dates.js";
import { analyze, toPlanDTO } from "@/lib/plan-service";
import { validateCreateInput } from "@/lib/plan-validate.js";
import { buildSchedule } from "@/lib/scheduler.js";
import { getPlanModel } from "@/models/Plan";

const MAX_PLANS_PER_USER = 50;

/** GET /api/plans: the user's plans with progress, no day-by-day schedule. */
export const GET = withAuth(async ({ request, userId }) => {
  const Plan = await getPlanModel();
  const docs = await Plan.find({ userId }).sort({ updatedAt: -1 }).lean();
  const timezone = timezoneOf(request, docs[0]?.timezone);

  const plans = docs.map((doc) => {
    const plan = toPlanDTO(doc);
    const { summary, scheduleError } = analyze(plan, timezone);
    return {
      id: plan.id,
      title: plan.title,
      startDate: plan.startDate,
      createdAt: plan.createdAt,
      summary,
      scheduleError,
    };
  });
  return ok({ plans });
});

/** POST /api/plans: validate, check the schedule builds, then save. */
export const POST = withAuth(async ({ request, userId }) => {
  const body = await readJson(request);
  const timezone = timezoneOf(request, body.timezone);
  const today = todayIn(timezone);

  const result = validateCreateInput({ ...body, timezone }, { today });
  if (!result.ok)
    return failure(400, "Please fix the highlighted problems.", {
      issues: result.issues,
    });

  const schedule = buildSchedule({
    sections: result.value.sections,
    weeklyMinutes: result.value.weeklyMinutes,
    ratio: result.value.ratio,
    startDate: result.value.startDate,
    skipDates: result.value.skipDates,
    today,
    timezone,
  });
  if (!schedule.ok)
    return failure(400, schedule.error.message, { code: schedule.error.code });

  const Plan = await getPlanModel();
  if ((await Plan.countDocuments({ userId })) >= MAX_PLANS_PER_USER) {
    return failure(
      400,
      `You can have up to ${MAX_PLANS_PER_USER} plans. Delete one to add another.`,
    );
  }

  const doc = await Plan.create({ ...result.value, userId });
  return ok({ id: String(doc._id) }, { status: 201 });
});
