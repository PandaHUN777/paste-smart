import { useCallback, useEffect, useRef, useState } from "react";

import { CLIPBOARD_POLL_INTERVAL_MS } from "../config";
import { addToHistory, readClipboardText } from "../lib/clipboard";
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

  useEffect(() => {
    let cancelled = false;

    const poll = async (): Promise<void> => {
      if (readingRef.current) return;
      readingRef.current = true;
      try {
        const text = await readClipboardText();
        if (!cancelled && text) {
          setHistory((current) => addToHistory(current, text));
        }
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

  const clear = useCallback(() => setHistory([]), []);

  return { history, clear };
}
