import { failure, ok, timezoneOf, withAuth } from "@/lib/api";
import {
  analyze,
  endDateChange,
  findOwnedPlan,
  planPayload,
  toPlanDTO,
} from "@/lib/plan-service";
import { getPlanModel } from "@/models/Plan";

/**
 * POST /api/plans/[id]/reset: every lesson becomes incomplete. The schedule is
 * recomputed from the start date (or today if that has passed) on read.
 */
export const POST = withAuth(async ({ request, params, userId }) => {
  const plan = await findOwnedPlan(userId, params.id);
  const timezone = timezoneOf(request, plan.timezone);
  const before = analyze(plan, timezone);

  const Plan = await getPlanModel();
  const result = await Plan.updateOne(
    { _id: params.id, userId },
    {
      $set: {
        "sections.$[].lessons.$[].completed": false,
        "sections.$[].lessons.$[].completedAt": null,
      },
    },
  );
  if (result.matchedCount === 0) return failure(404, "That plan wasn't found.");

  const saved = await Plan.findOne({ _id: params.id, userId }).lean();
  const payload = planPayload(toPlanDTO(saved), timezone);
  return ok({
    ...payload,
    change: endDateChange(before.schedule, payload.schedule),
  });
});
