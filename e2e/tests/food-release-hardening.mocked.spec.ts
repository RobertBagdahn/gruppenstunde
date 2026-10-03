import { test, expect } from '../fixtures/food';
import { assertRecord } from '../fixtures/api';

const mockUser = {
  id: 1,
  email: 'food-release@example.test',
  first_name: 'Food',
  last_name: 'Release',
  display_name: 'Food Release',
  is_staff: true,
  is_superuser: true,
  needs_onboarding: false,
  providers: [],
};

const breadTemplate = {
  id: 7,
  name: 'Mittagsbuffet',
  slug: 'lunch-buffet',
  description: '',
  meal_types: ['lunch'],
  sort_order: 1,
  roles: [],
};

const breadCatalog = {
  template_slug: 'lunch-buffet',
  gram_unit_id: 1,
  ml_unit_id: 2,
  roles: [{
    role: { slug: 'buffet-bread', name: 'Brot & Gebäck', icon: '' },
    amount_per_person: 120,
    unit: 'g',
    enabled_by_default: true,
    items: [
      { kind: 'ingredient', id: 10, name: 'Baguette', default_selected: true },
      { kind: 'ingredient', id: 11, name: 'Ciabatta', default_selected: false },
    ],
  }],
};

function mealItem(id: number, name: string, role: string) {
  return {
    id,
    recipe_id: null,
    recipe_title: '',
    recipe_slug: '',
    image_url: null,
    ingredient_id: id,
    ingredient_name: name,
    ingredient_slug: name.toLowerCase(),
    quantity: 60,
    measuring_unit_id: 1,
    measuring_unit_name: 'Gramm',
    portion_id: null,
    display_name: null,
    factor: 1,
    active_recipe_item_ids: [],
    variant_group_id: null,
    energy_kcal: 120,
    cost_eur: 0.2,
    quantity_g: 60,
    ingredient_tags: [role],
    recipe_type: '',
    nutri_class: null,
    overrides: [],
    has_missing_weight: false,
    is_per_norm_person: true,
    buffet_role: role,
    warnings: [],
  };
}

function mealPlanDetail(items: Array<Record<string, unknown>>) {
  return {
    id: 42,
    name: 'E2E Buffetplan',
    slug: 'e2e-buffetplan',
    description: '',
    norm_portions: 4,
    reserve_factor: 1,
    budget_per_person_per_day: null,
    event_id: null,
    event_name: '',
    start_datetime: '2026-09-07T00:00:00Z',
    end_datetime: '2026-09-07T23:59:00Z',
    created_by_id: 1,
    owner_id: 1,
    owner_name: 'Food Release',
    visibility: 'private',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    day_part_factors: { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 },
    meal_default_times: {},
    meals: [{
      id: 101,
      start_datetime: '2026-09-07T12:00:00Z',
      end_datetime: '2026-09-07T13:00:00Z',
      meal_type: 'lunch',
      day_part_factor: 0.35,
      display_name: 'Mittagessen',
      override_portions: null,
      note: '',
      note_is_published: false,
      is_reference: false,
      ref_meal_id: null,
      is_synced: false,
      buffet_template_id: null,
      is_external: false,
      external_energy_kcal: null,
      external_cost_per_person: null,
      total_energy_kcal: 240,
      total_cost_eur: 0.4,
      price_coverage: null,
      items,
    }],
    can_edit: true,
    can_delete: true,
    is_owner: true,
    collaborators: [],
    tags: [],
    nutritional_tag_ids: [],
    nutritional_tags: [],
    is_template: false,
    has_group_members: false,
    group_members_count: 0,
    group_members: [],
  };
}

function buffetResult(saved: boolean, selected: Array<Record<string, unknown>>) {
  return {
    saved,
    portions: 4,
    items: selected.map((selection) => {
      const id = Number(selection.ingredient_id);
      const name = id === 10 ? 'Baguette' : 'Ciabatta';
      return {
        role_slug: 'buffet-bread',
        kind: 'ingredient',
        id,
        name,
        amount_per_person: 60,
        unit: 'g',
        total_amount: 240,
        factor: 1,
        energy_kcal_per_person: 150,
        cost_per_person: 0.2,
        cost_total: 0.8,
      };
    }),
    energy_kcal_per_person: 300,
    target_kcal_per_person: 700,
    cost_per_person: 0.4,
    cost_total: 1.6,
    warnings: [],
  };
}

