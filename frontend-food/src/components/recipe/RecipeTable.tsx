import type { RecipeListItem } from '@/schemas/recipe';
import RecipeTableRow from './RecipeTableRow';
import type { NavigateFunction } from 'react-router-dom';

interface RecipeTableProps {
  recipes: RecipeListItem[];
  searchQuery?: string;
  navigate: NavigateFunction;
  onDelete: (id: number, title: string) => void;
  onClone: (id: number, title: string) => void;
}

export default function RecipeTable({ recipes, searchQuery, onDelete, onClone }: RecipeTableProps) {
  return (
    <div className="space-y-2">
      {recipes.map((recipe) => (
        <RecipeTableRow
          key={recipe.id}
          recipe={recipe}
          searchQuery={searchQuery}
          onDelete={recipe.can_delete ? () => onDelete(recipe.id, recipe.title) : undefined}
          onClone={() => onClone(recipe.id, recipe.title)}
        />
      ))}
    </div>
  );
}
