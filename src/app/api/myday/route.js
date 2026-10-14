import { ok, timezoneOf, withAuth } from "@/lib/api";
import { toPlanDTO } from "@/lib/plan-service";
import { buildMyDay } from "@/lib/plan-summary.js";
import { getPlanModel } from "@/models/Plan";

/** GET /api/myday: today's work across all plans, plus streak and week strip. */
export const GET = withAuth(async ({ request, userId }) => {
  const Plan = await getPlanModel();
  const docs = await Plan.find({ userId }).sort({ updatedAt: -1 }).lean();
  const timezone = timezoneOf(request, docs[0]?.timezone);
  return ok(buildMyDay(docs.map(toPlanDTO), timezone));
});