test('Buffet action opens, saves, and restores the buffet after reload', async ({ foodPage }) => {
  let savedSelections: Array<Record<string, unknown>> = [];
  let savedTemplateId: number | null = null;
  let savedRoleAmounts: Record<string, number> = {};
  const buffetRequests: string[] = [];
  const saveRequests: Array<Record<string, unknown>> = [];
  let failFirstSave = true;

  await foodPage.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    if (!path.startsWith('/api/')) return route.continue();

    if (path === '/api/auth/me/') return route.fulfill({ json: { is_authenticated: true, user: mockUser } });
    if (path === '/api/meal-plans/42/') {
      const mealItems = savedSelections.map((selection) => mealItem(
        Number(selection.ingredient_id),
        Number(selection.ingredient_id) === 10 ? 'Baguette' : 'Ciabatta',
        'buffet-bread',
      ));
      return route.fulfill({ json: mealPlanDetail(mealItems) });
    }
    if (path === '/api/meal-plans/buffet-templates/') {
      buffetRequests.push('templates');
      return route.fulfill({ json: [breadTemplate] });
    }
    if (path === '/api/supply/buffet-catalog/') {
      buffetRequests.push('catalog');
      return route.fulfill({ json: breadCatalog });
    }
    if (path === '/api/meal-plans/42/meals/101/buffet/') {
      buffetRequests.push(method === 'GET' ? 'state' : 'preview-or-save');
      if (method === 'GET') {
        return route.fulfill({
          json: {
            template_id: savedTemplateId,
            selections: savedSelections,
            role_amounts: savedRoleAmounts,
          },
        });
      }
      const body = assertRecord(request.postDataJSON());
      const selections = Array.isArray(body.selections) ? body.selections.map(assertRecord) : [];
      if (body.dry_run === true) {
        return route.fulfill({ json: buffetResult(false, selections) });
      }
      saveRequests.push(body);
      if (failFirstSave) {
        failFirstSave = false;
        return route.fulfill({
          status: 500,
          json: {
            detail: 'Interner Serverfehler. Bitte versuche es später erneut.',
            code: 'internal_error',
            request_id: 'buffet-retry-1',
          },
        });
      }
      savedSelections = selections;
      savedTemplateId = Number(body.template_id);
      savedRoleAmounts = (body.role_amounts ?? {}) as Record<string, number>;
      return route.fulfill({ json: buffetResult(true, selections) });
    }
    if (path === '/api/meal-plans/42/plan-check/') {
      return route.fulfill({ json: { total_issues: 0, alerts: [] } });
    }
    if (path === '/api/meal-plans/42/ingredient-scan/') {
      return route.fulfill({ json: { nutritional_tags: [], violations: [], summary: { total_violations: 0, affected_meals: 0, unique_tags: 0 } } });
    }
    if (path === '/api/nutritional-tags/') return route.fulfill({ json: [] });
    return route.fulfill({ json: [] });
  });

  await foodPage.goto('/meal-plans/42/plan');
  const openBuilder = foodPage.getByRole('button', { name: 'Buffet zusammenstellen' });
  await expect(openBuilder).toBeVisible();
  await openBuilder.click();

  await expect(foodPage.getByRole('heading', { name: 'Buffet zusammenstellen' })).toBeVisible();
  await expect(foodPage.getByText('Brot & Gebäck')).toBeVisible();
  await foodPage.getByText('Ciabatta').click();
  await foodPage.getByTestId('buffet-save').click();
  await expect(foodPage.getByText(/Serverfehler \(HTTP 500\)/)).toBeVisible();
  await expect(foodPage.getByRole('heading', { name: 'Buffet zusammenstellen' })).toBeVisible();
  await expect(foodPage.getByRole('button', { name: 'Ciabatta' })).toHaveClass(/border-primary/);
  expect(saveRequests).toHaveLength(1);

  await foodPage.getByTestId('buffet-save').click();
  await expect.poll(() => saveRequests).toHaveLength(2);
  await expect(foodPage.getByRole('heading', { name: 'Buffet zusammenstellen' })).toBeHidden();
  await foodPage.getByText('Mittagessen').first().click();
  await expect(foodPage.getByText('Ciabatta')).toBeVisible();
  expect(buffetRequests).toContain('templates');
  expect(buffetRequests).toContain('catalog');
  expect(buffetRequests).toContain('state');

  await foodPage.reload();
  await foodPage.getByText('Mittagessen').first().click();
  await expect(foodPage.getByText('Ciabatta')).toBeVisible();
});

