"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { addDays, formatDate, WEEKDAYS } from "@/lib/dates";
import { plural } from "@/lib/format";

/** Step 3: choose the start date. Today is disabled, with the reason, when no study time is left. */
export function StepStart({ draft, update, today, availability }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">When do you want to start?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Past dates aren't available.
        </p>
      </div>

      <Button
        variant={draft.startDate === today ? "primary" : "outline"}
        size="lg"
        disabled={!availability.available}
        onClick={() => update({ startDate: today })}
      >
        Start today
      </Button>
      {!availability.available && (
        <p
          role="note"
          className="-mt-2 rounded-2xl bg-warning-soft p-3 text-sm text-warning"
        >
          Today is unavailable: {availability.reason}
        </p>
      )}

      <div className="rounded-3xl border border-border bg-background p-3">
        <Calendar
          mode="single"
          selected={draft.startDate}
          minDate={today}
          disabledDates={availability.available ? [] : [today]}
          offWeekdays={WEEKDAYS.filter((key) => draft.weeklyMinutes[key] === 0)}
          onChange={(startDate) => update({ startDate })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Dotted days are weekdays you set to Off. If you start on one, your first
        lesson lands on the next study day.
      </p>

      {draft.startDate && (
        <p className="text-center font-medium">
          Starting{" "}
          <span className="text-accent-text">
            {formatDate(draft.startDate, { weekday: true, year: true })}
          </span>
        </p>
      )}
    </div>
  );
}

/** Step 4: pick specific dates to skip. Whole weekdays are skipped via Step 2. */
export function StepSkip({ draft, update, today }) {
  const minDate = draft.startDate ?? addDays(today, 1);
  const offWeekdays = WEEKDAYS.filter((key) => draft.weeklyMinutes[key] === 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Any days off?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap dates you won't study, like trips or exams. You can change these
          any time.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background p-3">
        <Calendar
          mode="multiple"
          selected={draft.skipDates}
          minDate={minDate}
          offWeekdays={offWeekdays}
          onChange={(skipDates) => update({ skipDates })}
        />
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li>Greyed: before your start date</li>
        <li>Dotted: weekly day off (Step 2)</li>
        <li>Ringed: today</li>
      </ul>

      {draft.skipDates.length > 0 ? (
        <section
          aria-label="Selected skip days"
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">
            {plural(draft.skipDates.length, "skip day")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {draft.skipDates.map((date) => (
              <li key={date}>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      skipDates: draft.skipDates.filter((d) => d !== date),
                    })
                  }
                  aria-label={`Remove skip day ${formatDate(date)}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-medium text-accent-text"
                >
                  {formatDate(date, { weekday: true })}
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No skip days. Nice and simple 🙌
        </p>
      )}
    </div>
  );
}
