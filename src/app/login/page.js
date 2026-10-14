import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginCard } from "@/components/shared/login-card";
import { getSession } from "@/lib/session";

export const metadata = { title: "Sign in" };

/** Real session check: signed-in users never see the login page. */
async function LoginGate() {
  if (await getSession()) redirect("/");
  return <LoginCard />;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--primary-soft),transparent)] px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
      <Suspense fallback={<LoginCard disabled />}>
        <LoginGate />
      </Suspense>
    </main>
  );
}
