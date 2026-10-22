import { Link } from 'react-router-dom';
import { Clock, ShoppingCart } from 'lucide-react';
import { formatClock } from '@/lib/tripTime';
import type { PlannedTrip } from '@/schemas/shoppingTrip';

interface DayTripMarkerProps {
  trip: PlannedTrip;
  eventSlug: string;
  /** Planned trips of the event team can be moved to another time. */
  canChangeTime: boolean;
  onChangeTime: (trip: PlannedTrip) => void;
}

/** A shopping trip between the meals of a day: "Einkauf Rewe · 10:00". */
export default function DayTripMarker({ trip, eventSlug, canChangeTime, onChangeTime }: DayTripMarkerProps) {
  const created = trip.status === 'created';
  return (
    <div
      data-testid="day-trip-marker"
      className="flex flex-wrap items-center justify-between gap-2 bg-primary-soft px-5 py-2.5 text-body"
    >
      <Link
        to={`/shopping-lists/events/${eventSlug}?trip=${trip.list_id}`}
        className="inline-flex min-w-0 items-center gap-2 font-semibold text-primary-dark hover:underline"
      >
        <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          Einkauf {trip.store_name || trip.name} · {formatClock(trip.scheduled_at)}
        </span>
        {created && <span className="rounded-full bg-success-soft px-2 py-0.5 text-caption text-success">Erstellt</span>}
      </Link>
      {canChangeTime && !created && (
        <button
          type="button"
          onClick={() => onChangeTime(trip)}
          className="press inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-semibold text-muted-foreground hover:bg-card hover:text-foreground"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Uhrzeit ändern
        </button>
      )}
    </div>
  );
}
