"use client";

import { useState } from "react";
import { ScheduleList } from "@/components/plan/schedule-list";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { formatDuration } from "@/lib/time";

/** Step 5: the generated schedule, end date and totals. Saving happens in the wizard footer. */
export function StepReview({ draft, today, schedule, sections, submitError }) {
  const [showAll, setShowAll] = useState(false);

  if (!schedule.ok) {
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
        {schedule.error.message}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-highlight p-6 text-primary-foreground shadow-card">
        <p className="text-sm opacity-90">{draft.title}</p>
        <p className="mt-1 text-sm opacity-90">You'll finish on</p>
        <p className="text-3xl font-semibold tracking-tight">
          🏁 {formatDate(schedule.endDate, { weekday: true, year: true })}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 p-3">
            <dt className="text-xs opacity-90">Study days</dt>
            <dd className="text-xl font-semibold">{schedule.studyDays}</dd>
          </div>
          <div className="rounded-2xl bg-white/15 p-3">
            <dt className="text-xs opacity-90">Skipped</dt>
            <dd className="text-xl font-semibold">{schedule.skippedDays}</dd>
          </div>
          <div className="rounded-2xl bg-white/15 p-3">
            <dt className="text-xs opacity-90">Total time</dt>
            <dd className="text-xl font-semibold">
              {formatDuration(schedule.totals.effectiveSeconds)}
            </dd>
          </div>
        </dl>
      </section>

      {submitError && (
        <div
          role="alert"
          className="rounded-2xl bg-danger-soft p-4 text-sm text-danger"
        >
          <p className="font-semibold">We couldn't save your plan</p>
          <p>{submitError}</p>
          <p className="mt-1">
            Your draft is safe. Tap "Create plan" to try again.
          </p>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your schedule</h2>
        <ScheduleList
          days={schedule.days}
          sections={sections}
          today={today}
          skipDates={draft.skipDates}
          endDate={schedule.endDate}
          limit={showAll ? undefined : 14}
        />
        {!showAll && schedule.days.length > 14 && (
          <Button variant="outline" onClick={() => setShowAll(true)}>
            Show all {plural(schedule.days.length, "study day")}
          </Button>
        )}
      </section>
    </div>
  );
}
