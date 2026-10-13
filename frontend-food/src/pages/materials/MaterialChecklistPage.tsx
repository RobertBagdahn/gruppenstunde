/**
 * MaterialChecklistPage — unsaved material list of a recipe, a meal plan or a
 * shopping list (query: ?recipe=ID&servings=N, ?meal-plan=ID, ?shopping-list=ID).
 *
 * Ticking off is stored only in this browser (localStorage), never on the server.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCopy, Printer } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useMaterialList, type MaterialListSource } from '@/api/materials';
import { BackButton } from '@/components/shared/BackButton';
import HeroBand from '@/components/shared/HeroBand';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildMaterialListText, formatEuro, formatMaterialAmount } from '@/lib/materialAmount';
import type { MaterialListEntry } from '@/schemas/supply';

function sourceFromParams(params: URLSearchParams): MaterialListSource | null {
  const recipe = Number(params.get('recipe'));
  if (recipe > 0) {
    const servings = Number(params.get('servings'));
    return { kind: 'recipe', id: recipe, servings: servings > 0 ? servings : 1 };
  }
  const plan = Number(params.get('meal-plan'));
  if (plan > 0) return { kind: 'meal-plan', id: plan };
  const list = Number(params.get('shopping-list'));
  if (list > 0) return { kind: 'shopping-list', id: list };
  return null;
}

function storageKey(source: MaterialListSource): string {
  const servings = source.kind === 'recipe' ? `:${source.servings}` : '';
  return `material-list-checked:${source.kind}:${source.id}${servings}`;
}

function loadChecked(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === 'number') : [];
  } catch {
    return [];
  }
}

function saveChecked(key: string, ids: number[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage can be unavailable (private window); the list still works without persistence.
  }
}

function backTarget(source: MaterialListSource | null): string {
  switch (source?.kind) {
    case 'meal-plan':
      return `/meal-plans/${source.id}`;
    case 'shopping-list':
      return `/shopping-lists/${source.id}`;
    default:
      return '/recipes';
  }
}

function Group({
  title,
  entries,
  checked,
  onToggle,
}: {
  title: string;
  entries: MaterialListEntry[];
  checked: ReadonlySet<number>;
  onToggle: (materialId: number) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="bg-card rounded-xl p-4 sm:p-5 shadow-card print:shadow-none print:break-inside-avoid">
      <h2 className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      <ul className="divide-y divide-border/40">
        {entries.map((entry) => {
          const isChecked = checked.has(entry.material_id);
          const amount = formatMaterialAmount(entry.amount, entry.is_consumable);
          return (
            <li key={entry.material_id} className="py-2.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  checked={isChecked}
                  onChange={() => onToggle(entry.material_id)}
                  aria-label={`${entry.name} abhaken`}
                />
                <span className="flex-1 min-w-0">
                  <span className={cn('flex items-baseline justify-between gap-3', isChecked && 'opacity-50 line-through')}>
                    <Link
                      to={`/material/${entry.slug}`}
                      className="text-body font-medium hover:underline underline-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entry.name}
                    </Link>
                    {amount && <span className="text-body tabular-nums">{amount}</span>}
                  </span>
                  {entry.recipes.length > 0 && (
                    <span className="block text-caption text-muted-foreground">
                      für {entry.recipes.map((recipe) => recipe.title).join(', ')}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function MaterialChecklistPage() {
  const [params] = useSearchParams();
  const source = useMemo(() => sourceFromParams(params), [params]);
  const { data, isPending, error, refetch } = useMaterialList(source);
  const key = source ? storageKey(source) : '';
  const [checkedIds, setCheckedIds] = useState<number[]>([]);

  useEffect(() => {
    setCheckedIds(key ? loadChecked(key) : []);
  }, [key]);

  const toggle = useCallback(
    (materialId: number) => {
      setCheckedIds((prev) => {
        const next = prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId];
        if (key) saveChecked(key, next);
        return next;
      });
    },
    [key],
  );

  const checked = useMemo(() => new Set(checkedIds), [checkedIds]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildMaterialListText(data));
      notify.success('Materialliste kopiert');
    } catch {
      notify.error('Materialliste konnte nicht kopiert werden');
    }
  };

  if (source === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState
          icon="inventory_2"
          title="Keine Materialliste ausgewählt"
          description="Öffne die Materialliste über ein Rezept, einen Essensplan oder eine Einkaufsliste."
          ctaLabel="Zu den Rezepten"
          ctaHref="/recipes"
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      </div>
    );
  }
  if (isPending || !data) return <PageSkeleton />;

  const isEmpty = data.devices.length === 0 && data.consumables.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <HeroBand pullUpClassName="-mt-8" innerClassName="max-w-2xl" className="mb-6 print:hidden">
        <BackButton to={backTarget(source)} tone="hero" className="mb-5" />
        <h1 className="font-display text-display font-extrabold text-hero-foreground [overflow-wrap:anywhere]">
          Materialliste
        </h1>
        <p className="mt-2 text-body text-hero-muted">
          {data.title}
          {source.kind === 'recipe' ? ` · ${source.servings} ${source.servings === 1 ? 'Portion' : 'Portionen'}` : ''}
        </p>
      </HeroBand>
      <h1 className="hidden print:block text-title font-bold mb-4">Materialliste: {data.title}</h1>

      {isEmpty ? (
        <EmptyState
          icon="inventory_2"
          title="Kein Material nötig"
          description="Für diese Rezepte ist kein Material hinterlegt."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={handleCopy} data-testid="material-list-copy">
              <ClipboardCopy className="w-4 h-4 mr-1.5" />
              Kopieren
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()} data-testid="material-list-print">
              <Printer className="w-4 h-4 mr-1.5" />
              Drucken / PDF
            </Button>
          </div>
          <Group title="Benötigte Geräte" entries={data.devices} checked={checked} onToggle={toggle} />
          <Group title="Verbrauchsmaterial" entries={data.consumables} checked={checked} onToggle={toggle} />
          {data.total_cost > 0 && (
            <p className="text-body text-muted-foreground text-right">
              Verbrauchsmaterial ca. <span className="font-semibold text-foreground">{formatEuro(data.total_cost)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
