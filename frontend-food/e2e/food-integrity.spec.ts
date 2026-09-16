import { expect, test, type Page, type Route } from '@playwright/test';

const user = {
  id: 1,
  username: 'food-e2e',
  email: 'food-e2e@example.test',
  first_name: 'Food',
  last_name: 'Test',
  is_staff: true,
  is_superuser: true,
};

const recipe = {
  id: 7,
  slug: 'salz-suppe',
  title: 'Salz-Suppe',
  summary: '',
  summary_long: '',
  description: '',
  image_url: null,
  execution_time: 'less_30',
  preparation_time: 'none',
  difficulty: 'easy',
  status: 'approved',
  like_score: 0,
  view_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  scout_levels: [],
  tags: [],
  can_edit: true,
  can_delete: true,
  recipe_type: 'warm_meal',
  portions: 1,
  equipment: [],
  materials: [],
  recipe_items: [
    {
      id: 41,
      portion_id: 11,
      portion_name: '1 Teelöffel',
      ingredient_id: 101,
      ingredient_name: 'Salz',
      ingredient_slug: 'salz',
      quantity: 1,
      measuring_unit_id: null,
      measuring_unit_name: null,
      sort_order: 0,
      note: '',
      ingredient_portions: [],
      weight_g: 5,
      is_optional: false,
      exchange_group_id: 3,
      exchange_position: 0,
      portion_display: '1 Teelöffel',
      has_missing_weight: false,
      weight_status: 'confirmed',
      weight_source: 'manual',
      weight_confirmed_at: '2026-01-01T00:00:00Z',
      is_weight_trusted: true,
    },
  ],
  steps: [],
  shared_groups: [],
};

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installCommonRoutes(page: Page): Promise<void> {
  await page.route('**/api/auth/me/**', (route) => fulfillJson(route, user));
  await page.route('**/api/tags/**', (route) => fulfillJson(route, []));
  await page.route('**/api/scout-levels/**', (route) => fulfillJson(route, []));
  await page.route('**/api/admin/equipment/**', (route) => fulfillJson(route, []));
}

