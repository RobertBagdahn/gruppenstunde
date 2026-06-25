/**
 * Tool color configuration for the Food app navigation.
 */

export interface ToolConfig {
  key: string;
  label: string;
  tagline?: string;
  icon: string;
  gradient?: string;
  bgSolid?: string;
  textColor?: string;
  bgTint?: string;
  borderColor?: string;
  ringColor?: string;
  basePath: string;
  mascotImg?: string;
}

export const TOOL_RECIPES: ToolConfig = {
  key: 'recipes',
  label: 'Rezepte',
  icon: 'menu_book',
  basePath: '/recipes',
};

export const TOOL_INGREDIENTS: ToolConfig = {
  key: 'ingredients',
  label: 'Zutaten',
  icon: 'egg',
  basePath: '/ingredients',
};

export const TOOL_MEAL_PLAN: ToolConfig = {
  key: 'meal-plan',
  label: 'Essensplan',
  icon: 'restaurant_menu',
  gradient: 'from-primary to-primary/90',
  bgSolid: 'bg-primary',
  textColor: 'text-primary',
  bgTint: 'bg-primary/5',
  borderColor: 'border-primary/20',
  ringColor: 'ring-primary/30',
  basePath: '/meal-plans',
};

export const TOOL_SHOPPING_LISTS: ToolConfig = {
  key: 'shopping-lists',
  label: 'Einkaufslisten',
  icon: 'shopping_cart',
  basePath: '/shopping-lists',
};

export const TOOL_INGREDIENT_STATISTICS: ToolConfig = {
  key: 'ingredient-statistics',
  label: 'Statistiken',
  icon: 'analytics',
  basePath: '/ingredients/statistics',
};
