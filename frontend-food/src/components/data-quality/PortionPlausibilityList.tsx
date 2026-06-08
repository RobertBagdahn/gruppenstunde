import { usePortionPlausibility } from '@/api/dataQuality';
import type { PortionPlausibility } from '@/schemas/dataQuality';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PortionPlausibilityListProps {
  page?: number;
  pageSize?: number;
}

export default function PortionPlausibilityList({ page = 1, pageSize = 50 }: PortionPlausibilityListProps) {
  const { data, isLoading, error } = usePortionPlausibility({ page, page_size: pageSize });

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-2xl text-muted-foreground" />
      </div>
    );
  if (error) return <div className="text-red-500 py-4">Fehler beim Laden: {error.message}</div>;
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
          className="block rounded-xl border border-red-200 bg-red-50/30 dark:bg-red-950/10 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{item.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                Portion: {formatWeight(item.cached_weight_g)}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {item.issue}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
