/**
 * LocationDetailDialog — Fullscreen dialog with map, address, description,
 * and OpenStreetMap routing link for event locations and meeting points.
 */
import { MapView } from '@/components/shared/MapView';

interface LocationData {
  name: string;
  address?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  location: LocationData;
  open: boolean;
  onClose: () => void;
  /** Optional label like "Veranstaltungsort", "Treffpunkt", "Abholpunkt" */
  label?: string;
}

export default function LocationDetailDialog({ location, open, onClose, label }: Props) {
  if (!open) return null;

  const hasCoords = location.latitude != null && location.longitude != null;

  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`
    : null;

  const routeUrl = hasCoords
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${location.latitude}%2C${location.longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            {label && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
            )}
            <h3 className="text-lg font-bold">{location.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Map */}
        {hasCoords && (
          <div className="w-full">
            <MapView
              latitude={location.latitude!}
              longitude={location.longitude!}
              zoom={15}
              className="h-64 w-full"
            />
          </div>
        )}

        {/* Details */}
        <div className="p-4 space-y-3">
          {location.address && (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5 text-muted-foreground">
                location_on
              </span>
              <p className="text-sm">{location.address}</p>
            </div>
          )}

          {location.description && (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5 text-muted-foreground">
                info
              </span>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {location.description}
              </p>
            </div>
          )}

          {hasCoords && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-[14px]">my_location</span>
              {location.latitude!.toFixed(6)}, {location.longitude!.toFixed(6)}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {osmUrl && (
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                In OpenStreetMap öffnen
              </a>
            )}
            {routeUrl && (
              <a
                href={routeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">directions</span>
                Route planen
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
