/**
 * Zod schemas for the Shopping List feature.
 * MUST stay in sync with backend/shopping/schemas.py
 */
import { z } from 'zod';
import { UnitOptionSchema } from './quantityUnits';
import { QuantityWarningSchema } from './buffet';

// --- Collaborator ---

export const ShoppingListCollaboratorSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  display_name: z.string().default(''),
  role: z.string(),
});

export type ShoppingListCollaborator = z.output<typeof ShoppingListCollaboratorSchema>;

// --- Portion Option ---

export const PortionOptionSchema = z.object({
  name: z.string(),
  is_default: z.boolean(),
  weight_g: z.number().default(0),
  count: z.number().default(0),
});

export type PortionOption = z.output<typeof PortionOptionSchema>;

// --- Package Option (shop-bought package count) ---

export const ShoppingPackageOptionSchema = z.object({
  count: z.number(),
  package_name: z.string(),
  weight_g: z.number(),
  volume_ml: z.number().nullish(),
});

export type ShoppingPackageOption = z.output<typeof ShoppingPackageOptionSchema>;

// --- Item Source (provenance) ---

export const ShoppingItemSourceSchema = z.object({
  id: z.number().optional(),
  recipe_id: z.number().nullable().optional(),
  meal_id: z.number().nullable().optional(),
  ingredient_id: z.number().nullable().optional(),
  recipe_name: z.string().default(''),
  recipe_slug: z.string().default(''),
  meal_label: z.string().default(''),
  quantity_g: z.number().default(0),
});

export type ShoppingItemSource = z.output<typeof ShoppingItemSourceSchema>;

// --- Item ---

export const ShoppingListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity_g: z.number(),
  /** Display quantity in `unit` (grams, or millilitres for beverages/liquids). */
  quantity: z.number().default(0),
  unit: z.string().default('g'),
  retail_section_id: z.number().nullable().optional(),
  retail_section_name: z.string().default(''),
  /** Consumable material; the piece count is shown in `quantity`/`unit`. */
  material_id: z.number().nullable().default(null),
  is_material: z.boolean().default(false),
  is_checked: z.boolean(),
  checked_by_display_name: z.string().nullable().optional(),
  checked_at: z.string().nullable().optional(),
  /** Who put the entry on the list; null for entries generated from a recipe or plan. */
  added_by_display_name: z.string().nullable().default(null),
  created_at: z.string().default(''),
  /** Who takes care of buying it; `claimed_by_me` is resolved per viewer. */
  claimed_by_display_name: z.string().nullable().default(null),
  claimed_by_me: z.boolean().default(false),
  /** Resolved per viewer by the backend (guests remove only their own entries). */
  can_delete: z.boolean().default(false),
  sort_order: z.number(),
  note: z.string().default(''),
  ingredient_id: z.number().nullable().optional(),
  ingredient_slug: z.string().nullable().optional(),
  estimated_price_eur: z.number().nullable().optional(),
  /** Unit the amount is shown in first (standard portion, else g/ml); `quantity_g` stays the stored amount. */
  start_unit: UnitOptionSchema.nullable().default(null),
  portion_options: z.array(PortionOptionSchema).default([]),
  package_options: z.array(ShoppingPackageOptionSchema).default([]),
  /** count × package weight − quantity_g; negative when rounded down within tolerance. */
  package_surplus_g: z.number().nullable().default(null),
  sources: z.array(ShoppingItemSourceSchema).default([]),
});

export type ShoppingListItem = z.output<typeof ShoppingListItemSchema>;

// --- List (summary for list views) ---

/** Freshness of a list created from a meal plan; null for other lists or without access to the plan. */
export const ShoppingListSourceStatusSchema = z.enum(['current', 'changed', 'deleted']);
export type ShoppingListSourceStatus = z.infer<typeof ShoppingListSourceStatusSchema>;

export const ShoppingListSchema = z.object({
  id: z.number(),
  name: z.string(),
  owner_id: z.number(),
  owner_display_name: z.string().default(''),
  source_type: z.string(),
  source_id: z.number().nullable().optional(),
  items_count: z.number().default(0),
  checked_count: z.number().default(0),
  collaborators_count: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
  source_status: ShoppingListSourceStatusSchema.nullable().default(null),
  source_updated_at: z.string().nullable().default(null),
});

export type ShoppingList = z.output<typeof ShoppingListSchema>;

// --- Invitation link ---

export const ShoppingListGuestSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});

export type ShoppingListGuest = z.output<typeof ShoppingListGuestSchema>;

