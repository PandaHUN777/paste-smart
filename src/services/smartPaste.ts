import { writeClipboardText } from "../lib/clipboard";
import { simulatePaste } from "../lib/commands";

/**
 * Put `text` on the clipboard and paste it into the previously active window.
 *
 * When the overlay is on screen it must be hidden before the keystroke is
 * synthesized, otherwise it receives the paste itself — `hide` is awaited in
 * between for that reason, and Rust then waits for focus to settle. A silent
 * run skips both, which is most of what makes the hotkey feel immediate.
 */
export async function pasteText(
  text: string,
  hide: () => Promise<void>,
  isOverlayVisible: boolean,
): Promise<void> {
  await writeClipboardText(text);
  if (isOverlayVisible) await hide();
  await simulatePaste(isOverlayVisible);
}
