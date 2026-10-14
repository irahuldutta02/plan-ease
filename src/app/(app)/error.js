"use client";

import { ErrorState } from "@/components/ui/states";

export default function AppError({ reset }) {
  return (
    <ErrorState
      message="Something unexpected happened on this page."
      onRetry={reset}
    />
  );
}
