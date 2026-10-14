import { CalendarDays, Flag } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/dates";
import { daysLeftText } from "@/lib/format";

/** One plan in the list: progress, dates and a finish-line countdown. */
export function PlanCard({ plan }) {
  const { summary } = plan;
  return (
    <li>
      <Link
        href={`/plans/${plan.id}`}
        className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-card transition hover:border-primary"
      >
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
            {plan.title}
          </h2>
          <StatusChip status={summary.status} />
        </div>

        <div className="flex flex-col gap-1.5">
          <ProgressBar
            value={summary.progressPct}
            label={`${plan.title} progress`}
          />
          <p className="flex justify-between text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {summary.progressPct}%
            </span>
            <span>
              {summary.lessonsDone}/{summary.lessonsTotal} lessons
            </span>
          </p>
        </div>

        {plan.scheduleError ? (
          <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
            {plan.scheduleError.message}
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="sr-only">Start date</dt>
                <dd className="truncate">
                  Starts {formatDate(plan.startDate)}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flag className="size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="sr-only">End date</dt>
                <dd className="truncate">
                  {summary.endDate
                    ? `Ends ${formatDate(summary.endDate)}`
                    : "Complete"}
                </dd>
              </div>
            </div>
            <p className="col-span-2 font-medium text-accent-text">
              🏁 {daysLeftText(summary)}
            </p>
          </dl>
        )}
      </Link>
    </li>
  );
}
