"use client";

import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  CircleSlash,
  ListChecks,
  RotateCcw,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LessonsSheet,
  SkipDaysSheet,
  StartDateSheet,
  TimeSpeedSheet,
} from "@/components/plan/plan-sheets";
import { ScheduleList } from "@/components/plan/schedule-list";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { ConfirmSheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { StatusChip } from "@/components/ui/status-chip";
import { apiFetch, browserTimezone, errorMessage } from "@/lib/api-client";
import { celebrate } from "@/lib/celebrate";
import { formatDate, todayIn } from "@/lib/dates";
import {
  daysLeftText,
  describeEndChange,
  plural,
  speedLabel,
} from "@/lib/format";
import { detectMilestones } from "@/lib/milestones";
import { formatDuration } from "@/lib/time";
import { useLessonToggle } from "@/lib/use-lesson-toggle";
import { useResource } from "@/lib/use-resource";

function DetailSkeleton() {
  return (
    <output
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading plan"
    >
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40" />
      <Skeleton className="h-28" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </output>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl bg-muted p-3 text-center">
      <dd className="font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function ControlButton({ icon: Icon, label, value, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-card transition hover:-translate-y-px hover:border-primary"
    >
      <Icon
        className={`size-5 shrink-0 ${danger ? "text-danger" : "text-accent-text"}`}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className={`block font-medium ${danger ? "text-danger" : ""}`}>
          {label}
        </span>
        {value && (
          <span className="block truncate text-sm text-muted-foreground">
            {value}
          </span>
        )}
      </span>
    </button>
  );
}

export function PlanDetail({ id }) {
  const router = useRouter();
  const { data, error, loading, reload, setData } = useResource(
    `/api/plans/${id}`,
  );
  const { overrides, toggle } = useLessonToggle();
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState(null);
  const [jumpKey, setJumpKey] = useState(0);
  const [expandKey, setExpandKey] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);

  const today = useMemo(() => todayIn(browserTimezone()), []);

  const completed = useMemo(() => {
    if (!data) return [];
    return data.plan.sections.flatMap((section) =>
      section.lessons
        .filter((lesson) => lesson.completed)
        .map((lesson) => ({ ...lesson, sectionTitle: section.title })),
    );
  }, [data]);

  if (loading) return <DetailSkeleton />;
  if (error) {
    return error.status === 404 ? (
      <ErrorState
        message="This plan doesn't exist any more."
        onRetry={() => router.replace("/plans")}
      />
    ) : (
      <ErrorState message={error.message} onRetry={() => reload()} />
    );
  }

  const { plan, schedule, scheduleError, summary } = data;
  const todayEntry = schedule?.days.find((day) => day.date === today);
  const doneTodaySeconds = todayEntry?.doneSeconds ?? 0;
  const weeklyTotal = Object.values(plan.weeklyMinutes).reduce(
    (a, b) => a + b,
    0,
  );

  function apply(result) {
    setData(result);
    setChange(result.change ?? null);
  }

  /** Save a PATCH, then show the new schedule and any end-date shift. */
  async function patchPlan(body, { message = "Plan updated", undo } = {}) {
    setBusy(true);
    try {
      const result = await apiFetch(`/api/plans/${id}`, {
        method: "PATCH",
        body,
      });
      apply(result);
      toast.success(message, {
        description: describeEndChange(result.change) ?? undefined,
        action: undo && {
          label: "Undo",
          onClick: () => patchPlan(undo, { message: "Change undone" }),
        },
      });
      setSheet(null);
    } catch (patchError) {
      toast.error(errorMessage(patchError));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleLesson(lessonId, completedNow, { undo = false } = {}) {
    const result = await toggle(id, lessonId, completedNow, apply);
    if (!result || undo) return;
    const milestones = completedNow
      ? detectMilestones(summary, result.summary)
      : [];
    if (milestones.some((m) => m.kind === "plan" || m.kind === "percent"))
      celebrate("big");
    else if (milestones.length > 0) celebrate("small");
    toast(
      milestones[0]?.text ??
        (completedNow ? "Lesson completed" : "Marked incomplete"),
      {
        description: describeEndChange(result.change) ?? "Rescheduled",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () =>
            onToggleLesson(lessonId, !completedNow, { undo: true }),
        },
      },
    );
  }

  async function resetProgress() {
    setBusy(true);
    try {
      const result = await apiFetch(`/api/plans/${id}/reset`, {
        method: "POST",
      });
      apply(result);
      toast.success("Progress reset. Fresh start! 🌱", {
        description: describeEndChange(result.change) ?? undefined,
      });
      setSheet(null);
    } catch (resetError) {
      toast.error(errorMessage(resetError));
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan() {
    setBusy(true);
    try {
      await apiFetch(`/api/plans/${id}`, { method: "DELETE" });
      toast.success("Plan deleted");
      router.replace("/plans");
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div>
        <Link
          href="/plans"
          className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Plans
        </Link>
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
            {plan.title}
          </h1>
          <StatusChip status={summary.status} className="mt-1.5" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-6 lg:sticky lg:top-10">
          <section
            aria-label="Overview"
            className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-card"
          >
            <div className="flex flex-col gap-1.5">
              <ProgressBar value={summary.progressPct} label="Plan progress" />
              <p className="flex justify-between text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {summary.progressPct}% done
                </span>
                <span>
                  {summary.lessonsDone}/{summary.lessonsTotal} lessons
                </span>
              </p>
            </div>
            {schedule && (
              <dl className="grid grid-cols-3 gap-2">
                <Tile
                  label="Ends"
                  value={summary.endDate ? formatDate(summary.endDate) : "Done"}
                />
                <Tile
                  label="Days left"
                  value={summary.finished ? "0" : (summary.daysLeft ?? "–")}
                />
                <Tile
                  label="Time left"
                  value={formatDuration(summary.totals.remainingSeconds)}
                />
              </dl>
            )}
            {change && (
              <div className="flex items-center gap-2 rounded-2xl bg-primary-soft p-3 text-sm font-medium text-accent-text">
                <span className="min-w-0 flex-1">
                  {describeEndChange(change)}
                </span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setChange(null)}
                  className="grid size-11 place-items-center"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
            {summary.finished && (
              <p className="rounded-2xl bg-success-soft p-3 text-center font-medium text-success">
                🏆 Every lesson is done. Brilliant work!
              </p>
            )}
            {scheduleError && (
              <p
                role="alert"
                className="rounded-2xl bg-warning-soft p-3 text-sm text-warning"
              >
                {scheduleError.message}
              </p>
            )}
          </section>

          <section
            aria-label="Plan controls"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
          >
            <ControlButton
              icon={CalendarDays}
              label="Start date"
              value={formatDate(plan.startDate, { year: true })}
              onClick={() => setSheet("start")}
            />
            <ControlButton
              icon={CircleSlash}
              label="Skip days"
              value={
                plan.skipDates.length
                  ? plural(plan.skipDates.length, "day")
                  : "None"
              }
              onClick={() => setSheet("skip")}
            />
            <ControlButton
              icon={Timer}
              label="Study time & speed"
              value={`${formatDuration(weeklyTotal * 60)}/week · ${speedLabel(plan.ratio)}`}
              onClick={() => setSheet("time")}
            />
            <ControlButton
              icon={ListChecks}
              label="Edit course"
              value={`${summary.lessonsTotal} lessons`}
              onClick={() => setSheet("lessons")}
            />
            <ControlButton
              icon={RotateCcw}
              label="Reset progress"
              onClick={() => setSheet("reset")}
            />
            <ControlButton
              icon={Trash2}
              label="Delete plan"
              danger
              onClick={() => setSheet("delete")}
            />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {schedule && schedule.days.length > 0 && (
            <section
              aria-labelledby="schedule-heading"
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="schedule-heading" className="text-lg font-semibold">
                  Schedule · {daysLeftText(summary)}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setExpandKey((key) => key + 1)}
                >
                  Expand / collapse
                </Button>
              </div>
              <ScheduleList
                days={schedule.days}
                sections={plan.sections}
                today={today}
                skipDates={plan.skipDates}
                endDate={schedule.endDate}
                planId={id}
                overrides={overrides}
                onToggleLesson={onToggleLesson}
                jumpKey={jumpKey}
                expandAllKey={expandKey}
              />
            </section>
          )}

          {completed.length > 0 && (
            <section className="flex flex-col gap-2">
              <Button
                variant="outline"
                aria-expanded={showCompleted}
                onClick={() => setShowCompleted((v) => !v)}
              >
                {showCompleted ? "Hide" : "Show"} completed lessons (
                {completed.length})
              </Button>
              {showCompleted && (
                <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                  {completed.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
                    >
                      {/* biome-ignore lint/a11y/useSemanticElements: styled round checkbox */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={overrides[`${id}:${lesson.id}`] ?? true}
                        aria-label={`Mark incomplete: ${lesson.title}`}
                        onClick={() => onToggleLesson(lesson.id, false)}
                        className="grid size-11 shrink-0 place-items-center"
                      >
                        <span className="grid size-6 place-items-center rounded-full border-2 border-success bg-success text-sm text-card">
                          ✓
                        </span>
                      </button>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-muted-foreground line-through">
                          {lesson.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {lesson.sectionTitle}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      {schedule && schedule.days.length > 0 && (
        <Button
          size="lg"
          className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 md:right-8 md:bottom-8"
          onClick={() => setJumpKey((key) => key + 1)}
        >
          <CalendarClock className="size-5" aria-hidden="true" />
          Today
        </Button>
      )}

      <StartDateSheet
        open={sheet === "start"}
        onOpenChange={(open) => !open && setSheet(null)}
        plan={plan}
        today={today}
        doneTodaySeconds={doneTodaySeconds}
        busy={busy}
        onSave={(startDate) =>
          patchPlan({ startDate }, { message: "Start date updated" })
        }
      />
      <SkipDaysSheet
        open={sheet === "skip"}
        onOpenChange={(open) => !open && setSheet(null)}
        plan={plan}
        today={today}
        busy={busy}
        onSave={(skipDates) =>
          patchPlan(
            { skipDates },
            {
              message: "Skip days updated",
              undo: { skipDates: plan.skipDates },
            },
          )
        }
      />
      <TimeSpeedSheet
        open={sheet === "time"}
        onOpenChange={(open) => !open && setSheet(null)}
        plan={plan}
        busy={busy}
        onSave={(values) =>
          patchPlan(values, {
            message: "Rescheduled",
            undo: { weeklyMinutes: plan.weeklyMinutes, ratio: plan.ratio },
          })
        }
      />
      <LessonsSheet
        open={sheet === "lessons"}
        onOpenChange={(open) => !open && setSheet(null)}
        plan={plan}
        busy={busy}
        onSave={(values) => patchPlan(values, { message: "Course updated" })}
      />
      <ConfirmSheet
        open={sheet === "reset"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Reset progress?"
        description="Every lesson becomes incomplete and the plan reschedules from your start date (or today if it has passed). This can't be undone."
        confirmLabel="Reset progress"
        danger
        busy={busy}
        onConfirm={resetProgress}
      />
      <ConfirmSheet
        open={sheet === "delete"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Delete this plan?"
        description={`"${plan.title}" and all of its progress will be removed permanently.`}
        confirmLabel="Delete plan"
        danger
        busy={busy}
        onConfirm={deletePlan}
      />
    </div>
  );
}
