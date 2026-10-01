/**
 * NutriTagIndicator - Traffic light display of nutritional tags
 * Shows dangerous tags (allergens) as red, non-dangerous as green
 */

import type { RecipeDetail } from '@/schemas/recipe';

interface NutriTagIndicatorProps {
  recipe: RecipeDetail;
}

export default function NutriTagIndicator({ recipe }: NutriTagIndicatorProps) {
  if (!recipe.nutritional_tags || recipe.nutritional_tags.length === 0) {
    return (
      <div className="text-caption text-muted-foreground p-3 text-center border rounded-lg">
        Keine Ernährungstags
      </div>
    );
  }

  const dangerous = recipe.nutritional_tags.filter((tag) => tag.is_dangerous);
  const safe = recipe.nutritional_tags.filter((tag) => !tag.is_dangerous);

  return (
    <div className="space-y-2">
      {dangerous.length > 0 && (
        <div className="p-3 bg-danger-soft border border-danger-border rounded-lg">
          <p className="text-caption font-semibold text-danger mb-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-danger" />
            Allergenhinweise
          </p>
          <div className="flex flex-wrap gap-2">
            {dangerous.map((tag) => (
              <span
                key={tag.id}
                className="text-caption bg-danger-soft text-danger px-2 py-1 rounded-full font-medium"
                title={tag.description}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {safe.length > 0 && (
        <div className="p-3 bg-success-soft border border-success-border rounded-lg">
          <p className="text-caption font-semibold text-success mb-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-success" />
            Positive Merkmale
          </p>
          <div className="flex flex-wrap gap-2">
            {safe.map((tag) => (
              <span
                key={tag.id}
                className="text-caption bg-success-soft text-success px-2 py-1 rounded-full font-medium"
                title={tag.description}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
