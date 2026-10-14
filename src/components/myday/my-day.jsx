"use client";

import { Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { LessonCard } from "@/components/myday/lesson-card";
import { WeekStrip } from "@/components/myday/week-strip";
import { buttonClasses } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusChip } from "@/components/ui/status-chip";
import { authClient } from "@/lib/auth-client";
import { celebrate } from "@/lib/celebrate";
import { formatDate } from "@/lib/dates";
import { daysLeftText, describeEndChange, greetingFor } from "@/lib/format";
import { detectMilestones } from "@/lib/milestones";
import { formatDuration } from "@/lib/time";
import { useLessonToggle } from "@/lib/use-lesson-toggle";
import { useResource } from "@/lib/use-resource";

function MyDaySkeleton() {
  return (
    <output
      className="flex flex-col items-center gap-6"
      aria-busy="true"
      aria-label="Loading your day"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="size-48 rounded-full" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </output>
  );
}

const sum = (list, pick) =>
  list.reduce((total, entry) => total + pick(entry), 0);

export function MyDay() {
  const { data, error, loading, reload } = useResource("/api/myday");
  const { overrides, toggle } = useLessonToggle();
  const { data: session } = authClient.useSession();

  // Server data with the optimistic check-offs applied on top
  const view = useMemo(() => {
    if (!data) return null;
    const plans = data.plans.map((plan) => ({
      ...plan,
      items: plan.items.map((item) => ({
        ...item,
        done: overrides[`${plan.id}:${item.lessonId}`] ?? item.done,
      })),
    }));
    const withWork = plans.filter((plan) => plan.items.length > 0);
    const all = withWork.flatMap((plan) => plan.items);
    const doneSeconds = sum(
      all.filter((item) => item.done),
      (item) => item.seconds,
    );
    const plannedSeconds = sum(
      all.filter((item) => !item.done),
      (item) => item.seconds,
    );
    const next = withWork
      .flatMap((plan) =>
        plan.items.filter((item) => !item.done).map((item) => ({ plan, item })),
      )
      .at(0);
    return { plans, withWork, doneSeconds, plannedSeconds, next };
  }, [data, overrides]);

  async function onToggle(plan, item, completed, { undo = false } = {}) {
    // Will this check-off finish everything for today?
    const finishesDay =
      completed &&
      view.withWork.every((p) =>
        p.items.every(
          (i) => i.done || (p.id === plan.id && i.lessonId === item.lessonId),
        ),
      );

    const result = await toggle(plan.id, item.lessonId, completed, () =>
      reload({ silent: true }),
    );
    if (!result || undo) return;

    const milestones = completed
      ? detectMilestones(plan.summary, result.summary)
      : [];
    const big = milestones.find(
      (m) => m.kind === "plan" || m.kind === "percent",
    );
    if (big) celebrate("big");
    else if (finishesDay || milestones.length > 0) celebrate("small");

    const headline = finishesDay
      ? "Day complete! 🎉 Enjoy the rest of it."
      : (milestones[0]?.text ??
        (completed ? "Lesson completed" : "Marked incomplete"));
    toast(headline, {
      description: describeEndChange(result.change) ?? "Rescheduled",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => onToggle(plan, item, !completed, { undo: true }),
      },
    });
  }

  if (loading) return <MyDaySkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => reload()} />;

  if (data.plans.length === 0) {
    return (
      <EmptyState
        emoji="🌱"
        title="Your day is a blank page"
        body="Create a plan from any course and PlanEase will tell you exactly what to study each day."
        action={
          <Link
            href="/plans/new"
            className={buttonClasses({ size: "lg", className: "w-full" })}
          >
            Create plan
          </Link>
        }
      />
    );
  }

  const { withWork, doneSeconds, plannedSeconds, next } = view;
  const total = doneSeconds + plannedSeconds;
  const pct = total === 0 ? 0 : Math.round((doneSeconds / total) * 100);
  const firstName = session?.user?.name?.split(" ")[0];
  const behind = data.plans.filter(
    (plan) => plan.summary.status.kind === "behind",
  );
  const resting = data.plans.filter(
    (plan) =>
      plan.items.length === 0 && !plan.summary.finished && !plan.scheduleError,
  );

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="flex flex-col gap-6 lg:sticky lg:top-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {greetingFor(new Date().getHours())}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-muted-foreground">
            {formatDate(data.today, { weekday: true, year: true })}
          </p>
        </header>

        <section
          aria-label="Today's progress"
          className="flex flex-col items-center gap-4 rounded-3xl bg-card p-6 shadow-card"
        >
          <ProgressRing value={pct} size={188} label="Today's progress">
            {total === 0 ? (
              <div>
                <p className="text-3xl" aria-hidden="true">
                  😌
                </p>
                <p className="text-sm text-muted-foreground">Nothing planned</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl font-semibold tabular-nums">{pct}%</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(doneSeconds)} of {formatDuration(total)}
                </p>
              </div>
            )}
          </ProgressRing>
          <p className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-4 py-1.5 text-sm font-semibold text-warning">
            <Flame className="size-4" aria-hidden="true" />
            {data.streak > 0
              ? `${data.streak}-day streak`
              : "Start a streak today"}
          </p>
          <WeekStrip week={data.week} />
        </section>
      </div>

      <div className="flex flex-col gap-6">
        {behind.length > 0 && (
          <output className="block rounded-2xl bg-primary-soft p-4 text-sm">
            🌱 Let's pick up where you left off. Missed work has already moved
            forward, so there's nothing to catch up on.
          </output>
        )}

        {withWork.map((plan) => (
          <section
            key={plan.id}
            aria-labelledby={`plan-${plan.id}`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2
                id={`plan-${plan.id}`}
                className="min-w-0 flex-1 truncate text-lg font-semibold"
              >
                <Link href={`/plans/${plan.id}`} className="hover:underline">
                  {plan.title}
                </Link>
              </h2>
              <StatusChip status={plan.summary.status} />
              <span className="text-sm text-muted-foreground">
                {daysLeftText(plan.summary)}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {plan.items.map((item) => (
                <LessonCard
                  key={`${item.lessonId}-${item.part}`}
                  planId={plan.id}
                  item={item}
                  onToggle={(completed) => onToggle(plan, item, completed)}
                />
              ))}
            </ul>
          </section>
        ))}

        {withWork.length === 0 && (
          <EmptyState
            emoji="😴"
            title="Rest day. You've earned it."
            body={
              resting[0]?.nextStudyDate
                ? `Your next study day is ${formatDate(resting[0].nextStudyDate, { weekday: true })}.`
                : "No lessons are scheduled for today."
            }
          />
        )}

        {data.plans
          .filter((plan) => plan.scheduleError)
          .map((plan) => (
            <p
              key={plan.id}
              role="alert"
              className="rounded-2xl bg-warning-soft p-4 text-sm text-warning"
            >
              <Link
                href={`/plans/${plan.id}`}
                className="font-semibold underline"
              >
                {plan.title}
              </Link>{" "}
              needs attention: {plan.scheduleError.message}
            </p>
          ))}
      </div>

      {withWork.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2 md:bottom-4 md:left-64">
          <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-card">
            <Sparkles className="size-5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-sm">
              {next ? (
                <>
                  <span className="font-semibold">Up next:</span>{" "}
                  {next.item.lessonTitle}
                </>
              ) : (
                <span className="font-semibold">All done for today 🎉</span>
              )}
            </p>
            <p className="shrink-0 text-sm tabular-nums opacity-80">
              {plannedSeconds > 0
                ? `${formatDuration(plannedSeconds)} left`
                : "Nice work"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
