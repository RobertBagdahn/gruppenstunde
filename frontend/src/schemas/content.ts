/**
 * Zod schemas for Content base types.
 * MUST stay in sync with backend/content/base_schemas.py
 *
 * These are shared across all content types (GroupSession, Blog, Game, Recipe).
 */
import { z } from 'zod';

// --- Tag (shared across all content types) ---

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

// --- Author ---

export const ContentAuthorSchema = z.object({
  id: z.number().nullable().default(null),
  display_name: z.string(),
  scout_name: z.string().default(''),
  profile_picture_url: z.string().nullable().default(null),
  is_registered: z.boolean().default(false),
});
export type ContentAuthor = z.infer<typeof ContentAuthorSchema>;

// --- Content Base (list) ---

export const ContentListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  costs_rating: z.string(),
  execution_time: z.string(),
  difficulty: z.string(),
  status: z.string(),
  image_url: z.string().nullable(),
  like_score: z.number(),
  view_count: z.number(),
  created_at: z.string(),
  scout_levels: z.array(ScoutLevelSchema),
  tags: z.array(TagSchema),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type ContentListItem = z.infer<typeof ContentListItemSchema>;

// --- Content Base (detail) ---

export const ContentDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
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
  authors: z.array(ContentAuthorSchema).default([]),
  emotion_counts: z.record(z.string(), z.number()).default({}),
  user_emotion: z.string().nullable().default(null),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type ContentDetail = z.infer<typeof ContentDetailSchema>;

// --- Content Similar ---

export const ContentSimilarSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable(),
  difficulty: z.string(),
  execution_time: z.string(),
  content_type: z.string().default(''),
});
export type ContentSimilar = z.infer<typeof ContentSimilarSchema>;

// --- Comment ---

export interface ContentComment {
  id: number;
  text: string;
  author_name: string;
  user_id: number | null;
  user_display_name?: string | null;
  parent_id: number | null;
  status: string;
  created_at: string;
  replies: ContentComment[];
}

export const ContentCommentSchema: z.ZodType<ContentComment> = z.object({
  id: z.number(),
  text: z.string(),
  author_name: z.string(),
  user_id: z.number().nullable(),
  user_display_name: z.string().nullable().optional(),
  parent_id: z.number().nullable(),
  status: z.string(),
  created_at: z.string(),
  replies: z.lazy((): z.ZodType<ContentComment[]> => z.array(ContentCommentSchema)).default([]),
}) as z.ZodType<ContentComment>;

// --- Emotion ---

export const ContentEmotionSchema = z.object({
  emotion_type: z.string(),
  count: z.number(),
});
export type ContentEmotion = z.infer<typeof ContentEmotionSchema>;

// --- Content Status ---

export const CONTENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'submitted', label: 'Eingereicht' },
  { value: 'approved', label: 'Genehmigt' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'archived', label: 'Archiviert' },
] as const;

// --- Difficulty ---

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Einfach' },
  { value: 'medium', label: 'Mittel' },
  { value: 'hard', label: 'Schwer' },
] as const;

// --- Costs ---

export const COSTS_RATING_OPTIONS = [
  { value: 'free', label: '0 €' },
  { value: 'less_1', label: '< 1 €' },
  { value: '1_2', label: '1 – 2 €' },
  { value: 'more_2', label: '> 2 €' },
] as const;

// --- Execution Time ---

export const EXECUTION_TIME_OPTIONS = [
  { value: 'less_30', label: '< 30 Minuten' },
  { value: '30_60', label: '30 – 60 Minuten' },
  { value: '60_90', label: '60 – 90 Minuten' },
  { value: 'more_90', label: '> 90 Minuten' },
] as const;

// --- Preparation Time ---

export const PREPARATION_TIME_OPTIONS = [
  { value: 'none', label: 'keine' },
  { value: 'less_15', label: '< 15 Min' },
  { value: '15_30', label: '15 – 30 Min' },
  { value: '30_60', label: '30 – 60 Min' },
  { value: 'more_60', label: '> 60 Min' },
] as const;

// --- Sort ---

export const SORT_OPTIONS = [
  { value: 'relevant', label: 'Relevanz' },
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Aelteste' },
  { value: 'most_liked', label: 'Beliebteste' },
  { value: 'random', label: 'Zufaellig' },
] as const;

/** @deprecated Use COSTS_RATING_OPTIONS */
export const COSTS_OPTIONS = COSTS_RATING_OPTIONS;

// --- Emotion Types ---

export const EMOTION_TYPES = [
  { value: 'in_love', label: 'Begeistert', icon: '😍' },
  { value: 'happy', label: 'Gut', icon: '😊' },
  { value: 'disappointed', label: 'Enttäuscht', icon: '😞' },
  { value: 'complex', label: 'Zu komplex', icon: '🤯' },
] as const;

// --- AI Schemas ---

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
  suggested_tags: z.array(z.lazy(() => z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    icon: z.string(),
    sort_order: z.number(),
    parent_id: z.number().nullable(),
    parent_name: z.string().nullable().optional(),
  }))).optional().default([]),
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
  location: z.string().optional().default(''),
  season: z.string().optional().default(''),
  image_prompt: z.string().optional().default(''),
  image_url: z.string().nullable().optional().default(null),
  image_urls: z.array(z.string()).optional().default([]),
  processing_time_seconds: z.number().default(0),
});
export type AiRefurbish = z.output<typeof AiRefurbishSchema>;

export const AiErrorSchema = z.object({
  detail: z.string(),
  error_code: z.string(),
});
export type AiError = z.infer<typeof AiErrorSchema>;

// --- Autocomplete ---

export const AutocompleteSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
});
export type Autocomplete = z.infer<typeof AutocompleteSchema>;

// --- Content Filter (used by search store) ---

export const ContentFilterSchema = z.object({
  q: z.string().optional(),
  content_types: z.array(z.string()).optional(),
  scout_level_ids: z.array(z.number()).optional(),
  tag_slugs: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  costs_rating: z.string().optional(),
  execution_time: z.string().optional(),
  sort: z.string().default('newest'),
  page: z.number().default(1),
  page_size: z.number().default(20),
});
export type ContentFilter = z.infer<typeof ContentFilterSchema>;

// --- Content Type URL mapping ---

const CONTENT_TYPE_URL_PREFIXES: Record<string, string> = {
  session: '/sessions',
  blog: '/blogs',
  game: '/games',
  recipe: '/recipes',
};

/** Get the URL path for a content item based on its type and slug. */
export function getContentUrl(contentType: string, slug: string): string {
  const prefix = CONTENT_TYPE_URL_PREFIXES[contentType] ?? '/search';
  return `${prefix}/${slug}`;
}

const CONTENT_TYPE_LABELS_MAP: Record<string, string> = {
  session: 'Gruppenstunde',
  blog: 'Wissensbeitrag',
  game: 'Spiel',
  recipe: 'Rezept',
};

/** Get a human-readable label for a content type. */
export function getContentTypeLabel(contentType: string): string {
  return CONTENT_TYPE_LABELS_MAP[contentType] ?? contentType;
}
