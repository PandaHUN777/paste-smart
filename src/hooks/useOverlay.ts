import { useCallback, useEffect, useRef, useState } from "react";

import { OVERLAY_SHORTCUT } from "../config";
import { onShowOverlayRequested } from "../lib/events";
import { hideOverlay, onOverlayFocusChanged, showOverlay } from "../lib/overlayWindow";
import type { ActiveContext } from "../types";
import { useActiveContext } from "./useActiveContext";
import { useGlobalShortcut } from "./useGlobalShortcut";

interface UseOverlay {
  /** Whether the overlay is on screen. */
  isVisible: boolean;
  /**
   * Incremented each time the hotkey starts a session. The overlay stays
   * hidden; consumers react to this to run Smart Paste in the background.
   */
  sessionId: number;
  /** Window that was focused when the session started, if it could be read. */
  context: ActiveContext | null;
  /** Show the overlay, for when Smart Paste needs the user to decide. */
  reveal: () => Promise<void>;
  /** Hide the overlay and return focus to the previous window. */
  close: () => Promise<void>;
}

/**
 * Own the overlay window's lifecycle.
 *
 * The hotkey deliberately does *not* show the window: it starts a session and
 * leaves the overlay hidden so a confident Smart Paste never interrupts the
 * user. The window is only revealed when the app asks for it, or when the tray
 * is used to browse history.
 */
export function useOverlay(): UseOverlay {
  const [isVisible, setIsVisible] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  // Focus events also fire while hidden; the ref keeps the handler cheap and current.
  const isVisibleRef = useRef(false);

  // Sampled continuously rather than on keypress, so the hotkey starts work
  // immediately instead of waiting on a round trip to Rust.
  const context = useActiveContext(isVisible);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  const close = useCallback(async (): Promise<void> => {
    setIsVisible(false);
    await hideOverlay();
  }, []);

  const reveal = useCallback(async (): Promise<void> => {
    setIsVisible(true);
    await showOverlay();
  }, []);

  // Hotkey: start a session without showing anything.
  useGlobalShortcut(OVERLAY_SHORTCUT, () => {
    setSessionId((current) => current + 1);
  });

  // The tray opens the history picker instead, without asking Jev anything.
  useEffect(() => {
    const unlisten = onShowOverlayRequested(() => void reveal());

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [reveal]);

  useEffect(() => {
    const unlisten = onOverlayFocusChanged((focused) => {
      if (!focused && isVisibleRef.current) void close();
    });

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [close]);

  return { isVisible, sessionId, context, reveal, close };
}
