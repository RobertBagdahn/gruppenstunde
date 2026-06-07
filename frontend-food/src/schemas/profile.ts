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
  updated_at: z.string(),
  recipes: z.array(PublicRecipeSchema),
  shopping_lists: z.array(PublicShoppingListSchema),
  meal_plans: z.array(PublicMealPlanSchema),
});

export type PublicUserFoodProfile = z.infer<typeof PublicUserFoodProfileSchema>;

// --- Own (editable) profile ---

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

export const UserProfileSchema = z.object({
  id: z.number(),
  slug: z.string().nullable(),
  scout_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  gender: z.string(),
  birthday: z.string().nullable(),
  about_me: z.string(),
  nutritional_tags: z.array(NutritionalTagSchema),
  profile_picture_url: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserProfileUpdateSchema = z.object({
  scout_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  gender: z.string().optional(),
  birthday: z.string().nullable().optional(),
  about_me: z.string().optional(),
  nutritional_tag_ids: z.array(z.number()).optional(),
  is_public: z.boolean().optional(),
  slug: z.string().optional(),
});
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

export const ProfilePictureResponseSchema = z.object({
  profile_picture_url: z.string().nullable(),
});
export type ProfilePictureResponse = z.infer<typeof ProfilePictureResponseSchema>;
