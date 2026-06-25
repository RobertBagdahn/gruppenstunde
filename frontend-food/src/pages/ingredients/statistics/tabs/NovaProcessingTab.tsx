import { useSearchParams, Link } from 'react-router-dom';
import { useIngredientScores } from '@/api/supplies';
import TabFilters from '../components/TabFilters';

const NOVA_COLORS: Record<number, string> = {
  1: 'bg-green-600',
  2: 'bg-lime-500',
  3: 'bg-yellow-400',
  4: 'bg-red-600',
};

const NOVA_LABELS: Record<number, string> = {
  1: 'Unverarbeitet',
  2: 'Küchenzutat',
  3: 'Verarbeitet',
  4: 'Hochverarbeitet',
};

export default function NovaProcessingTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScores('nova', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Verteilung der NOVA-Verarbeitungsgrade (1–4) über alle verifizierten Zutaten.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {data.classes.map((cls) => (
              <div key={cls.class_value} className="flex-1 min-w-[100px] rounded-xl border border-border bg-card p-4 text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold text-white mb-2 ${NOVA_COLORS[cls.class_value] ?? 'bg-muted'}`}>
                  {cls.class_label}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{NOVA_LABELS[cls.class_value] ?? ''}</p>
                <p className="text-2xl font-bold font-display">{cls.count}</p>
                <p className="text-xs text-muted-foreground">{cls.percentage}%</p>
              </div>
            ))}
          </div>

          {data.classes.map((cls) => (
            <div key={cls.class_value} className="space-y-2">
              <h4 className="text-sm font-semibold">
                NOVA {cls.class_label} ({NOVA_LABELS[cls.class_value]}) – Top-3 (nach Energie)
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
