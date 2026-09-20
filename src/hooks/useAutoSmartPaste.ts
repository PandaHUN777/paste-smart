import { useEffect, useRef } from "react";

/**
 * Run Smart Paste once per overlay session.
 *
 * `run` is held in a ref because it changes identity whenever the clipboard
 * history does; without that, every poll would fire another request.
 */
export function useAutoSmartPaste(sessionId: number, run: () => Promise<void>): void {
  const runRef = useRef(run);
  const lastSessionRef = useRef(0);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    // Session 0 is the initial mount, when the overlay has never been shown.
    if (sessionId === 0 || lastSessionRef.current === sessionId) return;
    lastSessionRef.current = sessionId;
    void runRef.current();
  }, [sessionId]);
}
