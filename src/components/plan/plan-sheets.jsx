"use client";

import { useEffect, useState } from "react";
import { CourseTreeEditor } from "@/components/plan/course-tree-editor";
import {
  RatioEditor,
  WeeklyTimeEditor,
} from "@/components/plan/study-time-editor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  treeFromSections,
  treeToPayload,
  validateTree,
} from "@/lib/course-tree";
import { formatDate, WEEKDAYS } from "@/lib/dates";
import { plural } from "@/lib/format";
import { getStartDateAvailability } from "@/lib/scheduler";

/** Edit the start date. Today is disabled, with the reason, when no study time is left. */
export function StartDateSheet({
  open,
  onOpenChange,
  plan,
  today,
  doneTodaySeconds,
  busy,
  onSave,
}) {
  const [date, setDate] = useState(plan.startDate);

  useEffect(() => {
    if (open) setDate(plan.startDate < today ? today : plan.startDate);
  }, [open, plan.startDate, today]);

  const availability = getStartDateAvailability({
    date: today,
    today,
    weeklyMinutes: plan.weeklyMinutes,
    skipDates: plan.skipDates,
    completedTodaySeconds: doneTodaySeconds,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Start date"
      description="Pick today or a later day. The schedule regenerates."
      footer={
        <Button
          className="flex-1"
          size="lg"
          disabled={busy || date === plan.startDate}
          onClick={() => onSave(date)}
        >
          {busy ? "Saving…" : `Start ${formatDate(date)}`}
        </Button>
      }
    >
      {!availability.available && (
        <p className="mb-3 rounded-2xl bg-warning-soft p-3 text-sm text-warning">
          Today is unavailable: {availability.reason}
        </p>
      )}
      <Calendar
        mode="single"
        selected={date}
        minDate={today}
        disabledDates={availability.available ? [] : [today]}
        offWeekdays={WEEKDAYS.filter((key) => plan.weeklyMinutes[key] === 0)}
        onChange={setDate}
      />
    </Sheet>
  );
}

/** Add or remove skip days, including today (unfinished work moves to the next study day). */
export function SkipDaysSheet({
  open,
  onOpenChange,
  plan,
  today,
  busy,
  onSave,
}) {
  const [dates, setDates] = useState(plan.skipDates);

  useEffect(() => {
    if (open) setDates(plan.skipDates);
  }, [open, plan.skipDates]);

  const changed = dates.join() !== plan.skipDates.join();
  const upcoming = dates.filter((date) => date >= today).length;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Skip days"
      description="Tap days you won't study. Remove one by tapping it again."
      footer={
        <Button
          className="flex-1"
          size="lg"
          disabled={busy || !changed}
          onClick={() => onSave(dates)}
        >
          {busy ? "Saving…" : "Save skip days"}
        </Button>
      }
    >
      <Calendar
        mode="multiple"
        selected={dates}
        minDate={today}
        offWeekdays={WEEKDAYS.filter((key) => plan.weeklyMinutes[key] === 0)}
        onChange={setDates}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        {upcoming === 0
          ? "No upcoming skip days."
          : `${plural(upcoming, "upcoming skip day")}.`}{" "}
        Greyed days are in the past; dotted days are weekly days off.
      </p>
    </Sheet>
  );
}

/** Edit daily study time and speed. */
export function TimeSpeedSheet({ open, onOpenChange, plan, busy, onSave }) {
  const [weeklyMinutes, setWeeklyMinutes] = useState(plan.weeklyMinutes);
  const [ratio, setRatio] = useState(plan.ratio);

  useEffect(() => {
    if (open) {
      setWeeklyMinutes(plan.weeklyMinutes);
      setRatio(plan.ratio);
    }
  }, [open, plan.weeklyMinutes, plan.ratio]);

  const changed =
    JSON.stringify({ weeklyMinutes, ratio }) !==
    JSON.stringify({ weeklyMinutes: plan.weeklyMinutes, ratio: plan.ratio });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Study time & speed"
      tall
      footer={
        <Button
          className="flex-1"
          size="lg"
          disabled={busy || !changed}
          onClick={() => onSave({ weeklyMinutes, ratio })}
        >
          {busy ? "Saving…" : "Save and reschedule"}
        </Button>
      }
    >
      <div className="flex flex-col gap-8 pt-1">
        <WeeklyTimeEditor
          weeklyMinutes={weeklyMinutes}
          onChange={setWeeklyMinutes}
        />
        <RatioEditor ratio={ratio} onChange={setRatio} />
      </div>
    </Sheet>
  );
}

/** Rename the plan and edit its sections and lessons. Progress on kept lessons is preserved. */
export function LessonsSheet({ open, onOpenChange, plan, busy, onSave }) {
  const [title, setTitle] = useState(plan.title);
  const [tree, setTree] = useState([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(plan.title);
      setTree(treeFromSections(plan.sections));
      setShowErrors(false);
    }
  }, [open, plan.title, plan.sections]);

  const issues = validateTree(tree);
  if (!title.trim()) issues.unshift("Give your plan a title.");

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit course"
      description="Changes reschedule your remaining lessons."
      tall
      footer={
        <Button
          className="flex-1"
          size="lg"
          disabled={busy}
          onClick={() => {
            if (issues.length > 0) {
              setShowErrors(true);
              return;
            }
            onSave({ title: title.trim(), sections: treeToPayload(tree) });
          }}
        >
          {busy ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <Field label="Plan title">
          {(id) => (
            <Input
              id={id}
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>
        <CourseTreeEditor tree={tree} onChange={setTree} />
        {showErrors && issues.length > 0 && (
          <ul
            role="alert"
            className="rounded-2xl bg-danger-soft p-4 text-sm text-danger"
          >
            {issues.slice(0, 4).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
