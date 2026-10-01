import { BUFFET_ROLE_NAMES } from '@/lib/buffetRoles';

const BREAKFAST_ROLE_NAMES: Record<string, string> = {
  'breakfast-base': 'Frühstück: Basis',
  'breakfast-fat': 'Frühstück: Fett',
  'breakfast-topping': 'Frühstück: Belag',
  'breakfast-drink': 'Frühstück: Getränk',
};

/**
 * Readable name for a tag slug shown as a badge. Meal items carry tag slugs
 * (they double as logic keys for buffet and breakfast roles), so known roles get
 * their German name and any other slug is made presentable ("gluten-free" → "Gluten free").
 */
export function tagDisplayName(slug: string): string {
  const known = BUFFET_ROLE_NAMES[slug] ?? BREAKFAST_ROLE_NAMES[slug];
  if (known) return known;
  const words = slug.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
