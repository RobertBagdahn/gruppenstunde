import { Link } from 'react-router-dom';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import type { IngredientListItem } from '@/schemas/supply';
import { formatEuro } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

interface IngredientTableRowProps {
  ingredient: IngredientListItem;
  onDelete?: () => void;
}

/** One row of the ingredient table: name, Nutri-Score, kcal per 100 g and price per kg. */
export default function IngredientTableRow({ ingredient, onDelete }: IngredientTableRowProps) {
  const kcalLabel = ingredient.energy_kcal !== null ? `${Math.round(ingredient.energy_kcal)} kcal` : '—';
  const priceLabel = ingredient.price_per_kg !== null ? `${formatEuro(ingredient.price_per_kg)} / kg` : '—';

  return (
    <div className="flex items-center gap-2 rounded-xl bg-card shadow-card px-3 md:px-5 py-2 md:py-3 transition-shadow">
      <Link
        to={`/ingredients/${ingredient.slug}`}
        className="group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg py-1"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-emphasis text-foreground line-clamp-2 group-hover:text-primary-dark transition-colors">
              {ingredient.name}
            </span>
            {ingredient.status === 'draft' && (
              <span className="inline-block rounded-full border border-warning-border bg-warning-soft px-2 py-0.5 text-caption font-medium text-warning">
                Entwurf
              </span>
            )}
          </div>
          {ingredient.retail_section_name && (
            <div className="flex items-center gap-1 text-caption text-muted-foreground">
              <Icon name="store" size={16} />
              <span className="truncate">{ingredient.retail_section_name}</span>
            </div>
          )}
          {/* Mobile: the figures move under the name, the table columns are md and up. */}
          <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground tabular-nums md:hidden">
            <NutriScoreBadge value={ingredient.nutri_class} size="sm" emptyLabel="—" />
            <span>{kcalLabel}</span>
            <span>{priceLabel}</span>
          </div>
        </div>
        <span className="hidden md:flex w-20 shrink-0 justify-center">
          <NutriScoreBadge value={ingredient.nutri_class} size="sm" emptyLabel="—" />
        </span>
        <span className="hidden md:block w-28 shrink-0 text-right text-body font-semibold text-foreground tabular-nums">
          {kcalLabel}
        </span>
        <span className="hidden md:block w-28 shrink-0 text-right text-body font-semibold text-foreground tabular-nums">
          {priceLabel}
        </span>
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          title="Zutat löschen"
          aria-label={`Zutat löschen: ${ingredient.name}`}
        >
          <Icon name="delete" size={20} />
        </button>
      )}
    </div>
  );
}
