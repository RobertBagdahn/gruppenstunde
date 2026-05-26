/**
 * MeetingPointPicker — reusable picker component for selecting or creating meeting points.
 * Follows the same card-selection + inline-form pattern as the location picker in NewEventPage.
 * Includes geocoding button and draggable map pin for coordinate setting.
 */
import { useState } from 'react';
import { useMeetingPoints, useCreateMeetingPoint } from '@/api/events';
import { toast } from 'sonner';
import { geocodeAddress } from '@/utils/geocoding';
import { MapView } from '@/components/shared/MapView';

interface MeetingPointPickerProps {
  label: string;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function MeetingPointPicker({ label, selectedId, onSelect }: MeetingPointPickerProps) {
  const { data: meetingPoints, isLoading } = useMeetingPoints();
  const createMutation = useCreateMeetingPoint();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const selected = meetingPoints?.find((mp) => mp.id === selectedId) ?? null;

  const handleGeocode = async () => {
    const address = [formStreet, formZip, formCity].filter(Boolean).join(', ');
    if (!address.trim()) {
      toast.error('Bitte Adresse eingeben');
      return;
    }
    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(address);
      if (result) {
        setFormLat(result.lat);
        setFormLng(result.lng);
        toast.success('Koordinaten gefunden');
      } else {
        toast.error('Adresse konnte nicht gefunden werden');
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    createMutation.mutate(
      {
        name: formName.trim(),
        street: formStreet.trim(),
        zip_code: formZip.trim(),
        city: formCity.trim(),
        latitude: formLat,
        longitude: formLng,
      },
      {
        onSuccess: (newPoint) => {
          onSelect(newPoint.id);
          setShowForm(false);
          setFormName('');
          setFormStreet('');
          setFormZip('');
          setFormCity('');
          setFormLat(null);
          setFormLng(null);
          toast.success('Treffpunkt erstellt');
        },
        onError: (err) => {
          toast.error('Fehler', { description: err.message });
        },
      },
    );
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </label>

      {/* Selected meeting point confirmation */}
      {selected && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span className="font-medium">{selected.name}</span>
          {selected.full_address && (
            <span className="text-green-600">— {selected.full_address}</span>
          )}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Meeting point list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade Treffpunkte...</p>
      ) : (
        <div className="space-y-1.5">
          {meetingPoints && meetingPoints.length > 0 ? (
            meetingPoints.map((mp) => (
              <button
                key={mp.id}
                type="button"
                onClick={() => onSelect(mp.id === selectedId ? null : mp.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  mp.id === selectedId
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted/50 border-border'
                }`}
              >
                <span className="font-medium">{mp.name}</span>
                {mp.full_address && (
                  <span className={`ml-2 ${mp.id === selectedId ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {mp.full_address}
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Treffpunkte vorhanden.
            </p>
          )}
        </div>
      )}

      {/* Create new inline */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-2 text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Neuen Treffpunkt anlegen
        </button>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-violet-300 bg-violet-50/30 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="z.B. Parkplatz Gemeindehaus"
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Straße</label>
            <input
              type="text"
              value={formStreet}
              onChange={(e) => setFormStreet(e.target.value)}
              placeholder="z.B. Kirchweg 5"
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">PLZ</label>
              <input
                type="text"
                value={formZip}
                onChange={(e) => setFormZip(e.target.value)}
                placeholder="35037"
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Stadt</label>
              <input
                type="text"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="Marburg"
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              />
            </div>
          </div>
          {/* Geocoding button */}
          <button
            type="button"
            onClick={handleGeocode}
            disabled={isGeocoding || (!formStreet && !formCity)}
            className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isGeocoding ? 'progress_activity' : 'my_location'}
            </span>
            {isGeocoding ? 'Suche...' : 'Koordinaten aus Adresse ermitteln'}
          </button>
          {/* Map preview with draggable pin */}
          {formLat !== null && formLng !== null && (
            <div className="rounded-lg overflow-hidden border">
              <MapView
                latitude={formLat}
                longitude={formLng}
                zoom={15}
                className="h-40 w-full"
                draggable
                onPositionChange={(lat, lng) => {
                  setFormLat(lat);
                  setFormLng(lng);
                }}
              />
              <p className="text-[10px] text-muted-foreground px-2 py-1 bg-muted/50">
                Pin verschieben um Position anzupassen
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
