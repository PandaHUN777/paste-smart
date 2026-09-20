import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

import { HISTORY_LIMIT, PREVIEW_LENGTH } from "../config";
import type { ClipboardItem } from "../types";

/**
 * Read the clipboard as text. Returns `null` when the clipboard is empty or
 * holds a non-text payload, which the plugin surfaces as an error.
 */
export async function readClipboardText(): Promise<string | null> {
  try {
    const text = await readText();
    return text && text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}

/** Replace the clipboard contents with `text`. */
export async function writeClipboardText(text: string): Promise<void> {
  await writeText(text);
}

/** Wrap raw clipboard text in a history entry. */
export function createClipboardItem(text: string): ClipboardItem {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    capturedAt: Date.now(),
  };
}

/**
 * Prepend `text` to `history`, keeping entries unique and capped at
 * {@link HISTORY_LIMIT}. Re-copying an existing entry moves it to the front
 * rather than duplicating it. Returns the original array when nothing changed,
 * so callers can skip a re-render.
 */
export function addToHistory(history: ClipboardItem[], text: string): ClipboardItem[] {
  if (history[0]?.text === text) return history;

  const existing = history.find((item) => item.text === text);
  const head = existing ?? createClipboardItem(text);
  const rest = existing ? history.filter((item) => item.id !== existing.id) : history;

  return [head, ...rest].slice(0, HISTORY_LIMIT);
}

/** Collapse an entry to a single-line preview for the UI and for Jev. */
export function previewOf(text: string, length: number = PREVIEW_LENGTH): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > length ? `${collapsed.slice(0, length)}…` : collapsed;
}
