import { PlanDetail } from "@/components/plan/plan-detail";

export const metadata = { title: "Plan" };

export default async function PlanPage({ params }) {
  const { id } = await params;
  return <PlanDetail id={id} />;
}
