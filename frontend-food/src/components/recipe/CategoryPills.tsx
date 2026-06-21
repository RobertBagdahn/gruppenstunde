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
}

export default function CategoryPills({ selected, onChange }: CategoryPillsProps) {
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

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onChange(new Set())}
        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
          allSelected
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border hover:bg-muted'
        }`}
      >
        Alle
      </button>
      {RECIPE_TYPES.map(({ value, label }) => {
        const active = selected.has(value);
        return (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
