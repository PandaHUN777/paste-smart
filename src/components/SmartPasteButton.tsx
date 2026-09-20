interface SmartPasteButtonProps {
  /** Disables the button while a request is in flight or there is nothing to paste. */
  disabled: boolean;
  /** Renders the in-flight label. */
  isBusy: boolean;
  onClick: () => void;
}

/** Primary action: hand the current state to Jev and let it choose. */
export function SmartPasteButton({ disabled, isBusy, onClick }: SmartPasteButtonProps) {
  return (
    <button className="smart-paste" type="button" onClick={onClick} disabled={disabled}>
      {isBusy ? "Asking Jev…" : "Smart Paste"}
    </button>
  );
}
