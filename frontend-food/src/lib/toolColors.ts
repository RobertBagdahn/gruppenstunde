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
  gradient: 'from-sky-500 to-cyan-600',
  bgSolid: 'bg-sky-600',
  textColor: 'text-sky-600',
  bgTint: 'bg-sky-50',
  borderColor: 'border-sky-200',
  ringColor: 'ring-sky-500/30',
  basePath: '/meal-plans',
};

export const TOOL_SHOPPING_LISTS: ToolConfig = {
  key: 'shopping-lists',
  label: 'Einkaufslisten',
  icon: 'shopping_cart',
  basePath: '/shopping-lists',
};
