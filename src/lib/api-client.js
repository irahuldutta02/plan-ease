/** Browser-side fetch wrapper for our own JSON API. */

export class ApiClientError extends Error {
  constructor(message, { status = 0, issues = null, code = null } = {}) {
    super(message);
    this.status = status;
    this.issues = issues;
    this.code = code;
  }
}

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: object, signal?: AbortSignal }} [options]
 * @returns {Promise<any>} the parsed `{ ok: true, ... }` body
 * @throws {ApiClientError}
 */
export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      signal,
      headers: {
        "x-timezone": browserTimezone(),
        ...(body && { "content-type": "application/json" }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiClientError(
      "Can't reach PlanEase right now. Check your connection and try again.",
    );
  }

  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.assign("/login");
    throw new ApiClientError("Please sign in again.", { status: 401 });
  }
  if (!response.ok || !data?.ok) {
    throw new ApiClientError(
      data?.error ?? "Something went wrong. Please retry.",
      {
        status: response.status,
        issues: data?.issues ?? null,
        code: data?.code ?? null,
      },
    );
  }
  return data;
}

/** The most useful message from an error, including the first field issue. */
export function errorMessage(error) {
  const first = error?.issues?.[0];
  if (first?.message) return first.message;
  return error?.message ?? "Something went wrong. Please retry.";
}
