/**
 * MaterialChecklistPage — unsaved material list of a recipe, a meal plan or a
 * shopping list (query: ?recipe=ID&servings=N, ?meal-plan=ID, ?shopping-list=ID).
 *
 * Ticking off is stored only in this browser (localStorage), never on the server.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCopy, Printer } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useMaterialList, type MaterialListSource } from '@/api/materials';
import DetailHeader from '@/components/shared/DetailHeader';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
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

function backTarget(source: MaterialListSource | null): { to: string; label: string } {
  switch (source?.kind) {
    case 'meal-plan':
      return { to: `/meal-plans/${source.id}`, label: 'Essensplan' };
    case 'shopping-list':
      return { to: `/shopping-lists/${source.id}`, label: 'Einkaufsliste' };
    default:
      return { to: '/recipes', label: 'Rezepte' };
  }
}

/** Section of the checklist: icon plaque and group title, rows divided by hairlines. */
function Group({
  title,
  icon,
  entries,
  checked,
  onToggle,
}: {
  title: string;
  icon: string;
  entries: MaterialListEntry[];
  checked: ReadonlySet<number>;
  onToggle: (materialId: number) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="rounded-xl bg-card p-4 shadow-card sm:p-5 print:break-inside-avoid print:shadow-none">
      <h2 className="mb-2 flex items-center gap-3 text-body font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name={icon} size={20} />
        </span>
        {title}
      </h2>
      <ul className="divide-y divide-border">
        {entries.map((entry) => {
          const isChecked = checked.has(entry.material_id);
          const amount = formatMaterialAmount(entry.amount, entry.is_consumable);
          return (
            <li key={entry.material_id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-primary"
                  checked={isChecked}
                  onChange={() => onToggle(entry.material_id)}
                  aria-label={`${entry.name} abhaken`}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('flex items-center justify-between gap-3', isChecked && 'opacity-50 line-through')}>
                    <Link
                      to={`/material/${entry.slug}`}
                      className="text-emphasis font-semibold text-foreground [overflow-wrap:anywhere] hover:text-primary-dark"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entry.name}
                    </Link>
                    {amount && (
                      <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary-dark tabular-nums">
                        {amount}
                      </span>
                    )}
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

/** Progress of the ticked items: big count, petrol bar on the muted track. */
function Progress({ checked, total }: { checked: number; total: number }) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  return (
    <section className="space-y-3 rounded-xl bg-card p-4 shadow-card sm:p-5 print:hidden" aria-label="Fortschritt">
      <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Fortschritt</p>
      <p className="font-display text-metric font-extrabold tabular-nums">
        {checked}
        <span className="text-emphasis font-medium text-muted-foreground"> von {total} erledigt</span>
      </p>
      <div
        role="progressbar"
        aria-label="Erledigte Materialien"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={checked}
        className="h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      </div>
    );
  }
  if (isPending || !data) return <PageSkeleton />;

  const isEmpty = data.devices.length === 0 && data.consumables.length === 0;
  const entries = [...data.devices, ...data.consumables];
  const checkedCount = entries.filter((entry) => checked.has(entry.material_id)).length;
  const back = backTarget(source);
  const description: ReactNode = (
    <>
      {data.title}
      {source.kind === 'recipe' ? ` · ${source.servings} ${source.servings === 1 ? 'Portion' : 'Portionen'}` : ''}
    </>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-8">
      <DetailHeader title="Materialliste" back={back} description={description} />
      <p className="hidden print:block text-title font-bold mb-4">Materialliste: {data.title}</p>

      {isEmpty ? (
        <EmptyState
          icon="inventory_2"
          title="Kein Material nötig"
          description="Für diese Rezepte ist kein Material hinterlegt."
        />
      ) : (
        <div className="space-y-4">
          <Progress checked={checkedCount} total={entries.length} />
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="secondary" onClick={handleCopy} data-testid="material-list-copy">
              <ClipboardCopy className="w-4 h-4 mr-1.5" />
              Kopieren
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.print()} data-testid="material-list-print">
              <Printer className="w-4 h-4 mr-1.5" />
              Drucken / PDF
            </Button>
          </div>
          <Group title="Benötigte Geräte" icon="restaurant" entries={data.devices} checked={checked} onToggle={toggle} />
          <Group
            title="Verbrauchsmaterial"
            icon="inventory_2"
            entries={data.consumables}
            checked={checked}
            onToggle={toggle}
          />
          {data.total_cost > 0 && (
            <p className="text-right text-body text-muted-foreground">
              Verbrauchsmaterial ca.{' '}
              <span className="font-semibold text-foreground tabular-nums">{formatEuro(data.total_cost)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
