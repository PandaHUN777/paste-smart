import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import type { ChoiceCriteria } from "@typesafe-ai/sdk";

import {
  JEV_CANDIDATE_LIMIT,
  JEV_PREVIEW_LENGTH,
  MIN_CHOICE_CONFIDENCE,
  MIN_RELEVANCE,
} from "../config";
import { previewOf } from "../lib/clipboard";
import { pooledFetch } from "../lib/http";
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
    // request is made from Rust — over a connection that stays warm.
    fetch: pooledFetch,
  });
  return client;
}

/** Label used for the nth history entry in the choice question. */
const labelFor = (index: number): string => `entry_${index}`;

/**
 * Label meaning "nothing here fits".
 *
 * This used to be a separate `noul` question. Folding it into the choice costs
 * one extra label instead of a second inference, and the probability mass on
 * it is the same relevance signal we were asking for.
 */
const NONE_LABEL = "none";

/** The entries Jev is offered: the most recent few, trimmed short. */
function candidatesOf(history: ClipboardItem[]): ClipboardItem[] {
  return history.slice(0, JEV_CANDIDATE_LIMIT);
}

/** Describe each entry to Jev, keyed by a label we can map back to an item. */
function buildCriteria(candidates: ClipboardItem[]): ChoiceCriteria {
  const criteria: ChoiceCriteria = {
    [NONE_LABEL]: "None of the entries suit this window, or the history is irrelevant here.",
  };
  candidates.forEach((item, index) => {
    criteria[labelFor(index)] = previewOf(item.text, JEV_PREVIEW_LENGTH);
  });
  return criteria;
}

/** Shape the window context into the request state. */
export function buildState(context: ActiveContext): SmartPasteState {
  return { activeTitle: context.title, activeApp: context.appName };
}

/** The most likely real entry, used to seed the picker when Jev says "none". */
function likeliestEntry(probabilities: Readonly<Record<string, number>>): string | null {
  let best: string | null = null;
  for (const [label, probability] of Object.entries(probabilities)) {
    if (label === NONE_LABEL) continue;
    if (best === null || probability > (probabilities[best] ?? 0)) best = label;
  }
  return best;
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
  const candidates = candidatesOf(history);
  if (candidates.length === 0) {
    throw new JevUnavailableError("Clipboard history is empty.");
  }

  const questions = {
    best: choice(
      "Which clipboard entry should be pasted into the active window right now?",
      buildCriteria(candidates),
    ),
  };

  let answers;
  try {
    ({ answers } = await getClient().systemOne(
      { state: buildState(context), questions, model: MODEL },
      { signal },
    ));
  } catch (error) {
    if (error instanceof JevUnavailableError) throw error;
    throw new JevUnavailableError(error instanceof Error ? error.message : "Jev request failed.");
  }

  const { choice: picked, confidence, probabilities } = answers.best;
  const fitsNothing = picked === NONE_LABEL;
  // When Jev declines, still surface its best real guess so the picker opens
  // with something highlighted rather than nothing.
  const label = fitsNothing ? likeliestEntry(probabilities) : picked;

  const index = candidates.findIndex((_, position) => labelFor(position) === label);
  const item = candidates[index];
  if (!item) {
    throw new JevUnavailableError(`Jev returned an unknown entry: ${picked}`);
  }

  // Probability mass left over after "none" is how well the pick suits the window.
  const relevance = 1 - (probabilities[NONE_LABEL] ?? 0);

  return {
    item,
    confidence,
    relevance,
    isConfident: !fitsNothing && confidence >= MIN_CHOICE_CONFIDENCE && relevance >= MIN_RELEVANCE,
  };
}
