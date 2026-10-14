import { NextResponse } from "next/server";
import { auth } from "./auth";
import { isValidTimezone } from "./dates.js";

/** An error that maps straight to an HTTP response. */
export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function ok(data = {}, init) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function failure(status, error, extra = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/**
 * Wrap a route handler: validates the real Better Auth session, then passes
 * `{ request, params, userId }`. Errors become `{ ok: false, error }` JSON.
 */
export function withAuth(handler) {
  return async (request, context) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) throw new ApiError(401, "Please sign in again.");
      const params = context?.params ? await context.params : {};
      return await handler({
        request,
        params,
        userId: session.user.id,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return failure(error.status, error.message, error.extra);
      }
      // Next.js signals "this needs request data" with digest-bearing errors;
      // they must reach the framework instead of becoming a 500
      if (typeof error?.digest === "string") throw error;
      console.error("[api]", error);
      return failure(500, "Something went wrong on our side. Please retry.");
    }
  };
}

const MAX_BODY_CHARS = 1_000_000;

/** Parse a JSON request body with basic guards. */
export async function readJson(request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new ApiError(415, "Send the body as application/json.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS)
    throw new ApiError(413, "That request is too large.");
  try {
    const body = JSON.parse(text);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("not an object");
    }
    return body;
  } catch {
    throw new ApiError(400, "The request body must be a JSON object.");
  }
}

/** Timezone from the `x-timezone` header, else the fallback, else UTC. */
export function timezoneOf(request, fallback = "UTC") {
  const header = request.headers.get("x-timezone");
  if (isValidTimezone(header)) return header;
  return isValidTimezone(fallback) ? fallback : "UTC";
}
