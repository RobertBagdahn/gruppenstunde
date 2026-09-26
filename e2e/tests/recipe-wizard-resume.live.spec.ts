import { test, expect } from '../fixtures/food';

test.describe('Recipe wizard draft resume', () => {
  test('creates a draft from AI text, resumes it after a reload and finishes it', async ({ foodPage, resources, uniqueName }) => {
    const title = uniqueName('E2E Wizard Entwurf');
    // Intercept only the AI analysis; the draft itself is created by the live API.
    await foodPage.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({ json: {
      rows: [],
      sources: [],
      ai_interaction_id: null,
      is_reconstructed: false,
      recipe_draft: {
        title, description: '', summary: '', servings: 4,
        preparation_time: null, execution_time: null, recipe_type: 'warm_meal', difficulty: 'easy',
        execution_time_choice: 'less_30', preparation_time_choice: 'none', scout_level_ids: [], tag_ids: [],
        steps: ['Alles verrühren.'], source_url: '', image_url: '',
      },
    } }));

    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill(title);
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();

    await expect(foodPage.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
    await expect(foodPage).toHaveURL(/[?&]step=ingredients/);
    const draftId = Number(new URL(foodPage.url()).searchParams.get('draft'));
    expect(draftId).toBeGreaterThan(0);
    resources.track({ kind: 'recipe', id: draftId });

    await foodPage.reload();
    await expect(foodPage.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
    await expect(foodPage.getByTestId('recipe-source-servings')).toContainText('Originalrezept für 4 Personen');
    await expect(foodPage.getByLabel('Titel *')).toHaveValue(title);
    await expect(foodPage.getByTestId('recipe-wizard-back')).toBeDisabled();

    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Materialien' })).toBeVisible();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Zubereitungsschritte' })).toBeVisible();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Vorschau & Speichern' })).toBeVisible();
    await foodPage.getByTestId('recipe-wizard-finish').click();

    await foodPage.waitForURL(/\/recipes\/[^/?]+$/);
    await expect(foodPage.getByRole('heading', { name: title })).toBeVisible();
  });
});
