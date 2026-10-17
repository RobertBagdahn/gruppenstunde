import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useShoppingListItem } from '@/api/shoppingLists';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { formatEuro } from '@/lib/format';
import { formatBoardQuantity } from './boardQuantity';

interface ShoppingItemDetailDialogProps {
  listId: number;
  itemId: number;
  onClose: () => void;
}

/** Everything the compact board leaves out, loaded only when the entry's details are opened. */
export default function ShoppingItemDetailDialog({ listId, itemId, onClose }: ShoppingItemDetailDialogProps) {
  const { data: item, isLoading, error, refetch } = useShoppingListItem(listId, itemId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {isLoading && (
          <div className="space-y-3" aria-label="Details werden geladen">
            <Skeleton className="h-6 w-2/3" />
            <SkeletonText lines={4} />
          </div>
        )}
        {error && !isLoading && (
          <ErrorDisplay error={error} onRetry={() => void refetch()} />
        )}
        {item && <ItemDetails item={item} />}
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function ItemDetails({ item }: { item: ShoppingListItem }) {
  const rows: [string, string][] = [];
  const quantity = formatBoardQuantity(item.quantity, item.unit);
  if (quantity) rows.push(['Menge', quantity]);
  if (item.retail_section_name) rows.push(['Abschnitt', item.retail_section_name]);
  if (item.note) rows.push(['Notiz', item.note]);
  if (item.estimated_price_eur != null) rows.push(['Geschätzter Preis', formatEuro(item.estimated_price_eur)]);
  for (const option of item.package_options) {
    rows.push(['Packung', `${option.count} × ${option.package_name} (${option.weight_g} g)`]);
  }
  if (item.package_surplus_g != null && item.package_surplus_g !== 0) {
    rows.push(['Rest nach Packungen', `${item.package_surplus_g > 0 ? '+' : ''}${item.package_surplus_g} g`]);
  }
  for (const option of item.portion_options.filter((p) => p.is_default)) {
    rows.push(['Standardportion', option.name]);
  }
  const origins = item.sources.map((source) => [source.recipe_name, source.meal_label].filter(Boolean).join(' · '));
  if (origins.length) rows.push(['Herkunft', origins.join(', ')]);
  if (item.added_by_display_name) rows.push(['Hinzugefügt von', item.added_by_display_name]);
  if (item.claimed_by_display_name) {
    rows.push(['Zuständig', item.claimed_by_me ? 'Du' : item.claimed_by_display_name]);
  }
  if (item.is_checked && item.checked_by_display_name) {
    const when = formatDateTime(item.checked_at);
    rows.push(['Abgehakt von', `${item.checked_by_display_name}${when ? ` am ${when}` : ''}`]);
  }
  const created = formatDateTime(item.created_at);
  if (created) rows.push(['Angelegt', created]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-section break-words">{item.name}</DialogTitle>
        <DialogDescription className="sr-only">Details zu diesem Eintrag</DialogDescription>
      </DialogHeader>
      {rows.length === 0 ? (
        <p className="text-body text-muted-foreground">Keine weiteren Angaben.</p>
      ) : (
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-body">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground font-semibold">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