function ingredientPortion(id: number, name: string) {
  return {
    id,
    name,
    quantity: 100,
    weight_g: 100,
    rank: 1,
    is_default: true,
    measuring_unit_id: 1,
    measuring_unit_name: 'Gramm',
    weight_status: 'confirmed',
    weight_source: 'manual',
    weight_confirmed_at: '2026-09-01T00:00:00Z',
    weight_confidence: 1,
    is_weight_trusted: true,
    is_piece_like: false,
  };
}

function recipeItem(
  id: number,
  ingredientId: number,
  name: string,
  slug: string,
  portionId: number,
  quantity: number,
  exchangeGroupId: number | null,
  exchangePosition: number | null,
) {
  return {
    id,
    portion_id: portionId,
    portion_name: 'Gramm',
    ingredient_id: ingredientId,
    ingredient_name: name,
    ingredient_slug: slug,
    quantity,
    client_request_id: null,
    idempotency_key: null,
    measuring_unit_id: 1,
    measuring_unit_name: 'Gramm',
    sort_order: id === 201 ? 0 : 1,
    note: '',
    ingredient_portions: [ingredientPortion(portionId, 'Gramm')],
    ingredient_density: 1,
    ingredient_viscosity: 'solid',
    ingredient_price_per_kg: null,
    ingredient_nutri_class: null,
    ingredient_retail_section_id: null,
    ingredient_retail_section_name: null,
    weight_g: quantity,
    is_optional: false,
    exchange_group_id: exchangeGroupId,
    exchange_position: exchangePosition,
    portion_display: `${quantity} g`,
    has_missing_weight: false,
    weight_status: 'confirmed',
    weight_source: 'manual',
    weight_confirmed_at: '2026-09-01T00:00:00Z',
    is_weight_trusted: true,
    current_portion: null,
  };
}

function recipeDetail(items: Array<Record<string, unknown>>) {
  return {
    id: 101,
    title: 'Jackfruit Alternative E2E',
    slug: 'jackfruit-alternative-e2e',
    summary: 'E2E Rezept',
    summary_long: '',
    description: 'Pulled Soja Rezept',
    execution_time: 'less_30',
    preparation_time: 'none',
    difficulty: 'easy',
    status: 'draft',
    image_url: null,
    like_score: 0,
    view_count: 0,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    scout_levels: [],
    tags: [],
    authors: [],
    emotion_counts: {},
    user_emotion: null,
    can_edit: true,
    can_delete: true,
    recipe_type: 'warm_meal',
    portions: 1,
    preparation_method: '',
    equipment: [],
    materials: [],
    shared_groups: [],
    owner_name: 'Food Release',
    visibility: 'private',
    recipe_badge: 'personal',
    source_url: '',
    is_owner: true,
    usage_in_meal_plans_count: 0,
    nutritional_tags: [],
    recipe_items: items,
    next_best_recipes: [],
    steps: [],
    steps_count: 0,
    has_structured_steps: false,
  };
}

