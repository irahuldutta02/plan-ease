"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

function errorMessage(code) {
  if (!code) return null;
  if (code === "access_denied") {
    return "Sign-in was cancelled. No worries, try again whenever you're ready.";
  }
  return "We couldn't sign you in. Please try again.";
}

function GoogleButton({ loading = false, disabled = false, onClick }) {
  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <GoogleMark />
      )}
      {loading ? "Redirecting to Google…" : "Continue with Google"}
    </Button>
  );
}

function LoginForm({ disabled }) {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorMessage(params.get("error")));

  // Returning via the browser's back button restores this page mid-redirect
  useEffect(() => {
    const reset = (event) => event.persisted && setLoading(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function signIn() {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login",
      });
      if (authError) throw authError;
      // On success the browser is redirected to Google, so keep loading
    } catch {
      setLoading(false);
      setError(errorMessage("unknown"));
    }
  }

  return (
    <>
      <GoogleButton loading={loading} disabled={disabled} onClick={signIn} />
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
    </>
  );
}

export function LoginCard({ disabled = false }) {
  return (
    <section className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl bg-card p-8 text-center shadow-card">
      <Logo size={88} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">PlanEase</h1>
        <p className="text-muted-foreground">
          Turn any course into a day-by-day plan you can actually finish.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Suspense fallback={<GoogleButton disabled />}>
          <LoginForm disabled={disabled} />
        </Suspense>
      </div>
    </section>
  );
}
