/**
 * Zod schemas for shopping stores.
 * MUST stay in sync with backend/shopping/schemas/stores.py
 */
import { z } from 'zod';

export const StoreSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string().default(''),
});

export type Store = z.output<typeof StoreSchema>;

export const PaginatedStoresSchema = z.object({
  items: z.array(StoreSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type PaginatedStores = z.output<typeof PaginatedStoresSchema>;

export const StoreInputSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib einen Namen für den Laden ein.').max(80),
});

export type StoreInput = z.input<typeof StoreInputSchema>;
