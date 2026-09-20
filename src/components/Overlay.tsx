import type { ReactNode } from "react";

import type { ActiveContext } from "../types";

interface OverlayProps {
  /** Window the overlay was summoned from. */
  context: ActiveContext | null;
  /** Dismiss the overlay. */
  onClose: () => void;
  children: ReactNode;
}

/** Frameless shell: a draggable header describing the target window, plus content. */
export function Overlay({ context, onClose, children }: OverlayProps) {
  return (
    <div className="overlay">
      <header className="overlay__header" data-tauri-drag-region>
        <div className="overlay__target">
          <span className="overlay__app">{context?.appName ?? "Unknown app"}</span>
          <span className="overlay__title">{context?.title ?? "No active window"}</span>
        </div>
        <button className="overlay__close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <main className="overlay__body">{children}</main>
    </div>
  );
}
