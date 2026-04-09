/**
 * EventDayPlan — Day plan timeline view for an event.
 * Groups day slots by date and renders them as a timeline.
 */
import { useState } from 'react';
import type { EventDaySlot } from '@/schemas/event';
import DaySlotCard from './DaySlotCard';
import AddDaySlotDialog from './AddDaySlotDialog';

interface EventDayPlanProps {
  daySlots: EventDaySlot[];
  eventSlug: string;
  isManager: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

/** Group slots by date string ("YYYY-MM-DD"). */
function groupByDate(slots: EventDaySlot[]): Map<string, EventDaySlot[]> {
  const map = new Map<string, EventDaySlot[]>();
  for (const slot of slots) {
    const existing = map.get(slot.date) ?? [];
    existing.push(slot);
    map.set(slot.date, existing);
  }
  return map;
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function EventDayPlan({
  daySlots,
  eventSlug,
  isManager,
  startDate,
}: EventDayPlanProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForDate, setAddForDate] = useState<string | null>(null);

  const grouped = groupByDate(daySlots);
  // Sort dates chronologically
  const sortedDates = [...grouped.keys()].sort();

  function handleAddForDate(dateStr: string) {
    setAddForDate(dateStr);
    setShowAddDialog(true);
  }

  function handleAddGeneral() {
    // Default to start_date or today
    const defaultDate = startDate
      ? startDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    setAddForDate(defaultDate);
    setShowAddDialog(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">view_timeline</span>
          Tagesplan
        </h3>
        {isManager && (
          <button
            onClick={handleAddGeneral}
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Eintrag hinzufuegen
          </button>
        )}
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <span className="material-symbols-outlined text-3xl text-muted-foreground/30 mb-2">
            event_note
          </span>
          <p className="text-sm text-muted-foreground">
            Noch keine Eintraege im Tagesplan.
          </p>
          {isManager && (
            <button
              onClick={handleAddGeneral}
              className="mt-3 px-4 py-1.5 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-700"
            >
              Ersten Eintrag erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const slots = grouped.get(dateStr) ?? [];
            return (
              <div key={dateStr}>
                {/* Date heading */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {formatDateHeading(dateStr)}
                  </h4>
                  {isManager && (
                    <button
                      onClick={() => handleAddForDate(dateStr)}
                      className="p-1 rounded hover:bg-muted"
                      title="Eintrag hinzufuegen"
                    >
                      <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                        add_circle
                      </span>
                    </button>
                  )}
                </div>

                {/* Slots timeline */}
                <div>
                  {slots.map((slot) => (
                    <DaySlotCard
                      key={slot.id}
                      slot={slot}
                      eventSlug={eventSlug}
                      isManager={isManager}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && addForDate && (
        <AddDaySlotDialog
          open={showAddDialog}
          eventSlug={eventSlug}
          defaultDate={addForDate}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}
