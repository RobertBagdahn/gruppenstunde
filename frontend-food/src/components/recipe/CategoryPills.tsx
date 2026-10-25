import { RECIPE_DOT_CLASSES, recipeTint } from '@/lib/recipeTypeStyle';
import { cn } from '@/lib/utils';

export const RECIPE_TYPES = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'warm_meal', label: 'Warme Mahlzeit' },
  { value: 'cold_meal', label: 'Kalte Mahlzeit' },
  { value: 'dessert', label: 'Nachtisch' },
  { value: 'recipe_part', label: 'Rezeptteil' },
  { value: 'drink', label: 'Getränke' },
  { value: 'snack', label: 'Snack' },
  { value: 'ingredient', label: 'Zutat' },
] as const;

export type RecipeTypeValue = typeof RECIPE_TYPES[number]['value'];

export const RECIPE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RECIPE_TYPES.map(({ value, label }) => [value, label]),
);

interface CategoryPillsProps {
  selected: Set<string>;
  onChange: (value: Set<string>) => void;
  showAll?: boolean;
}

/**
 * Filter chip row (food-colorful-detail): white chips with a thin border, a colour dot per
 * recipe type, and the active chip marked by border and text in Petrol, never a filled surface.
 */
export default function CategoryPills({ selected, onChange, showAll = true }: CategoryPillsProps) {
  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  };

  const allSelected = selected.size === 0;

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 h-11 md:h-9 text-caption font-medium transition-colors',
      active ? 'border-primary text-primary-dark font-semibold' : 'border-border text-muted-foreground hover:border-primary-soft-border',
    );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {showAll && (
        <button
          type="button"
          aria-pressed={allSelected}
          onClick={() => onChange(new Set())}
          className={chipClass(allSelected)}
        >
          Alle
        </button>
      )}
      {RECIPE_TYPES.map(({ value, label }) => {
        const active = selected.has(value);
        const tint = recipeTint(value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(value)}
            className={chipClass(active)}
          >
            {tint && <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', RECIPE_DOT_CLASSES[tint])} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
