import { BookOpen } from 'lucide-react';
import { useRecentlyUsedRecipes } from '@/api/mealPlans';
import RecipeBadge from './RecipeBadge';

export default function RecentlyUsedSection() {
  const { data } = useRecentlyUsedRecipes(5);
  const recipes = data?.recipes ?? [];

  if (recipes.length === 0) return null;

  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        Kürzlich verwendet
      </p>
      <div className="flex flex-wrap gap-1.5">
        {recipes.map((r) => {
          const price = r.price_per_serving != null
            ? `${r.price_per_serving.toFixed(2).replace('.', ',')} €`
            : '—';
          return (
            <button
              key={r.id}
              className="px-2.5 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors flex items-center gap-1.5"
            >
              <RecipeBadge badge={r.recipe_badge ?? 'community'} />
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{r.title}</span>
              <span className="text-xs text-muted-foreground">{price}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