test('a readable draft ingredient persists as a named recipe alternative', async ({ foodPage }) => {
  const source = recipeItem(201, 501, 'Pulled Soja', 'pulled-soja', 301, 80, null, null);
  const jackfruitPortion = ingredientPortion(302, 'Gramm');
  let recipeItems: Array<Record<string, unknown>> = [source];
  const alternativeRequests: Array<Record<string, unknown>> = [];
  let failFirstAlternative = true;
  const draftIngredient = {
    id: 502,
    name: 'Jackfruit',
    slug: 'jackfruit',
    status: 'draft',
    energy_kcal: null,
    protein_g: null,
    fat_g: null,
    carbohydrate_g: null,
    nutri_class: null,
    price_per_kg: null,
    retail_section_id: null,
    retail_section_name: null,
    usage_count: 0,
    groups: [],
    can_edit: true,
    can_delete: true,
    can_verify: true,
  };

  await foodPage.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (!path.startsWith('/api/')) return route.continue();

    if (path === '/api/auth/me/') return route.fulfill({ json: { is_authenticated: true, user: mockUser } });
    if (path === '/api/recipes/by-slug/jackfruit-alternative-e2e/') {
      return route.fulfill({ json: recipeDetail(recipeItems) });
    }
    if (path === '/api/recipes/101/recipe-items/') return route.fulfill({ json: recipeItems });
    if (path === '/api/ingredients/' && url.searchParams.get('name')?.toLowerCase() === 'jackfruit') {
      return route.fulfill({
        json: { items: [draftIngredient], total: 1, page: 1, page_size: 20, total_pages: 1 },
      });
    }
    if (path === '/api/ingredients/jackfruit/portions/') return route.fulfill({ json: [jackfruitPortion] });
    if (path === '/api/recipes/101/recipe-items/201/alternatives/' && method === 'POST') {
      const body = assertRecord(request.postDataJSON());
      alternativeRequests.push(body);
      if (failFirstAlternative) {
        failFirstAlternative = false;
        return route.fulfill({
          status: 500,
          json: {
            detail: 'Interner Serverfehler. Bitte versuche es später erneut.',
            code: 'internal_error',
            request_id: 'recipe-alternative-retry-1',
          },
        });
      }
      const alternative = recipeItem(
        202,
        draftIngredient.id,
        draftIngredient.name,
        draftIngredient.slug,
        jackfruitPortion.id,
        Number(body.quantity),
        900,
        1,
      );
      recipeItems = [
        { ...source, exchange_group_id: 900, exchange_position: 0 },
        alternative,
      ];
      return route.fulfill({ status: 201, json: alternative });
    }
    if (path === '/api/retail-sections/' || path === '/api/ingredient-groups/' || path === '/api/nutritional-tags/') {
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ json: [] });
  });

  await foodPage.goto('/recipes/jackfruit-alternative-e2e');
  await expect(foodPage.getByTestId('ingredients-edit-trigger')).toBeVisible();
  await foodPage.getByTestId('ingredients-edit-trigger').click();
  await foodPage.getByTitle('Alternative hinzufügen').first().click();
  await foodPage.getByPlaceholder('Nach Zutat suchen...').fill('Jackfruit');
  await foodPage.getByText('Jackfruit', { exact: true }).first().click();

  await expect(foodPage.getByTestId('recipe-ingredient-editor')).toContainText(/100 g\s*Jackfruit/);
  await foodPage.getByTestId('ingredient-editor-save').click();
  await expect.poll(() => alternativeRequests).toHaveLength(1);
  await expect(foodPage.getByText(/Serverfehler \(HTTP 500\)/)).toBeVisible();
  await expect(foodPage.getByTestId('recipe-ingredient-editor')).toBeVisible();
  await expect(foodPage.getByTestId('recipe-ingredient-editor')).toContainText(/100 g\s*Jackfruit/);

  await foodPage.getByTestId('ingredient-editor-save').click();
  await expect.poll(() => alternativeRequests).toHaveLength(2);
  expect(alternativeRequests[0]).toMatchObject({
    portion_id: jackfruitPortion.id,
    client_request_id: expect.any(String),
  });
  expect(alternativeRequests[1].client_request_id).toBe(alternativeRequests[0].client_request_id);
  expect(draftIngredient.status).toBe('draft');
  await expect(foodPage.getByTestId('recipe-ingredient-editor')).toBeHidden();
  await expect(foodPage.getByText(/oder Jackfruit/)).toBeVisible();

  await foodPage.reload();
  await expect(foodPage.getByText(/oder Jackfruit/)).toBeVisible();
});
