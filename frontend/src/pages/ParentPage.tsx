/**
 * ParentPage — Public page for parents to view event details for their child.
 * Accessible via `/events/:slug/parent/:token` (no auth required).
 * Shows: child name, event dates, packing list info, meeting point with map, event description.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Suspense, lazy } from 'react';

const MapView = lazy(() =>
  import('@/components/shared/MapView').then((m) => ({ default: m.MapView })),
);

// Schema for the parent view response
const ParentViewSchema = z.object({
  participant_name: z.string(),
  event_name: z.string(),
  event_description: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  location: z.string(),
  meeting_point: z
    .object({
      name: z.string(),
      full_address: z.string(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  pickup_point: z
    .object({
      name: z.string(),
      full_address: z.string(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  packing_list_items: z.array(z.string()).optional(),
});

type ParentView = z.infer<typeof ParentViewSchema>;

function useParentView(slug: string, token: string) {
  return useQuery<ParentView>({
    queryKey: ['parent-view', slug, token],
    queryFn: async () => {
      const res = await fetch(`/api/events/${slug}/parent/${token}/`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Zugang nicht gefunden (${res.status})`);
      }
      return ParentViewSchema.parse(await res.json());
    },
    enabled: !!slug && !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export default function ParentPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const { data, isLoading, error } = useParentView(slug ?? '', token ?? '');

  if (isLoading) {
    return (
      <div className="container py-12 max-w-lg mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded-lg w-2/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-32 bg-muted rounded-xl mt-4" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-12 max-w-lg mx-auto text-center">
        <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2 block">
          lock
        </span>
        <h1 className="text-lg font-bold mb-1">Zugang nicht gefunden</h1>
        <p className="text-sm text-muted-foreground">
          {error?.message || 'Dieser Link ist ungültig oder abgelaufen.'}
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="container py-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Elternzugang
        </p>
        <h1 className="text-xl font-bold">{data.event_name}</h1>
        <p className="text-sm text-violet-600 mt-1">{data.participant_name}</p>
      </div>

      {/* Dates */}
      {(data.start_date || data.end_date) && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Termine
          </h2>
          <div className="text-sm space-y-1">
            {data.start_date && <p>Beginn: {formatDate(data.start_date)}</p>}
            {data.end_date && <p>Ende: {formatDate(data.end_date)}</p>}
          </div>
        </div>
      )}

      {/* Location */}
      {data.location && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            Veranstaltungsort
          </h2>
          <p className="text-sm">{data.location}</p>
        </div>
      )}

      {/* Meeting Point */}
      {data.meeting_point && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">pin_drop</span>
            Treffpunkt
          </h2>
          <p className="text-sm font-medium">{data.meeting_point.name}</p>
          <p className="text-sm text-muted-foreground">{data.meeting_point.full_address}</p>
          {data.meeting_point.latitude && data.meeting_point.longitude && (
            <div className="mt-3 rounded-lg overflow-hidden" style={{ height: 200 }}>
              <Suspense fallback={<div className="bg-muted h-full animate-pulse" />}>
                <MapView
                  latitude={data.meeting_point.latitude}
                  longitude={data.meeting_point.longitude}
                  label={data.meeting_point.name}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {/* Pickup Point */}
      {data.pickup_point && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">directions_car</span>
            Abholpunkt
          </h2>
          <p className="text-sm font-medium">{data.pickup_point.name}</p>
          <p className="text-sm text-muted-foreground">{data.pickup_point.full_address}</p>
          {data.pickup_point.latitude && data.pickup_point.longitude && (
            <div className="mt-3 rounded-lg overflow-hidden" style={{ height: 200 }}>
              <Suspense fallback={<div className="bg-muted h-full animate-pulse" />}>
                <MapView
                  latitude={data.pickup_point.latitude}
                  longitude={data.pickup_point.longitude}
                  label={data.pickup_point.name}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {/* Packing List */}
      {data.packing_list_items && data.packing_list_items.length > 0 && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">checklist</span>
            Packliste
          </h2>
          <ul className="space-y-1">
            {data.packing_list_items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                  check_box_outline_blank
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Description */}
      {data.event_description && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Beschreibung
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {data.event_description}
          </p>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground">
        Diese Seite wurde automatisch erstellt. Bei Fragen wende dich an die Eventleitung.
      </p>
    </div>
  );
}
