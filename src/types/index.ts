/** A single entry in the clipboard history. */
export interface ClipboardItem {
  /** Stable identity for React keys; derived from the capture time. */
  id: string;
  /** Full clipboard text. */
  text: string;
  /** Epoch milliseconds at which the text was first seen. */
  capturedAt: number;
}

/** The window the user was working in before the overlay took focus. */
export interface ActiveContext {
  title: string;
  appName: string;
}

/** A history entry as Jev sees it: a label and a trimmed preview. */
export type HistoryEntry = {
  id: string;
  text: string;
};

/**
 * The state handed to Jev when asking it to pick an entry. Declared as object
 * type aliases so it stays assignable to the SDK's JSON state type.
 */
export type SmartPasteState = {
  history: HistoryEntry[];
  activeTitle: string;
  activeApp: string;
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
