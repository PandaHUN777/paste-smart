import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import type { ChoiceCriteria, Fetch } from "@typesafe-ai/sdk";

import { MIN_CHOICE_CONFIDENCE, MIN_RELEVANCE } from "../config";
import { previewOf } from "../lib/clipboard";
import type { ActiveContext, ClipboardItem, SmartPasteState, Suggestion } from "../types";

/** Model used to answer Smart Paste questions. */
const MODEL = "jev-latest";

/** Thrown when Jev cannot be reached or is not configured. */
export class JevUnavailableError extends Error {}

let client: TypeSafeClient | null = null;

/**
 * Lazily construct the shared client.
 *
 * The key comes from `TYPESAFE_API_KEY`; it is inlined at build time because
 * the SDK runs inside the webview. Never commit a populated `.env`.
 */
function getClient(): TypeSafeClient {
  if (client) return client;

  const apiKey = import.meta.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new JevUnavailableError(
      "TYPESAFE_API_KEY is not set. Add it to your environment or .env file and rebuild.",
    );
  }

  client = new TypeSafeClient({
    apiKey,
    baseURL: import.meta.env.TYPESAFE_BASE_URL,
    defaultModel: import.meta.env.TYPESAFE_DEFAULT_MODEL ?? MODEL,
    // The SDK guards against browser use; the webview is a trusted local shell.
    dangerouslyAllowBrowser: true,
    // The API rejects browser origins ("Disallowed CORS origin"), so the
    // request is made from Rust instead of the webview.
    fetch: tauriFetch as Fetch,
  });
  return client;
}

/** Label used for the nth history entry in the choice question. */
const labelFor = (index: number): string => `entry_${index}`;

/** Describe each entry to Jev, keyed by a label we can map back to an item. */
function buildCriteria(history: ClipboardItem[]): ChoiceCriteria {
  const criteria: ChoiceCriteria = {};
  history.forEach((item, index) => {
    criteria[labelFor(index)] = previewOf(item.text);
  });
  return criteria;
}

/** Shape the clipboard history and window context into the request state. */
export function buildState(history: ClipboardItem[], context: ActiveContext): SmartPasteState {
  return {
    history: history.map((item, index) => ({
      id: labelFor(index),
      text: previewOf(item.text),
    })),
    activeTitle: context.title,
    activeApp: context.appName,
  };
}

/**
 * Ask Jev which clipboard entry belongs in the active window.
 *
 * @param history - Clipboard entries, most recent first. Must be non-empty.
 * @param context - The window the user was working in.
 * @param signal - Cancels the request when the overlay closes.
 * @throws {JevUnavailableError} The API key is missing or the request failed.
 */
export async function selectBestItem(
  history: ClipboardItem[],
  context: ActiveContext,
  signal?: AbortSignal,
): Promise<Suggestion> {
  if (history.length === 0) {
    throw new JevUnavailableError("Clipboard history is empty.");
  }

  const questions = {
    best: choice(
      "Which clipboard entry should be pasted into the active window right now?",
      buildCriteria(history),
    ),
    relevant: noul("Does the selected clipboard entry clearly suit the active window?", {
      true: "The entry is the kind of text this window and application expect.",
      false: "The entry is unrelated, or nothing in the history fits.",
    }),
  };

  let answers;
  try {
    ({ answers } = await getClient().systemOne(
      { state: buildState(history, context), questions, model: MODEL },
      { signal },
    ));
  } catch (error) {
    if (error instanceof JevUnavailableError) throw error;
    throw new JevUnavailableError(error instanceof Error ? error.message : "Jev request failed.");
  }

  const index = history.findIndex((_, position) => labelFor(position) === answers.best.choice);
  const item = history[index];
  if (!item) {
    throw new JevUnavailableError(`Jev returned an unknown entry: ${answers.best.choice}`);
  }

  const confidence = answers.best.confidence;
  const relevance = answers.relevant.noul;

  return {
    item,
    confidence,
    relevance,
    isConfident: confidence >= MIN_CHOICE_CONFIDENCE && relevance >= MIN_RELEVANCE,
  };
}
