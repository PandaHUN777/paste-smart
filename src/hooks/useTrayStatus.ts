import { useEffect } from "react";

import { setTrayStatus } from "../lib/tray";

/**
 * Mirror the clipboard history size in the tray tooltip, so the tray doubles
 * as a liveness indicator for the background app.
 */
export function useTrayStatus(itemCount: number): void {
  useEffect(() => {
    setTrayStatus(itemCount).catch((error: unknown) => {
      console.error("Failed to update the tray tooltip:", error);
    });
  }, [itemCount]);
}
