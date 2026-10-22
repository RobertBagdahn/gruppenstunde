import { describe, expect, it } from 'vitest';
import { buildRecipeJsonLd, type RecipeJsonLdInput } from './buildRecipeJsonLd';

const base: RecipeJsonLdInput = {
  title: 'Chili sin Carne',
  summary: 'Kräftiges Chili für große Gruppen.',
  image_url: '/media/chili.jpg',
  portions: 8,
  cached_energy_per_portion_kcal: 412.4,
  recipe_items: [
    { ingredient_name: 'Kidneybohnen', quantity: 2, unit_label: 'Dose' },
    { ingredient_name: 'Paprika', quantity: 0.5, unit_label: 'kg' },
    { ingredient_name: '', quantity: 1, unit_label: 'Prise' },
  ] as RecipeJsonLdInput['recipe_items'],
  steps: [
    { instruction: 'Zwiebeln würfeln.', duration_minutes: 5 },
    { instruction: 'Alles köcheln lassen.', duration_minutes: 25 },
  ] as RecipeJsonLdInput['steps'],
};

const origin = 'https://food.example';

describe('buildRecipeJsonLd', () => {
  it('maps a complete recipe to schema.org Recipe with every visible value', () => {
    const json = buildRecipeJsonLd(base, origin, '/recipes/chili-sin-carne');
    expect(json).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Chili sin Carne',
      description: 'Kräftiges Chili für große Gruppen.',
      url: 'https://food.example/recipes/chili-sin-carne',
      image: 'https://food.example/media/chili.jpg',
      recipeYield: '8 Portionen',
      totalTime: 'PT30M',
      recipeIngredient: ['2 Dose Kidneybohnen', '0,5 kg Paprika'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Zwiebeln würfeln.' },
        { '@type': 'HowToStep', text: 'Alles köcheln lassen.' },
      ],
      nutrition: { '@type': 'NutritionInformation', calories: '412 kcal' },
    });
  });

  it('leaves out the image when the recipe has none', () => {
    const json = buildRecipeJsonLd({ ...base, image_url: null }, origin, '/recipes/x');
    expect(json).not.toHaveProperty('image');
  });

  it('leaves out nutrition and time when the values are missing', () => {
    const json = buildRecipeJsonLd(
      {
        ...base,
        cached_energy_per_portion_kcal: null,
        steps: [{ instruction: 'Kochen.', duration_minutes: null }] as RecipeJsonLdInput['steps'],
      },
      origin,
      '/recipes/x',
    );
    expect(json).not.toHaveProperty('nutrition');
    expect(json).not.toHaveProperty('totalTime');
  });

  it('serializes to valid JSON with the required fields', () => {
    const json = buildRecipeJsonLd(base, origin, '/recipes/x');
    const parsed = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
    expect(parsed['@type']).toBe('Recipe');
    expect(parsed.name).toBeTruthy();
  });
});
