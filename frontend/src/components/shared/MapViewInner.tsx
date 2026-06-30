import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useState, useEffect, useMemo } from "react";

// Fix default marker icon path issue in bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewInnerProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
  draggable?: boolean;
  label?: string;
  onPositionChange?: (lat: number, lng: number) => void;
}

function DraggableMarker({
  position,
  onPositionChange,
  label,
}: {
  position: [number, number];
  onPositionChange?: (lat: number, lng: number) => void;
  label?: string;
}) {
  const [markerPosition, setMarkerPosition] = useState(position);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = useMemo(
    () => ({
      dragend(e: L.DragEndEvent) {
        const marker = e.target;
        const pos = marker.getLatLng();
        setMarkerPosition([pos.lat, pos.lng]);
        onPositionChange?.(pos.lat, pos.lng);
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      position={markerPosition}
      draggable={!!onPositionChange}
      eventHandlers={eventHandlers}
    >
      {label && <Tooltip permanent>{label}</Tooltip>}
    </Marker>
  );
}

function ClickHandler({
  onPositionChange,
}: {
  onPositionChange?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapViewInner({
  latitude,
  longitude,
  zoom = 13,
  className = "h-48 w-full rounded-md",
  draggable = false,
  label,
  onPositionChange,
}: MapViewInnerProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DraggableMarker position={center} onPositionChange={draggable ? onPositionChange : undefined} label={label} />
      {draggable && <ClickHandler onPositionChange={onPositionChange} />}
    </MapContainer>
  );
}
