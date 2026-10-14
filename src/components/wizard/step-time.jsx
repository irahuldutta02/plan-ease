"use client";

import {
  RatioEditor,
  WeeklyTimeEditor,
} from "@/components/plan/study-time-editor";
import { formatDuration } from "@/lib/time";

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-background p-3 text-center">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Step 2: study time per weekday, speed ratio, and a live summary. */
export function StepTime({ draft, update, content, estimate }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How long can you study?</h2>
        <WeeklyTimeEditor
          weeklyMinutes={draft.weeklyMinutes}
          onChange={(weeklyMinutes) => update({ weeklyMinutes })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How fast will you go?</h2>
        <RatioEditor
          ratio={draft.ratio}
          onChange={(ratio) => update({ ratio })}
        />
      </section>

      <section
        aria-live="polite"
        className="flex flex-col gap-3 rounded-3xl bg-primary-soft p-4"
      >
        <h2 className="font-semibold">Your estimate</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Lecture time"
            value={formatDuration(content.lectureSeconds)}
          />
          <Stat
            label="At your speed"
            value={formatDuration(content.effectiveSeconds)}
          />
          <Stat
            label="Study days"
            value={estimate.ok ? estimate.studyDays : "–"}
          />
        </div>
        {estimate.ok ? (
          <p className="text-sm text-muted-foreground">
            Study days are counted before any skip days you add later.
          </p>
        ) : (
          <p role="alert" className="text-sm text-danger">
            {estimate.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
