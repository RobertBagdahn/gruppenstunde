import { useSearchParams, Link } from 'react-router-dom';
import { useIngredientScores } from '@/api/supplies';
import TabFilters from '../components/TabFilters';

const NUTRI_COLORS: Record<number, { bg: string; label: string }> = {
  1: { bg: 'bg-green-600', label: 'A' },
  2: { bg: 'bg-lime-500', label: 'B' },
  3: { bg: 'bg-yellow-400', label: 'C' },
  4: { bg: 'bg-orange-500', label: 'D' },
  5: { bg: 'bg-red-600', label: 'E' },
};

export default function NutriLandscapeTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScores('nutri_score', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Verteilung der Nutri-Score-Klassen (A–E) über alle verifizierten Zutaten.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {data.classes.map((cls) => (
              <div key={cls.class_value} className="flex-1 min-w-[100px] rounded-xl border border-border bg-card p-4 text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold text-white mb-2 ${NUTRI_COLORS[cls.class_value]?.bg ?? 'bg-muted'}`}>
                  {cls.class_label}
                </div>
                <p className="text-2xl font-bold font-display">{cls.count}</p>
                <p className="text-xs text-muted-foreground">{cls.percentage}%</p>
              </div>
            ))}
          </div>

          {data.classes.map((cls) => (
            <div key={cls.class_value} className="space-y-2">
              <h4 className="text-sm font-semibold">
                Nutri-Score {cls.class_label} – Top-3 (nach Energie)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {cls.top.map((item) => (
                  <Link key={item.id} to={`/ingredients/${item.slug}`}
                    className="rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-sm font-medium text-primary">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.value?.toFixed(0) ?? '–'} kcal</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
