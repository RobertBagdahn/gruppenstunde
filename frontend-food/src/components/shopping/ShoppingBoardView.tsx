import { useState } from 'react';
import { Check, Eye, Scale, Trash2 } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PageSkeleton } from '@/components/ui/skeleton';
import type { ShoppingBoardItem, ShoppingListBoard } from '@/schemas/shoppingList';
import { cn } from '@/lib/utils';
import { isOverloadError } from '@/lib/queryRetry';
import OverloadNotice from './OverloadNotice';
import { formatBoardQuantity } from './boardQuantity';
import { BoardQuantityDialog } from './ItemQuantityDialog';
import ShoppingItemDetailDialog from './ShoppingItemDetailDialog';

export { formatBoardQuantity };

const OTHER_SECTION = 'Sonstiges';
const MATERIAL_SECTION = 'Material';

/**
 * Groups entries by section in the server's order of first appearance; open entries
 * come before checked ones inside a section. "Sonstiges" and "Material" go last.
 */
export function groupBoardItems(items: ShoppingBoardItem[]): [string, ShoppingBoardItem[]][] {
  const groups = new Map<string, ShoppingBoardItem[]>();
  for (const item of items) {
    const section = item.is_material ? MATERIAL_SECTION : item.retail_section_name || OTHER_SECTION;
    const group = groups.get(section) ?? [];
    group.push(item);
    groups.set(section, group);
  }
  const rank = (section: string) => (section === OTHER_SECTION ? 2 : section === MATERIAL_SECTION ? 3 : 1);
  return [...groups.entries()]
    .map(([section, group]): [string, ShoppingBoardItem[]] => [
      section,
      [...group].sort((a, b) => (a.is_checked !== b.is_checked ? (a.is_checked ? 1 : -1) : a.sort_order - b.sort_order)),
    ])
    .sort((a, b) => rank(a[0]) - rank(b[0]));
}

interface ShoppingBoardViewProps {
  board: ShoppingListBoard | undefined;
  isLoading: boolean;
  error: Error | null | undefined;
  /** The backend is turning requests away (pulse or reload); the board keeps its last state. */
  overloaded?: boolean;
  onRetry: () => void;
  onExit: () => void;
  onCheck: (itemId: number, isChecked: boolean) => void;
  onClaim: (itemId: number, claimed: boolean) => void;
  onDelete: (itemId: number) => void;
  /** Saves a new amount in grams (e.g. after buying only a part). */
  onUpdateQuantity: (itemId: number, quantityG: number) => void;
}

