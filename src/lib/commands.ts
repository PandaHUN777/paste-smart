import { invoke } from "@tauri-apps/api/core";

import type { ActiveContext } from "../types";

/** Title and application name of the window that currently has focus. */
export function getActiveContext(): Promise<ActiveContext> {
  return invoke<ActiveContext>("get_active_context");
}

/**
 * Synthesize Ctrl+V in whichever window holds focus.
 *
 * @param restoreFocus - Pass `true` only when the overlay was just hidden, so
 * Rust waits for the OS to hand focus back. On the silent hotkey path nothing
 * took focus in the first place and the wait would be wasted latency.
 */
export function simulatePaste(restoreFocus: boolean): Promise<void> {
  return invoke<void>("simulate_paste", { restoreFocus });
}
