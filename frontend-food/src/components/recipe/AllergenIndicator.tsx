/**
 * AllergenIndicator - Traffic light display of allergens
 * Shows dangerous ingredients as red, others as green
 */

import type { RecipeDetail } from '@/schemas/recipe';

interface AllergenIndicatorProps {
  recipe: RecipeDetail;
}

export default function AllergenIndicator({ recipe }: AllergenIndicatorProps) {
  if (!recipe.nutritional_tags || recipe.nutritional_tags.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 text-center border rounded-lg">
        Keine Allergenhinweise
      </div>
    );
  }

  const dangerous = recipe.nutritional_tags.filter((tag) => tag.is_dangerous);
  const safe = recipe.nutritional_tags.filter((tag) => !tag.is_dangerous);

  return (
    <div className="space-y-2">
      {dangerous.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
            Allergenhinweise
          </p>
          <div className="flex flex-wrap gap-2">
            {dangerous.map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium"
                title={tag.description}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {safe.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
            Positive Merkmale
          </p>
          <div className="flex flex-wrap gap-2">
            {safe.map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium"
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
