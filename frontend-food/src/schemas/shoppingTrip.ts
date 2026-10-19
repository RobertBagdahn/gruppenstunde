/**
 * Zod schemas for event shopping trips (plan, trips, allocation rules, diff).
 * MUST stay in sync with backend/shopping/schemas/trips.py
 */
import { z } from 'zod';

export const TripStatusSchema = z.enum(['planned', 'created']);
export type TripStatus = z.infer<typeof TripStatusSchema>;

export const SubjectKindSchema = z.enum(['ingredient', 'material']);
export type SubjectKind = z.infer<typeof SubjectKindSchema>;

// --- Event overview ---

export const NextTripSchema = z.object({
  list_id: z.number(),
  store_name: z.string(),
  scheduled_at: z.string(),
});

export const ShoppingEventSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  trips_count: z.number().default(0),
  next_trip: NextTripSchema.nullable().default(null),
  can_manage: z.boolean().default(false),
});

export type ShoppingEvent = z.output<typeof ShoppingEventSchema>;

export const PaginatedShoppingEventsSchema = z.object({
  items: z.array(ShoppingEventSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type PaginatedShoppingEvents = z.output<typeof PaginatedShoppingEventsSchema>;

// --- Plan ---

export const TripSourceSchema = z.object({
  recipe_id: z.number().nullable().default(null),
  meal_id: z.number().nullable().default(null),
  recipe_name: z.string().default(''),
  recipe_slug: z.string().default(''),
  meal_label: z.string().default(''),
  quantity_g: z.number().default(0),
});

export type TripSource = z.output<typeof TripSourceSchema>;

export const TripRowSchema = z.object({
  kind: SubjectKindSchema,
  subject_id: z.number(),
  name: z.string(),
  quantity: z.number().default(0),
  unit: z.string().default('g'),
  total_quantity_g: z.number().default(0),
  net_quantity_g: z.number().default(0),
  reserve_quantity_g: z.number().default(0),
  retail_section_name: z.string().default(''),
  estimated_price_eur: z.number().nullable().default(null),
  display_text: z.string().default(''),
  package_options: z
    .array(z.object({ count: z.number(), package_name: z.string(), weight_g: z.number() }).passthrough())
    .default([]),
  package_surplus_g: z.number().nullable().default(null),
  sources: z.array(TripSourceSchema).default([]),
  rule_ids: z.array(z.number()).default([]),
  /** Number of trips this ingredient is split over. */
  spread_count: z.number().default(1),
});

export type TripRow = z.output<typeof TripRowSchema>;

export const PlannedTripSchema = z.object({
  list_id: z.number(),
  name: z.string(),
  store_id: z.number().nullable().default(null),
  store_name: z.string().default(''),
  scheduled_at: z.string().nullable().default(null),
  status: TripStatusSchema,
  items_count: z.number().default(0),
  checked_count: z.number().default(0),
  rows: z.array(TripRowSchema).default([]),
});

export type PlannedTrip = z.output<typeof PlannedTripSchema>;

export const UncoveredReasonSchema = z.enum(['before_first_trip', 'no_time', 'no_trips']);

export const UncoveredSchema = z.object({
  kind: SubjectKindSchema,
  subject_id: z.number(),
  name: z.string(),
  quantity: z.number(),
  meal_id: z.number(),
  meal_label: z.string(),
  reason: UncoveredReasonSchema,
});

export type Uncovered = z.output<typeof UncoveredSchema>;

export const HintSchema = z.object({
  kind: z.enum(['after_meal', 'rule_exceeds_demand', 'no_time']),
  message: z.string(),
  meal_id: z.number().nullable().default(null),
  trip_id: z.number().nullable().default(null),
  rule_id: z.number().nullable().default(null),
});

export type Hint = z.output<typeof HintSchema>;

export const AllocationRuleSchema = z.object({
  id: z.number(),
  target_id: z.number(),
  ingredient_id: z.number().nullable().default(null),
  material_id: z.number().nullable().default(null),
  meal_id: z.number().nullable().default(null),
  quantity: z.number().nullable().default(null),
  name: z.string().default(''),
});

export type AllocationRule = z.output<typeof AllocationRuleSchema>;

export const TripPlanSchema = z.object({
  event_id: z.number(),
  event_slug: z.string(),
  event_name: z.string(),
  can_manage: z.boolean().default(false),
  trips: z.array(PlannedTripSchema).default([]),
  uncovered: z.array(UncoveredSchema).default([]),
  hints: z.array(HintSchema).default([]),
  rules: z.array(AllocationRuleSchema).default([]),
  stamp: z.string().default(''),
});

export type TripPlan = z.output<typeof TripPlanSchema>;

// --- Inputs ---

export const TripInputSchema = z.object({
  store_id: z.number({ message: 'Bitte wähle einen Laden aus.' }),
  scheduled_at: z.string().min(1, 'Bitte gib an, wann eingekauft wird.'),
  name: z.string().max(255).optional(),
});

export type TripInput = z.input<typeof TripInputSchema>;

export const AllocationRuleInputSchema = z.object({
  target_id: z.number(),
  ingredient_id: z.number().nullable().optional(),
  material_id: z.number().nullable().optional(),
  meal_id: z.number().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
});

export type AllocationRuleInput = z.input<typeof AllocationRuleInputSchema>;

// --- Diff after plan changes ---

export const TripDiffRowSchema = z.object({
  kind: z.enum(['new', 'changed', 'removed']),
  subject_kind: SubjectKindSchema,
  subject_id: z.number(),
  name: z.string(),
  unit: z.string().default('g'),
  snapshot_open: z.number().default(0),
  snapshot_checked: z.number().default(0),
  current: z.number().default(0),
});

export type TripDiffRow = z.output<typeof TripDiffRowSchema>;

export const TripDiffSchema = z.object({
  rows: z.array(TripDiffRowSchema).default([]),
  has_changes: z.boolean().default(false),
  plan_synced_at: z.string().nullable().default(null),
});

export type TripDiff = z.output<typeof TripDiffSchema>;

// --- Recipe purchase ---

export const RecipePurchaseInputSchema = z
  .object({
    portions: z.number().int().min(1),
    include_consumables: z.boolean().default(true),
    store_id: z.number().optional(),
    scheduled_at: z.string().optional(),
    shopping_list_id: z.number().optional(),
  })
  .refine((value) => value.shopping_list_id !== undefined || (value.store_id !== undefined && !!value.scheduled_at), {
    message: 'Bitte wähle einen Laden und einen Zeitpunkt oder eine bestehende Liste.',
  });

export type RecipePurchaseInput = z.input<typeof RecipePurchaseInputSchema>;

// --- Events the user may link a meal plan to ---

export const ManageableEventSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
});

export type ManageableEvent = z.output<typeof ManageableEventSchema>;

export const PaginatedManageableEventsSchema = z.object({
  items: z.array(ManageableEventSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type PaginatedManageableEvents = z.output<typeof PaginatedManageableEventsSchema>;

/** Response of `POST /api/events/` and of linking: only what the shopping flow needs. */
export const CreatedEventSchema = z.object({ id: z.number(), slug: z.string(), name: z.string() }).passthrough();

export type CreatedEvent = z.output<typeof CreatedEventSchema>;
