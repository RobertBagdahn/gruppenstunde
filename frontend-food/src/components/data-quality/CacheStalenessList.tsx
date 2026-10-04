import { useCacheStaleness } from '@/api/dataQuality';
import type { CacheStaleness } from '@/schemas/dataQuality';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import ErrorDisplay from '@/components/ErrorDisplay';

interface CacheStalenessListProps {
  page?: number;
  pageSize?: number;
}

export default function CacheStalenessList({ page = 1, pageSize = 50 }: CacheStalenessListProps) {
  const { data, isLoading, error } = useCacheStaleness({ page, page_size: pageSize });

  if (isLoading)
    return (
      <SkeletonTableRows rows={5} columns={3} label="Einträge werden geladen" />
    );
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" />;
  if (!data?.items.length) return <div className="text-muted-foreground py-4">Alle Caches sind aktuell</div>;

  function formatStaleSince(val: string | null | undefined): string {
    if (!val) return 'Unbekannt';
    const d = new Date(val);
    const now = new Date();
    const days = Math.round((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    return `Seit ${days} Tagen`;
  }

  return (
    <div className="space-y-2">
      {data.items.map((item: CacheStaleness) => (
        <a
          key={item.id}
          href={`/recipes/${item.slug}`}
          className="block rounded-xl border border-warning-border bg-warning-soft/30 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{item.title}</span>
              <span className="ml-2 text-caption text-muted-foreground">
                {item.cached_at ? `Gecached: ${new Date(item.cached_at).toLocaleDateString('de')}` : 'Nie gecached'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-caption text-warning flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formatStaleSince(item.stale_since)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  notify.info('Cache-Neuberechnung ist in Planung');
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Cache neu berechnen
              </Button>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
