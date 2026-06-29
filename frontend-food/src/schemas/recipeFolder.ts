import { z } from 'zod';

export const RecipeFolderSchema = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number().nullable(),
  sort_order: z.number(),
  recipe_count: z.number(),
});
export type RecipeFolder = z.infer<typeof RecipeFolderSchema>;

export const RecipeFolderCreateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  parent_id: z.number().nullable().optional(),
  sort_order: z.number().optional(),
});
export type RecipeFolderCreate = z.infer<typeof RecipeFolderCreateSchema>;

export const RecipeFolderUpdateSchema = z.object({
  name: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  sort_order: z.number().optional(),
});
export type RecipeFolderUpdate = z.infer<typeof RecipeFolderUpdateSchema>;
