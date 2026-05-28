import { Link } from 'react-router-dom';
import type { IngredientListItem } from '@/schemas/ingredient';
import { NUTRI_SCORE_COLORS } from '@/schemas/ingredient';

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
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-amber-500/40 hover:shadow-colorful p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-amber-700 transition-colors">
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
        {ingredient.energy_kj !== null && (
          <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
            <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
            {ingredient.energy_kj} kJ
          </span>
        )}
        {ingredient.protein_g !== null && (
          <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
            {ingredient.protein_g}g Protein
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
        <span className="mt-2 inline-block text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
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
