"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** The calendar library is loaded only when a calendar is first shown. */
export const Calendar = dynamic(() => import("./calendar-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-80" />,
});
