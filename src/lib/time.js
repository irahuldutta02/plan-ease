/** Duration parsing and formatting. All values are whole seconds. */

export const MAX_LESSON_SECONDS = 86_400; // 24 hours

export function secondsFromHms(hours = 0, minutes = 0, seconds = 0) {
  return hours * 3600 + minutes * 60 + seconds;
}

export function splitHms(totalSeconds) {
  const total = Math.max(0, Math.round(totalSeconds));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Friendly length: "1h 05m", "46m 12s", "45s". Seconds are dropped from
 * hour-long values so cards stay short.
 */
export function formatDuration(totalSeconds) {
  const { hours, minutes, seconds } = splitHms(totalSeconds);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) {
    return seconds > 0
      ? `${minutes}m ${String(seconds).padStart(2, "0")}s`
      : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Player-style clock: "32:46" or "1:05:09". */
export function formatClock(totalSeconds) {
  const { hours, minutes, seconds } = splitHms(totalSeconds);
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

const CLOCK = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/;
const UNITS = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i;
const PLAIN_MINUTES = /^\d+$/;

/**
 * Parse a lesson duration typed by a person. Accepts:
 *   "32:46" (mm:ss), "1:05:09" (h:mm:ss), "1h 5m 3s", "90m", "45s",
 *   and a bare number, which means minutes.
 * @param {string} input
 * @returns {{ ok: true, seconds: number } | { ok: false, error: string }}
 */
export function parseDuration(input) {
  const text = String(input ?? "").trim();
  if (!text) return { ok: false, error: "Enter a duration, like 12:30." };

  let seconds = null;
  const clock = CLOCK.exec(text);
  if (clock) {
    const parts = clock
      .slice(1)
      .filter((part) => part !== undefined)
      .map(Number);
    const [hours, minutes, secs] =
      parts.length === 3 ? parts : [0, parts[0], parts[1]];
    // Only the leading unit may exceed 59
    if ((parts.length === 3 && minutes > 59) || secs > 59) {
      return { ok: false, error: "Minutes and seconds must be under 60." };
    }
    seconds = secondsFromHms(hours, minutes, secs);
  } else if (PLAIN_MINUTES.test(text)) {
    seconds = Number(text) * 60;
  } else {
    const units = UNITS.exec(text);
    if (units && (units[1] || units[2] || units[3])) {
      seconds = secondsFromHms(
        Number(units[1] ?? 0),
        Number(units[2] ?? 0),
        Number(units[3] ?? 0),
      );
    }
  }

  if (seconds === null) {
    return { ok: false, error: "Use a format like 12:30, 1h 5m or 45m." };
  }
  if (seconds <= 0)
    return { ok: false, error: "Duration must be longer than 0." };
  if (seconds > MAX_LESSON_SECONDS) {
    return { ok: false, error: "A single lesson can be at most 24 hours." };
  }
  return { ok: true, seconds };
}
