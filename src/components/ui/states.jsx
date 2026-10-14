import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Friendly empty state: emoji, a short line, and an optional action. */
export function EmptyState({ emoji, title, body, action, className }) {
  return (
    <section
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card",
        className,
      )}
    >
      <p className="text-5xl" aria-hidden="true">
        {emoji}
      </p>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {body && <p className="max-w-xs text-muted-foreground">{body}</p>}
      {action && <div className="mt-2 w-full max-w-xs">{action}</div>}
    </section>
  );
}

/** Error state with a retry button. */
export function ErrorState({ message, onRetry, className }) {
  return (
    <section
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card",
        className,
      )}
    >
      <p className="text-5xl" aria-hidden="true">
        🛟
      </p>
      <h2 className="text-xl font-semibold tracking-tight">That didn't load</h2>
      <p className="max-w-xs text-muted-foreground">
        {message ?? "Something went wrong. Please try again."}
      </p>
      {onRetry && (
        <Button className="mt-2" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </section>
  );
}
