/**
 * Zod schemas for Idea API.
 * MUST stay in sync with backend/idea/schemas.py
 */
import { z } from 'zod';

// --- Tag (hierarchical) ---

export const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  sort_order: z.number(),
  parent_id: z.number().nullable(),
  parent_name: z.string().nullable().optional(),
});
export type Tag = z.infer<typeof TagSchema>;

export const ScoutLevelSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
});
export type ScoutLevel = z.infer<typeof ScoutLevelSchema>;

// --- NutritionalTag ---

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

// --- Material ---

export const MaterialItemSchema = z.object({
  id: z.number(),
  quantity: z.string(),
  material_name: z.string().nullable(),
  material_name_id: z.number().nullable().optional(),
  material_name_slug: z.string().nullable().optional(),
  material_unit: z.string().nullable(),
  quantity_type: z.enum(['once', 'per_person']).default('once'),
});
export type MaterialItem = z.infer<typeof MaterialItemSchema>;

// --- Idea Schemas ---

export const IdeaListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  idea_type: z.string(),
  summary: z.string(),
  costs_rating: z.string(),
  execution_time: z.string(),
  difficulty: z.string(),
  image_url: z.string().nullable(),
  like_score: z.number(),
  view_count: z.number(),
  created_at: z.string(),
  scout_levels: z.array(ScoutLevelSchema),
  tags: z.array(TagSchema),
});
export type IdeaListItem = z.infer<typeof IdeaListItemSchema>;

export const IdeaSimilarSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable(),
  difficulty: z.string(),
  execution_time: z.string(),
});
export type IdeaSimilar = z.infer<typeof IdeaSimilarSchema>;

// --- Author ---

export const IdeaAuthorSchema = z.object({
  id: z.number().nullable().default(null),
  display_name: z.string(),
  scout_name: z.string().default(''),
  profile_picture_url: z.string().nullable().default(null),
  is_registered: z.boolean().default(false),
});
export type IdeaAuthor = z.infer<typeof IdeaAuthorSchema>;

export const IdeaDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  idea_type: z.string(),
  summary: z.string(),
  summary_long: z.string(),
  description: z.string(),
  costs_rating: z.string(),
  execution_time: z.string(),
  preparation_time: z.string(),
  difficulty: z.string(),
  status: z.string(),
  image_url: z.string().nullable(),
  like_score: z.number(),
  view_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  scout_levels: z.array(ScoutLevelSchema),
  tags: z.array(TagSchema),
  materials: z.array(MaterialItemSchema),
  authors: z.array(IdeaAuthorSchema).default([]),
  emotion_counts: z.record(z.string(), z.number()).default({}),
  user_emotion: z.string().nullable().default(null),
  can_edit: z.boolean().default(false),
});
export type IdeaDetail = z.infer<typeof IdeaDetailSchema>;

