import { describe, expect, it } from 'vitest';
import {
  AllocationRuleSchema,
  PaginatedShoppingEventsSchema,
  RecipePurchaseInputSchema,
  TripDiffSchema,
  TripPlanSchema,
  TripInputSchema,
} from './shoppingTrip';
import { PaginatedStoresSchema, StoreInputSchema } from './shoppingStore';
import { ShoppingListDetailSchema, ShoppingListSchema } from './shoppingList';

/** Payloads shaped like the backend responses (backend/shopping/tests/test_trips_api.py and friends). */
const row = {
  kind: 'ingredient',
  subject_id: 7,
  name: 'Kartoffeln',
  quantity: 1000,
  unit: 'g',
  total_quantity_g: 1000,
  net_quantity_g: 1000,
  reserve_quantity_g: 0,
  retail_section_name: 'Obst & Gemüse',
  estimated_price_eur: null,
  display_text: '',
  package_options: [],
  package_surplus_g: null,
  sources: [
    { recipe_id: 3, meal_id: 11, recipe_name: 'Kartoffelpfanne', recipe_slug: 'kartoffelpfanne', meal_label: 'Sa Mittag', quantity_g: 1000 },
  ],
  rule_ids: [],
  spread_count: 1,
};

const plan = {
  event_id: 1,
  event_slug: 'sommerlager',
  event_name: 'Sommerlager',
  can_manage: true,
  trips: [
    {
      list_id: 5,
      name: 'Metro · Sa 17.10. 09:00',
      store_id: 2,
      store_name: 'Metro',
      scheduled_at: '2026-10-17T07:00:00Z',
      status: 'planned',
      items_count: 0,
      checked_count: 0,
      rows: [row],
    },
  ],
  uncovered: [
    { kind: 'ingredient', subject_id: 8, name: 'Reis', quantity: 500, meal_id: 12, meal_label: 'Fr Abend', reason: 'before_first_trip' },
  ],
  hints: [{ kind: 'after_meal', message: 'Einkauf liegt nach der Mahlzeit', meal_id: 12, trip_id: 5, rule_id: 1 }],
  rules: [{ id: 1, target_id: 5, ingredient_id: 7, material_id: null, meal_id: null, quantity: null, name: 'Kartoffeln' }],
  stamp: '1|2026|1|2026|0|None|0',
};

describe('shopping trip schemas', () => {
  it('parses a plan response', () => {
    const parsed = TripPlanSchema.parse(plan);
    expect(parsed.trips[0].rows[0].sources[0].meal_id).toBe(11);
    expect(parsed.uncovered[0].reason).toBe('before_first_trip');
    expect(parsed.rules[0].quantity).toBeNull();
  });

  it('rejects an unknown uncovered reason', () => {
    const broken = { ...plan, uncovered: [{ ...plan.uncovered[0], reason: 'whenever' }] };
    expect(() => TripPlanSchema.parse(broken)).toThrow();
  });

  it('parses the event overview', () => {
    const parsed = PaginatedShoppingEventsSchema.parse({
      items: [
        {
          id: 1,
          slug: 'sommerlager',
          name: 'Sommerlager',
          start_date: '2026-10-20T08:00:00Z',
          end_date: null,
          trips_count: 3,
          next_trip: { list_id: 5, store_name: 'Rewe', scheduled_at: '2026-10-24T08:00:00Z' },
          can_manage: false,
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    });
    expect(parsed.items[0].next_trip?.store_name).toBe('Rewe');
  });

  it('parses a diff', () => {
    const diff = TripDiffSchema.parse({
      rows: [{ kind: 'changed', subject_kind: 'ingredient', subject_id: 7, name: 'Nudeln', unit: 'g', snapshot_open: 0, snapshot_checked: 2000, current: 3000 }],
      has_changes: true,
      plan_synced_at: '2026-10-17T10:00:00Z',
    });
    expect(diff.rows[0].current - diff.rows[0].snapshot_checked).toBe(1000);
  });

  it('parses stores and rejects blank names', () => {
    expect(PaginatedStoresSchema.parse({ items: [{ id: 1, name: 'Metro', created_at: '2026-10-17T10:00:00Z' }], total: 1, page: 1, page_size: 20, total_pages: 1 }).items).toHaveLength(1);
    expect(StoreInputSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('parses trip fields on list summaries and details, with null for free lists', () => {
    const base = { id: 1, name: 'Frei', owner_id: 1, source_type: 'manual', created_at: 'x', updated_at: 'x', can_edit: true, can_delete: true };
    const free = ShoppingListSchema.parse(base);
    expect(free.trip_status).toBeNull();
    expect(free.event_slug).toBeNull();

    const trip = ShoppingListSchema.parse({ ...base, source_type: 'event_trip', event_id: 1, event_slug: 'sommerlager', event_name: 'Sommerlager', store_id: 2, store_name: 'Metro', scheduled_at: '2026-10-17T07:00:00Z', trip_status: 'planned' });
    expect(trip.trip_status).toBe('planned');

    const detail = ShoppingListDetailSchema.parse({ ...base, source_type: 'event_trip', trip_status: 'planned', can_plan: true, preview: plan.trips[0] });
    expect(detail.preview?.rows[0].name).toBe('Kartoffeln');
    expect(detail.items_count).toBe(0);
  });

  it('parses a rule', () => {
    expect(AllocationRuleSchema.parse(plan.rules[0]).name).toBe('Kartoffeln');
  });

  it('validates trip and recipe purchase input with the German messages', () => {
    const missingTime = TripInputSchema.safeParse({ store_id: 1, scheduled_at: '' });
    expect(missingTime.success).toBe(false);
    expect(missingTime.error?.issues[0].message).toBe('Bitte gib an, wann eingekauft wird.');

    expect(RecipePurchaseInputSchema.safeParse({ portions: 4 }).error?.issues[0].message).toBe(
      'Bitte wähle einen Laden und einen Zeitpunkt oder eine bestehende Liste.',
    );
    expect(RecipePurchaseInputSchema.safeParse({ portions: 4, shopping_list_id: 3 }).success).toBe(true);
    expect(RecipePurchaseInputSchema.safeParse({ portions: 4, store_id: 1, scheduled_at: '2026-10-22T16:00' }).success).toBe(true);
  });
});
