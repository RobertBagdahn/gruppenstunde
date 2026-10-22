/**
 * Sticker sources (food-design-system: "Sticker-Quellen aus vorhandenen Feldern").
 * Priority: beliebt > neu > ohne Kochen > Zubereitungsart. Kochen gives no sticker.
 * Only existing fields are used; nothing is invented for decoration.
 */

export const POPULAR_TOP_N = 10;
export const NEW_WINDOW_DAYS = 14;

export type StickerKind = 'beliebt' | 'neu' | 'ohne-kochen' | 'zubereitung';

export interface StickerInput {
  /** Recipe is among the first ten of the existing sort "Meistgesehen". */
  inPopularTop: boolean;
  /** ISO timestamp of `created_at`. */
  createdAt?: string | null;
  /** `preparation_method`: cooking, baking, frying, grilling, raw, none, or blank. */
  preparationMethod?: string | null;
  /** Reference time, injectable for tests. */
  now?: Date;
}

const PREPARATION_LABEL: Record<string, string> = {
  baking: 'Backen',
  frying: 'Braten',
  grilling: 'Grillen',
};

export interface Sticker {
  kind: StickerKind;
  label: string;
}

export function recipeSticker(input: StickerInput): Sticker | null {
  if (input.inPopularTop) return { kind: 'beliebt', label: 'Beliebt' };

  const now = input.now ?? new Date();
  if (input.createdAt) {
    const created = new Date(input.createdAt);
    const ageDays = (now.getTime() - created.getTime()) / 86_400_000;
    if (ageDays >= 0 && ageDays <= NEW_WINDOW_DAYS) return { kind: 'neu', label: 'Neu' };
  }

  const method = input.preparationMethod ?? '';
  if (method === 'none' || method === 'raw') return { kind: 'ohne-kochen', label: 'Ohne Kochen' };
  const label = PREPARATION_LABEL[method];
  if (label) return { kind: 'zubereitung', label };

  return null;
}
