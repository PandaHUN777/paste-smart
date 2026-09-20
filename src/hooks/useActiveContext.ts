import { useEffect, useState } from "react";

import { ACTIVE_CONTEXT_POLL_INTERVAL_MS } from "../config";
import { getActiveContext } from "../lib/commands";
import type { ActiveContext } from "../types";

/**
 * Keep the foreground window's identity a few hundred milliseconds fresh.
 *
 * Reading it when the hotkey fires puts an IPC round trip on the critical
 * path, before any work that matters can start. Sampling in the background
 * means the keypress already knows where the paste is headed.
 *
 * @param paused - Stops sampling, for while the overlay holds focus. The last
 * value from before the overlay appeared is kept, so our own window is never
 * mistaken for the paste target.
 */
export function useActiveContext(paused: boolean): ActiveContext | null {
  const [context, setContext] = useState<ActiveContext | null>(null);

  useEffect(() => {
    if (paused) return;

    let cancelled = false;

    const sample = async (): Promise<void> => {
      let next: ActiveContext | null;
      try {
        next = await getActiveContext();
      } catch {
        // A momentary read failure (no foreground window, a protected process)
        // is not worth discarding the last good value for.
        return;
      }
      if (cancelled) return;

      // Only replace the object when it actually describes a different window,
      // so four samples a second do not cause four renders.
      setContext((current) =>
        current && current.title === next.title && current.appName === next.appName
          ? current
          : next,
      );
    };

    void sample();
    const timer = window.setInterval(() => void sample(), ACTIVE_CONTEXT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paused]);

  return context;
}
