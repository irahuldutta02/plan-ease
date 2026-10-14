import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** Real server-side session check (the proxy only looks at the cookie). */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** For pages and layouts: returns the session or redirects to /login. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
