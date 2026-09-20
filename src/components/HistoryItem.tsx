import { previewOf } from "../lib/clipboard";
import type { ClipboardItem } from "../types";

interface HistoryItemProps {
  item: ClipboardItem;
  /** Position in the list, shown as a 1-based index. */
  index: number;
  /** Whether Jev picked this entry. */
  isSuggested: boolean;
  onSelect: (item: ClipboardItem) => void;
}

/** One clipboard entry; clicking it pastes it. */
export function HistoryItem({ item, index, isSuggested, onSelect }: HistoryItemProps) {
  return (
    <li>
      <button
        type="button"
        className={`entry${isSuggested ? " entry--suggested" : ""}`}
        onClick={() => onSelect(item)}
        title={item.text}
      >
        <span className="entry__index">{index + 1}</span>
        <span className="entry__text">{previewOf(item.text, 160)}</span>
        {isSuggested && <span className="entry__badge">Jev</span>}
      </button>
    </li>
  );
}