/** Shopping mode: big tap targets, only what is needed in the shop. Works on the compact board only. */
export default function ShoppingBoardView({
  board,
  isLoading,
  error,
  overloaded = false,
  onRetry,
  onExit,
  onCheck,
  onClaim,
  onDelete,
  onUpdateQuantity,
}: ShoppingBoardViewProps) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [quantityId, setQuantityId] = useState<number | null>(null);
  if (isLoading) {
    return <PageSkeleton label="Einkaufsmodus wird geladen" />;
  }

  // Overload with data on screen keeps the board and shows a notice; any other error replaces it.
  if ((error && !isOverloadError(error)) || !board) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorDisplay error={error} onRetry={onRetry} onBack={onExit} backLabel="Zurück zur Liste" />
      </div>
    );
  }

  const groups = groupBoardItems(board.items);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {(overloaded || isOverloadError(error)) && <OverloadNotice />}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-section font-bold break-words">{board.name}</h1>
          <p className="text-caption text-muted-foreground">
            {board.checked} von {board.total} erledigt
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-pressed
          className="shrink-0 px-3 py-2 text-body font-semibold rounded-lg bg-primary-soft text-primary hover:opacity-80 transition-all"
        >
          Einkaufsmodus beenden
        </button>
      </header>

      {board.total === 0 && (
        <p className="text-body text-muted-foreground">Noch keine Einträge auf dieser Liste.</p>
      )}

      {groups.map(([section, items]) => (
        <section key={section} className="bg-card rounded-xl p-4 shadow-card">
          <h2 className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">{section}</h2>
          <ul className="divide-y divide-border/40">
            {items.map((item) => (
              <BoardRow
                key={item.id}
                item={item}
                canEdit={board.can_edit}
                onCheck={onCheck}
                onClaim={onClaim}
                onDelete={onDelete}
                onShowDetails={setDetailId}
                onChangeQuantity={setQuantityId}
              />
            ))}
          </ul>
        </section>
      ))}
      {quantityId !== null && (
        <BoardQuantityDialog
          listId={board.id}
          itemId={quantityId}
          onSave={(quantityG) => onUpdateQuantity(quantityId, quantityG)}
          onClose={() => setQuantityId(null)}
        />
      )}
      {detailId !== null && (
        <ShoppingItemDetailDialog listId={board.id} itemId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

interface BoardRowProps {
  item: ShoppingBoardItem;
  canEdit: boolean;
  onCheck: (itemId: number, isChecked: boolean) => void;
  onClaim: (itemId: number, claimed: boolean) => void;
  onDelete: (itemId: number) => void;
  onShowDetails: (itemId: number) => void;
  onChangeQuantity: (itemId: number) => void;
}

function BoardRow({ item, canEdit, onCheck, onClaim, onDelete, onShowDetails, onChangeQuantity }: BoardRowProps) {
  const quantity = formatBoardQuantity(item.quantity, item.unit);
  const claimText = item.claimed_by_me
    ? 'Du holst das'
    : item.claimed_by_name
      ? `Holt: ${item.claimed_by_name}`
      : null;
  const details = [quantity, item.note, item.checked_by_name && item.is_checked ? `abgehakt von ${item.checked_by_name}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.is_checked}
        aria-label={item.is_checked ? `${item.name} als unerledigt markieren` : `${item.name} als erledigt markieren`}
        disabled={!canEdit}
        onClick={() => onCheck(item.id, !item.is_checked)}
        className={cn(
          'flex items-center justify-center shrink-0 w-14 h-14 rounded-xl border-2 transition-all shadow-soft',
          item.is_checked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 bg-card',
          !canEdit && 'opacity-50 cursor-default',
        )}
      >
        {item.is_checked && <Check className="w-7 h-7" strokeWidth={2} />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-emphasis font-semibold break-words',
            item.is_checked && 'line-through text-muted-foreground',
          )}
        >
          {item.name}
        </p>
        {details && <p className="text-caption text-muted-foreground">{details}</p>}
        {claimText && <p className="text-caption text-primary font-semibold">{claimText}</p>}
      </div>

      {canEdit && !item.is_checked && item.claimed_by_me && (
        <button
          type="button"
          onClick={() => onClaim(item.id, false)}
          className="shrink-0 px-2.5 py-1.5 text-caption font-semibold rounded-lg bg-primary-soft text-primary"
        >
          Nicht mehr
        </button>
      )}
      {canEdit && !item.claimed_by_name && (
        <button
          type="button"
          onClick={() => onClaim(item.id, true)}
          className="shrink-0 px-2.5 py-1.5 text-caption font-semibold rounded-lg bg-primary-soft text-primary"
        >
          Ich hole das
        </button>
      )}
      {canEdit && !item.is_checked && !item.is_material && (
        <button
          type="button"
          onClick={() => onChangeQuantity(item.id)}
          aria-label={`Menge von „${item.name}“ ändern`}
          className="shrink-0 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 text-caption font-semibold text-primary"
        >
          <Scale className="w-4 h-4" strokeWidth={2} />
          Menge
        </button>
      )}
      <button
        type="button"
        onClick={() => onShowDetails(item.id)}
        aria-label={`Details zu ${item.name}`}
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary-soft"
      >
        <Eye className="w-5 h-5" strokeWidth={2} />
      </button>
      {canEdit && item.can_delete && (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          aria-label={`${item.name} löschen`}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft"
        >
          <Trash2 className="w-5 h-5" strokeWidth={2} />
        </button>
      )}
    </li>
  );
}
