import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useIngredientCompleteness } from '@/api/dataQuality';
import type { CompletenessItem } from '@/schemas/dataQuality';
import Pagination from '@/components/shared/Pagination';
import { Loader2, ArrowUpDown } from 'lucide-react';

type SortKey = keyof CompletenessItem;
type SortDir = 'asc' | 'desc';

const SCORE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'quality_score', label: 'Gesamt' },
  { key: 'nutrition_score', label: 'Nährwerte' },
  { key: 'price_score', label: 'Preis' },
  { key: 'physical_score', label: 'Physikalisch' },
  { key: 'classification_score', label: 'Klassifikation' },
  { key: 'scout_score', label: 'Pfadfinder' },
  { key: 'portion_score', label: 'Portionen' },
];

function scoreColor(value: number): string {
  if (value >= 80) return 'text-emerald-600';
  if (value >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function CompletenessGrid() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>('quality_score');
  const [dir, setDir] = useState<SortDir>('asc');

  const { data, isLoading, error } = useIngredientCompleteness({ page, page_size: 25 });

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDir('desc');
    }
  };

  const sortedItems = data?.items ? [...data.items].sort((a, b) => {
    const aVal = a[sort] ?? 0;
    const bVal = b[sort] ?? 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return dir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  }) : [];

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-2xl text-muted-foreground" />
      </div>
    );
  if (error) return <div className="text-red-500 py-4">Fehler beim Laden: {error.message}</div>;
  if (!sortedItems.length) return <div className="text-muted-foreground py-4">Keine Zutaten gefunden</div>;

  return (
    <div>
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {SCORE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-2.5 font-medium cursor-pointer select-none hover:bg-muted/80 transition-colors',
                    col.key === 'name' ? 'text-left min-w-[140px]' : 'text-right'
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sort === col.key && (
                      <ArrowUpDown className={cn('h-3 w-3', dir === 'asc' ? 'rotate-180' : '')} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5">
                  <a
                    href={`/ingredients/${item.slug}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {item.name}
                  </a>
                  <span className="ml-2 text-xs text-muted-foreground">{item.status}</span>
                </td>
                <td className={cn('px-3 py-2.5 text-right font-semibold', scoreColor(item.quality_score ?? 0))}>
                  {item.quality_score ?? '–'}
                </td>
                <td className={cn('px-3 py-2.5 text-right', scoreColor(item.nutrition_score))}>
                  {item.nutrition_score}
                </td>
                <td className={cn('px-3 py-2.5 text-right', scoreColor(item.price_score))}>
                  {item.price_score}
                </td>
                <td className={cn('px-3 py-2.5 text-right', scoreColor(item.physical_score))}>
                  {item.physical_score}
                </td>
                <td className={cn('px-3 py-2.5 text-right', scoreColor(item.classification_score))}>
                  {item.classification_score}
                </td>
                <td className={cn('px-3 py-2.5 text-right', scoreColor(item.scout_score))}>
                  {item.scout_score}
                </td>
                <td className={cn('px-3 py-2.5 text-right', scoreColor(item.portion_score))}>
                  {item.portion_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          currentPage={data.page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