export const ShoppingListShareSchema = z.object({
  share_token: z.string().nullable().default(null),
  guests: z.array(ShoppingListGuestSchema).default([]),
});

export type ShoppingListShare = z.output<typeof ShoppingListShareSchema>;

export const SharedListPreviewSchema = z.object({
  list_id: z.number(),
  name: z.string(),
  owner_display_name: z.string().default(''),
  items_count: z.number().default(0),
  checked_count: z.number().default(0),
  already_member: z.boolean().default(false),
  guest_name: z.string().nullable().default(null),
});

export type SharedListPreview = z.output<typeof SharedListPreviewSchema>;

export const SharedListJoinSchema = z.object({
  list_id: z.number(),
  display_name: z.string(),
  guest_token: z.string().nullable().default(null),
  guest_id: z.number().nullable().default(null),
});

export type SharedListJoin = z.output<typeof SharedListJoinSchema>;

export const ShoppingListPulseSchema = z.object({ stamp: z.string() });

// --- Detail ---

export const ShoppingListDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  owner_id: z.number(),
  owner_display_name: z.string().default(''),
  source_type: z.string(),
  source_id: z.number().nullable().optional(),
  items: z.array(ShoppingListItemSchema).default([]),
  collaborators: z.array(ShoppingListCollaboratorSchema).default([]),
  can_edit: z.boolean().default(false),
  is_owner: z.boolean().default(false),
  /** Owner/admin: may manage the invitation link and the guests. */
  can_manage: z.boolean().default(false),
  share_token: z.string().nullable().default(null),
  guests: z.array(ShoppingListGuestSchema).default([]),
  /** Set for guests: who the viewer is on this list. */
  viewer_guest_id: z.number().nullable().default(null),
  viewer_display_name: z.string().default(''),
  /** Change marker compared with the polled `/pulse/` stamp. */
  stamp: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  source_status: ShoppingListSourceStatusSchema.nullable().default(null),
  source_updated_at: z.string().nullable().default(null),
});

export type ShoppingListDetail = z.output<typeof ShoppingListDetailSchema>;

// --- Warnings (meal-plan lists only, loaded separately) ---

export const ShoppingListWarningsSchema = z.array(QuantityWarningSchema);

// --- Board (compact view for the shopping screen) ---

export const ShoppingBoardItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.number().default(0),
  unit: z.string().default('g'),
  retail_section_id: z.number().nullable().default(null),
  retail_section_name: z.string().default(''),
  is_material: z.boolean().default(false),
  is_checked: z.boolean().default(false),
  checked_by_name: z.string().nullable().default(null),
  claimed_by_name: z.string().nullable().default(null),
  claimed_by_me: z.boolean().default(false),
  can_delete: z.boolean().default(false),
  sort_order: z.number().default(0),
  note: z.string().default(''),
});

export const ShoppingListBoardSchema = z.object({
  id: z.number(),
  name: z.string(),
  stamp: z.string(),
  can_edit: z.boolean().default(false),
  viewer_display_name: z.string().default(''),
  total: z.number().default(0),
  checked: z.number().default(0),
  items: z.array(ShoppingBoardItemSchema).default([]),
});

export type ShoppingListBoard = z.output<typeof ShoppingListBoardSchema>;
export type ShoppingBoardItem = z.output<typeof ShoppingBoardItemSchema>;

// --- Pagination ---

export const PaginatedShoppingListsSchema = z.object({
  items: z.array(ShoppingListSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type PaginatedShoppingLists = z.output<typeof PaginatedShoppingListsSchema>;

// --- Source type labels ---

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: 'Manuell',
  recipe: 'Rezept',
  meal_event: 'Essensplan',
};

export const COLLABORATOR_ROLE_LABELS: Record<string, string> = {
  viewer: 'Betrachter',
  editor: 'Bearbeiter',
  admin: 'Administrator',
};

// --- REWE Export ---

export const ReweExportTokenResponseSchema = z.object({
  token: z.string(),
  export_url: z.string(),
  expires_at: z.string(),
});

export type ReweExportTokenResponse = z.output<typeof ReweExportTokenResponseSchema>;

export const ReweExportItemSchema = z.object({
  item_id: z.number(),
  ingredient_name: z.string(),
  nan_art_id_rewe: z.number().nullable().optional(),
  order_quantity: z.number(),
  unit: z.string(),
  already_added_at: z.string().nullable().optional(),
  matched: z.boolean().default(false),
});

export type ReweExportItem = z.output<typeof ReweExportItemSchema>
