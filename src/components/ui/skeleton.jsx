import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-2xl bg-muted", className)}
      {...props}
    />
  );
}
