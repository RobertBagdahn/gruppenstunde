/**
 * Zod schemas for Profile & Group API.
 * MUST stay in sync with backend/profiles/schemas.py
 */
import { z } from 'zod';
import { NutritionalTagSchema } from './idea';

// --- User Profile ---

export const UserProfileSchema = z.object({
  id: z.number(),
  scout_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  gender: z.string(),
  birthday: z.string().nullable(),
  about_me: z.string(),
  nutritional_tags: z.array(NutritionalTagSchema),
  profile_picture_url: z.string().nullable().optional(),
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
});
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

// --- User Preferences ---

export const UserPreferenceSchema = z.object({
  id: z.number(),
  preferred_scout_level_id: z.number().nullable(),
  preferred_group_size_min: z.number().nullable(),
  preferred_group_size_max: z.number().nullable(),
  preferred_difficulty: z.string(),
  preferred_location: z.string(),
});
export type UserPreference = z.infer<typeof UserPreferenceSchema>;

export const UserPreferenceUpdateSchema = z.object({
  preferred_scout_level_id: z.number().nullable().optional(),
  preferred_group_size_min: z.number().nullable().optional(),
  preferred_group_size_max: z.number().nullable().optional(),
  preferred_difficulty: z.string().optional(),
  preferred_location: z.string().optional(),
});
export type UserPreferenceUpdate = z.infer<typeof UserPreferenceUpdateSchema>;

// --- Public User Profile ---

export const PublicIdeaSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  idea_type: z.string(),
  summary: z.string(),
  image_url: z.string().nullable().optional(),
  created_at: z.string(),
});
export type PublicIdea = z.infer<typeof PublicIdeaSchema>;

export const MyIdeaSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  idea_type: z.string(),
  summary: z.string(),
  status: z.string(),
  image_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MyIdea = z.infer<typeof MyIdeaSchema>;

export const PublicUserProfileSchema = z.object({
  id: z.number(),
  scout_name: z.string(),
  first_name: z.string(),
  about_me: z.string(),
  profile_picture_url: z.string().nullable().optional(),
  created_at: z.string(),
  ideas: z.array(PublicIdeaSchema).default([]),
});
export type PublicUserProfile = z.infer<typeof PublicUserProfileSchema>;

// --- Groups ---

export const GroupParentSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});
export type GroupParent = z.infer<typeof GroupParentSchema>;

export const UserGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  is_visible: z.boolean(),
  free_to_join: z.boolean(),
  member_count: z.number(),
  parent: GroupParentSchema.nullable().optional(),
  created_at: z.string(),
});
export type UserGroup = z.infer<typeof UserGroupSchema>;

export const GroupMemberSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_email: z.string(),
  user_first_name: z.string(),
  user_last_name: z.string(),
  role: z.string(),
  date_joined: z.string(),
  is_active: z.boolean(),
});
export type GroupMember = z.infer<typeof GroupMemberSchema>;

export const UserGroupChildSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  member_count: z.number(),
});
export type UserGroupChild = z.infer<typeof UserGroupChildSchema>;

export const UserGroupDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  is_visible: z.boolean(),
  free_to_join: z.boolean(),
  join_code: z.string(),
  member_count: z.number(),
  parent: GroupParentSchema.nullable().optional(),
  children: z.array(UserGroupChildSchema).default([]),
  ancestors: z.array(GroupParentSchema).default([]),
  created_by_id: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  members: z.array(GroupMemberSchema),
  inherited_member_count: z.number().default(0),
});
export type UserGroupDetail = z.infer<typeof UserGroupDetailSchema>;

export const UserGroupCreateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().default(''),
  is_visible: z.boolean().default(true),
  free_to_join: z.boolean().default(false),
  join_code: z.string().default(''),
  parent_id: z.number().nullable().optional(),
});
export type UserGroupCreate = z.infer<typeof UserGroupCreateSchema>;

// --- Join Requests ---

export const JoinRequestSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_email: z.string(),
  group_id: z.number(),
  group_name: z.string(),
  message: z.string(),
  approved: z.boolean().nullable(),
  date_requested: z.string(),
  date_checked: z.string().nullable(),
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;
