import { writeClipboardText } from "../lib/clipboard";
import { simulatePaste } from "../lib/commands";

/**
 * Put `text` on the clipboard and paste it into the previously active window.
 *
 * The overlay must be hidden before the keystroke is synthesized, otherwise it
 * receives the paste itself — `hide` is awaited in between for that reason.
 */
export async function pasteText(text: string, hide: () => Promise<void>): Promise<void> {
  await writeClipboardText(text);
  await hide();
  await simulatePaste();
}
