"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "./api-client";
import { haptic } from "./celebrate";

/**
 * Optimistic lesson completion shared by My Day and Plan detail.
 * `overrides` maps "planId:lessonId" to the state to show immediately; it is
 * cleared once `apply` has put fresh server data on screen (or on failure).
 */
export function useLessonToggle() {
  const [overrides, setOverrides] = useState({});

  const toggle = useCallback(async (planId, lessonId, completed, apply) => {
    const key = `${planId}:${lessonId}`;
    setOverrides((current) => ({ ...current, [key]: completed }));
    if (completed) haptic();
    try {
      const data = await apiFetch(`/api/plans/${planId}/lessons/${lessonId}`, {
        method: "PATCH",
        body: { completed },
      });
      await apply?.(data);
      return data;
    } catch (error) {
      toast.error(errorMessage(error));
      return null;
    } finally {
      setOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }, []);

  return { overrides, toggle };
}
