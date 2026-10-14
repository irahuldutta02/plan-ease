import { cn } from "@/lib/cn";

const LETTERS = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
};

/** Mon to Sun activity dots for the current week. */
export function WeekStrip({ week }) {
  return (
    <ul className="flex justify-center gap-3" aria-label="This week">
      {week.map((day) => (
        <li
          key={day.date}
          className="flex flex-col items-center gap-1.5"
          aria-label={`${day.weekday}: ${day.active ? "studied" : day.isFuture ? "upcoming" : day.rest ? "rest day" : "no study"}`}
        >
          <span
            className={cn(
              "text-xs font-medium",
              day.isToday ? "text-accent-text" : "text-muted-foreground",
            )}
          >
            {LETTERS[day.weekday]}
          </span>
          <span
            className={cn(
              "grid size-7 place-items-center rounded-full text-[11px]",
              day.active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
              day.isToday &&
                "ring-2 ring-primary ring-offset-2 ring-offset-background",
              day.isFuture && "opacity-50",
            )}
          >
            {day.active ? "✓" : day.rest && !day.isFuture ? "·" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
