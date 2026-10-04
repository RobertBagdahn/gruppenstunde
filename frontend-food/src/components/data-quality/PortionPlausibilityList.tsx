import { usePortionPlausibility } from '@/api/dataQuality';
import type { PortionPlausibility } from '@/schemas/dataQuality';
import { AlertTriangle } from 'lucide-react';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import ErrorDisplay from '@/components/ErrorDisplay';

interface PortionPlausibilityListProps {
  page?: number;
  pageSize?: number;
}

export default function PortionPlausibilityList({ page = 1, pageSize = 50 }: PortionPlausibilityListProps) {
  const { data, isLoading, error } = usePortionPlausibility({ page, page_size: pageSize });

  if (isLoading)
    return (
      <SkeletonTableRows rows={5} columns={3} label="Einträge werden geladen" />
    );
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" />;
  if (!data?.items.length) return <div className="text-muted-foreground py-4">Alle Portionsgewichte sind plausibel</div>;

  function formatWeight(val: number | null | undefined): string {
    if (val == null) return '–';
    return `${val}g`;
  }

  return (
    <div className="space-y-2">
      {data.items.map((item: PortionPlausibility) => (
        <a
          key={item.id}
          href={`/recipes/${item.slug}`}
          className="block rounded-xl border border-danger-border bg-danger-soft/30 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{item.title}</span>
              <span className="ml-2 text-caption text-muted-foreground">
                Portion: {formatWeight(item.cached_weight_g)}
              </span>
            </div>
            <span className="flex items-center gap-1 text-caption text-danger">
              <AlertTriangle className="h-3.5 w-3.5" />
              {item.issue}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
