"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, apiFetch } from "./api-client";

/**
 * Load JSON from our API. `reload({ silent: true })` refreshes without
 * flipping back to the skeleton. Stale responses are ignored.
 * @param {string | null} path pass null to skip loading
 */
export function useResource(path) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: Boolean(path),
  });
  const latest = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!path) return null;
      const id = ++latest.current;
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await apiFetch(path);
        if (id === latest.current)
          setState({ data, error: null, loading: false });
        return data;
      } catch (error) {
        if (id === latest.current && error?.name !== "AbortError") {
          setState((s) => ({
            data: silent ? s.data : null,
            error:
              error instanceof ApiClientError
                ? error
                : new ApiClientError("Something went wrong."),
            loading: false,
          }));
        }
        return null;
      }
    },
    [path],
  );

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  const setData = useCallback(
    (data) => setState({ data, error: null, loading: false }),
    [],
  );

  return { ...state, reload: load, setData };
}
