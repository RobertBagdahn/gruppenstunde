import { useIngredientImpact } from '@/api/dataQuality';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ImpactBadgeProps {
  slug: string;
}

export default function ImpactBadge({ slug }: ImpactBadgeProps) {
  const { data: impact, isLoading } = useIngredientImpact(slug);

  if (isLoading || !impact) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {impact.recipe_count > 0 ? (
        <Link
          to={`/recipes?ingredient_slug=${slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 hover:bg-muted/80 transition-colors"
        >
          Wird in {impact.recipe_count} Rezept{impact.recipe_count !== 1 ? 'en' : ''} verwendet
          <ExternalLink className="h-3 w-3" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5">
          Wird in keinen Rezepten verwendet
        </span>
      )}
      {impact.meal_plan_count > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5">
          In {impact.meal_plan_count} Speiseplän{impact.meal_plan_count !== 1 ? 'en' : ''}
        </span>
      )}
    </div>
  );
}
