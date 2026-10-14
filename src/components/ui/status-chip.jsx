import { cn } from "@/lib/cn";
import { statusChip } from "@/lib/format";

const TONES = {
  primary: "bg-primary-soft text-accent-text",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

export function Chip({ tone = "primary", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** "On track", "Ahead by 1 day", "Behind by 2 days", ... */
export function StatusChip({ status, className }) {
  const { text, tone } = statusChip(status);
  return (
    <Chip tone={tone} className={className}>
      {text}
    </Chip>
  );
}