export const PaginatedIdeasSchema = z.object({
  items: z.array(IdeaListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedIdeas = z.infer<typeof PaginatedIdeasSchema>;

// --- Comment (with moderation) ---

export const CommentSchema = z.object({
  id: z.number(),
  text: z.string(),
  author_name: z.string(),
  user_id: z.number().nullable(),
  created_at: z.string(),
  parent_id: z.number().nullable(),
  status: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

// --- Emotion ---

export const EmotionSchema = z.object({
  id: z.number(),
  emotion_type: z.string(),
  created_at: z.string(),
});
export type Emotion = z.infer<typeof EmotionSchema>;

// --- Filter ---

export const IdeaFilterSchema = z.object({
  q: z.string().optional(),
  idea_type: z.array(z.string()).optional(),
  scout_level_ids: z.array(z.number()).optional(),
  tag_slugs: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  costs_rating: z.string().optional(),
  execution_time: z.string().optional(),
  sort: z.string().default('newest'),
  page: z.number().default(1),
  page_size: z.number().default(20),
});
export type IdeaFilter = z.infer<typeof IdeaFilterSchema>;

// --- AI ---

export const AiImproveTextSchema = z.object({
  improved_text: z.string(),
});
export type AiImproveText = z.infer<typeof AiImproveTextSchema>;

export const AiSuggestTagsSchema = z.object({
  tag_ids: z.array(z.number()),
  tag_names: z.array(z.string()),
});
export type AiSuggestTags = z.infer<typeof AiSuggestTagsSchema>;

export const AiRefurbishSchema = z.object({
  title: z.string(),
  summary: z.string(),
  summary_long: z.string(),
  description: z.string(),
  idea_type: z.string().default('idea'),
  suggested_tag_ids: z.array(z.number()),
  suggested_tag_names: z.array(z.string()),
  suggested_tags: z.array(TagSchema).optional().default([]),
  costs_rating: z.string(),
  execution_time: z.string(),
  preparation_time: z.string(),
  difficulty: z.string(),
  suggested_scout_level_ids: z.array(z.number()).optional().default([]),
  suggested_materials: z.array(z.object({
    quantity: z.string(),
    material_name: z.string(),
    material_unit: z.string(),
    quantity_type: z.enum(['once', 'per_person']).default('per_person'),
  })).optional().default([]),
});
export type AiRefurbish = z.infer<typeof AiRefurbishSchema>;

// --- Autocomplete ---

export const AutocompleteSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
});
export type Autocomplete = z.infer<typeof AutocompleteSchema>;

// --- User Preferences ---

export const UserPreferencesSchema = z.object({
  preferred_scout_level_id: z.number().nullable(),
  preferred_group_size_min: z.number().nullable(),
  preferred_group_size_max: z.number().nullable(),
  preferred_difficulty: z.string(),
  preferred_location: z.string(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// --- Choices (mirrors backend TextChoices) ---

export const IDEA_TYPE_OPTIONS = [
  { value: 'idea', label: 'Idee', icon: 'lightbulb', description: 'Eine Aktivität oder Spielidee für die Gruppenstunde' },
  { value: 'knowledge', label: 'Wissensbeitrag', icon: 'menu_book', description: 'Wissen, Methoden oder Hintergrundinformationen teilen' },
  { value: 'recipe', label: 'Rezept', icon: 'restaurant', description: 'Koch- oder Backrezept für Lager und Gruppenstunde' },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Einfach' },
  { value: 'medium', label: 'Mittel' },
  { value: 'hard', label: 'Schwer' },
] as const;

export const COSTS_OPTIONS = [
  { value: 'free', label: '0 €' },
  { value: 'less_1', label: '< 1 €' },
  { value: '1_2', label: '1 – 2 €' },
  { value: 'more_2', label: '> 2 €' },
] as const;

export const EXECUTION_TIME_OPTIONS = [
  { value: 'less_30', label: '< 30 Min' },
  { value: '30_60', label: '30 – 60 Min' },
  { value: '60_90', label: '60 – 90 Min' },
  { value: 'more_90', label: '> 90 Min' },
] as const;

export const SORT_OPTIONS = [
  { value: 'relevant', label: 'Relevanz' },
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Älteste' },
  { value: 'most_liked', label: 'Beliebteste' },
  { value: 'random', label: 'Zufällig' },
] as const;

export const PREPARATION_TIME_OPTIONS = [
  { value: 'none', label: 'keine' },
  { value: 'less_15', label: '< 15 Min' },
  { value: '15_30', label: '15 – 30 Min' },
  { value: '30_60', label: '30 – 60 Min' },
  { value: 'more_60', label: '> 60 Min' },
] as const;

export const EMOTION_OPTIONS = [
  { value: 'in_love', label: 'Begeistert', emoji: '😍' },
  { value: 'happy', label: 'Gut', emoji: '😊' },
  { value: 'disappointed', label: 'Enttäuscht', emoji: '😞' },
  { value: 'complex', label: 'Zu komplex', emoji: '🤯' },
] as const;

// --- Material Detail Schemas ---

export const MaterialIdeaSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable().optional(),
});
export type MaterialIdea = z.infer<typeof MaterialIdeaSchema>;

export const MaterialNameDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  default_unit: z.string().nullable(),
  ideas: z.array(MaterialIdeaSchema),
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

export const PaginatedMaterialsSchema = z.object({
  items: z.array(MaterialNameListSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedMaterials = z.infer<typeof PaginatedMaterialsSchema>;
