/**
 * Buffet role tags (content.Tag, group="buffet"), in display order.
 * Mirrors the seeded buffet role tags and their stable display order.
 */
export const BUFFET_ROLE_ORDER = [
  'buffet-bread',
  'buffet-fat',
  'buffet-savory',
  'buffet-sweet',
  'buffet-condiment',
  'buffet-fresh',
  'buffet-cereal',
  'buffet-drink',
  'buffet-dish',
  'buffet-cheese',
  'buffet-salty-snack',
  'buffet-sweet-snack',
  'buffet-nuts',
  'buffet-dip',
  'buffet-salad',
  'buffet-carb',
  'buffet-main',
  'buffet-soup',
  'buffet-topping',
] as const;

export type BuffetRoleSlug = (typeof BUFFET_ROLE_ORDER)[number];

export const BUFFET_ROLE_NAMES: Record<string, string> = {
  'buffet-bread': 'Brot & Gebäck',
  'buffet-fat': 'Streichfett',
  'buffet-savory': 'Belag herzhaft',
  'buffet-sweet': 'Belag süß',
  'buffet-condiment': 'Soßen & Würze',
  'buffet-fresh': 'Gemüse & Obst',
  'buffet-cereal': 'Müsli & Joghurt',
  'buffet-drink': 'Getränke',
  'buffet-dish': 'Gerichte',
  'buffet-cheese': 'Käse',
  'buffet-salty-snack': 'Knabbereien',
  'buffet-sweet-snack': 'Süßes & Kekse',
  'buffet-nuts': 'Nüsse & Trockenobst',
  'buffet-dip': 'Dips',
  'buffet-salad': 'Salate',
  'buffet-carb': 'Beilagen',
  'buffet-main': 'Hauptkomponente',
  'buffet-soup': 'Suppen & Eintöpfe',
  'buffet-topping': 'Toppings & Extras',
};

export function buffetRoleName(slug: string): string {
  return BUFFET_ROLE_NAMES[slug] ?? slug;
}

/**
 * Categorize a meal item by buffet role: its own `buffet_role` first
 * (set by the buffet builder), otherwise the first role tag present on
 * the ingredient/recipe, in role order. Returns null for items without
 * any buffet role.
 */
export function itemBuffetRole(item: { buffet_role?: string; ingredient_tags?: string[] }): BuffetRoleSlug | null {
  if (item.buffet_role && (BUFFET_ROLE_ORDER as readonly string[]).includes(item.buffet_role)) {
    return item.buffet_role as BuffetRoleSlug;
  }
  const tags = new Set(item.ingredient_tags ?? []);
  for (const role of BUFFET_ROLE_ORDER) {
    if (tags.has(role)) return role;
  }
  return null;
}
