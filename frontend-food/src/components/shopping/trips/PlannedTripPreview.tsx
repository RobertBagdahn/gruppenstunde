import { Button } from '@/components/ui/button';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import type { PlannedTrip } from '@/schemas/shoppingTrip';
import { formatRowQuantity } from './tripFormat';

interface PlannedTripPreviewProps {
  preview: PlannedTrip | null;
  /** Entries added by hand before the list exists; they stay when it is created. */
  manualItems: ShoppingListItem[];
  canPlan: boolean;
  creating: boolean;
  onCreate: () => void;
}

/** What a planned trip shows instead of entries: the live allocation, without checkboxes or shopping mode. */
export default function PlannedTripPreview({ preview, manualItems, canPlan, creating, onCreate }: PlannedTripPreviewProps) {
  const rows = preview?.rows ?? [];
  return (
    <section aria-label="Vorschau" className="space-y-4 rounded-xl bg-card p-4 shadow-card md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="note" className="text-body text-muted-foreground">
          Vorschau – wird mit „Liste erstellen“ festgehalten
        </p>
        {canPlan && (
          <Button onClick={onCreate} disabled={creating}>
            {creating ? 'Wird erstellt…' : 'Liste erstellen'}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-body text-muted-foreground">Diesem Einkauf ist noch kein Bedarf zugeordnet.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Zutaten der Vorschau">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.subject_id}`} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
              <span className="min-w-0 break-words text-body font-semibold text-foreground">{row.name}</span>
              <span className="text-body text-muted-foreground">{formatRowQuantity(row)}</span>
            </li>
          ))}
        </ul>
      )}

      {manualItems.length > 0 && (
        <div>
          <h3 className="mb-1 text-caption font-bold uppercase tracking-wider text-muted-foreground">Selbst hinzugefügt</h3>
          <ul className="divide-y divide-border" aria-label="Eigene Einträge">
            {manualItems.map((item) => (
              <li key={item.id} className="py-2 text-body">
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
