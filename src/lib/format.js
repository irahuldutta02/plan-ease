import { addDays, formatDate } from "./dates.js";

/** "Ends Mar 12 → Mar 15" for an end-date change from the API. */
export function describeEndChange(change) {
  if (!change) return null;
  const { before, after } = change;
  if (!after) return "Plan complete 🎉";
  if (!before) return `Ends ${formatDate(after)}`;
  return `Ends ${formatDate(before)} → ${formatDate(after)}`;
}

export function greetingFor(hour) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Today", "Tomorrow", otherwise "Wed, Mar 12". */
export function dayLabel(date, today) {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return formatDate(date, { weekday: true });
}

/** Chip text and colour tone for a plan status. */
export function statusChip(status) {
  switch (status?.kind) {
    case "done":
      return { text: "Completed", tone: "success" };
    case "ahead":
      return {
        text: `Ahead by ${plural(status.days, "day")}`,
        tone: "success",
      };
    case "behind":
      return {
        text: `Behind by ${plural(status.days, "day")}`,
        tone: "warning",
      };
    case "not_started":
      return {
        text: `Starts in ${plural(status.days, "day")}`,
        tone: "primary",
      };
    default:
      return { text: "On track", tone: "primary" };
  }
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Days-left phrase for the finish-line countdown. */
export function daysLeftText(summary) {
  if (summary.finished) return "Finished";
  if (summary.daysLeft === null) return "No end date";
  if (summary.daysLeft === 0) return "Ends today";
  return `${plural(summary.daysLeft, "day")} left`;
}

/** "0.5x", "1x", "1.25x": the speed a ratio stands for. */
export function speedLabel(ratio) {
  const speed = Math.round((ratio.a / ratio.b) * 100) / 100;
  return `${speed}x`;
}
