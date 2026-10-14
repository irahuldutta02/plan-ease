import mongoose from "mongoose";
import {
  ApiError,
  failure,
  ok,
  readJson,
  timezoneOf,
  withAuth,
} from "@/lib/api";
import {
  analyze,
  assertObjectId,
  endDateChange,
  findOwnedPlan,
  planPayload,
  toPlanDTO,
} from "@/lib/plan-service";
import { getPlanModel } from "@/models/Plan";

/**
 * PATCH /api/plans/[id]/lessons/[lessonId]  body: { "completed": true | false }
 * Idempotent: sets the state rather than toggling it. Completing stamps
 * `completedAt` with the current time (used for streaks and today's allowance).
 */
export const PATCH = withAuth(async ({ request, params, userId }) => {
  assertObjectId(params.lessonId, "lesson");
  const body = await readJson(request);
  if (typeof body.completed !== "boolean") {
    throw new ApiError(400, '"completed" must be true or false.');
  }

  const plan = await findOwnedPlan(userId, params.id);
  const timezone = timezoneOf(request, plan.timezone);
  const before = analyze(plan, timezone);

  const lessonId = new mongoose.Types.ObjectId(params.lessonId);
  const Plan = await getPlanModel();
  const result = await Plan.updateOne(
    { _id: params.id, userId, "sections.lessons._id": lessonId },
    {
      $set: {
        "sections.$[].lessons.$[lesson].completed": body.completed,
        "sections.$[].lessons.$[lesson].completedAt": body.completed
          ? new Date()
          : null,
      },
    },
    { arrayFilters: [{ "lesson._id": lessonId }] },
  );
  if (result.matchedCount === 0)
    return failure(404, "That lesson wasn't found.");

  const saved = await Plan.findOne({ _id: params.id, userId }).lean();
  const payload = planPayload(toPlanDTO(saved), timezone);
  return ok({
    ...payload,
    change: endDateChange(before.schedule, payload.schedule),
  });
});
