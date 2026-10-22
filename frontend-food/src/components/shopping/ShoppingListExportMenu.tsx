/**
 * ShoppingListExportMenu — print, share or copy the open entries of a list.
 * Everything runs in the browser from the loaded list, so it also works while the server is busy.
 */
import { FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { buildShoppingListExport, formatShoppingListText } from '@/lib/shoppingListExport';
import { notify } from '@/lib/notify';

interface ShoppingListExportMenuProps {
  listName: string;
  items: ShoppingListItem[];
  /** The page mounts the print sheet, prints and removes it again. */
  onPrint: () => void;
}

const NOTHING_LEFT_HINT = 'Alles abgehakt – nichts zu exportieren';

function currentText(listName: string, items: ShoppingListItem[]): string {
  return formatShoppingListText(buildShoppingListExport(listName, items, new Date()));
}

export default function ShoppingListExportMenu({ listName, items, onPrint }: ShoppingListExportMenuProps) {
  const openCount = items.filter((item) => !item.is_checked).length;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = async () => {
    try {
      await navigator.share({ title: listName, text: currentText(listName, items) });
    } catch (err) {
      // Closing the share sheet is not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      notify.error('Liste konnte nicht geteilt werden', { error: err });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText(listName, items));
      notify.success('Liste kopiert');
    } catch (err) {
      notify.error('Liste konnte nicht kopiert werden', { error: err });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={openCount === 0}
          aria-label="Liste exportieren"
          title={openCount === 0 ? NOTHING_LEFT_HINT : 'Liste exportieren'}
          data-testid="shopping-export-trigger"
          className="press flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-foreground transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onPrint}>Drucken oder als PDF speichern</DropdownMenuItem>
        {canShare && <DropdownMenuItem onSelect={() => void handleShare()}>Als Text teilen</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => void handleCopy()}>Text kopieren</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
