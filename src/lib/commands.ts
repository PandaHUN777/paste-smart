import { invoke } from "@tauri-apps/api/core";

import type { ActiveContext } from "../types";

/** Title and application name of the window that currently has focus. */
export function getActiveContext(): Promise<ActiveContext> {
  return invoke<ActiveContext>("get_active_context");
}

/**
 * Synthesize Ctrl+V in whichever window holds focus. The Rust side waits
 * briefly first, so hide the overlay before calling this.
 */
export function simulatePaste(): Promise<void> {
  return invoke<void>("simulate_paste");
}
