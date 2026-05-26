/**
 * Step 3: Datum & Ort — date pickers with smart defaults, location picker with map, meeting points.
 */
import { useEffect, useRef } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';
import { useLocations } from '@/api/events';
import { MeetingPointPicker } from '@/components/events/MeetingPointPicker';
import { MapView } from '@/components/shared/MapView';
import { cn } from '@/lib/utils';
import { getNextSaturday, getNextSunday } from '@/utils/smartDefaults';

export default function StepDateLocation() {
  const { data, updateStep3, setStepValid } = useEventWizardStore();
  const { data: locations, isLoading: locationsLoading } = useLocations();

  // Smart default tracking
  const endDateEdited = useRef(false);
  const hasSetDefaults = useRef(false);

  // Step is always valid (all fields optional)
  useEffect(() => {
    setStepValid(2, true);
  }, [setStepValid]);

  // Set smart defaults on first render if no start date yet
  useEffect(() => {
    if (!hasSetDefaults.current && !data.start_date) {
      hasSetDefaults.current = true;
      const nextSat = getNextSaturday();
      const nextSun = getNextSunday(nextSat);
      updateStep3({
        start_date: nextSat,
        end_date: nextSun,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-update end date when start date changes (if not manually edited)
  useEffect(() => {
    if (!data.start_date || endDateEdited.current) return;
    const sunday = getNextSunday(data.start_date);
    if (sunday) updateStep3({ end_date: sunday });
  }, [data.start_date]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedLocation = locations?.find((l) => l.id === data.event_location_id) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Datum & Ort</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Wann und wo findet dein Event statt?
        </p>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Startdatum</label>
          <input
            type="datetime-local"
            value={data.start_date || ''}
            onChange={(e) => updateStep3({ start_date: e.target.value || null })}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Enddatum</label>
          <input
            type="datetime-local"
            value={data.end_date || ''}
            onChange={(e) => {
              endDateEdited.current = true;
              updateStep3({ end_date: e.target.value || null });
            }}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
      </div>

      {/* Location picker */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Veranstaltungsort</label>

        {locationsLoading ? (
          <p className="text-sm text-muted-foreground">Orte laden...</p>
        ) : locations && locations.length > 0 ? (
          <div className="grid gap-2">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() =>
                  updateStep3({
                    event_location_id: loc.id === data.event_location_id ? null : loc.id,
                    location: loc.id !== data.event_location_id
                      ? `${loc.name}, ${loc.city}`
                      : '',
                  })
                }
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border transition-all text-sm',
                  data.event_location_id === loc.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'hover:bg-muted border-border',
                )}
              >
                <div className="font-medium">{loc.name}</div>
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    data.event_location_id === loc.id
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground',
                  )}
                >
                  {[loc.street, loc.zip_code, loc.city].filter(Boolean).join(', ')}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Orte vorhanden.</p>
        )}

        {/* Map preview for selected location */}
        {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
          <div className="rounded-lg overflow-hidden border h-48">
            <MapView
              latitude={selectedLocation.latitude}
              longitude={selectedLocation.longitude}
              zoom={13}
            />
          </div>
        )}
      </div>

      {/* Meeting & Pickup Points */}
      <div className="border-t pt-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-1">Treff- & Abholpunkte</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Optional: Wo treffen sich die Teilnehmer? Wo werden sie abgeholt?
          </p>
        </div>
        <MeetingPointPicker
          label="Treffpunkt (Start)"
          selectedId={data.meeting_point_id ?? null}
          onSelect={(id) => updateStep3({ meeting_point_id: id })}
        />
        <MeetingPointPicker
          label="Abholpunkt (Ende)"
          selectedId={data.pickup_point_id ?? null}
          onSelect={(id) => updateStep3({ pickup_point_id: id })}
        />
      </div>
    </div>
  );
}
