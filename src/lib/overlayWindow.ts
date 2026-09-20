import { getCurrentWindow } from "@tauri-apps/api/window";

const overlay = getCurrentWindow();

/** Bring the overlay to the front and give it keyboard focus. */
export async function showOverlay(): Promise<void> {
  await overlay.setAlwaysOnTop(true);
  await overlay.show();
  await overlay.setFocus();
}

/** Hide the overlay, returning focus to the previously active window. */
export async function hideOverlay(): Promise<void> {
  await overlay.hide();
}

/**
 * Subscribe to focus changes on the overlay window.
 * Resolves to an unlisten function.
 */
export function onOverlayFocusChanged(handler: (focused: boolean) => void): Promise<() => void> {
  return overlay.onFocusChanged(({ payload }) => handler(payload));
}
