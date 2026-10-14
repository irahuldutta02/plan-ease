"use client";

import { CalendarCheck, LayoutList, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const MY_DAY = { href: "/", label: "My Day", Icon: CalendarCheck };
const PLANS = { href: "/plans", label: "Plans", Icon: LayoutList };

/** Sidebar links (desktop). Creating a plan lives on the Plans page. */
const SIDE_NAV = [MY_DAY, PLANS];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/plans") {
    return pathname.startsWith("/plans") && !pathname.startsWith("/plans/new");
  }
  return pathname.startsWith(href);
}

function Avatar({ user, size = 40 }) {
  const style = { width: size, height: size };
  return user?.image ? (
    // biome-ignore lint/performance/noImgElement: external Google avatar
    <img
      src={user.image}
      alt=""
      referrerPolicy="no-referrer"
      style={style}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      style={style}
      className="grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-accent-text"
    >
      {user?.name?.[0] ?? "?"}
    </span>
  );
}

/**
 * Phones: top bar with the profile avatar, bottom tab bar with a centred
 * round "new plan" button. From `md:` up: a sidebar instead.
 */
export function AppShell({ children }) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  // The wizard is full-screen and brings its own bottom bar
  const fullScreen = pathname.startsWith("/plans/new");

  if (fullScreen) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-border bg-card p-4 md:flex">
        <Link href="/" className="flex items-center gap-3 rounded-2xl p-1">
          <Logo size={40} priority />
          <span className="text-xl font-semibold tracking-tight">PlanEase</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {SIDE_NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-4 font-medium transition",
                  active
                    ? "bg-primary-soft text-accent-text"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          aria-current={pathname.startsWith("/profile") ? "page" : undefined}
          className="mt-auto flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-background p-2 pr-3 transition hover:border-primary"
        >
          <Avatar user={user} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {user?.name ?? "Your account"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
          </span>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={32} priority />
              <span className="text-lg font-semibold tracking-tight">
                PlanEase
              </span>
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              aria-current={
                pathname.startsWith("/profile") ? "page" : undefined
              }
              className={cn(
                "grid size-11 place-items-center rounded-full",
                pathname.startsWith("/profile") && "ring-2 ring-primary",
              )}
            >
              <Avatar user={user} size={36} />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-10 md:pt-12 md:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-3 items-center">
          {[MY_DAY, null, PLANS].map((item) => {
            if (!item) {
              return (
                <li key="new" className="flex justify-center">
                  <Link
                    href="/plans/new"
                    aria-label="New plan"
                    className="grid size-14 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-card transition active:scale-95"
                  >
                    <Plus className="size-7" aria-hidden="true" />
                  </Link>
                </li>
              );
            }
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium transition",
                    active ? "text-accent-text" : "text-muted-foreground",
                  )}
                >
                  <item.Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
