import { Link } from 'react-router-dom';
import type { IngredientListItem } from '@/schemas/supply';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';

interface IngredientCardProps {
  ingredient: IngredientListItem;
  onDelete?: () => void;
}

export default function IngredientCard({ ingredient, onDelete }: IngredientCardProps) {
  const nutriColors = ingredient.nutri_class
    ? NUTRI_SCORE_COLORS[ingredient.nutri_class]
    : null;

  const formatPrice = (price: number | null) => {
    if (price === null) return null;
    return `${price.toFixed(2).replace('.', ',')} \u20AC/kg`;
  };

  return (
    <Link
      to={`/ingredients/${ingredient.slug}`}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border hover:border-primary/50 hover:shadow-md p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {ingredient.name}
        </h3>
        {nutriColors && (
          <span
            className={`${nutriColors.bg} ${nutriColors.text} text-xs font-bold px-2 py-0.5 rounded-md shrink-0`}
          >
            {nutriColors.label}
          </span>
        )}
      </div>

      {ingredient.retail_section_name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <span className="material-symbols-outlined text-[14px]">store</span>
          {ingredient.retail_section_name}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {ingredient.energy_kcal !== null && (
          <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
            <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
            {Math.round(ingredient.energy_kcal)} kcal
          </span>
        )}
        {ingredient.protein_g !== null && (
          <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
            {parseFloat(ingredient.protein_g.toFixed(1))}g Protein
          </span>
        )}
        {formatPrice(ingredient.price_per_kg) && (
          <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
            <span className="material-symbols-outlined text-[12px]">payments</span>
            {formatPrice(ingredient.price_per_kg)}
          </span>
        )}
      </div>

      {ingredient.status === 'draft' && (
        <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))] font-medium">
          Entwurf
        </span>
      )}

      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 right-3 text-destructive/60 hover:text-destructive rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Loeschen"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      )}
    </Link>
  );
}
