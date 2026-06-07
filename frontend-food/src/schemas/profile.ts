import { z } from 'zod';

export const PublicRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable(),
  created_at: z.string(),
});

export const PublicShoppingListSchema = z.object({
  id: z.number(),
  name: z.string(),
  item_count: z.number(),
  created_at: z.string(),
});

export const PublicMealPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
});

export const PublicUserFoodProfileSchema = z.object({
  id: z.number(),
  slug: z.string().nullable(),
  scout_name: z.string(),
  first_name: z.string(),
  about_me: z.string(),
  profile_picture_url: z.string().nullable(),
  created_at: z.string(),
  recipes: z.array(PublicRecipeSchema),
  shopping_lists: z.array(PublicShoppingListSchema),
  meal_plans: z.array(PublicMealPlanSchema),
});

export type PublicUserFoodProfile = z.infer<typeof PublicUserFoodProfileSchema>;
