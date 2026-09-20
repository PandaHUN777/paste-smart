/** A single entry in the clipboard history. */
export interface ClipboardItem {
  /** Stable identity for React keys; derived from the capture time. */
  id: string;
  /** Full clipboard text. */
  text: string;
  /** Epoch milliseconds at which the text was first seen. */
  capturedAt: number;
  /**
   * Application the text was copied from, when it could be read at capture
   * time. `undefined` when the active window lookup failed, not when it
   * legitimately has no name.
   */
  sourceApp?: string;
}

/** The window the user was working in before the overlay took focus. */
export interface ActiveContext {
  title: string;
  appName: string;
}

/**
 * The state handed to Jev when asking it to pick an entry.
 *
 * The candidate entries are not repeated here: they are already the choice
 * question's criteria, and sending them twice doubled the input tokens for no
 * extra signal. Declared as an object type alias so it stays assignable to the
 * SDK's JSON state type.
 */
export type SmartPasteState = {
  activeTitle: string;
  activeApp: string;
  /**
   * Whether the most recently copied entry came from the same app the user is
   * pasting into. A strong "still mid-workflow, this is probably it" cue that
   * per-entry criteria can't express on their own. `null` when the source
   * app of the newest entry is unknown.
   */
  latestEntryFromActiveApp: boolean | null;
  /** How many candidates Jev is choosing between, out of the full history. */
  candidateCount: number;
  totalHistoryCount: number;
};

/** Jev's verdict about which history entry fits the active context. */
export interface Suggestion {
  /** The entry Jev selected. */
  item: ClipboardItem;
  /** Confidence in the selected label, from 0 to 1. */
  confidence: number;
  /** Probability that the entry is actually appropriate to paste, from 0 to 1. */
  relevance: number;
  /** Whether both signals cleared their thresholds. */
  isConfident: boolean;
}

/** Progress of a Smart Paste run, for rendering loading and error states. */
export type SmartPasteStatus = "idle" | "thinking" | "pasting" | "done" | "error";
