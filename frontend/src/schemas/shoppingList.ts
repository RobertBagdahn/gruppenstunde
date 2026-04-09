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
