import { listen } from "@tauri-apps/api/event";

/** Emitted by the tray when the user asks for the overlay. Mirrors `tray.rs`. */
const SHOW_OVERLAY_EVENT = "smart-paste://show-overlay";

/**
 * Subscribe to overlay requests coming from the tray icon.
 * Resolves to an unlisten function.
 */
export function onShowOverlayRequested(handler: () => void): Promise<() => void> {
  return listen(SHOW_OVERLAY_EVENT, () => handler());
}
