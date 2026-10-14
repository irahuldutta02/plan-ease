import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <EmptyState
      emoji="🧭"
      title="Nothing here"
      body="That page doesn't exist, but your day is waiting."
      action={
        <Link
          href="/"
          className={buttonClasses({ size: "lg", className: "w-full" })}
        >
          Back to My Day
        </Link>
      }
    />
  );
}
