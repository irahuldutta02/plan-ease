import { useId } from "react";
import { cn } from "@/lib/cn";

/** Text input. 16px font keeps iOS from zooming on focus. */
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-2xl border border-border bg-background px-4 shadow-sm text-base text-foreground placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Label + control + hint/error, wired together for screen readers. */
export function Field({ label, hint, error, children }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
