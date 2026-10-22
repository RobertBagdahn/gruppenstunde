import { describe, expect, it } from 'vitest';
import { recipeSticker } from './stickers';

const NOW = new Date('2026-10-21T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe('sticker sources (food-design-system)', () => {
  it('shows "Beliebt" for the first ten of the popular sort', () => {
    expect(recipeSticker({ inPopularTop: true, createdAt: daysAgo(1), preparationMethod: 'none', now: NOW })).toEqual({
      kind: 'beliebt',
      label: 'Beliebt',
    });
  });

  it('shows "Neu" up to 14 days after creation', () => {
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(14), now: NOW })?.kind).toBe('neu');
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(15), now: NOW })).toBeNull();
  });

  it('shows "Ohne Kochen" for raw and no-cook recipes', () => {
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(90), preparationMethod: 'none', now: NOW })?.label).toBe('Ohne Kochen');
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(90), preparationMethod: 'raw', now: NOW })?.label).toBe('Ohne Kochen');
  });

  it('uses the preparation method as label for baking, frying and grilling', () => {
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(90), preparationMethod: 'grilling', now: NOW })).toEqual({
      kind: 'zubereitung',
      label: 'Grillen',
    });
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(90), preparationMethod: 'baking', now: NOW })?.label).toBe('Backen');
  });

  it('gives no sticker for cooking or missing data', () => {
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(90), preparationMethod: 'cooking', now: NOW })).toBeNull();
    expect(recipeSticker({ inPopularTop: false, createdAt: null, preparationMethod: '', now: NOW })).toBeNull();
  });

  it('keeps the priority: popular beats new beats no-cook beats preparation', () => {
    expect(recipeSticker({ inPopularTop: true, createdAt: daysAgo(1), preparationMethod: 'raw', now: NOW })?.kind).toBe('beliebt');
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(1), preparationMethod: 'raw', now: NOW })?.kind).toBe('neu');
    expect(recipeSticker({ inPopularTop: false, createdAt: daysAgo(90), preparationMethod: 'raw', now: NOW })?.kind).toBe('ohne-kochen');
  });
});
