"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { PlanCard } from "@/components/plan/plan-card";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useResource } from "@/lib/use-resource";

export function PlansList() {
  const { data, error, loading, reload } = useResource("/api/plans");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Your plans</h1>
        <Link
          href="/plans/new"
          className={buttonClasses({ className: "hidden md:inline-flex" })}
        >
          <Plus className="size-4" aria-hidden="true" />
          New plan
        </Link>
      </div>

      {loading && (
        <output
          className="flex flex-col gap-4"
          aria-busy="true"
          aria-label="Loading plans"
        >
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </output>
      )}
      {error && <ErrorState message={error.message} onRetry={() => reload()} />}
      {data && data.plans.length === 0 && (
        <EmptyState
          emoji="🗺️"
          title="No plans yet"
          body="Import a course or build one by hand, and get a day-by-day schedule in a minute."
          action={
            <Link
              href="/plans/new"
              className={buttonClasses({ size: "lg", className: "w-full" })}
            >
              Create plan
            </Link>
          }
        />
      )}
      {data && data.plans.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      )}
    </div>
  );
}
