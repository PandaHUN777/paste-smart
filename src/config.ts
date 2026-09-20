/** Tunables for the Smart Paste prototype. */

/** Maximum number of unique clipboard entries kept in memory. */
export const HISTORY_LIMIT = 25;

/** How often the clipboard is polled, in milliseconds. */
export const CLIPBOARD_POLL_INTERVAL_MS = 800;

/** Accelerator that summons the overlay. */
export const OVERLAY_SHORTCUT = "CommandOrControl+Shift+V";

/** Minimum confidence in Jev's chosen entry before pasting without confirmation. */
export const MIN_CHOICE_CONFIDENCE = 0.6;

/** Minimum probability that the chosen entry actually suits the active context. */
export const MIN_RELEVANCE = 0.6;

/** Characters of an entry shown to Jev and in the list preview. */
export const PREVIEW_LENGTH = 280;
