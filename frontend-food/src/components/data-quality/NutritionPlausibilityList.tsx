import { useNutritionPlausibility } from '@/api/dataQuality';
import type { NutritionPlausibility } from '@/schemas/dataQuality';
import { Loader2, XCircle, AlertTriangle } from 'lucide-react';

interface NutritionPlausibilityListProps {
  page?: number;
  pageSize?: number;
}

export default function NutritionPlausibilityList({ page = 1, pageSize = 50 }: NutritionPlausibilityListProps) {
  const { data, isLoading, error } = useNutritionPlausibility({ page, page_size: pageSize });

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-2xl text-muted-foreground" />
      </div>
    );
  if (error) return <div className="text-red-500 py-4">Fehler beim Laden: {error.message}</div>;
  if (!data?.items.length) return <div className="text-muted-foreground py-4">Keine Auffälligkeiten gefunden</div>;

  return (
    <div className="space-y-2">
      {data.items.map((item: NutritionPlausibility) => (
        <a
          key={item.id}
          href={`/ingredients/${item.slug}`}
          className="block rounded-xl border border-red-200 bg-red-50/30 dark:bg-red-950/10 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{item.name}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span>{Math.round(item.energy_kcal)} kcal</span>
                <span>P {parseFloat(item.protein_g.toFixed(1))}g</span>
                <span>F {parseFloat(item.fat_g.toFixed(1))}g</span>
                <span>KH {parseFloat(item.carbohydrate_g.toFixed(1))}g</span>
                {item.macro_sum > 100 && (
                  <span className="text-red-600 font-medium">Summe: {parseFloat(item.macro_sum.toFixed(1))}%</span>
                )}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-red-600 flex-shrink-0 ml-2">
              {item.issue.includes('extrem') || item.issue.includes('ungewöhnlich') ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {item.issue}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
