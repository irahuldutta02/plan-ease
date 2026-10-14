"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/dates";
import { plural, speedLabel } from "@/lib/format";
import { formatDuration } from "@/lib/time";

const STEP = 15;
const MAX_MINUTES = 16 * 60;

function minutesText(minutes) {
  return minutes === 0 ? "Off" : formatDuration(minutes * 60);
}

/** Sheet with numeric hour and minute inputs for exact values. */
function MinutesSheet({ open, onOpenChange, label, value, onSave }) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  useEffect(() => {
    if (open) {
      setHours(String(Math.floor(value / 60)));
      setMinutes(String(value % 60));
    }
  }, [open, value]);

  const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const valid = total >= 0 && total <= MAX_MINUTES;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      description="Set 0 for a day off."
      footer={
        <Button
          className="flex-1"
          size="lg"
          disabled={!valid}
          onClick={() => {
            onSave(total);
            onOpenChange(false);
          }}
        >
          Save
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 pt-1">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Hours
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={hours}
            onChange={(event) =>
              setHours(event.target.value.replace(/\D/g, "").slice(0, 2))
            }
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Minutes
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={minutes}
            onChange={(event) =>
              setMinutes(event.target.value.replace(/\D/g, "").slice(0, 2))
            }
          />
        </label>
      </div>
      {!valid && (
        <p className="mt-3 text-sm text-danger">
          Study time can be at most 16 hours a day.
        </p>
      )}
    </Sheet>
  );
}

/** Big − / value / + control. Tap the value to type an exact time. */
export function MinutesField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="icon"
        aria-label={`Less time for ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - STEP))}
      >
        <Minus className="size-5" aria-hidden="true" />
      </Button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${minutesText(value)}. Tap to edit.`}
        className={cn(
          "min-h-11 min-w-24 rounded-2xl px-3 text-center text-base font-semibold tabular-nums hover:bg-muted",
          value === 0 && "text-muted-foreground",
        )}
      >
        {minutesText(value)}
      </button>
      <Button
        variant="secondary"
        size="icon"
        aria-label={`More time for ${label}`}
        disabled={value >= MAX_MINUTES}
        onClick={() => onChange(Math.min(MAX_MINUTES, value + STEP))}
      >
        <Plus className="size-5" aria-hidden="true" />
      </Button>
      <MinutesSheet
        open={open}
        onOpenChange={setOpen}
        label={label}
        value={value}
        onSave={onChange}
      />
    </div>
  );
}

const PRESETS = [
  { label: "0.5x", a: 1, b: 2 },
  { label: "1x", a: 1, b: 1 },
  { label: "1.25x", a: 5, b: 4 },
  { label: "1.5x", a: 3, b: 2 },
  { label: "2x", a: 2, b: 1 },
];

const sameSpeed = (ratio, preset) =>
  Math.abs(ratio.a * preset.b - ratio.b * preset.a) < 1e-9;

function parsePositive(text) {
  const value = Number(text);
  return Number.isFinite(value) && value > 0 && value <= 1000 ? value : null;
}

/** Speed presets plus a custom a:b ("a seconds of lecture take b seconds"). */
export function RatioEditor({ ratio, onChange }) {
  const [aText, setAText] = useState(String(ratio.a));
  const [bText, setBText] = useState(String(ratio.b));

  // Follow outside changes such as a preset tap
  useEffect(() => {
    if (parsePositive(aText) !== ratio.a) setAText(String(ratio.a));
    if (parsePositive(bText) !== ratio.b) setBText(String(ratio.b));
  }, [ratio.a, ratio.b, aText, bText]);

  const commit = (nextA, nextB) => {
    const a = parsePositive(nextA);
    const b = parsePositive(nextB);
    if (a && b) onChange({ a, b });
  };
  const invalid =
    parsePositive(aText) === null || parsePositive(bText) === null;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Speed presets"
        className="grid grid-cols-5 gap-2"
      >
        {PRESETS.map((preset) => {
          const active = sameSpeed(ratio, preset);
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled preset chips
            <button
              key={preset.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ a: preset.a, b: preset.b })}
              className={cn(
                "min-h-11 rounded-2xl text-sm font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted text-foreground hover:brightness-95",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <fieldset className="flex items-end gap-3">
        <legend className="mb-1.5 text-sm font-medium">Custom ratio</legend>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Lecture seconds
          <Input
            inputMode="decimal"
            value={aText}
            aria-invalid={invalid}
            onChange={(event) => {
              setAText(event.target.value);
              commit(event.target.value, bText);
            }}
          />
        </label>
        <span className="pb-3 text-xl font-semibold" aria-hidden="true">
          :
        </span>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Takes seconds
          <Input
            inputMode="decimal"
            value={bText}
            aria-invalid={invalid}
            onChange={(event) => {
              setBText(event.target.value);
              commit(aText, event.target.value);
            }}
          />
        </label>
      </fieldset>
      {invalid ? (
        <p role="alert" className="text-sm text-danger">
          Both numbers must be greater than 0.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {plural(ratio.a, "second")} of lecture take{" "}
          {plural(ratio.b, "second")} to complete ({speedLabel(ratio)} speed).
        </p>
      )}
    </div>
  );
}

/** "Same for all days" shortcut plus a Mon to Sun editor. */
export function WeeklyTimeEditor({ weeklyMinutes, onChange }) {
  const setDay = (key, minutes) =>
    onChange({ ...weeklyMinutes, [key]: minutes });
  const setAll = (minutes) =>
    onChange(Object.fromEntries(WEEKDAYS.map((key) => [key, minutes])));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-primary-soft p-4">
        <p className="text-sm font-medium">Same for all days</p>
        <MinutesField
          label="All days"
          value={weeklyMinutes.mon}
          onChange={setAll}
        />
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {WEEKDAYS.map((key) => (
          <li
            key={key}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <span className="min-w-24 font-medium">{WEEKDAY_LABELS[key]}</span>
            <MinutesField
              label={WEEKDAY_LABELS[key]}
              value={weeklyMinutes[key]}
              onChange={(m) => setDay(key, m)}
            />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Set a day to Off (0) to skip that weekday every week.
      </p>
    </div>
  );
}
