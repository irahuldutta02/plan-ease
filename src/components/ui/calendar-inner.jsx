"use client";

import { DayPicker } from "react-day-picker";
import { addDays, weekdayOf } from "@/lib/dates";

const pad = (n) => String(n).padStart(2, "0");

/** ISO date to a local Date at noon (safe from DST edges). */
export function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function dateToIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const classNames = {
  root: "w-full",
  months: "relative flex flex-col",
  month: "w-full",
  month_caption: "flex h-11 items-center justify-center font-semibold",
  caption_label: "text-base",
  nav: "absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between",
  button_previous:
    "grid size-11 place-items-center rounded-full text-foreground hover:bg-muted disabled:opacity-30",
  button_next:
    "grid size-11 place-items-center rounded-full text-foreground hover:bg-muted disabled:opacity-30",
  chevron: "size-5 fill-current",
  month_grid: "w-full table-fixed border-collapse",
  weekday: "h-9 text-center text-xs font-medium text-muted-foreground",
  day: "p-0.5 text-center",
  day_button:
    "mx-auto grid size-11 place-items-center rounded-full text-sm font-medium transition hover:bg-muted focus-visible:outline-2",
  selected:
    "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary",
  today: "[&>button]:ring-2 [&>button]:ring-primary [&>button]:ring-inset",
  disabled:
    "opacity-35 [&>button]:cursor-not-allowed [&>button:hover]:bg-transparent",
  outside: "opacity-30",
};

const modifiersClassNames = {
  off: "[&>button]:underline [&>button]:decoration-dotted [&>button]:underline-offset-4",
};

/**
 * Touch-friendly calendar with 44px day cells.
 *
 * @param {object} props
 * @param {"single" | "multiple"} props.mode
 * @param {string | string[] | null} props.selected ISO date(s)
 * @param {(value: any) => void} props.onChange ISO date (single) or ISO[] (multiple)
 * @param {string} props.minDate ISO; earlier days are greyed out and not selectable
 * @param {string[]} [props.offWeekdays] weekday keys that are off (shown dotted, not selectable)
 * @param {string[]} [props.disabledDates] extra ISO dates that cannot be picked
 */
export default function Calendar({
  mode,
  selected,
  onChange,
  minDate,
  offWeekdays = [],
  disabledDates = [],
}) {
  const min = isoToDate(minDate);
  const lastDay = addDays(minDate, 800);
  const disabled = [
    { before: min },
    ...(offWeekdays.length > 0
      ? [(date) => offWeekdays.includes(weekdayOf(dateToIso(date)))]
      : []),
    ...disabledDates.map(isoToDate),
  ];

  const shared = {
    weekStartsOn: 1,
    classNames,
    modifiersClassNames,
    modifiers: {
      off: (date) => offWeekdays.includes(weekdayOf(dateToIso(date))),
    },
    disabled,
    startMonth: new Date(min.getFullYear(), min.getMonth(), 1),
    endMonth: isoToDate(lastDay),
    showOutsideDays: false,
  };

  if (mode === "single") {
    return (
      <DayPicker
        {...shared}
        mode="single"
        selected={selected ? isoToDate(selected) : undefined}
        defaultMonth={isoToDate(selected ?? minDate)}
        onSelect={(date) => date && onChange(dateToIso(date))}
      />
    );
  }

  const selectedDates = (selected ?? []).map(isoToDate);
  return (
    <DayPicker
      {...shared}
      mode="multiple"
      selected={selectedDates}
      defaultMonth={selectedDates[0] ?? min}
      onSelect={(dates) => onChange((dates ?? []).map(dateToIso).sort())}
    />
  );
}
