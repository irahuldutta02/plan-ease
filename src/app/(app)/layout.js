import { Suspense } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/session";

/** Validates the real session before any page content renders. */
async function AuthGate({ children }) {
  await requireSession();
  return children;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-48" />
      <Skeleton className="h-24" />
    </div>
  );
}

export default function AppLayout({ children }) {
  // The shell reads the current path, which is request data on dynamic routes
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AppShell>
        <Suspense fallback={<PageSkeleton />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </AppShell>
    </Suspense>
  );
}
