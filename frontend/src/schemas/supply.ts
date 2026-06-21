/**
 * Zod schemas for Supply (Material, MeasuringUnit, NutritionalTag, etc.).
 * MUST stay in sync with backend/supply/schemas.py
 */
import { z } from 'zod';

// --- Material Category Options ---

export const MATERIAL_CATEGORY_OPTIONS = [
  { value: 'tools', label: 'Werkzeuge' },
  { value: 'crafting', label: 'Bastelmaterial' },
  { value: 'kitchen', label: 'Küchenbedarf' },
  { value: 'outdoor', label: 'Outdoor-Ausrüstung' },
  { value: 'stationery', label: 'Schreibwaren' },
  { value: 'other', label: 'Sonstiges' },
] as const;

// --- Material schemas ---

export const MaterialSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  material_category: z.string(),
  is_consumable: z.boolean(),
  image_url: z.string().nullable(),
  purchase_links: z.array(z.unknown()).default([]),
  created_at: z.string(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const MaterialListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  material_category: z.string(),
  is_consumable: z.boolean(),
});
export type MaterialListItem = z.infer<typeof MaterialListItemSchema>;

// --- ContentMaterialItem (material assigned to content) ---

export const ContentMaterialItemSchema = z.object({
  id: z.number(),
  material_id: z.number(),
  material_name: z.string(),
  material_slug: z.string(),
  material_category: z.string(),
  quantity: z.string(),
  sort_order: z.number(),
});
export type ContentMaterialItem = z.infer<typeof ContentMaterialItemSchema>;

// --- Paginated material response ---

export const PaginatedMaterialsSchema = z.object({
  items: z.array(MaterialSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedMaterials = z.infer<typeof PaginatedMaterialsSchema>;

// ---------------------------------------------------------------------------
// MeasuringUnit
// ---------------------------------------------------------------------------

export const MeasuringUnitSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
});
export type MeasuringUnit = z.infer<typeof MeasuringUnitSchema>;

// ---------------------------------------------------------------------------
// NutritionalTag
// ---------------------------------------------------------------------------

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

// ---------------------------------------------------------------------------
// RetailSection
// ---------------------------------------------------------------------------

export const RetailSectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  rank: z.number(),
});
export type RetailSection = z.infer<typeof RetailSectionSchema>;

// --- Legacy Material Content schemas (used by api/materials.ts) ---

export const MaterialContentSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable().optional(),
  content_type: z.string().optional(),
});
export type MaterialContent = z.infer<typeof MaterialContentSchema>;

export const MaterialNameDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  default_unit: z.string().nullable(),
  contents: z.array(MaterialContentSchema),
});
export type MaterialNameDetail = z.infer<typeof MaterialNameDetailSchema>;

export const MaterialNameListSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  default_unit: z.string().nullable(),
});
export type MaterialNameList = z.infer<typeof MaterialNameListSchema>;

export const MaterialUnitSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().default(''),
  quantity: z.number().default(1),
  unit: z.string().default(''),
});
export type MaterialUnit2 = z.infer<typeof MaterialUnitSchema>;

export const PaginatedMaterialNamesSchema = z.object({
  items: z.array(MaterialNameListSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedMaterialNames = z.infer<typeof PaginatedMaterialNamesSchema>;

// --- Unit Conversion ---

export const UnitConversionSchema = z.object({
  id: z.number(),
  from_unit_id: z.number(),
  from_unit_name: z.string(),
  to_unit_id: z.number(),
  to_unit_name: z.string(),
  factor: z.number(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string().nullable(),
});
export type UnitConversion = z.infer<typeof UnitConversionSchema>;

export const UnitConversionResultSchema = z.object({
  result: z.number(),
  factor: z.number(),
  is_ingredient_specific: z.boolean(),
});
export type UnitConversionResult = z.infer<typeof UnitConversionResultSchema>;
