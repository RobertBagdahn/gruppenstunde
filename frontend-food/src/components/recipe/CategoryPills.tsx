const RECIPE_TYPES = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'warm_meal', label: 'Warme Mahlzeit' },
  { value: 'cold_meal', label: 'Kalte Mahlzeit' },
  { value: 'dessert', label: 'Nachtisch' },
  { value: 'side_dish', label: 'Beilage' },
  { value: 'drink', label: 'Getränke' },
  { value: 'simple_meal', label: 'Einfach' },
];

interface CategoryPillsProps {
  selected: string | null;
  onChange: (value: string | null) => void;
}

export default function CategoryPills({ selected, onChange }: CategoryPillsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {RECIPE_TYPES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(selected === value ? null : value)}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
            selected === value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
          selected === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border hover:bg-muted'
        }`}
      >
        Alle
      </button>
    </div>
  );
}
