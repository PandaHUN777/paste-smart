import type { SmartPasteStatus, Suggestion } from "../types";

interface StatusBarProps {
  status: SmartPasteStatus;
  error: string | null;
  suggestion: Suggestion | null;
  /** Number of entries currently tracked. */
  itemCount: number;
}

const asPercent = (value: number): string => `${Math.round(value * 100)}%`;

function message({ status, error, suggestion, itemCount }: StatusBarProps): string {
  if (status === "error") return error ?? "Something went wrong.";
  if (status === "thinking") return "Jev is reading the active window…";
  if (status === "pasting") return "Pasting…";
  if (status === "done") return "Pasted.";
  if (suggestion && !suggestion.isConfident) {
    return `Not confident enough (${asPercent(suggestion.confidence)} match, ${asPercent(
      suggestion.relevance,
    )} fit) — pick one below.`;
  }
  return `${itemCount} item${itemCount === 1 ? "" : "s"} · Esc to dismiss`;
}

/** Single line reporting progress, errors and Jev's confidence. */
export function StatusBar(props: StatusBarProps) {
  const tone = props.status === "error" ? "status status--error" : "status";
  return (
    <p className={tone} role={props.status === "error" ? "alert" : "status"}>
      {message(props)}
    </p>
  );
}
