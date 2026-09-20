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

/** Characters of an entry shown in the overlay list. */
export const PREVIEW_LENGTH = 280;

/**
 * How many of the most recent entries Jev is asked to choose between.
 *
 * Every candidate is input tokens, and input size is the largest lever we have
 * on response time. The tail of a 25-entry history is almost never the answer.
 */
export const JEV_CANDIDATE_LIMIT = 8;

/** Characters of each candidate sent to Jev — enough to recognize, not to quote. */
export const JEV_PREVIEW_LENGTH = 120;

/** How often the foreground window is sampled, in milliseconds. */
export const ACTIVE_CONTEXT_POLL_INTERVAL_MS = 300;
