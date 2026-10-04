import { useSearchParams, Link } from 'react-router-dom';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import { useIngredientScores } from '@/api/supplies';
import TabFilters from '../components/TabFilters';
import { formatNumber } from '@/lib/format';


export default function NutriLandscapeTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScores('nutri_score', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-body text-muted-foreground">
        Verteilung der Nutri-Score-Klassen (A–E) über alle verifizierten Zutaten.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {data.classes.map((cls) => (
              <div key={cls.class_value} className="flex-1 min-w-[100px] rounded-xl bg-card shadow-card p-4 text-center">
                <NutriScoreBadge value={cls.class_value} size="md" className="mb-2 h-10 w-10 text-section" />
                <p className="text-title font-bold font-display">{cls.count}</p>
                <p className="text-caption text-muted-foreground">{cls.percentage}%</p>
              </div>
            ))}
          </div>

          {data.classes.map((cls) => (
            <div key={cls.class_value} className="space-y-2">
              <h4 className="text-body font-semibold">
                Nutri-Score {cls.class_label} – Top-3 (nach Energie)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {cls.top.map((item) => (
                  <Link key={item.id} to={`/ingredients/${item.slug}`}
                    className="rounded-xl border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-body font-medium text-primary">{item.name}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">{formatNumber(item.value, { maxDecimals: 0 }) ?? '–'} kcal</p>
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
