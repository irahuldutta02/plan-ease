"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { celebrationsEnabled, setCelebrationsEnabled } from "@/lib/celebrate";

export function ProfileCard() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const user = data?.user;
  const [celebrations, setCelebrations] = useState(true);
  useEffect(() => setCelebrations(celebrationsEnabled()), []);

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      toast.error("Couldn't sign you out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>

      <section className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-card">
        {isPending ? (
          <>
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-10 flex-1" />
          </>
        ) : (
          <>
            {user?.image ? (
              // biome-ignore lint/performance/noImgElement: external Google avatar
              <img
                src={user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="size-14 rounded-full"
              />
            ) : (
              <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-xl font-semibold text-accent-text">
                {user?.name?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-card">
        <h2 className="font-medium">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="flex items-center justify-between gap-4 rounded-3xl bg-card p-5 shadow-card">
        <div>
          <h2 className="font-medium">Celebrations</h2>
          <p className="text-sm text-muted-foreground">
            Confetti when you hit a milestone
          </p>
        </div>
        <button
          type="button"
          // biome-ignore lint/a11y/useSemanticElements: styled switch
          role="switch"
          aria-checked={celebrations}
          aria-label="Celebrations"
          onClick={() => {
            setCelebrations(!celebrations);
            setCelebrationsEnabled(!celebrations);
          }}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${celebrations ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${celebrations ? "translate-x-6" : ""}`}
          />
        </button>
      </section>

      <Button
        variant="outline"
        size="lg"
        onClick={signOut}
        disabled={signingOut}
      >
        <LogOut className="size-5" aria-hidden="true" />
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
