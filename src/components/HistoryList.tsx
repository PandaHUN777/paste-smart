import { HistoryItem } from "./HistoryItem";
import type { ClipboardItem } from "../types";

interface HistoryListProps {
  items: ClipboardItem[];
  /** Id of the entry Jev picked, if any. */
  suggestedId: string | null;
  onSelect: (item: ClipboardItem) => void;
}

/** Recent clipboard entries, most recent first. */
export function HistoryList({ items, suggestedId, onSelect }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="empty">
        No clipboard history yet.
        <br />
        Copy some text and it will show up here.
      </p>
    );
  }

  return (
    <ul className="history">
      {items.map((item, index) => (
        <HistoryItem
          key={item.id}
          item={item}
          index={index}
          isSuggested={item.id === suggestedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
