/**
 * Staff lists for unusual ingredient amounts (recipe-quantity-outlier-checks):
 * recipe lines far above the usual amount, undivided lines, unconfirmed 150 g
 * piece portions and ingredient alias conflicts. Reports only — fixes happen
 * in the recipe or ingredient, merges via the existing merge dialog.
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { AlertTriangle, EyeOff, GitMerge } from 'lucide-react';
import {
  useAliasConflicts,
  useDismissDuplicate,
  useRecipeQuantityOutliers,
  useRecipeUndividedLines,
  useSuspiciousPortions,
} from '@/api/dataQuality';
import type { AliasConflict, RecipeQuantityOutlier, SuspiciousPortion } from '@/schemas/dataQuality';
import ErrorDisplay from '@/components/ErrorDisplay';
import IngredientMergeDialog from '@/components/ingredients/IngredientMergeDialog';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import { formatNumber, formatWeight } from '@/lib/format';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

interface Page<T> {
  items: T[];
  total: number;
}

function PagedList<T>({
  query,
  emptyText,
  intro,
  renderItem,
}: {
  query: UseInfiniteQueryResult<InfiniteData<Page<T>>>;
  emptyText: string;
  intro: ReactNode;
  renderItem: (item: T) => ReactNode;
}) {
  if (query.isPending) return <SkeletonTableRows rows={5} columns={3} label="Einträge werden geladen" />;
  if (query.isError) {
    return <ErrorDisplay variant="inline" error={query.error} title="Daten konnten nicht geladen werden" onRetry={() => query.refetch()} />;
  }
  const items = query.data.pages.flatMap((page) => page.items);
  const total = query.data.pages[0]?.total ?? 0;
  return (
    <div className="space-y-3">
      <p className="text-body text-muted-foreground">{intro}</p>
      {items.length === 0 ? (
        <p className="py-4 text-body text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <p className="text-caption text-muted-foreground">
            {formatNumber(items.length)} von {formatNumber(total)}
          </p>
          <ul className="space-y-2">{items.map(renderItem)}</ul>
          {query.hasNextPage && (
            <button
              type="button"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="h-10 w-full rounded-lg bg-primary-soft text-body font-medium text-primary disabled:opacity-50"
            >
              Mehr laden
            </button>
          )}
        </>
      )}
    </div>
  );
}

function OutlierRow({ row }: { row: RecipeQuantityOutlier }) {
  const danger = row.outlier.severity === 'danger';
  return (
    <li
      className={cn(
        'rounded-xl border p-4',
        danger ? 'border-danger-border bg-danger-soft/30' : 'border-warning-border bg-warning-soft/30',
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link to={`/recipes/${row.recipe_slug}`} className="text-body font-medium hover:text-primary">
            {row.recipe_title}
          </Link>
          <p className="text-body">
            {row.ingredient_name}: {formatNumber(row.quantity, { maxDecimals: 3 })} {row.unit_label}
          </p>
          <p className={cn('flex items-start gap-1 text-caption', danger ? 'text-danger' : 'text-warning')}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {row.outlier.message}
          </p>
        </div>
        {row.outlier.sample_count > 0 && (
          <span className="shrink-0 text-caption text-muted-foreground">
            Vergleich: {formatNumber(row.outlier.sample_count)} Rezepte
          </span>
        )}
      </div>
    </li>
  );
}

export function QuantityOutlierList() {
  const [severity, setSeverity] = useState<'warning' | 'danger' | undefined>(undefined);
  const query = useRecipeQuantityOutliers(severity);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stufe">
        {(
          [
            [undefined, 'Alle'],
            ['danger', 'Stark'],
            ['warning', 'Auffällig'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={severity === value}
            onClick={() => setSeverity(value)}
            className={cn(
              'h-9 rounded-lg px-3 text-body font-medium',
              severity === value ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <PagedList
        query={query}
        intro="Rezeptzeilen mit deutlich mehr Gramm pro Person als in anderen Rezepten mit dieser Zutat (ab dem Dreifachen des Üblichen)."
        emptyText="Keine auffälligen Mengen gefunden."
        renderItem={(row) => <OutlierRow key={row.recipe_item_id} row={row} />}
      />
    </div>
  );
}

export function UndividedLineList() {
  return (
    <PagedList
      query={useRecipeUndividedLines()}
      intro="Zeilen, die beim Umrechnen auf eine Person vermutlich nicht geteilt wurden (z. B. „2 Zwiebeln“ zwischen lauter Bruchteilen)."
      emptyText="Keine ungeteilten Zeilen gefunden."
      renderItem={(row) => <OutlierRow key={row.recipe_item_id} row={row} />}
    />
  );
}

export function SuspiciousPortionList() {
  return (
    <PagedList
      query={useSuspiciousPortions()}
      intro="Stück-Portionen mit dem Import-Standardgewicht von 150 g, die nie bestätigt wurden und in Rezepten oder Plänen verwendet werden."
      emptyText="Keine verdächtigen Stückgewichte."
      renderItem={(row: SuspiciousPortion) => (
        <li key={row.portion_id} className="rounded-xl border border-warning-border bg-warning-soft/30 p-4">
          <Link to={`/ingredients/${row.ingredient_slug}`} className="text-body font-medium hover:text-primary">
            {row.ingredient_name}
          </Link>
          <p className="text-body">
            „{row.portion_name}“ = {formatWeight(row.weight_g)}
            {row.weight_status ? ` · ${row.weight_status}` : ''}
          </p>
          <p className="text-caption text-muted-foreground">
            {formatNumber(row.recipe_count)} Rezepte · {formatNumber(row.meal_item_count)} Plan-Einträge
          </p>
        </li>
      )}
    />
  );
}

export function AliasConflictList() {
  const query = useAliasConflicts();
  const dismiss = useDismissDuplicate();
  const [merging, setMerging] = useState<AliasConflict | null>(null);

  const handleDismiss = (row: AliasConflict) => {
    dismiss.mutate(
      { ingredient_a_id: row.ingredient_id, ingredient_b_id: row.conflicting_ingredient_id },
      {
        onSuccess: () => notify.success('Als kein Duplikat markiert'),
        onError: (error) => notify.error('Markierung konnte nicht gespeichert werden', { error }),
      },
    );
  };

  return (
    <>
      <PagedList
        query={query}
        intro="Zutaten, deren Name ein Alias einer anderen Zutat ist, oder zwei Zutaten mit demselben Alias. Meist sind das Duplikate (z. B. „Zwiebel“ und „Speisezwiebel“)."
        emptyText="Keine Alias-Konflikte."
        renderItem={(row: AliasConflict) => (
          <li
            key={`${row.ingredient_id}-${row.conflicting_ingredient_id}`}
            className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-body">
              <p>
                <Link to={`/ingredients/${row.ingredient_slug}`} className="font-medium hover:text-primary">
                  {row.ingredient_name}
                </Link>{' '}
                <span className="text-caption text-muted-foreground">({formatNumber(row.ingredient_usage)}×)</span>
                {' ↔ '}
                <Link to={`/ingredients/${row.conflicting_ingredient_slug}`} className="font-medium hover:text-primary">
                  {row.conflicting_ingredient_name}
                </Link>{' '}
                <span className="text-caption text-muted-foreground">
                  ({formatNumber(row.conflicting_ingredient_usage)}×)
                </span>
              </p>
              <p className="text-caption text-muted-foreground">
                {row.kind === 'name_is_alias' ? 'Name ist Alias der anderen Zutat' : 'Gleicher Alias'}: „{row.alias}“
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setMerging(row)}
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 text-body font-medium text-primary-foreground"
              >
                <GitMerge className="h-4 w-4" />
                Zusammenführen
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(row)}
                disabled={dismiss.isPending}
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-soft px-3 text-body font-medium text-primary disabled:opacity-50"
              >
                <EyeOff className="h-4 w-4" />
                Kein Duplikat
              </button>
            </div>
          </li>
        )}
      />
      {merging && (
        <IngredientMergeDialog
          open
          onOpenChange={(open) => !open && setMerging(null)}
          currentIngredient={{
            id: merging.conflicting_ingredient_id,
            name: merging.conflicting_ingredient_name,
            slug: merging.conflicting_ingredient_slug,
          }}
          preSelectedTarget={{ id: merging.ingredient_id, name: merging.ingredient_name, slug: merging.ingredient_slug }}
          onMergeComplete={() => setMerging(null)}
        />
      )}
    </>
  );
}
