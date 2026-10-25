import { useSearchParams, Link } from 'react-router-dom';
import { useIngredientScores } from '@/api/supplies';
import TabFilters from '../components/TabFilters';
import { formatNumber } from '@/lib/format';

/** Status dots only (bright token); the class circle itself stays neutral petrol. */
const NOVA_DOT_COLORS: Record<number, string> = {
  1: 'bg-success-bright',
  2: 'bg-success-bright',
  3: 'bg-warning-bright',
  4: 'bg-danger-bright',
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
      <p className="text-body text-muted-foreground">
        Verteilung der NOVA-Verarbeitungsgrade (1–4) über alle verifizierten Zutaten.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 skeleton-shimmer rounded-xl" />
      ) : data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {data.classes.map((cls) => (
              <div key={cls.class_value} className="flex-1 min-w-[100px] rounded-xl bg-card p-4 text-center shadow-card">
                <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary-soft-border bg-primary-soft text-section font-bold font-display text-primary-dark mb-2">
                  {cls.class_label}
                </div>
                <p className="flex items-center justify-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-primary-dark mb-1">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${NOVA_DOT_COLORS[cls.class_value] ?? 'bg-muted'}`} />
                  {NOVA_LABELS[cls.class_value] ?? ''}
                </p>
                <p className="text-title font-bold font-display">{cls.count}</p>
                <p className="text-caption text-muted-foreground">{cls.percentage}%</p>
              </div>
            ))}
          </div>

          {data.classes.map((cls) => (
            <div key={cls.class_value} className="space-y-2">
              <h4 className="text-body font-semibold">
                NOVA {cls.class_label} ({NOVA_LABELS[cls.class_value]}) – Top-3 (nach Energie)
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
