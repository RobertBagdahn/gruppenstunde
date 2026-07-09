/**
 * BreakfastItemCard.tsx
 * Card component for displaying breakfast items (ingredients/recipes) with owner info and actions.
 */
import React from 'react';
import { IngredientDetail, RecipeDetail } from '../../schemas/breakfast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface BreakfastItemCardProps {
  item: IngredientDetail | RecipeDetail;
  type: 'ingredient' | 'recipe';
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

export function BreakfastItemCard({
  item,
  type,
  onEdit,
  onDelete,
  onView,
}: BreakfastItemCardProps) {
  const isShared = item.visibility === 'shared' && item.shared_groups.length > 0;
  const isSystemItem = item.owner_id === null;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {type === 'ingredient' ? (item as IngredientDetail).name : (item as RecipeDetail).title}
          </h3>
          <p className="text-sm text-gray-600">
            {type === 'ingredient'
              ? (item as IngredientDetail).description
              : (item as RecipeDetail).description}
          </p>
        </div>
        {isShared && (
          <Badge variant="secondary" className="ml-2">
            👥 Geteilt
          </Badge>
        )}
        {isSystemItem && (
          <Badge variant="outline" className="ml-2">
            ✓ System
          </Badge>
        )}
      </div>

      {/* Owner info */}
      {item.owner_name && (
        <div className="text-xs text-gray-500 mb-2">
          von {item.owner_name}
          {isShared && item.shared_groups.length > 0 && (
            <span className="block mt-1">
              Geteilt mit: {item.shared_groups.map((g) => g.name).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Item-specific details */}
      {type === 'ingredient' && (
        <div className="text-sm text-gray-600 mb-3">
          {(item as IngredientDetail).energy_kcal && (
            <span>{(item as IngredientDetail).energy_kcal} kcal</span>
          )}
          {(item as IngredientDetail).portions.length > 0 && (
            <span className="ml-2">
              {(item as IngredientDetail).portions.length} Portionen
            </span>
          )}
        </div>
      )}

      {type === 'recipe' && (
        <div className="text-sm text-gray-600 mb-3">
          {(item as RecipeDetail).portions && (
            <span>{(item as RecipeDetail).portions} Portionen</span>
          )}
          {(item as RecipeDetail).cached_energy_kcal && (
            <span className="ml-2">{(item as RecipeDetail).cached_energy_kcal} kcal</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        {onView && (
          <Button size="sm" variant="outline" onClick={onView}>
            Details
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            Bearbeiten
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Löschen
          </Button>
        )}
      </div>
    </div>
  );
}
