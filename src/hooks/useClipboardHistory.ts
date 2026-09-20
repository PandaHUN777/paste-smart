import { useCallback, useEffect, useRef, useState } from "react";

import { CLIPBOARD_POLL_INTERVAL_MS } from "../config";
import { addToHistory, readClipboardText } from "../lib/clipboard";
import { getActiveContext } from "../lib/commands";
import type { ClipboardItem } from "../types";

interface UseClipboardHistory {
  history: ClipboardItem[];
  clear: () => void;
}

/**
 * Track copied text by polling the clipboard.
 *
 * Polling keeps the prototype simple and avoids OS-level clipboard listeners;
 * entries stay unique and capped by {@link addToHistory}.
 */
export function useClipboardHistory(): UseClipboardHistory {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  // Guards against overlapping reads if a poll outlives its interval.
  const readingRef = useRef(false);
  // Mirrors the most recent entry's text, so a genuinely new copy can be told
  // apart from an unchanged clipboard without waiting on a state update.
  const lastTextRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async (): Promise<void> => {
      if (readingRef.current) return;
      readingRef.current = true;
      try {
        const text = await readClipboardText();
        if (cancelled || !text || text === lastTextRef.current) return;
        lastTextRef.current = text;

        // Only a genuinely new entry is worth the extra IPC round trip: this
        // is what lets Jev later tell whether the freshest copy came from the
        // window the user is now in.
        const sourceApp = await getActiveContext()
          .then((context) => context.appName)
          .catch(() => undefined);
        if (cancelled) return;

        setHistory((current) => addToHistory(current, text, sourceApp));
      } finally {
        readingRef.current = false;
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), CLIPBOARD_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    // Otherwise an unchanged clipboard would look like "nothing new" forever
    // and the cleared entry would never be picked back up.
    lastTextRef.current = null;
  }, []);

  return { history, clear };
}
