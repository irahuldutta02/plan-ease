"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { addDays, formatDate } from "@/lib/dates";
import { dayLabel } from "@/lib/format";
import { formatDuration } from "@/lib/time";

function LessonRow({ item, sections, interactive, checked, onToggle }) {
  const section = sections[item.sectionIndex];
  const lesson = section.lessons[item.lessonIndex];
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      {interactive ? (
        // biome-ignore lint/a11y/useSemanticElements: styled round checkbox
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`${checked ? "Mark incomplete" : "Mark complete"}: ${lesson.title}`}
          onClick={() => onToggle(lesson.id, !checked)}
          className="grid size-11 shrink-0 place-items-center"
        >
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full border-2 transition",
              checked ? "border-success bg-success text-card" : "border-border",
            )}
          >
            {checked && (
              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
            )}
          </span>
        </button>
      ) : (
        <span
          className="size-2 shrink-0 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium",
            checked && "text-muted-foreground line-through",
          )}
        >
          {lesson.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {section.title}
          {item.parts > 1 && ` · Part ${item.part}/${item.parts}`}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
        {formatDuration(item.seconds)}
      </span>
    </li>
  );
}

/**
 * Day-by-day schedule as an accordion. Pass `onToggleLesson` to make lessons
 * checkable. Raise `jumpKey` to open and scroll to today (or the next study day).
 */
export function ScheduleList({
  days,
  sections,
  today,
  skipDates = [],
  endDate,
  overrides = {},
  planId,
  onToggleLesson,
  jumpKey = 0,
  expandAllKey = 0,
  defaultOpenCount = 1,
  limit,
}) {
  const interactive = Boolean(onToggleLesson);
  const rows = useMemo(() => {
    const dayRows = days.map((day) => ({ type: "day", date: day.date, day }));
    const first = days[0]?.date ?? today;
    const skipRows = skipDates
      .filter(
        (date) =>
          date >= first &&
          endDate &&
          date <= endDate &&
          !days.some((day) => day.date === date),
      )
      .map((date) => ({ type: "skip", date }));
    return [...dayRows, ...skipRows].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [days, skipDates, endDate, today]);

  const shown = limit ? rows.slice(0, limit) : rows;
  const [open, setOpen] = useState(
    () => new Set(days.slice(0, defaultOpenCount).map((day) => day.date)),
  );

  // "Expand all" / "Collapse all" button in the parent
  useEffect(() => {
    if (expandAllKey === 0) return;
    setOpen((current) =>
      current.size > 0
        ? new Set()
        : new Set(rows.filter((r) => r.type === "day").map((r) => r.date)),
    );
  }, [expandAllKey, rows]);

  // Sticky "Today" button: open and scroll to today's entry, else the next study day
  useEffect(() => {
    if (jumpKey === 0) return;
    const target = rows.find((row) => row.type === "day" && row.date >= today);
    if (!target) return;
    setOpen((current) => new Set(current).add(target.date));
    requestAnimationFrame(() =>
      document
        .getElementById(`day-${target.date}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, [jumpKey, rows, today]);

  const toggleOpen = (date) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(date)) next.add(date);
      return next;
    });

  return (
    <ol className="flex flex-col gap-3">
      {shown.map((row) => {
        if (row.type === "skip") {
          return (
            <li
              key={`skip-${row.date}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
            >
              <span aria-hidden="true">🌴</span>
              {dayLabel(row.date, today)} · {formatDate(row.date)} · Skipped
            </li>
          );
        }

        const { day } = row;
        const isOpen = open.has(day.date);
        const total = day.plannedSeconds + day.doneSeconds;
        const isToday = day.date === today;
        return (
          <li
            key={day.date}
            id={`day-${day.date}`}
            className={cn(
              "scroll-mt-20 overflow-hidden rounded-2xl border bg-card",
              isToday ? "border-primary" : "border-border",
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleOpen(day.date)}
              className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {dayLabel(day.date, today)}
                  {isToday && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Today
                    </span>
                  )}
                  {day.date === endDate && (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                      🏁 Finish
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(day.date, {
                    year:
                      day.date.slice(0, 4) !== addDays(today, 0).slice(0, 4),
                  })}{" "}
                  · {day.items.length}{" "}
                  {day.items.length === 1 ? "lesson" : "lessons"} ·{" "}
                  {formatDuration(total)}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 transition",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <ul className="border-t border-border pb-1">
                {day.items.map((item) => {
                  const lessonId =
                    sections[item.sectionIndex].lessons[item.lessonIndex].id;
                  const override = overrides[`${planId}:${lessonId}`];
                  return (
                    <LessonRow
                      key={`${item.sectionIndex}-${item.lessonIndex}-${item.part}`}
                      item={item}
                      sections={sections}
                      interactive={interactive}
                      checked={override ?? item.done}
                      onToggle={onToggleLesson}
                    />
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
