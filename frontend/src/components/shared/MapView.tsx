import { lazy, Suspense } from "react";

const LazyMap = lazy(() => import("./MapViewInner"));

interface MapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
  draggable?: boolean;
  label?: string;
  onPositionChange?: (lat: number, lng: number) => void;
}

export function MapView(props: MapViewProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center bg-muted rounded-md h-48">
          <span className="text-muted-foreground text-sm">Karte wird geladen...</span>
        </div>
      }
    >
      <LazyMap {...props} />
    </Suspense>
  );
}
