/**
 * Grouping of shopping list entries by retail section, shared by the screen and the export.
 */
import type { ShoppingListItem } from '@/schemas/shoppingList';

/** Heading of entries without retail section (free text); listed after all retail sections. */
export const OTHER_SECTION = 'Sonstiges';

/** Heading of consumable materials (paper plates, skewers ...); always listed last. */
export const MATERIAL_SECTION = 'Verbrauchsmaterial';

function sectionOf(item: ShoppingListItem): string {
  return item.is_material ? MATERIAL_SECTION : item.retail_section_name || OTHER_SECTION;
}

export function groupBySection(
  items: ShoppingListItem[],
): Record<string, ShoppingListItem[]> {
  const groups: Record<string, ShoppingListItem[]> = {};

  // Preserve the server's retail-section order and sort only within sections.
  const sorted = [...items].sort((a, b) => {
    if (sectionOf(a) !== sectionOf(b)) return 0;
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  for (const item of sorted) {
    const section = sectionOf(item);
    if (!groups[section]) groups[section] = [];
    groups[section].push(item);
  }

  // Free-text entries have no section and would otherwise come first, headless;
  // consumable materials form the final block.
  const { [OTHER_SECTION]: other, [MATERIAL_SECTION]: materials, ...sections } = groups;
  return {
    ...sections,
    ...(other ? { [OTHER_SECTION]: other } : {}),
    ...(materials ? { [MATERIAL_SECTION]: materials } : {}),
  };
}
