const KEY = "planease:celebrations";

export function celebrationsEnabled() {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setCelebrationsEnabled(enabled) {
  try {
    window.localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // Storage can be blocked (private mode); the preference just won't persist
  }
}

function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

/** Subtle haptic tap where the browser supports it. */
export function haptic(pattern = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported; ignore
  }
}

/**
 * Brief confetti burst. The library is loaded on demand, and nothing runs
 * when celebrations are off or the user prefers reduced motion.
 * @param {"small" | "big"} [size]
 */
export async function celebrate(size = "small") {
  if (!celebrationsEnabled() || prefersReducedMotion()) return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: size === "big" ? 160 : 70,
    spread: size === "big" ? 100 : 70,
    startVelocity: 38,
    ticks: 120,
    origin: { y: 0.72 },
    zIndex: 100,
    disableForReducedMotion: true,
  });
}
