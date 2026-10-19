import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, CheckCircle2, Clock, Pencil, Store as StoreIcon, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/format';
import { formatTripTime } from '@/lib/tripTime';
import { cn } from '@/lib/utils';
import type { AllocationRule, PlannedTrip, TripRow } from '@/schemas/shoppingTrip';
import { formatRowQuantity } from './tripFormat';

interface TripCardProps {
  trip: PlannedTrip;
  rules: AllocationRule[];
  canManage: boolean;
  highlighted?: boolean;
  busy?: boolean;
  onEdit: (trip: PlannedTrip) => void;
  onDelete: (trip: PlannedTrip) => void;
  onMaterialize: (trip: PlannedTrip) => void;
  onMove: (trip: PlannedTrip, row: TripRow) => void;
  onRemoveRule: (rule: AllocationRule) => void;
}

const TripCard = forwardRef<HTMLElement, TripCardProps>(function TripCard(
  { trip, rules, canManage, highlighted = false, busy = false, onEdit, onDelete, onMaterialize, onMove, onRemoveRule },
  ref,
) {
  const created = trip.status === 'created';
  return (
    <article
      ref={ref}
      aria-label={trip.name}
      className={cn('rounded-xl bg-card p-4 shadow-card sm:p-5', highlighted && 'ring-2 ring-primary')}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words font-display text-emphasis font-bold text-foreground">{trip.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption font-semibold text-muted-foreground">
            {trip.store_name && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon className="h-4 w-4" aria-hidden="true" />
                {trip.store_name}
              </span>
            )}
            {trip.scheduled_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {formatTripTime(trip.scheduled_at)}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                created ? 'bg-success-soft text-success' : 'bg-info-soft text-info',
              )}
            >
              {created && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {created ? 'Erstellt' : 'Geplant'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {created ? (
            <Button asChild size="sm" variant="secondary">
              <Link to={`/shopping-lists/${trip.list_id}`}>Liste öffnen</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="outline">
                <Link to={`/shopping-lists/${trip.list_id}`}>Vorschau</Link>
              </Button>
              {canManage && (
                <Button size="sm" onClick={() => onMaterialize(trip)} disabled={busy}>
                  Liste erstellen
                </Button>
              )}
            </>
          )}
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEdit(trip)} aria-label={`Einkauf „${trip.name}“ ändern`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Ändern</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(trip)} aria-label={`Einkauf „${trip.name}“ löschen`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Löschen</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {created && (
        <p className="mt-3 text-caption text-muted-foreground">
          {plural(trip.checked_count, 'Eintrag', 'Einträge')} von {trip.items_count} abgehakt.
        </p>
      )}

      {trip.rows.length === 0 ? (
        <p className="mt-3 text-body text-muted-foreground">Diesem Einkauf ist noch kein Bedarf zugeordnet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border" aria-label={`Zutaten für ${trip.name}`}>
          {trip.rows.map((row) => {
            const rowRules = rules.filter((rule) => row.rule_ids.includes(rule.id));
            return (
              <li key={`${row.kind}-${row.subject_id}`} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-body font-semibold text-foreground">
                    {row.name} <span className="font-normal text-muted-foreground">· {formatRowQuantity(row)}</span>
                  </p>
                  {row.spread_count > 1 && (
                    <p className="text-caption text-muted-foreground">auf {row.spread_count} Einkäufe verteilt</p>
                  )}
                  {rowRules.map((rule) => (
                    <p key={rule.id} className="flex items-center gap-1 text-caption text-primary">
                      Von Hand zugeordnet
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onRemoveRule(rule)}
                          aria-label={`Zuordnung für ${row.name} zurücknehmen`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </p>
                  ))}
                </div>
                {canManage && !created && (
                  <Button size="sm" variant="ghost" onClick={() => onMove(trip, row)} aria-label={`${row.name} verschieben`}>
                    <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                    Verschieben
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
});

export default TripCard;