test.describe('Food data integrity release flows', () => {
  test('requires piece-portion confirmation in the recipe wizard at 320px', async ({ page }) => {
    await installCommonRoutes(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await page.route(/\/api\/recipes\/smart-input\/?$/, (route) => fulfillJson(route, {
      recipe_draft: {
        title: 'Apfelspieße', description: '', summary: '', servings: 4,
        preparation_time: null, execution_time: null, recipe_type: 'warm_meal',
        difficulty: 'easy', execution_time_choice: 'less_30', preparation_time_choice: 'none',
        scout_level_ids: [], tag_ids: [], steps: [], source_url: '', image_url: '',
      },
      recipe_items: [{
        ingredient_id: 101, ingredient_name: 'Apfel', ingredient_slug: 'apfel', quantity: 4,
        measuring_unit_id: null, measuring_unit_name: 'Stück', note: '', is_new_ingredient: false,
        portion_id: null, needs_unit_clarification: true, suggested_unit_name: 'Stück',
        suggested_portion_weight_g: 120, available_portions: [], weight_status: 'ai_proposed',
        weight_proposal_g: 120, suggested_portion_name: '1 Apfel', confirmation_required: true,
      }],
      created_ingredients: [], input_type: 'text', is_reconstructed: false, ai_interaction_id: null,
    }));
    await page.route('**/api/ingredients/apfel/portions/confirm/**', (route) => fulfillJson(route, {
      id: 81, name: '1 Apfel', quantity: 1, weight_g: 120, measuring_unit_id: null,
      measuring_unit_name: 'Stück', weight_status: 'confirmed', weight_source: 'manual', is_weight_trusted: true,
    }));
    await page.route('**/api/recipes/**', async (route) => {
      if (route.request().method() === 'POST' && route.request().url().endsWith('/api/recipes/')) {
        await fulfillJson(route, { ...recipe, id: 8, slug: 'apfelspiesse', title: 'Apfelspieße' }, 201);
        return;
      }
      await route.continue();
    });
    // Register after the broad recipe fallback so Playwright gives this route priority.
    await page.route('**/api/recipes/smart-input/**', (route) => fulfillJson(route, {
      recipe_draft: {
        title: 'Apfelspieße', description: '', summary: '', servings: 4,
        preparation_time: null, execution_time: null, recipe_type: 'warm_meal',
        difficulty: 'easy', execution_time_choice: 'less_30', preparation_time_choice: 'none',
        scout_level_ids: [], tag_ids: [], steps: [], source_url: '', image_url: '',
      },
      recipe_items: [{
        ingredient_id: 101, ingredient_name: 'Apfel', ingredient_slug: 'apfel', quantity: 4,
        measuring_unit_id: null, measuring_unit_name: 'Stück', note: '', is_new_ingredient: false,
        portion_id: null, needs_unit_clarification: true, suggested_unit_name: 'Stück',
        suggested_portion_weight_g: 120, available_portions: [], weight_status: 'ai_proposed',
        weight_proposal_g: 120, suggested_portion_name: '1 Apfel', confirmation_required: true,
      }],
      created_ingredients: [], input_type: 'text', is_reconstructed: false, ai_interaction_id: null,
    }));

    await page.goto('/recipes/new');
    await page.getByTestId('recipe-smart-input').fill('Apfelspieße für vier Personen');
    await page.getByTestId('recipe-wizard-next').click();
    await expect(page.getByTestId('recipe-serving-context-selector')).toBeVisible();
    await page.getByTestId('recipe-wizard-next').click();
    await expect(page.getByText('Bitte bestätige zuerst die Personenzahl.')).toBeVisible();
    await page.getByTestId('recipe-serving-context-confirm').click();
    await page.getByTestId('recipe-wizard-next').click();
    await expect(page.getByText(/Einheiten prüfen/)).toBeVisible();
    await expect(page.locator('option', { hasText: 'Neuen Vorschlag bestätigen' })).toHaveCount(1);
  });

  test('approves a missing ingredient price and shows provenance and coverage', async ({ page }) => {
    await installCommonRoutes(page);
    await page.route('**/api/admin/data-quality/ingredients/price-analysis/**', async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, {
          suggestions: [{ ingredient_id: 101, current_price: null, suggested_price: '2.50',
            reasoning: 'Vergleichbare Marktpreise', proposal_id: 55, status: 'pending', confidence: 0.9 }],
          batch_token: 'batch-1',
        });
        return;
      }
      await fulfillJson(route, { items: [{ id: 101, name: 'Salz', slug: 'salz', price_per_kg: null,
        retail_section: 'Gewürze', z_score: null, anomaly_type: 'missing', price_source: 'missing' }],
        total: 1, page: 1, page_size: 20, total_pages: 1 });
    });
    await page.route('**/api/admin/data-quality/ingredients/price-analysis/apply/**', (route) =>
      fulfillJson(route, { results: [{ ingredient_id: 101, proposal_id: 55, status: 'accepted', message: '' }] }));

    await page.goto('/admin/data-quality/ingredients?tab=price');
    await expect(page.getByText('Salz')).toBeVisible();
    await page.getByRole('button', { name: /0-Werte mit KI schätzen/ }).click();
    await expect(page.getByText('2.50 €/kg')).toBeVisible();
    await page.getByRole('button', { name: 'Alle übernehmen' }).click();
    await expect(page.getByText('Übernommen', { exact: true })).toBeVisible();
  });

  test('supports material CRUD, reorder and rejecting an AI suggestion without persistence', async ({ page }) => {
    await installCommonRoutes(page);
    let materials = [
      { id: 1, material_id: 10, material_name: 'Backpapier', material_slug: 'backpapier',
        material_category: 'Verbrauch', quantity: '1 Bogen', sort_order: 0 },
      { id: 2, material_id: 11, material_name: 'Alufolie', material_slug: 'alufolie',
        material_category: 'Hilfsmittel', quantity: '2 Stück', sort_order: 1 },
    ];
    let applyCalls = 0;
    await page.route('**/api/recipes/7/**', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/materials/') && route.request().method() === 'GET') { await fulfillJson(route, materials); return; }
      if (url.endsWith('/materials/') && route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { material_id: number; quantity: string };
        const created = { id: 3, material_id: body.material_id, material_name: 'Zahnstocher', material_slug: 'zahnstocher',
          material_category: 'Verbrauch', quantity: body.quantity, sort_order: materials.length };
        materials = [...materials, created];
        await fulfillJson(route, created, 201); return;
      }
      if (url.includes('/materials/1/') && route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as { quantity: string };
        materials = materials.map((item) => item.id === 1 ? { ...item, quantity: body.quantity } : item);
        await fulfillJson(route, materials[0]); return;
      }
      if (url.includes('/materials/2/') && route.request().method() === 'DELETE') {
        materials = materials.filter((item) => item.id !== 2);
        await route.fulfill({ status: 204 }); return;
      }
      if (url.endsWith('/materials/reorder/') && route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { item_ids: number[] };
        materials = body.item_ids.map((id, index) => ({ ...materials.find((item) => item.id === id)!, sort_order: index }));
        await fulfillJson(route, materials); return;
      }
      if (url.endsWith('/ai-suggest-materials/') && route.request().method() === 'POST') {
        await fulfillJson(route, { items: [{ material_id: 10, suggested_name: 'Backpapier', quantity: '2 Bögen', matched_name: 'Backpapier', is_new: false },
          { material_id: null, suggested_name: 'Holzspieß', quantity: '4 Stück', matched_name: null, is_new: true }], ai_interaction_id: null }); return;
      }
      if (url.endsWith('/ai-apply-materials/') && route.request().method() === 'POST') { applyCalls += 1; await fulfillJson(route, materials); return; }
      if (url.includes('/supplies/materials/search/') || url.includes('/materials/search')) {
        await fulfillJson(route, [{ id: 12, name: 'Zahnstocher', slug: 'zahnstocher', category: 'Verbrauch' }]); return;
      }
      await route.continue();
    });
    await page.route('**/api/recipes/by-slug/salz-suppe/**', (route) => fulfillJson(route, recipe));

    await page.goto('/recipes/salz-suppe/edit');
    await expect(page.getByTestId('materials-list')).toBeVisible();
    await page.getByTestId('materials-suggest-button').click();
    await expect(page.getByText('Holzspieß')).toBeVisible();
    await expect(page.getByTestId('materials-apply-suggestions')).toBeDisabled();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByText('Holzspieß')).not.toBeVisible();
    expect(applyCalls).toBe(0);
    await page.getByLabel('Menge für Backpapier').fill('2 Bögen');
    await page.getByLabel('Menge für Backpapier').blur();
    await page.getByRole('button', { name: 'Nach unten verschieben' }).first().click();
    await page.getByRole('button', { name: 'Alufolie entfernen' }).click();
    await expect(page.getByText('Backpapier')).toBeVisible();
  });

  test('replaces an ingredient without adding a duplicate or changing its exchange group', async ({ page }) => {
    await installCommonRoutes(page);
    await page.route('**/api/recipes/by-slug/salz-suppe/**', (route) => fulfillJson(route, recipe));
    await page.route('**/api/recipes/7/ai-suggest-ingredients/**', (route) => fulfillJson(route, {
      items: [{ ingredient_id: 102, ingredient_name: 'Jodsalz', portion_id: 12, portion_name: '1 Teelöffel',
        quantity: 1, is_new_ingredient: false, note: '', replacement_for_item_id: 41,
        replacement_reason: 'Gleiche Verwendung', replacement_confidence: 0.98 }], ai_interaction_id: null,
    }));
    let replacementPayload: unknown = null;
    await page.route('**/api/recipes/7/items/41/replace/**', async (route) => {
      replacementPayload = route.request().postDataJSON();
      await fulfillJson(route, {
      ...recipe.recipe_items[0], ingredient_id: 102, ingredient_name: 'Jodsalz', portion_id: 12,
      exchange_group_id: 3, exchange_position: 0,
      });
    });
    await page.route('**/api/ingredients/jodsalz/portions/**', (route) => fulfillJson(route, [{ id: 12, name: '1 Teelöffel', rank: 1, weight_g: 5 }]));

    await page.goto('/recipes/salz-suppe');
    await page.getByTestId('ingredients-edit-trigger').click();
    await page.getByTestId('recipe-serving-context-confirm').click();
    const suggestButton = page.getByRole('button', { name: /Weitere Zutaten/i });
    await expect(suggestButton).toBeVisible();
    await suggestButton.click();
    await expect(page.getByTestId('ai-replacement-41')).toBeVisible();
    await expect(page.getByText('Ersetzungen')).toBeVisible();
    await expect(page.getByText('Zutaten hinzufügen')).not.toBeVisible();
    await page.getByRole('button', { name: 'Ersetzen' }).click();
    await expect(page.getByText('Jodsalz ersetzt')).toBeVisible();
    expect(replacementPayload).toMatchObject({ portion_id: 12, ingredient_id: 102 });
    expect(JSON.stringify(replacementPayload)).not.toContain('quantity');
  });
});
