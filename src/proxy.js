import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

/**
 * Optimistic redirect only: it checks that a session cookie exists, not that
 * it is valid. Pages and APIs still validate the real session on the server.
 */
export function proxy(request) {
  const hasCookie = Boolean(getSessionCookie(request));
  const isLogin = request.nextUrl.pathname === "/login";

  if (!hasCookie && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasCookie && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icons|logo|manifest.webmanifest|sw.js).*)",
  ],
};
