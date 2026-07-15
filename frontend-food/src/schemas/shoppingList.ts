/**
 * Zod schemas for the Shopping List feature.
 * MUST stay in sync with backend/shopping/schemas.py
 */
import { z } from 'zod';

// --- Collaborator ---

export const ShoppingListCollaboratorSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  username: z.string().default(''),
  role: z.string(),
});

export type ShoppingListCollaborator = z.output<typeof ShoppingListCollaboratorSchema>;

// --- Portion Option ---

export const PortionOptionSchema = z.object({
  name: z.string(),
  display: z.string(),
  is_default: z.boolean(),
  weight_g: z.number().default(0),
  count: z.number().default(0),
});

export type PortionOption = z.output<typeof PortionOptionSchema>;

// --- Item Source (provenance) ---

export const ShoppingItemSourceSchema = z.object({
  id: z.number().optional(),
  recipe_id: z.number().nullable().optional(),
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
  unit: z.string().default('g'),
  retail_section_id: z.number().nullable().optional(),
  retail_section_name: z.string().default(''),
  is_checked: z.boolean(),
  checked_by_username: z.string().nullable().optional(),
  checked_at: z.string().nullable().optional(),
  sort_order: z.number(),
  note: z.string().default(''),
  ingredient_id: z.number().nullable().optional(),
  ingredient_slug: z.string().nullable().optional(),
  estimated_price_eur: z.number().nullable().optional(),
  display_quantity: z.string().default(''),
  natural_portions: z.string().default(''),
  portion_options: z.array(PortionOptionSchema).default([]),
  sources: z.array(ShoppingItemSourceSchema).default([]),
});

export type ShoppingListItem = z.output<typeof ShoppingListItemSchema>;

// --- List (summary for list views) ---

export const ShoppingListSchema = z.object({
  id: z.number(),
  name: z.string(),
  owner_id: z.number(),
  owner_username: z.string().default(''),
  source_type: z.string(),
  source_id: z.number().nullable().optional(),
  items_count: z.number().default(0),
  checked_count: z.number().default(0),
  collaborators_count: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});

export type ShoppingList = z.output<typeof ShoppingListSchema>;

// --- Detail ---

export const ShoppingListDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  owner_id: z.number(),
  owner_username: z.string().default(''),
  source_type: z.string(),
  source_id: z.number().nullable().optional(),
  items: z.array(ShoppingListItemSchema).default([]),
  collaborators: z.array(ShoppingListCollaboratorSchema).default([]),
  can_edit: z.boolean().default(false),
  is_owner: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ShoppingListDetail = z.output<typeof ShoppingListDetailSchema>;

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
