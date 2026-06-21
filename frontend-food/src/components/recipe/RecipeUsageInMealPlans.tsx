import { CalendarDays } from 'lucide-react';

interface RecipeUsageInMealPlansProps {
  count: number;
}

export default function RecipeUsageInMealPlans({ count }: RecipeUsageInMealPlansProps) {
  if (count <= 0) return null;

  return (
    <div className="mt-6 bg-card rounded-xl border p-4 flex items-center gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
        <CalendarDays className="w-4 h-4 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">
        In{' '}
        <span className="font-semibold text-foreground">
          {count} {count === 1 ? 'Essensplan' : 'Essensplänen'}
        </span>{' '}
        verwendet
      </p>
    </div>
  );
}
